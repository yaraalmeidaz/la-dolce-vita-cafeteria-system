import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { usePedidos } from "../context/PedidosContext";
import { useAuth } from "../auth/AuthContext";
import pedidoFinalizadoImg from "../assets/pedidoFinalizado.png";

export default function Pagamento() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clear } = useCart();
  const { addPedido } = usePedidos();
  const { user } = useAuth();
  const { tipo, endereco, totalFinal, items } = location.state || {};

  const [forma, setForma] = useState("pix");
  const [troco, setTroco] = useState("");

  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

  const [formaMenuAberto, setFormaMenuAberto] = useState(false);
  const formaMenuRef = useRef(null);

  const isDelivery = tipo === "delivery";

  const formaLabel = useMemo(() => {
    switch (forma) {
      case 'cartao':
        return 'Cartão';
      case 'dinheiro':
        return 'Dinheiro';
      default:
        return 'PIX';
    }
  }, [forma]);

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const inputStyle = {
    width: '100%',
    height: 48,
    borderRadius: 10,
    border: '1px solid #ddd',
    padding: '0 12px',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 400,
    color: '#222',
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  };

  useEffect(() => {
    if (!formaMenuAberto) return;

    const onMouseDown = (e) => {
      if (!formaMenuRef.current) return;
      if (!formaMenuRef.current.contains(e.target)) {
        setFormaMenuAberto(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [formaMenuAberto]);

  async function handlePagar() {
    // Simular pagamento
    const codigo = Math.floor(10000 + Math.random() * 90000); // 5 dígitos
    const nome = user?.nome || "Cliente";

    // Adicionar pedido
    const result = await addPedido({
      user_id: user.id,
      nome: user.nome,
      tipo,
      endereco,
      items,
      total: totalFinal,
      forma,
      troco: forma === "dinheiro" ? troco : null
    });

    clear();
    try {
      window.sessionStorage.removeItem('cafeteria_checkout_v1');
    } catch {
      // ignore
    }
    setPedidoConfirmado({
      codigo: result?.codigo ?? codigo,
      nome: result?.nome ?? nome,
    });
  }

  return (
    <div style={{ padding: 16, paddingBottom: 24, maxWidth: 820, margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '0 0 18px 0'
      }}>
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/checkout');
            }
          }}
          aria-label="Voltar"
          style={{
            width: 44,
            height: 44,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111',
            padding: 0
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <h2 style={{
          margin: 0,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          color: '#222'
        }}>
          Pagamento
        </h2>
      </div>

      {!items || items.length === 0 || typeof totalFinal !== 'number' ? (
        <div style={{
          border: '1px solid #f0f0f0',
          borderRadius: 12,
          padding: 16,
          backgroundColor: '#fff'
        }}>
          <p style={{
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 300,
            color: '#666'
          }}>
            Nenhuma informação de pagamento encontrada. Volte para revisar o pedido.
          </p>
          <button
            onClick={() => navigate('/checkout')}
            style={{
              marginTop: 14,
              width: '100%',
              height: 52,
              backgroundColor: '#000',
              color: '#fff',
              border: '2px solid #000',
              borderRadius: 12,
              cursor: 'pointer',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 16
            }}
          >
            Voltar para o Checkout
          </button>
        </div>
      ) : (
        pedidoConfirmado ? (
          <div style={{
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: 16,
            backgroundColor: '#fff'
          }}>
            <img
              src={pedidoFinalizadoImg}
              alt="Pedido confirmado"
              style={{
                width: '100%',
                height: 120,
                objectFit: 'cover',
                objectPosition: 'center',
                border: '1px solid #f0f0f0',
                borderRadius: 12,
                backgroundColor: '#fff',
                marginBottom: 14
              }}
            />

            <h3 style={{
              margin: '0 0 10px 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              color: '#222'
            }}>
              Pedido confirmado!
            </h3>

            <p style={{
              margin: '0 0 18px 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 300,
              color: '#666'
            }}>
              Número do pedido: <span style={{ fontWeight: 600, color: '#222' }}>{pedidoConfirmado.codigo}</span>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => navigate('/meus-pedidos')}
                style={{
                  width: '100%',
                  height: 56,
                  backgroundColor: '#000',
                  color: '#fff',
                  border: '2px solid #000',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  fontSize: 16
                }}
              >
                Meus pedidos
              </button>

              <button
                onClick={() => navigate('/cardapio')}
                aria-label="Voltar ao menu"
                title="Voltar ao menu"
                style={{
                  width: '100%',
                  height: 56,
                  backgroundColor: '#fff',
                  color: '#111',
                  border: '2px solid #111',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Ver cardápio
              </button>
            </div>
          </div>
        ) : (
          <>
          {/* Resumo */}
          <div style={{
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
            backgroundColor: '#fff'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              color: '#222'
            }}>
              Resumo do pedido
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 8,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 300,
              color: '#666'
            }}>
              <span>Tipo</span>
              <span style={{ fontWeight: 400, color: '#444' }}>
                {tipo === 'delivery' ? 'Delivery' : tipo === 'drive-thru' ? 'Drive-Thru' : 'No Estabelecimento'}
              </span>

              {tipo === 'delivery' && (
                <>
                  <span>Endereço</span>
                  <span style={{ fontWeight: 300, color: '#666', textAlign: 'right' }}>
                    {endereco || '-'}
                  </span>
                </>
              )}

              <span style={{ paddingTop: 10, color: '#222', fontWeight: 500 }}>Total</span>
              <span style={{ paddingTop: 10, color: '#222', fontWeight: 600 }}>
                <span style={{ fontWeight: 300 }}>R$</span> {formatCurrency(totalFinal)}
              </span>
            </div>
          </div>

          {/* Forma de pagamento */}
          <div style={{
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
            backgroundColor: '#fff'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              color: '#222'
            }}>
              Como você vai pagar
            </h3>

            <label style={{
              display: 'block',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 300,
              color: '#666',
              marginBottom: 8
            }}>
              Selecione uma opção
            </label>

            {/* Dropdown customizado (mesmo padrão do Checkout) */}
            <div ref={formaMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setFormaMenuAberto(v => !v)}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 48,
                  borderRadius: 10,
                  border: '1px solid #ddd',
                  padding: '0 52px 0 12px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 400,
                  color: '#222',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  cursor: 'pointer'
                }}
                aria-haspopup="listbox"
                aria-expanded={formaMenuAberto}
              >
                <span>{formaLabel}</span>
                <span style={{
                  position: 'absolute',
                  right: 16,
                  color: '#666',
                  fontSize: 16,
                  lineHeight: 1,
                  transform: formaMenuAberto ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  ▾
                </span>
              </button>

              {formaMenuAberto && (
                <div
                  role="listbox"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 52,
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: 10,
                    overflow: 'hidden',
                    zIndex: 50,
                    boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
                  }}
                >
                  {[{ value: 'pix', label: 'PIX' }, { value: 'cartao', label: 'Cartão' }, ...(isDelivery ? [{ value: 'dinheiro', label: 'Dinheiro' }] : [])].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setForma(opt.value);
                        setFormaMenuAberto(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 12px',
                        backgroundColor: forma === opt.value ? 'rgba(0,0,0,0.06)' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 400,
                        color: '#222'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {forma === "dinheiro" && (
              <div style={{ marginTop: 12 }}>
                <label style={{
                  display: 'block',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 300,
                  color: '#666',
                  marginBottom: 8
                }}>
                  Troco para quanto?
                </label>
                <input
                  type="number"
                  placeholder="Ex: 50"
                  value={troco}
                  onChange={e => setTroco(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          <button
            onClick={handlePagar}
            style={{
              width: '100%',
              height: 56,
              backgroundColor: '#000',
              color: '#fff',
              border: '2px solid #000',
              borderRadius: 12,
              cursor: 'pointer',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 16
            }}
          >
            Confirmar pagamento
          </button>
          </>
        )
      )}
    </div>
  );
}