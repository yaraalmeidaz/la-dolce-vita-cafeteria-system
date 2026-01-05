import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import CartItem from "../components/CartItem";
import { useState } from "react";

export default function Cart() {
  const { items, total, clear, decrease } = useCart();
  const navigate = useNavigate();
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const [confirmarRemoverUltimo, setConfirmarRemoverUltimo] = useState(false);
  const [itemParaRemover, setItemParaRemover] = useState(null);

  function handleLimpar() {
    setConfirmarLimpar(true);
  }

  function handleConfirmarLimpar() {
    clear();
    setConfirmarLimpar(false);
    navigate('/cardapio');
  }

  function handleCancelarLimpar() {
    setConfirmarLimpar(false);
  }

  function handleDiminuirItem(item) {
    const isUltimoItem = items.length === 1;
    const vaiRemoverAoDiminuir = Number(item?.qty || 0) <= 1;

    if (isUltimoItem && vaiRemoverAoDiminuir) {
      setItemParaRemover(item);
      setConfirmarRemoverUltimo(true);
      return;
    }

    decrease(item.id);
  }

  function handleConfirmarRemoverUltimo() {
    if (itemParaRemover?.id) {
      decrease(itemParaRemover.id);
    }
    setConfirmarRemoverUltimo(false);
    setItemParaRemover(null);
    navigate('/cardapio');
  }

  function handleCancelarRemoverUltimo() {
    setConfirmarRemoverUltimo(false);
    setItemParaRemover(null);
  }

  return (
    <div style={{ padding: 16, paddingBottom: 96 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '0 0 16px 0'
      }}>
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/cardapio');
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
          Meu Pedido
        </h2>
      </div>

      {items.length === 0 && (
        <p style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 300,
          color: '#666'
        }}>
          Seu pedido está vazio
        </p>
      )}

      {items.map(item => (
        <CartItem key={item.id} item={item} onDecrease={handleDiminuirItem} />
      ))}

      {items.length > 0 && (
        <div style={{ marginTop: 22, paddingTop: 10 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontFamily: "'Montserrat', sans-serif",
            color: '#444'
          }}>
            <span style={{ fontWeight: 300, fontSize: '1rem' }}>Total</span>
            <span style={{ fontWeight: 400, fontSize: '1.15rem' }}>
              <span style={{ fontWeight: 300 }}>R$</span>{' '}
              {Number(total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(68px + env(safe-area-inset-bottom))',
          padding: 12,
          backgroundColor: '#fff',
          zIndex: 300
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleLimpar}
              style={{
                flex: 1,
                height: 56,
                backgroundColor: '#fff',
                color: '#111',
                border: '2px solid #111',
                borderRadius: 12,
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 400,
                fontSize: 16
              }}
            >
              Limpar
            </button>

            <button
              onClick={() => navigate('/checkout')}
              style={{
                flex: 2,
                height: 56,
                backgroundColor: '#000',
                color: '#fff',
                border: '2px solid #000',
                borderRadius: 12,
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 500,
                fontSize: 16
              }}
            >
              Prosseguir com o pedido
            </button>
          </div>
        </div>
      )}

      {confirmarLimpar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
          }}
          onClick={handleCancelarLimpar}
          role="presentation"
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              backgroundColor: '#fff',
              borderRadius: 16,
              border: '1px solid #f0f0f0',
              padding: 16
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar limpeza do carrinho"
          >
            <h3
              style={{
                margin: '0 0 8px 0',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                color: '#222'
              }}
            >
              Limpar carrinho
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: '#666'
              }}
            >
              Confirma que deseja remover todos os itens do seu carrinho?
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleCancelarLimpar}
                style={{
                  flex: 1,
                  height: 52,
                  backgroundColor: '#fff',
                  color: '#111',
                  border: '2px solid #111',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  fontSize: 16
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmarLimpar}
                style={{
                  flex: 1,
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
                Sim, limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmarRemoverUltimo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
          }}
          onClick={handleCancelarRemoverUltimo}
          role="presentation"
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              backgroundColor: '#fff',
              borderRadius: 16,
              border: '1px solid #f0f0f0',
              padding: 16
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar remoção do item"
          >
            <h3
              style={{
                margin: '0 0 8px 0',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                color: '#222'
              }}
            >
              Remover item
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: '#666'
              }}
            >
              Certeza que deseja remover?
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleCancelarRemoverUltimo}
                style={{
                  flex: 1,
                  height: 52,
                  backgroundColor: '#fff',
                  color: '#111',
                  border: '2px solid #111',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  fontSize: 16
                }}
              >
                Não
              </button>

              <button
                type="button"
                onClick={handleConfirmarRemoverUltimo}
                style={{
                  flex: 1,
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
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
