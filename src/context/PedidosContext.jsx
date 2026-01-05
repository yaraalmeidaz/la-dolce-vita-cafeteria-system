import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../services/supabase";

const PedidosContext = createContext();

export function PedidosProvider({ children }) {
  const [pedidos, setPedidos] = useState([]);

  // Carregar pedidos recentes (hoje e ontem) para não “sumirem” pedidos de drive‑thru
  // que ficaram pendentes de retirada e precisam ser finalizados no dia seguinte.
  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cacheKey = `pedidos_recentes_${hoje}`;

    // Carrega do cache primeiro (abre instantâneo)
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.data)) {
          setPedidos(parsed.data);
        }
      }
    } catch {
      // ignore cache errors
    }

    // Atualiza em background (sem travar UI)
    loadPedidosDoDia({ cacheKey });
  }, []);

  async function loadPedidosDoDia({ cacheKey } = {}) {
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0]; // YYYY-MM-DD
    const ontem = new Date(agora);
    ontem.setDate(agora.getDate() - 1);
    const ontemIso = ontem.toISOString().split('T')[0];

    const key = cacheKey || `pedidos_recentes_${hoje}`;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          product_id,
          qty,
          price,
          products (nome)
        ),
        users (nome, email, telefone)
      `)
      .gte('created_at', ontemIso + ' 00:00:00')
      .lte('created_at', hoje + ' 23:59:59');

    if (!error && data) {
      // Transformar para formato compatível
      const pedidosFormatados = data.map(p => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.users?.nome || 'Cliente',
        telefone: p.users?.telefone,
        email: p.users?.email,
        tipo: p.tipo,
        endereco: p.endereco,
        total: p.total,
        forma_pagamento: p.forma_pagamento,
        troco: p.troco,
        status: p.status,
        items: p.order_items?.map(i => ({
          id: i.product_id,
          name: i.products?.nome || 'Produto',
          qty: i.qty,
          price: i.price
        })) || []
      }));
      setPedidos(pedidosFormatados);

      try {
        localStorage.setItem(key, JSON.stringify({ data: pedidosFormatados, savedAt: Date.now() }));
      } catch {
        // ignore cache write errors
      }
    }
  }

  async function addPedido(pedido) {
    // Gerar código único
    const codigo = Math.floor(10000 + Math.random() * 90000).toString();

    // Inserir pedido
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: pedido.user_id,
        codigo,
        tipo: pedido.tipo,
        endereco: pedido.endereco,
        total: pedido.total,
        forma_pagamento: pedido.forma,
        troco: pedido.troco,
        status: 'enviado'
      }])
      .select()
      .single();

    if (orderError) {
      console.error('Erro ao inserir pedido:', orderError);
      return;
    }

    // Inserir itens (inclui custo_unitario quando a coluna existir no banco)
    const list = Array.isArray(pedido.items) ? pedido.items : [];
    const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));

    // Busca custos de produção no banco (products.custo_producao) para os produtos do carrinho
    const productIds = Array.from(new Set(list.map((it) => it?.id).filter((id) => isUuid(id))));
    const custoByProductId = {};
    if (productIds.length > 0) {
      const { data: prods, error: prodError } = await supabase
        .from('products')
        .select('id_produto,custo_producao')
        .in('id_produto', productIds);

      if (prodError) {
        console.error('Erro ao buscar custos dos produtos:', prodError);
      } else {
        (prods || []).forEach((p) => {
          custoByProductId[p?.id_produto] = Number(p?.custo_producao || 0);
        });
      }
    }

    const itemsToInsert = list.map((item) => {
      const productId = item?.id;
      const custoUnit = isUuid(productId) ? Number(custoByProductId[productId] || 0) : 0;
      return {
        order_id: orderData.id,
        product_id: productId,
        qty: item?.qty,
        price: item?.price,
        custo_unitario: custoUnit,
      };
    });

    let itemsError = null;
    {
      const { error } = await supabase
        .from('order_items')
        .insert(itemsToInsert);
      itemsError = error;
    }

    if (itemsError) {
      const msg = String(itemsError?.message || '');
      // Compatibilidade: se a coluna ainda não existir no banco, tenta inserir sem custo_unitario
      if (msg.toLowerCase().includes('custo_unitario')) {
        const fallbackItems = itemsToInsert.map(({ custo_unitario, ...rest }) => rest);
        const { error: fallbackError } = await supabase
          .from('order_items')
          .insert(fallbackItems);
        if (fallbackError) {
          console.error('Erro ao inserir itens (fallback):', fallbackError);
        }
      } else {
        console.error('Erro ao inserir itens:', itemsError);
      }
    }

    // Recarregar pedidos
    loadPedidosDoDia();

    return { codigo, nome: pedido.nome };
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setPedidos(prev => {
        const next = prev.map(p => p.id === id ? { ...p, status } : p);
        try {
          const hoje = new Date().toISOString().split('T')[0];
          const key = `pedidos_recentes_${hoje}`;
          localStorage.setItem(key, JSON.stringify({ data: next, savedAt: Date.now() }));
        } catch {
          // ignore cache write errors
        }
        return next;
      });
    }
  }

  return (
    <PedidosContext.Provider value={{ pedidos, addPedido, updateStatus, loadPedidosDoDia }}>
      {children}
    </PedidosContext.Provider>
  );
}

export function usePedidos() {
  return useContext(PedidosContext);
}