import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { readCache, writeCache } from "../services/localCache";

export default function MeusPedidos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (user) {
      const cacheKey = `cafeteria_meus_pedidos_cache_v1:${user.id}`;
      const cached = readCache(cacheKey, { ttlMs: 30 * 1000 }); // 30s

      if (Array.isArray(cached) && cached.length > 0) {
        setMeusPedidos(cached);
        setLoading(false);
        loadMeusPedidos({ cacheKey, silent: true });
      } else {
        loadMeusPedidos({ cacheKey });
      }
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadMeusPedidos({ cacheKey, silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            product_id,
            qty,
            price,
            products (nome)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar pedidos:', error);
        if (!silent) setError('Erro ao carregar pedidos. Tente novamente.');
      } else {
        const pedidosFormatados = data.map(p => ({
          id: p.id,
          codigo: p.codigo,
          tipo: p.tipo,
          status: p.status,
          endereco: p.endereco,
          total: p.total,
          forma_pagamento: p.forma_pagamento,
          troco: p.troco,
          items: (p.order_items || []).map(i => ({
            id: i.product_id,
            name: i.products?.nome || 'Produto',
            qty: i.qty,
            price: i.price
          })),
          created_at: p.created_at
        }));
        setMeusPedidos(pedidosFormatados);
        if (cacheKey) writeCache(cacheKey, pedidosFormatados);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      if (!silent) setError('Erro inesperado ao carregar pedidos.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const statusTexto = (status, tipo) => {
    switch (status) {
      case "enviado":
        return "Enviado";
      case "confirmado":
        return "Confirmado";
      case "andamento":
        // compatibilidade com status antigos
        return "Confirmado";
      case "preparacao":
        return "Em Preparação";
      case "pronto":
        if (tipo === "estabelecimento") return "Disponível para retirada no balcão";
        if (tipo === "drive-thru") return "Pronto para Retirada";
        return "Pronto";
      case "retirado":
        return "Finalizado";
      case "a_caminho":
        return "A caminho";
      case "entregue":
        return "Chegou";
      case "chegou":
        return "Chegou";
      default:
        return "Status desconhecido";
    }
  };

  const tipoTexto = (tipo) => {
    switch (tipo) {
      case 'drive-thru':
        return 'Drive-thru';
      case 'delivery':
        return 'Delivery';
      default:
        return 'Balcão';
    }
  };

  const formaTexto = (forma) => {
    switch (forma) {
      case 'cartao':
        return 'Cartão';
      case 'dinheiro':
        return 'Dinheiro';
      default:
        return 'PIX';
    }
  };

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const isDisponivel = (status, tipo) => {
    // Pronto para retirada (balcão/drive-thru)
    if (status === 'pronto' && tipo !== 'delivery') return true;
    return false;
  };

  // Finalizado de fato (sem categoria especial)
  const isFinalizado = (status) => ['retirado', 'entregue', 'chegou'].includes(status);

  const resumoItens = (items) => {
    if (!items || items.length === 0) return 'Itens do pedido';
    const first = items[0]?.name || 'Item';
    if (items.length === 1) return first;
    return `${first} + ${items.length - 1} item(ns)`;
  };

  const pedidosDisponiveis = meusPedidos.filter(p => isDisponivel(p.status, p.tipo));
  const pedidosAndamento = meusPedidos.filter(p => !isDisponivel(p.status, p.tipo) && !isFinalizado(p.status));
  const pedidosFinalizados = meusPedidos.filter(p => !isDisponivel(p.status, p.tipo) && isFinalizado(p.status));

  const subtotalPedido = (items) =>
    (items || []).reduce((acc, i) => acc + Number(i?.qty || 0) * Number(i?.price || 0), 0);

  const renderListaPedidos = (pedidos) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {pedidos.map((p) => (
        <div key={p.id} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                color: '#222',
                marginBottom: 6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {resumoItens(p.items)}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', ...mutedText }}>
                <span>Tipo: <span style={{ fontWeight: 500, color: '#444' }}>{tipoTexto(p.tipo)}</span></span>
                <span>•</span>
                <span>Código: <span style={{ fontWeight: 600, color: '#222' }}>{p.codigo}</span></span>
              </div>

              <div style={{ marginTop: 8, ...mutedText }}>
                Status do pedido: <span style={{ fontWeight: 500, color: '#444' }}>{statusTexto(p.status, p.tipo)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpandedId(prev => prev === p.id ? null : p.id)}
              style={{
                height: 44,
                padding: '0 12px',
                borderRadius: 12,
                border: '2px solid #111',
                backgroundColor: '#fff',
                color: '#111',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              {expandedId === p.id ? 'Fechar' : 'Ver detalhes'}
            </button>
          </div>

          {expandedId === p.id && (
            <div style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid #f0f0f0'
            }}>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                color: '#222',
                marginBottom: 10
              }}>
                Recibo
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                ...mutedText
              }}>
                <span>Código</span>
                <span style={{ fontWeight: 600, color: '#222' }}>{p.codigo}</span>

                <span>Tipo</span>
                <span style={{ fontWeight: 500, color: '#444' }}>{tipoTexto(p.tipo)}</span>

                <span>Status do pedido</span>
                <span style={{ fontWeight: 500, color: '#444' }}>{statusTexto(p.status, p.tipo)}</span>

                <span>Data</span>
                <span style={{ fontWeight: 300, color: '#666' }}>
                  {new Date(p.created_at).toLocaleString('pt-BR')}
                </span>

                {p.tipo === 'delivery' && (
                  <>
                    <span>Endereço</span>
                    <span style={{ fontWeight: 300, color: '#666', textAlign: 'right' }}>
                      {p.endereco || '-'}
                    </span>
                  </>
                )}
              </div>

              <div style={{ marginTop: 12, borderTop: '1px dashed #e5e5e5', paddingTop: 12 }}>
                <div style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#222',
                  marginBottom: 10
                }}>
                  Itens
                </div>

                {(p.items || []).length === 0 ? (
                  <div style={mutedText}>Nenhum item encontrado.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.items.map((i) => (
                      <div
                        key={`${p.id}-${i.id}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: 10,
                          alignItems: 'start',
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 300,
                          color: '#666'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#222', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {i.qty}x {i.name}
                          </div>
                          <div style={{ fontSize: 13, marginTop: 2 }}>
                            R$ {formatCurrency(i.price)}
                          </div>
                        </div>
                        <div style={{ color: '#222', fontWeight: 600 }}>
                          <span style={{ fontWeight: 300 }}>R$</span>{' '}
                          {formatCurrency(Number(i.qty || 0) * Number(i.price || 0))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 300,
                    color: '#666'
                  }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 500, color: '#444' }}>
                      <span style={{ fontWeight: 300 }}>R$</span> {formatCurrency(subtotalPedido(p.items))}
                    </span>

                    <span style={{ paddingTop: 8, fontWeight: 500, color: '#222' }}>Total</span>
                    <span style={{ paddingTop: 8, fontWeight: 700, color: '#222' }}>
                      <span style={{ fontWeight: 300 }}>R$</span> {formatCurrency(p.total)}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 12, borderTop: '1px dashed #e5e5e5', paddingTop: 12 }}>
                  <div style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    color: '#222',
                    marginBottom: 10
                  }}>
                    Pagamento
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    ...mutedText
                  }}>
                    <span>Forma</span>
                    <span style={{ fontWeight: 500, color: '#444' }}>{formaTexto(p.forma_pagamento)}</span>

                    {p.forma_pagamento === 'dinheiro' && (
                      <>
                        <span>Troco</span>
                        <span style={{ fontWeight: 500, color: '#444' }}>
                          {p.troco ? (
                            <>
                              <span style={{ fontWeight: 300 }}>R$</span> {formatCurrency(p.troco)}
                            </>
                          ) : '-'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const cardStyle = {
    border: '1px solid #f0f0f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff'
  };

  const mutedText = {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 300,
    color: '#666'
  };

  return (
    <div style={{ padding: 16, paddingBottom: 96, maxWidth: 820, margin: '0 auto' }}>
      <h2 style={{
        margin: '0 0 18px 0',
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 600,
        color: '#222'
      }}>
        Meus pedidos
      </h2>

      {!loading && !error && pedidosDisponiveis.length > 0 && (
        <div
          role="status"
          style={{
            margin: '0 0 16px 0',
            padding: 14,
            borderRadius: 12,
            border: '1px solid #f0f0f0',
            backgroundColor: '#fff',
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 600,
            color: '#222'
          }}
        >
          {(user?.nome || 'Cliente')}, seu pedido está pronto!
        </div>
      )}

      {loading ? (
        <p>Carregando pedidos...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : meusPedidos.length === 0 ? (
        <p>Você ainda não fez nenhum pedido.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h3 style={{
              margin: '0 0 10px 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              color: '#222'
            }}>
              Pedido pronto
            </h3>

            {pedidosDisponiveis.length === 0 ? (
              <div style={{ ...cardStyle, ...mutedText }}>
                Nenhum pedido disponível no momento.
              </div>
            ) : (
              renderListaPedidos(pedidosDisponiveis)
            )}
          </div>

          <div>
            <h3 style={{
              margin: '0 0 10px 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              color: '#222'
            }}>
              Pedidos em andamento
            </h3>

            {pedidosAndamento.length === 0 ? (
              <div style={{ ...cardStyle, ...mutedText }}>
                Nenhum pedido em andamento.
              </div>
            ) : (
              renderListaPedidos(pedidosAndamento)
            )}
          </div>

          <div>
            <h3 style={{
              margin: '10px 0 10px 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              color: '#222'
            }}>
              Pedidos finalizados
            </h3>

            {pedidosFinalizados.length === 0 ? (
              <div style={{ ...cardStyle, ...mutedText }}>
                Nenhum pedido finalizado.
              </div>
            ) : (
              renderListaPedidos(pedidosFinalizados)
            )}
          </div>
        </div>
      )}

    </div>
  );
}