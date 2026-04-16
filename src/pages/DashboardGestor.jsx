import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../auth/AuthContext';

function DashboardGestor() {
  const { user } = useAuth();
  const custosFixosFallback = [
    { nome: 'Aluguel', valor: 9500 },
    { nome: 'Água', valor: 600 },
    { nome: 'Luz', valor: 1200 },
    { nome: 'Internet', valor: 200 },
    { nome: 'Limpeza e manutenção', valor: 1000 },
    { nome: 'Sistema / software', valor: 300 },
  ];

  const [aba, setAba] = useState('clientes');

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState({});
  const [clientesLista, setClientesLista] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteDetalheId, setClienteDetalheId] = useState(null);

  const [custosFixos, setCustosFixos] = useState(custosFixosFallback);
  const [totalSalarios, setTotalSalarios] = useState(0);
  const [msg, setMsg] = useState(null);
  const [isEditingCustos, setIsEditingCustos] = useState(false);
  const [savingCustos, setSavingCustos] = useState(false);
  const [custosDraft, setCustosDraft] = useState([]);
  const [custosPodeEditar, setCustosPodeEditar] = useState(false);

  const [periodo, setPeriodo] = useState('mensal');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loadingVendas, setLoadingVendas] = useState(true);
  const [canalVendas, setCanalVendas] = useState('todas');
  const [buscaVendasCliente, setBuscaVendasCliente] = useState('');

  const pedidosRequestIdRef = useRef(0);

  const [topCategorias, setTopCategorias] = useState([]);
  const [loadingTopCategorias, setLoadingTopCategorias] = useState(false);
  const [topCategoriasAviso, setTopCategoriasAviso] = useState(null);

  const [produtosData, setProdutosData] = useState([]);
  const [abaProduto, setAbaProduto] = useState('');
  const [loadingProdutos, setLoadingProdutos] = useState(false);

  // Aba Promoção
  const [cupons, setCupons] = useState([]);
  const [novoCupomCodigo, setNovoCupomCodigo] = useState('');
  const [novoCupomPct, setNovoCupomPct] = useState('');
  const [savingCupom, setSavingCupom] = useState(false);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [topConsumidores, setTopConsumidores] = useState([]);
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [mensagemEnviada, setMensagemEnviada] = useState({});

  const [relatorio, setRelatorio] = useState(null);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const hoje = new Date();
  const [relatorioMes, setRelatorioMes] = useState(hoje.getMonth());
  const [relatorioAno, setRelatorioAno] = useState(hoje.getFullYear());

  const totalFixosSemSalarios = (custosFixos || []).reduce((acc, c) => acc + (Number(c.valor) || 0), 0);

  useEffect(() => {
    if (user?.tipo_acesso === 'gestor') {
      // Garante que o período padrão (mensal) já filtre o mês atual.
      if (periodo !== 'personalizado' && !dataInicio && !dataFim) {
        const { inicio, fim } = getRangeForPeriodo(periodo);
        setDataInicio(inicio);
        setDataFim(fim);
      }
      carregarClientes();
      carregarCustosFixos();
      carregarTotalSalarios();
    }
    // eslint-disable-next-line
  }, [user, periodo, dataInicio, dataFim]);

  // Mantém o relatório de vendas sempre baseado no banco (Supabase), atualizando automaticamente.
  useEffect(() => {
    if (user?.tipo_acesso !== 'gestor') return;
    if (aba !== 'vendas') return;

    let isAlive = true;
    let inFlight = false;

    const refresh = async () => {
      if (!isAlive) return;
      if (inFlight) return;
      inFlight = true;
      try {
        await carregarPedidos();
      } finally {
        inFlight = false;
      }
    };

    refresh();
    const id = setInterval(refresh, 15000);
    return () => {
      isAlive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, aba, dataInicio, dataFim, canalVendas]);

  // Função para atualizar datas conforme filtro
  function handlePeriodoChange(e) {
    const value = e.target.value;
    setPeriodo(value);
    if (value === 'personalizado') {
      setDataInicio('');
      setDataFim('');
    } else {
      const { inicio, fim } = getRangeForPeriodo(value);
      setDataInicio(inicio);
      setDataFim(fim);
    }
  }

  function getRangeForPeriodo(p) {
    const hoje = new Date();
    let inicio;
    let fim;
    if (p === 'semanal') {
      const diaSemana = hoje.getDay();
      inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - diaSemana);
      fim = new Date(hoje);
    } else if (p === 'mensal') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje);
    } else if (p === 'anual') {
      inicio = new Date(hoje.getFullYear(), 0, 1);
      fim = new Date(hoje);
    }
    return {
      inicio: inicio ? inicio.toISOString().slice(0, 10) : '',
      fim: fim ? fim.toISOString().slice(0, 10) : '',
    };
  }

  function formatMoney(v) {
    const n = Number(v);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function formatDateTimeBR(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    const data = d.toLocaleDateString('pt-BR');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${data} ${hora}`;
  }

  function normalizeTipoVenda(tipo) {
    const t = String(tipo || '').trim().toLowerCase();
    if (!t) return '';
    if (t.includes('delivery')) return 'delivery';
    if (t.includes('drive') || t.includes('thru') || t.includes('drive_thru') || t.includes('drivethru') || t.includes('drivethu')) return 'drive-thru';
    if (t.includes('estabele') || t.includes('local') || t.includes('balcao') || t.includes('balcão') || t.includes('mesa')) return 'estabelecimento';
    return t;
  }

  function getPedidosFiltradosVendas() {
    // As datas (início/fim) já são aplicadas na query do Supabase em `carregarPedidos()`.
    // Evita re-filtrar aqui, pois `new Date('YYYY-MM-DD')` considera meia-noite em UTC e pode
    // cortar vendas do próprio dia (parecendo "desatualizado").
    let pedidosFiltrados = pedidos;

    if (canalVendas !== 'todas') {
      pedidosFiltrados = (pedidosFiltrados || []).filter((p) => normalizeTipoVenda(p.tipo) === canalVendas);
    }

    const q = normalizeText(buscaVendasCliente);
    if (q) {
      pedidosFiltrados = (pedidosFiltrados || []).filter((p) => {
        const nomeCliente = clientes[p.user_id] || p.nome_cliente || p.nome || '';
        return normalizeText(nomeCliente).includes(q);
      });
    }

    return pedidosFiltrados || [];
  }

  useEffect(() => {
    if (user?.tipo_acesso !== 'gestor') return;
    if (aba !== 'vendas') return;
    if (loadingVendas) return;

    const pedidosFiltrados = getPedidosFiltradosVendas();
    const orderIds = pedidosFiltrados.map((p) => p.id).filter(Boolean);
    if (orderIds.length === 0) {
      setTopCategorias([]);
      setTopCategoriasAviso(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingTopCategorias(true);
      setTopCategoriasAviso(null);
      try {
        const PAGE_SIZE = 1000;
        const ORDER_IDS_CHUNK = 200;

        const chunks = [];
        for (let i = 0; i < orderIds.length; i += ORDER_IDS_CHUNK) {
          chunks.push(orderIds.slice(i, i + ORDER_IDS_CHUNK));
        }

        const data = [];
        for (const idsChunk of chunks) {
          let from = 0;
          while (true) {
            let query = supabase
              .from('vendas_itens')
              .select('order_id,categoria,produto_nome,qty,price')
              .in('order_id', idsChunk)
              .order('order_id', { ascending: true })
              .order('order_item_id', { ascending: true })
              .range(from, from + PAGE_SIZE - 1);

            if (dataInicio && dataFim) {
              query = query
                .gte('order_created_at', dataInicio + 'T00:00:00')
                .lte('order_created_at', dataFim + 'T23:59:59');
            }

            if (canalVendas !== 'todas') {
              query = query.eq('tipo', canalVendas);
            }

            const { data: page, error } = await query;

            if (error) {
              const msg = String(error?.message || '');
              if (!cancelled) {
                setTopCategorias([]);
                setTopCategoriasAviso(
                  msg.toLowerCase().includes('vendas_itens')
                    ? 'Tabela "vendas_itens" não encontrada no banco. Execute o SQL do projeto para criar a tabela e triggers.'
                    : 'Não foi possível carregar os itens vendidos por categoria.'
                );
              }
              return;
            }

            if (page && page.length) data.push(...page);

            if (!page || page.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
          }
        }

        const byCatAndItem = new Map();
        (data || []).forEach((row) => {
          const categoria = String(row?.categoria || 'Sem categoria');
          const item = String(row?.produto_nome || 'Item');
          const qty = Number(row?.qty || 0);
          const price = Number(row?.price || 0);
          if (!qty) return;
          const key = `${categoria}__${item}`;
          const prev = byCatAndItem.get(key) || { categoria, item, qty: 0, receita: 0 };
          prev.qty += qty;
          prev.receita += qty * price;
          byCatAndItem.set(key, prev);
        });

        const bestByCategoria = new Map();
        byCatAndItem.forEach((row) => {
          const prev = bestByCategoria.get(row.categoria);
          if (!prev) {
            bestByCategoria.set(row.categoria, row);
            return;
          }
          if (row.qty > prev.qty) {
            bestByCategoria.set(row.categoria, row);
            return;
          }
          if (row.qty === prev.qty && row.receita > prev.receita) {
            bestByCategoria.set(row.categoria, row);
          }
        });

        const result = Array.from(bestByCategoria.values()).sort((a, b) =>
          a.categoria.localeCompare(b.categoria, 'pt-BR')
        );

        if (!cancelled) setTopCategorias(result);
      } catch {
        if (!cancelled) {
          setTopCategorias([]);
          setTopCategoriasAviso('Não foi possível carregar os itens vendidos por categoria.');
        }
      } finally {
        if (!cancelled) setLoadingTopCategorias(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, aba, loadingVendas, pedidos, dataInicio, dataFim, canalVendas, buscaVendasCliente, clientes]);

  // Carrega vendas por produto (all-time) ao entrar na aba Produtos
  useEffect(() => {
    if (user?.tipo_acesso !== 'gestor') return;
    if (aba !== 'produtos') return;
    carregarProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, aba]);

  // Carrega dados da aba Promoção
  useEffect(() => {
    if (user?.tipo_acesso !== 'gestor') return;
    if (aba !== 'promocao') return;
    carregarDadosPromocao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, aba]);

  // Carrega relatório mensal
  useEffect(() => {
    if (user?.tipo_acesso !== 'gestor') return;
    if (aba !== 'relatorio') return;
    carregarRelatorioMensal(relatorioMes, relatorioAno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, aba, relatorioMes, relatorioAno]);

  async function carregarPedidos() {
    const requestId = ++pedidosRequestIdRef.current;
    setLoadingVendas(true);

    try {
      const PAGE_SIZE = 1000;
      let from = 0;
      const all = [];

      while (true) {
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (dataInicio && dataFim) {
          query = query.gte('created_at', dataInicio + 'T00:00:00').lte('created_at', dataFim + 'T23:59:59');
        }

        if (canalVendas !== 'todas') {
          query = query.eq('tipo', canalVendas);
        }

        const { data, error } = await query;
        if (requestId !== pedidosRequestIdRef.current) return;
        if (error) throw error;

        if (data && data.length) all.push(...data);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      if (requestId !== pedidosRequestIdRef.current) return;
      setPedidos(all);
    } catch {
      if (requestId !== pedidosRequestIdRef.current) return;
      setPedidos([]);
    } finally {
      if (requestId !== pedidosRequestIdRef.current) return;
      setLoadingVendas(false);
    }
  }

  async function carregarClientes() {
    // Busca todos os clientes para mapear id -> nome e lista completa
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email, telefone, tipo_acesso, created_at')
      .order('nome');
    if (!error && data) {
      const map = {};
      data.forEach(u => { map[u.id] = u.nome; });
      setClientes(map);
      setClientesLista(data);
    }
  }

  async function carregarCustosFixos() {
    setMsg(null);
    try {
      const { data, error } = await supabase
        .from('custos_fixos')
        .select('id, descricao, valor')
        .order('created_at', { ascending: true });

      if (error) {
        setCustosFixos(custosFixosFallback);
        setCustosPodeEditar(true);
        setMsg('Não foi possível carregar custos fixos do banco.');
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setCustosFixos(data.map((c) => ({ id: c.id, nome: c.descricao, valor: Number(c.valor) || 0 })));
      } else {
        // Banco vazio: usa fallback sem id. A edição ainda é permitida e fará insert na 1ª vez.
        setCustosFixos(custosFixosFallback);
      }
      setCustosPodeEditar(true);
    } catch {
      setCustosFixos(custosFixosFallback);
      setCustosPodeEditar(true);
      setMsg('Não foi possível carregar custos fixos do banco.');
    }
  }

  function parseMoneyBR(text) {
    if (typeof text !== 'string') return Number(text) || 0;
    const cleaned = text
      .trim()
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function startEditCustos() {
    if (!custosPodeEditar) return;
    setCustosDraft(custosFixos.map((c) => ({ ...c, valorInput: String(c.valor ?? 0).replace('.', ',') })));
    setIsEditingCustos(true);
  }

  function cancelEditCustos() {
    setIsEditingCustos(false);
    setSavingCustos(false);
    setCustosDraft([]);
  }

  async function saveCustos() {
    if (!custosPodeEditar || savingCustos) return;
    setSavingCustos(true);
    setMsg(null);

    try {
      const comId    = custosDraft.filter((c) => c.id);
      const semId    = custosDraft.filter((c) => !c.id);

      // UPDATE dos que já existem no banco
      const byId = new Map(custosFixos.filter((c) => c.id).map((c) => [c.id, Number(c.valor) || 0]));
      const changed = comId
        .map((c) => ({ id: c.id, valor: parseMoneyBR(c.valorInput) }))
        .filter((u) => byId.has(u.id) && byId.get(u.id) !== u.valor);

      if (changed.length > 0) {
        const results = await Promise.all(
          changed.map((u) =>
            supabase.from('custos_fixos').update({ valor: u.valor }).eq('id', u.id)
          )
        );
        if (results.some((r) => r.error)) {
          setMsg('Não foi possível salvar todos os custos fixos.');
          setSavingCustos(false);
          return;
        }
      }

      // INSERT dos que vieram do fallback (sem id no banco)
      if (semId.length > 0) {
        const rows = semId.map((c) => ({
          descricao: c.nome,
          valor: parseMoneyBR(c.valorInput),
        }));
        const { error: insertError } = await supabase.from('custos_fixos').insert(rows);
        if (insertError) {
          setMsg('Não foi possível criar os custos fixos no banco: ' + insertError.message);
          setSavingCustos(false);
          return;
        }
      }

      await carregarCustosFixos();
      setIsEditingCustos(false);
      setCustosDraft([]);
    } catch {
      setMsg('Não foi possível salvar os custos fixos.');
    } finally {
      setSavingCustos(false);
    }
  }

  async function carregarTotalSalarios() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('salario')
        .eq('role', 'admin')
        .eq('ativo', true);

      if (error || !data) {
        setTotalSalarios(0);
        return;
      }
      const total = data.reduce((acc, f) => acc + (Number(f.salario) || 0), 0);
      setTotalSalarios(total);
    } catch {
      setTotalSalarios(0);
    }
  }

  async function carregarDadosPromocao() {
    setLoadingPromo(true);
    try {
      const hoje = new Date();
      const mesHoje = hoje.getMonth() + 1;
      const diaHoje = hoje.getDate();

      // Cupons do banco
      const { data: cuponsBanco } = await supabase
        .from('cupons_promocao')
        .select('*')
        .order('created_at', { ascending: false });
      setCupons(cuponsBanco || []);

      // Clientes com aniversário de cadastro (mesmo dia/mês)
      const { data: usuarios } = await supabase
        .from('users')
        .select('id, nome, email, created_at')
        .eq('tipo_acesso', 'cliente');

      const aniv = (usuarios || []).filter((u) => {
        const d = u.created_at ? new Date(u.created_at) : null;
        if (!d) return false;
        return d.getMonth() + 1 === mesHoje && d.getDate() === diaHoje;
      });
      setAniversariantes(aniv);

      // Top 5 consumidores (por total gasto)
      const { data: pedidosAll } = await supabase
        .from('orders')
        .select('user_id, total');

      const gastoMap = new Map();
      (pedidosAll || []).forEach((p) => {
        const uid = p.user_id;
        if (!uid) return;
        gastoMap.set(uid, (gastoMap.get(uid) || 0) + Number(p.total || 0));
      });

      const userMap = new Map((usuarios || []).map((u) => [u.id, u]));
      const top = Array.from(gastoMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uid, total]) => ({ ...userMap.get(uid), total }));

      setTopConsumidores(top);
    } catch {
      // silencia erro
    } finally {
      setLoadingPromo(false);
    }
  }

  async function adicionarCupom() {
    const codigo = novoCupomCodigo.trim().toUpperCase();
    const pct = Number(novoCupomPct);
    if (!codigo || !pct || pct <= 0 || pct > 100) return;
    setSavingCupom(true);
    try {
      const { data, error } = await supabase
        .from('cupons_promocao')
        .insert({ codigo, desconto_pct: pct, ativo: true })
        .select()
        .single();
      if (!error && data) {
        setCupons((prev) => [data, ...prev]);
        setNovoCupomCodigo('');
        setNovoCupomPct('');
      }
    } catch { /* silencia */ } finally {
      setSavingCupom(false);
    }
  }

  async function toggleCupom(id, ativoAtual) {
    const { data } = await supabase
      .from('cupons_promocao')
      .update({ ativo: !ativoAtual })
      .eq('id', id)
      .select()
      .single();
    if (data) setCupons((prev) => prev.map((c) => c.id === id ? data : c));
  }

  async function removerCupom(id) {
    const { error } = await supabase.from('cupons_promocao').delete().eq('id', id);
    if (!error) setCupons((prev) => prev.filter((c) => c.id !== id));
  }

  function simularEnvioMensagem(clienteId) {
    setMensagemEnviada((prev) => ({ ...prev, [clienteId]: true }));
    setTimeout(() => {
      setMensagemEnviada((prev) => ({ ...prev, [clienteId]: false }));
    }, 2000);
  }

  async function carregarProdutos() {
    setLoadingProdutos(true);
    try {
      const PAGE_SIZE = 1000;
      let from = 0;
      const all = [];

      while (true) {
        const { data, error } = await supabase
          .from('vendas_itens')
          .select('categoria, produto_nome, qty')
          .order('categoria')
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (data && data.length) all.push(...data);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const map = new Map();
      all.forEach((row) => {
        const cat = String(row?.categoria || 'Sem categoria');
        const nome = String(row?.produto_nome || 'Item');
        const qty = Number(row?.qty || 0);
        if (!qty) return;
        const key = `${cat}__${nome}`;
        const prev = map.get(key) || { categoria: cat, produto_nome: nome, qty: 0 };
        prev.qty += qty;
        map.set(key, prev);
      });

      const result = Array.from(map.values()).sort((a, b) => {
        const catCmp = a.categoria.localeCompare(b.categoria, 'pt-BR');
        if (catCmp !== 0) return catCmp;
        return b.qty - a.qty;
      });

      setProdutosData(result);
      if (result.length > 0) {
        setAbaProduto((prev) => prev || result[0].categoria);
      }
    } catch {
      setProdutosData([]);
    } finally {
      setLoadingProdutos(false);
    }
  }

  async function carregarRelatorioMensal(mes, ano) {
    setLoadingRelatorio(true);
    try {
      const agora = new Date();
      const ehMesAtual = mes === agora.getMonth() && ano === agora.getFullYear();
      const inicioMes = new Date(ano, mes, 1).toISOString().slice(0, 10);
      const fimMes = ehMesAtual
        ? agora.toISOString().slice(0, 10)
        : new Date(ano, mes + 1, 0).toISOString().slice(0, 10);
      const inicioMesPassado = new Date(ano, mes - 1, 1).toISOString().slice(0, 10);
      const fimMesPassado = new Date(ano, mes, 0).toISOString().slice(0, 10);

      // Busca paginada para suportar meses com mais de 1000 pedidos
      const PAGE = 1000;
      const pedidosMes = [];
      for (let from = 0; ; from += PAGE) {
        const { data } = await supabase
          .from('orders')
          .select('id, total, created_at')
          .gte('created_at', inicioMes + 'T00:00:00')
          .lte('created_at', fimMes + 'T23:59:59')
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        pedidosMes.push(...data);
        if (data.length < PAGE) break;
      }
      const pedidosMesPassado = [];
      for (let from = 0; ; from += PAGE) {
        const { data } = await supabase
          .from('orders')
          .select('total')
          .gte('created_at', inicioMesPassado + 'T00:00:00')
          .lte('created_at', fimMesPassado + 'T23:59:59')
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        pedidosMesPassado.push(...data);
        if (data.length < PAGE) break;
      }

      const receitaMes = (pedidosMes || []).reduce((acc, p) => acc + Number(p.total || 0), 0);
      const receitaMesPassado = (pedidosMesPassado || []).reduce((acc, p) => acc + Number(p.total || 0), 0);
      const variacaoReceita = receitaMesPassado > 0
        ? ((receitaMes - receitaMesPassado) / receitaMesPassado) * 100
        : null;

      // Custo de insumos: busca order_items do mês e soma qty * custo_unitario
      // Se custo_unitario for 0, tenta custo_producao do produto
      const orderIds = (pedidosMes || []).map((p) => p.id).filter(Boolean);
      let custoInsumos = 0;
      let topItens = [];

      if (orderIds.length > 0) {
        const CHUNK = 200;
        const allOrderItems = [];
        for (let i = 0; i < orderIds.length; i += CHUNK) {
          const chunk = orderIds.slice(i, i + CHUNK);
          const { data } = await supabase
            .from('order_items')
            .select('product_id, qty, custo_unitario')
            .in('order_id', chunk);
          if (data) allOrderItems.push(...data);
        }

        // Busca custo_producao de TODOS os produtos únicos do mês (fallback por item)
        const prodIds = [...new Set(allOrderItems.map((r) => r.product_id).filter(Boolean))];
        const custoProdMap = new Map();
        if (prodIds.length > 0) {
          for (let i = 0; i < prodIds.length; i += CHUNK) {
            const chunk = prodIds.slice(i, i + CHUNK);
            const { data: prods } = await supabase
              .from('products')
              .select('id_produto, custo_producao')
              .in('id_produto', chunk);
            (prods || []).forEach((p) => custoProdMap.set(p.id_produto, Number(p.custo_producao || 0)));
          }
        }

        // Por item: usa custo_unitario se > 0, senão usa custo_producao do produto
        custoInsumos = allOrderItems.reduce((acc, r) => {
          const custo = Number(r.custo_unitario || 0) > 0
            ? Number(r.custo_unitario)
            : (custoProdMap.get(r.product_id) || 0);
          return acc + Number(r.qty || 0) * custo;
        }, 0);

        // Itens mais vendidos (reutiliza order_items já buscados para vendas_itens)
        const allItens = [];
        for (let i = 0; i < orderIds.length; i += CHUNK) {
          const chunk = orderIds.slice(i, i + CHUNK);
          const { data } = await supabase
            .from('vendas_itens')
            .select('produto_nome, categoria, qty, price')
            .in('order_id', chunk);
          if (data) allItens.push(...data);
        }
        const itensMap = new Map();
        allItens.forEach((row) => {
          const key = String(row?.produto_nome || 'Item');
          const prev = itensMap.get(key) || { produto_nome: key, categoria: String(row?.categoria || ''), qty: 0, receita: 0 };
          prev.qty += Number(row?.qty || 0);
          prev.receita += Number(row?.qty || 0) * Number(row?.price || 0);
          itensMap.set(key, prev);
        });
        topItens = Array.from(itensMap.values())
          .filter((item) => item.qty > 0)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10);
      }

      const totalCustos = totalFixosSemSalarios + totalSalarios + custoInsumos;
      const lucro = receitaMes - totalCustos;

      // Dias da semana (0=Dom … 6=Sáb)
      const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const diasMap = Array.from({ length: 7 }, (_, i) => ({ dia: diasNomes[i], totalPedidos: 0, totalReceita: 0 }));
      (pedidosMes || []).forEach((p) => {
        const d = new Date(p.created_at);
        if (Number.isNaN(d.getTime())) return;
        const idx = d.getDay();
        diasMap[idx].totalPedidos += 1;
        diasMap[idx].totalReceita += Number(p.total || 0);
      });

      // Horários com mais pedidos
      const horariosMap = Array.from({ length: 24 }, (_, i) => ({ hora: i, totalPedidos: 0 }));
      (pedidosMes || []).forEach((p) => {
        const d = new Date(p.created_at);
        if (Number.isNaN(d.getTime())) return;
        horariosMap[d.getHours()].totalPedidos += 1;
      });
      const horariosAtivos = horariosMap.filter((h) => h.totalPedidos > 0);

      setRelatorio({
        receitaMes,
        receitaMesPassado,
        variacaoReceita,
        custoInsumos,
        totalCustos,
        lucro,
        topItens,
        diasSemana: diasMap,
        horarios: horariosAtivos,
      });
    } catch {
      setRelatorio(null);
    } finally {
      setLoadingRelatorio(false);
    }
  }

  function emitirPDF() {
    if (!relatorio) return;
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const nomeMes = new Date(relatorioAno, relatorioMes, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const titulo = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Mensal — ${esc(titulo)}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:32px;color:#000;font-size:13px}
      h1{font-size:20px;font-weight:700;margin-bottom:4px}
      .sub{color:#666;font-size:12px;margin-bottom:24px}
      h2{font-size:13px;font-weight:700;margin:24px 0 10px;text-transform:uppercase;letter-spacing:.4px;color:#555}
      .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:8px}
      .kpi{border:1px solid #ddd;border-radius:10px;padding:12px}
      .kpi__label{font-size:10px;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px}
      .kpi__value{font-size:20px;font-weight:700}
      .kpi__delta{font-size:11px;margin-top:4px;color:#888}
      .pos{color:#007700}.neg{color:#cc2200}
      table{width:100%;border-collapse:collapse;margin-bottom:4px}
      th{font-size:11px;color:#666;text-align:left;padding:8px 6px;background:#f5f5f5;border-bottom:1px solid #ddd}
      td{font-size:12px;padding:8px 6px;border-bottom:1px solid #eee}
      .bar-wrap{height:10px;background:#eee;border-radius:5px}
      .bar{height:10px;background:#111;border-radius:5px;min-width:2px}
      @media print{body{padding:16px}}
    </style></head><body>
      <h1>Relatório Mensal</h1>
      <div class="sub">${esc(titulo)}</div>
      <h2>Resumo financeiro</h2>
      <div class="kpis">
        <div class="kpi">
          <div class="kpi__label">Receita do mês</div>
          <div class="kpi__value">R$ ${esc(formatMoney(relatorio.receitaMes))}</div>
          <div class="kpi__delta ${relatorio.variacaoReceita !== null && relatorio.variacaoReceita >= 0 ? 'pos' : 'neg'}">
            ${relatorio.variacaoReceita !== null
              ? `${relatorio.variacaoReceita >= 0 ? '▲' : '▼'} ${Math.abs(relatorio.variacaoReceita).toFixed(1)}% vs. mês anterior`
              : 'Sem dados do mês anterior'}
          </div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Total de custos</div>
          <div class="kpi__value">R$ ${esc(formatMoney(relatorio.totalCustos))}</div>
          <div class="kpi__delta">Fixos: R$ ${esc(formatMoney(totalFixosSemSalarios))} • Salários: R$ ${esc(formatMoney(totalSalarios))} • Insumos: R$ ${esc(formatMoney(relatorio.custoInsumos))}</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Lucro estimado</div>
          <div class="kpi__value ${relatorio.lucro >= 0 ? 'pos' : 'neg'}">R$ ${esc(formatMoney(relatorio.lucro))}</div>
          <div class="kpi__delta">Receita − Custos totais</div>
        </div>
      </div>
      <h2>Itens mais vendidos</h2>
      <table><thead><tr><th>#</th><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Receita</th></tr></thead><tbody>
        ${relatorio.topItens.map((item, i) => `<tr><td>${i + 1}</td><td>${esc(item.produto_nome)}</td><td>${esc(item.categoria)}</td><td>${item.qty}</td><td>R$ ${esc(formatMoney(item.receita))}</td></tr>`).join('')}
      </tbody></table>
      <h2>Movimento por dia da semana</h2>
      <table><thead><tr><th>Dia</th><th>Pedidos</th><th>Receita</th></tr></thead><tbody>
        ${relatorio.diasSemana.map((d) => `<tr><td>${esc(d.dia)}</td><td>${d.totalPedidos}</td><td>R$ ${esc(formatMoney(d.totalReceita))}</td></tr>`).join('')}
      </tbody></table>
      <h2>Horários com mais pedidos</h2>
      <table><thead><tr><th>Horário</th><th>Pedidos</th><th>Distribuição</th></tr></thead><tbody>
        ${(() => {
          const maxH = Math.max(...relatorio.horarios.map((h) => h.totalPedidos), 1);
          return relatorio.horarios.map((h) => {
            const pct = Math.round((h.totalPedidos / maxH) * 100);
            return `<tr><td>${String(h.hora).padStart(2, '0')}h</td><td>${h.totalPedidos}</td><td><div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div></td></tr>`;
          }).join('');
        })()}
      </tbody></table>
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function filtrarClientes(lista) {
    const q = buscaCliente.trim().toLowerCase();
    return (lista || [])
      .filter((c) => c.tipo_acesso === 'cliente')
      .filter((c) => {
        if (!q) return true;
        return (
          c.nome?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.telefone?.toLowerCase().includes(q)
        );
      });
  }

  return (
    <div className="dash-gestor">
      <div className="dash-head">
        <div>
          <div className="dash-title">Dashboard do Gestor</div>
          <div className="dash-sub">Clientes, custos e vendas</div>
        </div>
      </div>

      <div className="dash-tabs" role="tablist" aria-label="Categorias">
        {[
          { key: 'clientes', label: 'Clientes cadastrados' },
          { key: 'custos', label: 'Custos fixos' },
          { key: 'vendas', label: 'Relatório de vendas' },
          { key: 'produtos', label: 'Produtos' },
          { key: 'promocao', label: 'Promoção' },
          { key: 'relatorio', label: 'Relatório Mensal' },
        ].map((t) => {
          const active = aba === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAba(t.key)}
              className={`dash-tab ${active ? 'is-active' : ''}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {msg && <div className="dash-msg">{msg}</div>}

      {aba === 'clientes' && (
        <section className="dash-card" aria-label="Clientes cadastrados">
          <div className="card-head">
            <div className="card-title">Clientes cadastrados</div>
            <div className="search-wrap">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="search-input"
              />
              <span className="search-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
            </div>
          </div>

          <div className="contact-list" role="list">
            {filtrarClientes(clientesLista).length === 0 && (
              <div className="empty">Nenhum cliente cadastrado.</div>
            )}

            {filtrarClientes(clientesLista).map((cliente) => {
              const aberto = clienteDetalheId === cliente.id;

              return (
                <div key={cliente.id} className="contact-item" role="listitem">
                  <div className="contact-row">
                    <div className="contact-name">{cliente.nome}</div>
                    <button
                      type="button"
                      className="contact-btn"
                      onClick={() => setClienteDetalheId(aberto ? null : cliente.id)}
                    >
                      {aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                  </div>

                  {aberto && (
                    <div className="contact-details">
                      <div className="detail-grid">
                        <div className="detail-item">
                          <div className="detail-label">Email</div>
                          <div className="detail-value">{cliente.email || '-'}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Telefone</div>
                          <div className="detail-value">{cliente.telefone || '-'}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Data de cadastro</div>
                          <div className="detail-value">{cliente.created_at ? new Date(cliente.created_at).toLocaleDateString() : '-'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {aba === 'custos' && (
        <section className="dash-card" aria-label="Custos fixos">
          <div className="card-head">
            <div>
              <div className="card-title">Custos fixos</div>
              <div className="card-sub">Total fixo + salários (mensal)</div>
            </div>

            <div className="card-actions">
              {!isEditingCustos ? (
                <button
                  type="button"
                  className="action-btn"
                  onClick={startEditCustos}
                  disabled={!custosPodeEditar}
                  title={!custosPodeEditar ? 'Sem acesso para editar custos fixos' : 'Editar custos fixos'}
                >
                  Editar
                </button>
              ) : (
                <div className="action-group">
                  <button type="button" className="action-btn action-btn--primary" onClick={saveCustos} disabled={savingCustos}>
                    {savingCustos ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" className="action-btn" onClick={cancelEditCustos} disabled={savingCustos}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="costs" aria-label="Lista de custos fixos e resumo">
            <div className="costs__grid" role="list" aria-label="Custos fixos">
              {(isEditingCustos ? custosDraft : custosFixos).map((c, i) => (
                <div key={c.id ?? i} className="cost-item" role="listitem">
                  <div className="cost-name">{c.nome}</div>
                  <div className="cost-value">
                    <span className="rs">R$</span>{' '}
                    {!isEditingCustos ? (
                      <span>{formatMoney(c.valor)}</span>
                    ) : (
                      <input
                        className="money-input"
                        inputMode="decimal"
                        value={c.valorInput ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustosDraft((prev) => prev.map((x) => (x.id === c.id ? { ...x, valorInput: v } : x)));
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="costs__summary" role="list" aria-label="Resumo de custos">
              <div className="cost-row" role="listitem">
                <div className="cost-name">Total custos fixos (sem salários)</div>
                <div className="cost-value"><span className="rs">R$</span> {formatMoney(totalFixosSemSalarios)}</div>
              </div>
              <div className="cost-row" role="listitem">
                <div className="cost-name">Salários</div>
                <div className="cost-value"><span className="rs">R$</span> {formatMoney(totalSalarios)}</div>
              </div>
              <div className="cost-row cost-row--strong" role="listitem">
                <div className="cost-name">Total (fixos + salários)</div>
                <div className="cost-value"><span className="rs">R$</span> {formatMoney(totalFixosSemSalarios + totalSalarios)}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {aba === 'vendas' && (
        <section className="dash-card" aria-label="Relatório de vendas">
          <div className="card-head card-head--vendas">
            <div>
              <div className="card-title">Relatório de vendas</div>
              <div className="card-sub">Filtre por período e consulte as vendas.</div>
            </div>
            <div className="filters">
              <label className="label">Período
                <div className="select-wrap">
                  <select value={periodo} onChange={handlePeriodoChange} className="select">
                    <option value="semanal">Semana</option>
                    <option value="mensal">Mês</option>
                    <option value="anual">Ano</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true" />
                </div>
              </label>

              <label className="label">Canal
                <div className="select-wrap">
                  <select value={canalVendas} onChange={(e) => setCanalVendas(e.target.value)} className="select">
                    <option value="todas">Todas</option>
                    <option value="estabelecimento">Estabelecimento</option>
                    <option value="drive-thru">Drive-thru</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true" />
                </div>
              </label>

              {periodo === 'personalizado' && (
                <>
                  <label className="label">Início
                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input" />
                  </label>
                  <label className="label">Fim
                    <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input" />
                  </label>
                </>
              )}
            </div>
          </div>

          {loadingVendas ? (
            <div className="loading">Carregando vendas...</div>
          ) : (
            <div>
              {(() => {
                const pedidosFiltrados = getPedidosFiltradosVendas();

                const totalVendido = pedidosFiltrados.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
                const labelPeriodo =
                  periodo === 'semanal'
                    ? 'na semana'
                    : periodo === 'mensal'
                      ? 'no mês'
                      : periodo === 'anual'
                        ? 'no ano'
                        : 'no período';

                const labelCanal =
                  canalVendas === 'todas'
                    ? ''
                    : canalVendas === 'estabelecimento'
                      ? ' — Estabelecimento'
                      : canalVendas === 'drive-thru'
                        ? ' — Drive-thru'
                        : canalVendas === 'delivery'
                          ? ' — Delivery'
                          : '';

                if (pedidosFiltrados.length === 0) {
                  return (
                    <>
                      <div className="sales-total">
                        <div className="sales-total__label">Total vendido {labelPeriodo}{labelCanal}</div>
                        <div className="sales-total__value"><span className="rs">R$</span> {formatMoney(0)}</div>
                      </div>

                      <div className="sales-search" aria-label="Buscar cliente no relatório">
                        <input
                          type="text"
                          placeholder="Buscar cliente..."
                          value={buscaVendasCliente}
                          onChange={(e) => setBuscaVendasCliente(e.target.value)}
                          className="sales-search__input"
                        />
                        <span className="sales-search__icon" aria-hidden="true">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </span>
                      </div>

                      <div className="empty">Nenhuma venda realizada.</div>
                    </>
                  );
                }

                return (
                  <>
                    <div className="sales-total">
                      <div className="sales-total__label">Total vendido {labelPeriodo}{labelCanal}</div>
                      <div className="sales-total__value"><span className="rs">R$</span> {formatMoney(totalVendido)}</div>
                    </div>

                    <div className="sales-search" aria-label="Buscar cliente no relatório">
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={buscaVendasCliente}
                        onChange={(e) => setBuscaVendasCliente(e.target.value)}
                        className="sales-search__input"
                      />
                      <span className="sales-search__icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </span>
                    </div>

                    <div className="topcats" aria-label="Item mais vendido por categoria">
                      <div className="topcats__head">
                        <div className="topcats__title">Item mais vendido por categoria</div>
                        <div className="topcats__hint">{loadingTopCategorias ? 'Carregando...' : ''}</div>
                      </div>

                      {topCategoriasAviso && (
                        <div className="topcats__warn">{topCategoriasAviso}</div>
                      )}

                      {!topCategoriasAviso && topCategorias.length === 0 ? (
                        <div className="topcats__empty">Sem dados de itens para o período selecionado.</div>
                      ) : (
                        <div className="topcats__grid">
                          {topCategorias.map((r) => (
                            <div key={`${r.categoria}-${r.item}`} className="topcats__item">
                              <div className="topcats__cat">{r.categoria}</div>
                              <div className="topcats__name">{r.item}</div>
                              <div className="topcats__meta">
                                <span><span className="topcats__k">Qtd</span> <span className="topcats__v">{r.qty}</span></span>
                                <span className="topcats__dot">•</span>
                                <span><span className="topcats__k">Total</span> <span className="topcats__v"><span className="rs">R$</span> {formatMoney(r.receita)}</span></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {pedidosFiltrados.length === 0 && (
                      <div className="empty">Nenhuma venda realizada.</div>
                    )}

                    {pedidosFiltrados.map((p) => (
                      <div key={p.id} className="sale">
                        <div className="sale__grid">
                          <div><span className="sale__k">Código</span><span className="sale__v">{p.codigo}</span></div>
                          <div><span className="sale__k">Nome</span><span className="sale__v">{clientes[p.user_id] || p.nome_cliente || p.nome || p.user_id}</span></div>
                          <div><span className="sale__k">Data/Horário</span><span className="sale__v">{formatDateTimeBR(p.created_at || p.data || p.data_pedido)}</span></div>
                          <div><span className="sale__k">Tipo</span><span className="sale__v">{p.tipo}</span></div>
                          <div><span className="sale__k">Total</span><span className="sale__v"><span className="rs">R$</span> {Number(p.total || 0).toFixed(2)}</span></div>
                        </div>
                        <div className="sale__status">
                          {['pronto', 'a_caminho', 'entregue', 'finalizado', 'retirado', 'chegou'].includes(p.status)
                            ? 'Pedido finalizado'
                            : `Status: ${p.status}`}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </section>
      )}

      {aba === 'produtos' && (
        <section className="dash-card" aria-label="Análise de produtos">
          <div className="card-head">
            <div>
              <div className="card-title">Análise de produtos</div>
              <div className="card-sub">Quantidade total de vendas por produto — clique em uma categoria para visualizar</div>
            </div>
          </div>

          {loadingProdutos ? (
            <div className="loading">Carregando dados de produtos...</div>
          ) : produtosData.length === 0 ? (
            <div className="empty">Nenhum dado de vendas por produto encontrado. Verifique se a tabela "vendas_itens" existe no banco.</div>
          ) : (() => {
            const categorias = [...new Set(produtosData.map((d) => d.categoria))].sort((a, b) =>
              a.localeCompare(b, 'pt-BR')
            );
            const produtosCat = produtosData.filter((d) => d.categoria === abaProduto);
            const maxQty = Math.max(...produtosCat.map((d) => d.qty), 1);

            return (
              <>
                <div className="prod-cats" role="tablist" aria-label="Categorias de produtos">
                  {categorias.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={abaProduto === cat}
                      className={`prod-cat-btn ${abaProduto === cat ? 'is-active' : ''}`}
                      onClick={() => setAbaProduto(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {produtosCat.length === 0 ? (
                  <div className="empty">Sem vendas registradas nesta categoria.</div>
                ) : (
                  <div className="prod-chart-wrap">
                    <div className="prod-chart" role="list" aria-label={`Vendas da categoria ${abaProduto}`}>
                      {produtosCat.map((p) => {
                        const pct = (p.qty / maxQty) * 100;
                        return (
                          <div key={p.produto_nome} className="prod-bar-col" role="listitem">
                            <span className="prod-bar-qty">{p.qty}</span>
                            <div className="prod-bar-area">
                              <div
                                className="prod-bar"
                                style={{ height: `${pct}%` }}
                                aria-label={`${p.produto_nome}: ${p.qty} vendas`}
                              />
                            </div>
                            <div className="prod-bar-name" title={p.produto_nome}>{p.produto_nome}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </section>
      )}

      {aba === 'promocao' && (
        <section className="dash-card" aria-label="Promoções e cupons">
          <div className="card-head">
            <div>
              <div className="card-title">Promoções</div>
              <div className="card-sub">Gerencie cupons de desconto e envie ofertas segmentadas para clientes</div>
            </div>
          </div>

          {/* ── Cupons de desconto ── */}
          <div className="promo-section">
            <div className="promo-section__title">Cupons de desconto</div>

            <div className="promo-cupom-form">
              <input
                className="promo-input"
                type="text"
                placeholder="Código (ex: VERAO10)"
                value={novoCupomCodigo}
                onChange={(e) => setNovoCupomCodigo(e.target.value.toUpperCase())}
                maxLength={20}
              />
              <div className="promo-input-wrap">
                <input
                  className="promo-input promo-input--pct"
                  type="number"
                  placeholder="% desconto"
                  value={novoCupomPct}
                  onChange={(e) => setNovoCupomPct(e.target.value)}
                  min="1"
                  max="100"
                />
                <span className="promo-pct-label">%</span>
              </div>
              <button
                type="button"
                className="action-btn action-btn--primary"
                onClick={adicionarCupom}
                disabled={savingCupom || !novoCupomCodigo.trim() || !novoCupomPct || Number(novoCupomPct) <= 0 || Number(novoCupomPct) > 100}
              >
                {savingCupom ? 'Salvando...' : 'Adicionar cupom'}
              </button>
            </div>

            {cupons.length === 0 ? (
              <div className="empty">Nenhum cupom cadastrado ainda.</div>
            ) : (
              <div className="promo-cupom-list">
                {cupons.map((c) => (
                  <div key={c.id} className={`promo-cupom-item ${!c.ativo ? 'is-inactive' : ''}`}>
                    <div className="promo-cupom-code">{c.codigo}</div>
                    <div className="promo-cupom-pct">{c.desconto_pct}% OFF</div>
                    <div className="promo-cupom-status">{c.ativo ? 'Ativo' : 'Inativo'}</div>
                    <div className="promo-cupom-actions">
                      <button type="button" className="action-btn" onClick={() => toggleCupom(c.id, c.ativo)}>
                        {c.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button type="button" className="action-btn promo-cupom-del" onClick={() => removerCupom(c.id)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Aniversariantes de cadastro ── */}
          <div className="promo-section">
            <div className="promo-section__title">🎂 Aniversariantes de cadastro hoje</div>
            <div className="promo-section__sub">Clientes cujo cadastro completa aniversário hoje — envie uma mensagem especial</div>

            {loadingPromo ? (
              <div className="loading">Carregando...</div>
            ) : aniversariantes.length === 0 ? (
              <div className="empty">Nenhum cliente com aniversário de cadastro hoje.</div>
            ) : (
              <div className="promo-cliente-list">
                {aniversariantes.map((c) => {
                  const anos = c.created_at
                    ? new Date().getFullYear() - new Date(c.created_at).getFullYear()
                    : null;
                  return (
                    <div key={c.id} className="promo-cliente-item">
                      <div className="promo-cliente-info">
                        <div className="promo-cliente-nome">{c.nome || 'Cliente'}</div>
                        <div className="promo-cliente-meta">
                          {c.email && <span>{c.email}</span>}
                          {anos !== null && <span>• {anos} {anos === 1 ? 'ano' : 'anos'} de cadastro</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`action-btn ${mensagemEnviada[c.id] ? 'action-btn--sent' : 'action-btn--primary'}`}
                        onClick={() => simularEnvioMensagem(c.id)}
                        disabled={mensagemEnviada[c.id]}
                      >
                        {mensagemEnviada[c.id] ? '✓ Enviado' : 'Enviar promoção'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Top consumidores ── */}
          <div className="promo-section">
            <div className="promo-section__title">⭐ Clientes que mais consomem</div>
            <div className="promo-section__sub">Top 5 clientes por valor total gasto — ofereça um benefício exclusivo</div>

            {loadingPromo ? (
              <div className="loading">Carregando...</div>
            ) : topConsumidores.length === 0 ? (
              <div className="empty">Nenhum dado de consumo encontrado.</div>
            ) : (
              <div className="promo-cliente-list">
                {topConsumidores.map((c, idx) => (
                  <div key={c.id || idx} className="promo-cliente-item">
                    <div className="promo-rank">#{idx + 1}</div>
                    <div className="promo-cliente-info">
                      <div className="promo-cliente-nome">{c.nome || 'Cliente'}</div>
                      <div className="promo-cliente-meta">
                        {c.email && <span>{c.email}</span>}
                        <span>• Total gasto: <strong>R$ {formatMoney(c.total)}</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`action-btn ${mensagemEnviada[c.id] ? 'action-btn--sent' : 'action-btn--primary'}`}
                      onClick={() => simularEnvioMensagem(c.id)}
                      disabled={mensagemEnviada[c.id]}
                    >
                      {mensagemEnviada[c.id] ? '✓ Enviado' : 'Enviar cupom'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {aba === 'relatorio' && (
        <section className="dash-card" aria-label="Relatório mensal">
          <div className="card-head card-head--vendas">
            <div>
              <div className="card-title">Relatório Mensal</div>
              <div className="card-sub">
                {(() => {
                  const s = new Date(relatorioAno, relatorioMes, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                  return s.charAt(0).toUpperCase() + s.slice(1);
                })()}
              </div>
            </div>
            <div className="filters" style={{ marginTop: 10 }}>
              <label className="label">Mês
                <div className="select-wrap">
                  <select
                    className="select"
                    value={relatorioMes}
                    onChange={(e) => setRelatorioMes(Number(e.target.value))}
                  >
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <span className="select-arrow" aria-hidden="true" />
                </div>
              </label>
              <label className="label">Ano
                <div className="select-wrap">
                  <select
                    className="select"
                    value={relatorioAno}
                    onChange={(e) => setRelatorioAno(Number(e.target.value))}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <span className="select-arrow" aria-hidden="true" />
                </div>
              </label>
              <button
                type="button"
                className="action-btn action-btn--primary"
                onClick={emitirPDF}
                disabled={loadingRelatorio || !relatorio}
                style={{ alignSelf: 'flex-end' }}
              >
                Emitir PDF
              </button>
            </div>
          </div>

          {loadingRelatorio ? (
            <div className="loading">Carregando relatório...</div>
          ) : !relatorio ? (
            <div className="empty">Não foi possível carregar o relatório. Tente novamente.</div>
          ) : (
            <div className="rel-body">

              {/* ── KPIs ── */}
              <div className="rel-kpis">
                <div className="rel-kpi">
                  <div className="rel-kpi__label">Receita do mês</div>
                  <div className="rel-kpi__value"><span className="rs">R$</span> {formatMoney(relatorio.receitaMes)}</div>
                  {relatorio.variacaoReceita !== null ? (
                    <div className={`rel-kpi__delta ${relatorio.variacaoReceita >= 0 ? 'is-pos' : 'is-neg'}`}>
                      {relatorio.variacaoReceita >= 0 ? '▲' : '▼'} {Math.abs(relatorio.variacaoReceita).toFixed(1)}% vs. mês anterior
                    </div>
                  ) : (
                    <div className="rel-kpi__delta">Sem dados do mês anterior</div>
                  )}
                </div>
                <div className="rel-kpi">
                  <div className="rel-kpi__label">Total de custos</div>
                  <div className="rel-kpi__value"><span className="rs">R$</span> {formatMoney(relatorio.totalCustos)}</div>
                  <div className="rel-kpi__detail">Fixos: R$ {formatMoney(totalFixosSemSalarios)} • Salários: R$ {formatMoney(totalSalarios)} • Insumos: R$ {formatMoney(relatorio.custoInsumos)}</div>
                </div>
                <div className="rel-kpi">
                  <div className="rel-kpi__label">Lucro estimado</div>
                  <div className={`rel-kpi__value ${relatorio.lucro >= 0 ? 'is-pos' : 'is-neg'}`}>
                    <span className="rs">R$</span> {formatMoney(relatorio.lucro)}
                  </div>
                  <div className="rel-kpi__detail">Receita − Custos totais</div>
                </div>
              </div>

              {/* ── Itens mais vendidos ── */}
              <div className="rel-section">
                <div className="rel-section__title">Itens mais vendidos no mês</div>
                {relatorio.topItens.length === 0 ? (
                  <div className="empty">Sem dados de itens para o mês atual. Verifique a tabela "vendas_itens".</div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '36px' }}>#</th>
                          <th>Produto</th>
                          <th>Categoria</th>
                          <th style={{ width: '68px' }}>Qtd</th>
                          <th style={{ width: '110px' }}>Receita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.topItens.map((item, i) => (
                          <tr key={item.produto_nome}>
                            <td className="rel-rank">{i + 1}</td>
                            <td>{item.produto_nome}</td>
                            <td>{item.categoria}</td>
                            <td>{item.qty}</td>
                            <td><span className="rs">R$</span> {formatMoney(item.receita)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Dias mais movimentados ── */}
              <div className="rel-section">
                <div className="rel-section__title">Dias mais movimentados da semana</div>
                <div className="rel-dias">
                  {(() => {
                    const maxP = Math.max(...relatorio.diasSemana.map((d) => d.totalPedidos), 1);
                    return relatorio.diasSemana.map((d) => {
                      const pct = (d.totalPedidos / maxP) * 100;
                      return (
                        <div key={d.dia} className="rel-dia-col" title={`${d.dia}: ${d.totalPedidos} pedidos — R$ ${formatMoney(d.totalReceita)}`}>
                          <div className="rel-dia-qty">{d.totalPedidos || ''}</div>
                          <div className="rel-dia-bar-area">
                            <div className="rel-dia-bar" style={{ height: `${pct}%` }} />
                          </div>
                          <div className="rel-dia-name">{d.dia}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* ── Horários com mais pedidos ── */}
              <div className="rel-section">
                <div className="rel-section__title">Horários com mais pedidos</div>
                {relatorio.horarios.length === 0 ? (
                  <div className="empty">Sem dados de horários para o mês atual.</div>
                ) : (
                  <div className="rel-horas">
                    {(() => {
                      const maxH = Math.max(...relatorio.horarios.map((h) => h.totalPedidos), 1);
                      return relatorio.horarios.map((h) => {
                        const pct = (h.totalPedidos / maxH) * 100;
                        return (
                          <div key={h.hora} className="rel-hora-row">
                            <div className="rel-hora-label">{String(h.hora).padStart(2, '0')}h</div>
                            <div className="rel-hora-bar-wrap">
                              <div className="rel-hora-bar" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="rel-hora-qty">{h.totalPedidos}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

            </div>
          )}
        </section>
      )}

      <style>{`
        .dash-gestor {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Montserrat', sans-serif;
          color: #000;
          width: 100%;
          box-sizing: border-box;
        }

        .dash-gestor * {
          box-sizing: border-box;
        }

        .dash-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .dash-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }

        .dash-sub {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(0,0,0,0.60);
        }

        .dash-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 14px;
          padding: 10px 12px;
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 14px;
          background: #fff;
          margin-bottom: 16px;
        }

        .dash-tab {
          border: none;
          background: transparent;
          padding: 10px 12px;
          border-bottom: 3px solid transparent;
          color: rgba(0,0,0,0.62);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .dash-tab.is-active {
          color: #000;
          border-bottom-color: #000;
        }

        .dash-msg {
          border: 1px solid rgba(0,0,0,0.14);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 13px;
          color: rgba(0,0,0,0.72);
          background: rgba(0,0,0,0.03);
        }

        .dash-card {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          background: #fff;
          padding: 16px;
          max-width: 100%;
        }

        .card-head {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .card-title {
          font-size: 16px;
          font-weight: 700;
        }

        .card-sub {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(0,0,0,0.58);
        }

        .card-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .action-group {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .action-btn {
          border: 1px solid rgba(0,0,0,0.18);
          background: #fff;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.75);
          cursor: pointer;
          flex: 0 0 auto;
        }

        .action-btn:hover {
          border-color: rgba(0,0,0,0.30);
        }

        .action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .action-btn--primary {
          background: #000;
          border-color: #000;
          color: #fff;
        }

        .search-wrap {
          position: relative;
          min-width: 0;
          width: 100%;
          max-width: 420px;
          flex: 1 1 320px;
          margin-left: auto;
          box-sizing: border-box;
        }

        .search-input {
          width: 100%;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 38px 0 12px;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }

        .search-input:focus { border-color: rgba(0,0,0,0.32); }

        .search-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0,0,0,0.55);
          pointer-events: none;
        }

        .contact-list {
          display: grid;
          gap: 10px;
        }

        .contact-item {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          background: #fff;
          padding: 12px;
        }

        .contact-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .contact-name {
          font-size: 14px;
          font-weight: 700;
          color: rgba(0,0,0,0.86);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .contact-btn {
          border: 1px solid rgba(0,0,0,0.18);
          background: #fff;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.75);
          cursor: pointer;
          flex: 0 0 auto;
        }

        .contact-btn:hover {
          border-color: rgba(0,0,0,0.30);
        }

        .contact-details {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(0,0,0,0.10);
        }

        .costs {
          display: grid;
          gap: 12px;
          max-width: 860px;
          margin: 0 auto;
        }

        .costs__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        .cost-item {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          background: #fff;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .cost-name {
          font-size: 13px;
          font-weight: 700;
          color: rgba(0,0,0,0.82);
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .cost-value {
          font-size: 13px;
          font-weight: 700;
          color: rgba(0,0,0,0.82);
          flex: 0 0 auto;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .costs__summary {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          background: rgba(0,0,0,0.02);
          padding: 12px;
        }

        .cost-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
        }

        .cost-row + .cost-row {
          border-top: 1px solid rgba(0,0,0,0.10);
        }

        .cost-row--strong {
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 12px;
          padding: 12px;
          margin-top: 10px;
        }

        .cost-row--strong + .cost-row {
          border-top: none;
        }

        .money-input {
          width: 110px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 10px;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          text-align: right;
          background: #fff;
          color: #000;
        }

        .money-input:focus {
          border-color: rgba(0,0,0,0.32);
        }

        @media (max-width: 720px) {
          .costs__grid { grid-template-columns: 1fr; }
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        .detail-item {
          min-width: 0;
        }

        .detail-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(0,0,0,0.52);
          margin-bottom: 2px;
        }

        .detail-value {
          font-size: 13px;
          font-weight: 600;
          color: rgba(0,0,0,0.82);
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .table-wrap {
          overflow-x: hidden;
          overflow-y: auto;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08);
          width: 100%;
          max-width: 100%;
        }

        .table-wrap--narrow {
          max-width: 760px;
          margin: 0 auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          background: #fff;
        }

        .table thead th {
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.62);
          padding: 12px;
          background: rgba(0,0,0,0.03);
          border-bottom: 1px solid rgba(0,0,0,0.10);
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .table tbody td {
          padding: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          font-size: 13px;
          color: rgba(0,0,0,0.80);
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .table tbody tr:last-child td { border-bottom: none; }

        .table-empty {
          text-align: center;
          padding: 20px;
          color: rgba(0,0,0,0.60);
        }

        .table-total td {
          font-weight: 700;
          background: rgba(0,0,0,0.02);
        }

        .table-total--strong td {
          background: rgba(0,0,0,0.04);
        }

        .rs { font-weight: 300; }

        .filters {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .card-head--vendas {
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
        }

        .card-head--vendas .filters {
          width: 100%;
          justify-content: flex-start;
          margin-top: 10px;
        }

        .label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.62);
        }

        .select-wrap {
          position: relative;
          width: 100%;
          max-width: 220px;
        }

        .select, .input {
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 10px;
          font-size: 13px;
          outline: none;
          background: #fff;
          color: #000;
        }

        .select {
          width: 100%;
          padding-right: 34px;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: none;
        }

        .select option {
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #000;
          background: #fff;
        }

        .select option:checked {
          background: rgba(0,0,0,0.06);
        }

        .select-arrow {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-35%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid rgba(0,0,0,0.55);
          pointer-events: none;
        }

        .select:focus, .input:focus { border-color: rgba(0,0,0,0.32); }

        .loading, .empty {
          padding: 16px 4px;
          font-size: 13px;
          color: rgba(0,0,0,0.62);
        }

        .sale {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          margin-top: 12px;
        }

        .sales-total {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 14px;
          background: rgba(0,0,0,0.02);
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-top: 4px;
        }

        .sales-search {
          position: relative;
          width: 100%;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 0;
          background: #fff;
          margin-top: 10px;
        }

        .sales-search__input {
          width: 100%;
          height: 44px;
          border: none;
          outline: none;
          border-radius: 14px;
          padding: 0 44px 0 14px;
          font-size: 13px;
          font-weight: 600;
          color: #000;
          background: transparent;
        }

        .sales-search__icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0,0,0,0.55);
          pointer-events: none;
        }

        .sales-total__label {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.60);
        }

        .sales-total__value {
          font-size: 16px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          white-space: nowrap;
        }

        .sale__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        .topcats {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          margin-top: 12px;
        }

        .topcats__head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .topcats__title {
          font-size: 13px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
        }

        .topcats__hint {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.50);
          min-height: 16px;
        }

        .topcats__warn, .topcats__empty {
          font-size: 12px;
          font-weight: 600;
          color: rgba(0,0,0,0.62);
          padding: 8px 0 2px 0;
        }

        .topcats__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        @media (max-width: 720px) {
          .topcats__grid {
            grid-template-columns: 1fr;
          }
        }

        .topcats__item {
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 12px;
          padding: 12px;
          background: rgba(0,0,0,0.02);
        }

        .topcats__cat {
          font-size: 11px;
          font-weight: 800;
          color: rgba(0,0,0,0.55);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 4px;
        }

        .topcats__name {
          font-size: 13px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          margin-bottom: 6px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .topcats__meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.60);
        }

        .topcats__k {
          font-weight: 800;
          color: rgba(0,0,0,0.52);
        }

        .topcats__v {
          font-weight: 800;
          color: rgba(0,0,0,0.84);
        }

        .topcats__dot {
          color: rgba(0,0,0,0.30);
        }

        .sale__k {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: rgba(0,0,0,0.52);
          margin-bottom: 2px;
        }

        .sale__v {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: rgba(0,0,0,0.82);
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .sale__status {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.10);
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.70);
        }

        @media (max-width: 720px) {
          .table thead th { padding: 10px; font-size: 11px; }
          .table tbody td { padding: 10px; font-size: 12px; }
          .sale__grid { grid-template-columns: 1fr; }
          .search-wrap { max-width: none; }
          .detail-grid { grid-template-columns: 1fr; }
          .costs { max-width: 100%; }
        }

        @media (max-width: 520px) {
          .dash-card { padding: 14px; }
          .dash-tabs {
            gap: 4px 10px;
          }
          .cost-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .cost-value {
            width: 100%;
            text-align: right;
          }
          .cost-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .cost-row .cost-value {
            width: 100%;
            text-align: right;
          }
          .card-actions {
            width: 100%;
            justify-content: flex-end;
          }
          .action-group {
            width: 100%;
            justify-content: flex-end;
          }
          .money-input {
            width: 140px;
          }
        }

        /* ── Aba Produtos ── */
        .prod-cats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .prod-cat-btn {
          border: 1px solid rgba(0,0,0,0.14);
          background: #fff;
          border-radius: 20px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.60);
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }

        .prod-cat-btn:hover:not(.is-active) {
          border-color: rgba(0,0,0,0.28);
          color: rgba(0,0,0,0.84);
        }

        .prod-cat-btn.is-active {
          background: #000;
          border-color: #000;
          color: #fff;
        }

        .prod-chart-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          background: rgba(0,0,0,0.01);
        }

        .prod-chart {
          display: flex;
          align-items: stretch;
          gap: 10px;
          min-width: max-content;
          height: 280px;
          padding: 20px 16px 0 16px;
        }

        .prod-bar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 72px;
          flex: 0 0 72px;
        }

        .prod-bar-qty {
          font-size: 12px;
          font-weight: 800;
          color: rgba(0,0,0,0.82);
          height: 18px;
          line-height: 18px;
          text-align: center;
          flex: 0 0 18px;
        }

        .prod-bar-area {
          flex: 1;
          width: 42px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background: rgba(0,0,0,0.05);
          border-radius: 6px 6px 0 0;
          margin-top: 4px;
          overflow: hidden;
        }

        .prod-bar {
          width: 100%;
          background: #000;
          border-radius: 6px 6px 0 0;
          min-height: 4px;
          transition: height 0.35s ease;
        }

        .prod-bar-name {
          flex: 0 0 40px;
          width: 72px;
          font-size: 10px;
          font-weight: 700;
          color: rgba(0,0,0,0.58);
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding: 6px 2px 0;
          line-height: 1.3;
        }

        /* ── Promoção ── */
        .promo-section {
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 14px;
          background: rgba(0,0,0,0.01);
        }

        .promo-section__title {
          font-size: 14px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          margin-bottom: 4px;
        }

        .promo-section__sub {
          font-size: 12px;
          font-weight: 600;
          color: rgba(0,0,0,0.52);
          margin-bottom: 12px;
        }

        .promo-cupom-form {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 14px;
        }

        .promo-input {
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 12px;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          background: #fff;
          color: #000;
          flex: 1 1 160px;
          min-width: 120px;
        }

        .promo-input:focus { border-color: rgba(0,0,0,0.32); }

        .promo-input--pct { max-width: 110px; flex: 0 0 90px; padding-right: 28px; }

        .promo-input-wrap {
          position: relative;
          flex: 0 0 90px;
        }

        .promo-pct-label {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13px;
          font-weight: 700;
          color: rgba(0,0,0,0.50);
          pointer-events: none;
        }

        .promo-cupom-list {
          display: grid;
          gap: 10px;
        }

        .promo-cupom-item {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 12px;
          padding: 12px 14px;
          background: #fff;
          flex-wrap: wrap;
        }

        .promo-cupom-item.is-inactive {
          opacity: 0.55;
        }

        .promo-cupom-code {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #000;
          flex: 1 1 120px;
          font-family: monospace;
        }

        .promo-cupom-pct {
          font-size: 13px;
          font-weight: 800;
          color: rgba(0,0,0,0.72);
          background: rgba(0,0,0,0.06);
          border-radius: 8px;
          padding: 4px 10px;
          white-space: nowrap;
        }

        .promo-cupom-status {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.52);
          min-width: 50px;
        }

        .promo-cupom-actions {
          display: flex;
          gap: 8px;
          margin-left: auto;
          flex-wrap: wrap;
        }

        .promo-cupom-del {
          color: rgba(180,0,0,0.75);
          border-color: rgba(180,0,0,0.20);
        }

        .promo-cupom-del:hover {
          border-color: rgba(180,0,0,0.40);
        }

        .promo-cliente-list {
          display: grid;
          gap: 10px;
        }

        .promo-cliente-item {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 12px;
          padding: 12px 14px;
          background: #fff;
          flex-wrap: wrap;
        }

        .promo-rank {
          font-size: 16px;
          font-weight: 800;
          color: rgba(0,0,0,0.38);
          min-width: 28px;
          text-align: center;
        }

        .promo-cliente-info {
          flex: 1 1 180px;
          min-width: 0;
        }

        .promo-cliente-nome {
          font-size: 14px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .promo-cliente-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 12px;
          font-weight: 600;
          color: rgba(0,0,0,0.55);
          margin-top: 2px;
        }

        .action-btn--sent {
          background: rgba(0,140,0,0.10);
          border-color: rgba(0,140,0,0.30);
          color: rgba(0,120,0,0.90);
        }

        @media (max-width: 520px) {
          .promo-cupom-form { flex-direction: column; align-items: stretch; }
          .promo-input--pct { max-width: none; }
          .promo-input-wrap { flex: 1 1 auto; }
          .promo-cupom-item { flex-direction: column; align-items: flex-start; }
          .promo-cupom-actions { margin-left: 0; }
          .promo-cliente-item { flex-direction: column; align-items: flex-start; }
        }

        /* ── Aba Relatório Mensal ── */
        .rel-body {
          display: grid;
          gap: 16px;
        }

        .rel-kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 720px) {
          .rel-kpis { grid-template-columns: 1fr; }
        }

        .rel-kpi {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 14px;
          background: rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .rel-kpi__label {
          font-size: 10px;
          font-weight: 700;
          color: rgba(0,0,0,0.52);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rel-kpi__value {
          font-size: 22px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          line-height: 1.1;
        }

        .rel-kpi__value.is-pos { color: #007700; }
        .rel-kpi__value.is-neg { color: #cc2200; }

        .rel-kpi__delta {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.52);
        }

        .rel-kpi__delta.is-pos { color: #007700; }
        .rel-kpi__delta.is-neg { color: #cc2200; }

        .rel-kpi__detail {
          font-size: 11px;
          font-weight: 600;
          color: rgba(0,0,0,0.42);
        }

        .rel-section {
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 14px;
          padding: 14px;
          background: #fff;
        }

        .rel-section__title {
          font-size: 13px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          margin-bottom: 12px;
        }

        .rel-rank {
          font-weight: 800;
          color: rgba(0,0,0,0.38);
          text-align: center;
        }

        /* Gráfico dias da semana */
        .rel-dias {
          display: flex;
          align-items: stretch;
          gap: 8px;
          height: 180px;
          padding: 0 4px;
        }

        .rel-dia-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: default;
        }

        .rel-dia-qty {
          font-size: 11px;
          font-weight: 800;
          color: rgba(0,0,0,0.72);
          height: 16px;
          line-height: 16px;
          flex: 0 0 16px;
        }

        .rel-dia-bar-area {
          flex: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background: rgba(0,0,0,0.06);
          border-radius: 6px 6px 0 0;
          margin-top: 4px;
          overflow: hidden;
        }

        .rel-dia-bar {
          width: 100%;
          background: #000;
          border-radius: 6px 6px 0 0;
          min-height: 2px;
          transition: height 0.35s ease;
        }

        .rel-dia-name {
          font-size: 11px;
          font-weight: 700;
          color: rgba(0,0,0,0.55);
          padding-top: 6px;
          flex: 0 0 20px;
        }

        /* Gráfico horários */
        .rel-horas {
          display: grid;
          gap: 6px;
        }

        .rel-hora-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .rel-hora-label {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.60);
          width: 32px;
          flex: 0 0 32px;
          text-align: right;
        }

        .rel-hora-bar-wrap {
          flex: 1;
          height: 16px;
          background: rgba(0,0,0,0.06);
          border-radius: 4px;
          overflow: hidden;
        }

        .rel-hora-bar {
          height: 100%;
          background: #000;
          border-radius: 4px;
          min-width: 2px;
          transition: width 0.35s ease;
        }

        .rel-hora-qty {
          font-size: 12px;
          font-weight: 800;
          color: rgba(0,0,0,0.70);
          width: 28px;
          flex: 0 0 28px;
        }
      `}</style>
    </div>
  );
}

export default DashboardGestor;
