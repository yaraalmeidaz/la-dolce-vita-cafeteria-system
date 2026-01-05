import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

const CHECKOUT_STORAGE_KEY = "cafeteria_checkout_v1";

function readCheckoutDraft() {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export default function Checkout() {
  const { items, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const draft = readCheckoutDraft();

  const [tipo, setTipo] = useState(draft?.tipo || "estabelecimento");
  const [rua, setRua] = useState(draft?.rua || "");
  const [numero, setNumero] = useState(draft?.numero || "");
  const [bairro, setBairro] = useState(draft?.bairro || "");
  const [taxaServico, setTaxaServico] = useState(Boolean(draft?.taxaServico));
  const [cupom, setCupom] = useState(draft?.cupom || "");
  const [cupomErro, setCupomErro] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [cupomAplicado, setCupomAplicado] = useState(Boolean(draft?.cupomAplicado));

  const [enderecoModal, setEnderecoModal] = useState("");

  const [tipoMenuAberto, setTipoMenuAberto] = useState(false);
  const tipoMenuRef = useRef(null);

  const tipoLabel = useMemo(() => {
    switch (tipo) {
      case 'delivery':
        return 'Entrega';
      case 'drive-thru':
        return 'Drive thru';
      default:
        return 'No Estabelecimento';
    }
  }, [tipo]);

  const hasItems = items.length > 0;
  const frete = tipo === 'delivery' && hasItems ? 8.5 : 0;
  const taxa = taxaServico && hasItems ? total * 0.1 : 0;
  const desconto = 0;
  const totalFinal = total + frete + taxa - desconto;

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const enderecoCompleto = useMemo(() => {
    const partes = [rua?.trim(), numero?.trim(), bairro?.trim()].filter(Boolean);
    return partes.join(", ");
  }, [rua, numero, bairro]);

  useEffect(() => {
    if (!tipoMenuAberto) return;

    const onMouseDown = (e) => {
      if (!tipoMenuRef.current) return;
      if (!tipoMenuRef.current.contains(e.target)) {
        setTipoMenuAberto(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [tipoMenuAberto]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        CHECKOUT_STORAGE_KEY,
        JSON.stringify({
          tipo,
          rua,
          numero,
          bairro,
          taxaServico,
          cupom,
          cupomAplicado,
        })
      );
    } catch {
      // ignore
    }
  }, [tipo, rua, numero, bairro, taxaServico, cupom, cupomAplicado]);

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

  async function validarCupom(codigo) {
    const code = (codigo || '').trim();
    setCupomErro('');
    setCupomAplicado(false);
    if (!code) return true;

    setValidandoCupom(true);
    try {
      // Tenta em tabelas/colunas comuns. Se não existir, trata como inválido.
      const tentativas = [
        { table: 'coupons', column: 'codigo' },
        { table: 'cupons', column: 'codigo' },
        { table: 'coupons', column: 'code' },
        { table: 'cupons', column: 'code' },
      ];

      for (const t of tentativas) {
        const { data, error } = await supabase
          .from(t.table)
          .select('*')
          .eq(t.column, code)
          .limit(1);

        if (error) {
          continue;
        }

        if (Array.isArray(data) && data.length > 0) {
          setCupomErro('');
          setCupomAplicado(true);
          return true;
        }

        // tabela existe, mas não encontrou
        setCupomErro('Cumpom de desconto Inválido');
        return false;
      }

      setCupomErro('Cumpom de desconto Inválido');
      return false;
    } finally {
      setValidandoCupom(false);
    }
  }

  function handleAplicarCupom() {
    // eslint-disable-next-line no-void
    void validarCupom(cupom);
  }

  function handleConfirmar() {
    if (!hasItems) return;

    // Validar endereço se for entrega
    if (tipo === 'delivery') {
      if (!rua.trim() || !numero.trim() || !bairro.trim()) {
        setEnderecoModal('Por favor, preencha Rua, Número e Bairro.');
        return;
      }
    }

    // Cupom só valida ao clicar em "Aplicar cupom".
    navigate("/pagamento", { state: { tipo, endereco: enderecoCompleto, totalFinal, items } });
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
              navigate('/carrinho');
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
          Finalizar Pedido
        </h2>
      </div>

      <p style={{
        margin: '0 0 22px 0',
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 300,
        color: '#666'
      }}>
        {user?.nome ? `Olá, ${user.nome}.` : 'Revise seu pedido antes de pagar.'}
      </p>

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

        {items.length === 0 ? (
          <p style={{
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 300,
            color: '#666'
          }}>
            Seu carrinho está vazio.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 0',
                  borderBottom: '1px solid #f5f5f5'
                }}
              >
                <div style={{
                  minWidth: 64,
                  width: 64,
                  height: 64,
                  borderRadius: 0,
                  backgroundColor: 'transparent',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 28 }}>🍰</span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700,
                    color: '#222',
                    textTransform: 'uppercase'
                  }}>
                    {item.name}
                  </div>

                  {Array.isArray(item.itens) && item.itens.length > 0 && (
                    <div style={{
                      marginTop: 4,
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 300,
                      color: '#666',
                      fontSize: 14,
                      lineHeight: 1.4
                    }}>
                      {item.itens.join(' • ')}
                    </div>
                  )}

                  <div style={{
                    marginTop: 6,
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 300,
                    color: '#666',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'baseline'
                  }}>
                    <span>{item.qty}x</span>
                    <span>R$ {formatCurrency(item.price)}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 400, color: '#444' }}>
                      R$ {formatCurrency((Number(item.price || 0) * Number(item.qty || 0)))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entrega/retirada */}
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
          Como você vai receber
        </h3>

        <label style={{
          display: 'block',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 300,
          color: '#666',
          marginBottom: 8
        }}>
          Tipo
        </label>

        {/* Select customizado para aplicar CSS também na lista */}
        <div ref={tipoMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setTipoMenuAberto(v => !v)}
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
            aria-expanded={tipoMenuAberto}
          >
            <span>{tipoLabel}</span>
            <span style={{
              position: 'absolute',
              right: 16,
              color: '#666',
              fontSize: 16,
              lineHeight: 1,
              transform: tipoMenuAberto ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▾
            </span>
          </button>

          {tipoMenuAberto && (
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
              {[
                { value: 'estabelecimento', label: 'No Estabelecimento' },
                { value: 'drive-thru', label: 'Drive thru' },
                { value: 'delivery', label: 'Entrega' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTipo(opt.value);
                    setTipoMenuAberto(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 12px',
                    backgroundColor: tipo === opt.value ? 'rgba(0,0,0,0.06)' : '#fff',
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

        {tipo === "delivery" && (
          <div style={{ marginTop: 12 }}>
            <label style={{
              display: 'block',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 300,
              color: '#666',
              marginBottom: 8
            }}>
              Endereço
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
              <input
                placeholder="Rua"
                value={rua}
                onChange={e => setRua(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Número"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                style={inputStyle}
              />
            </div>

            <input
              placeholder="Bairro"
              value={bairro}
              onChange={e => setBairro(e.target.value)}
              style={{ ...inputStyle, marginTop: 12 }}
            />
          </div>
        )}
      </div>

      {/* Extras */}
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
          Extras
        </h3>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 300,
          color: '#666'
        }}>
          <input
            type="checkbox"
            checked={taxaServico}
            onChange={e => setTaxaServico(e.target.checked)}
          />
          Taxa de serviço (10%)
        </label>

        <div style={{ marginTop: 12 }}>
          <label style={{
            display: 'block',
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 300,
            color: '#666',
            marginBottom: 8
          }}>
            Cupom
          </label>
          <input
            placeholder="Cupom de Desconto"
            value={cupom}
            onChange={e => {
              setCupom(e.target.value);
              if (cupomErro) setCupomErro('');
              if (cupomAplicado) setCupomAplicado(false);
            }}
            style={inputStyle}
          />

          <button
            type="button"
            onClick={handleAplicarCupom}
            disabled={validandoCupom || !cupom.trim()}
            style={{
              marginTop: 10,
              width: '100%',
              height: 48,
              backgroundColor: '#fff',
              color: '#111',
              border: '2px solid #111',
              borderRadius: 12,
              cursor: validandoCupom || !cupom.trim() ? 'not-allowed' : 'pointer',
              opacity: validandoCupom || !cupom.trim() ? 0.6 : 1,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 500,
              fontSize: 15
            }}
          >
            Aplicar cupom
          </button>

          {validandoCupom && cupom.trim() && (
            <p style={{
              margin: '8px 0 0 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 300,
              color: '#777',
              fontSize: 13
            }}>
              Validando cupom...
            </p>
          )}

          {cupomErro && (
            <p style={{
              margin: '8px 0 0 0',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              color: '#b71c1c',
              fontSize: 13
            }}>
              {cupomErro}
            </p>
          )}
        </div>
      </div>

      {/* Totais */}
      <div style={{
        border: '1px solid #f0f0f0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#fff'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          color: '#222'
        }}>
          Total
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 8,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 300,
          color: '#666'
        }}>
          <span>Subtotal</span>
          <span>R$ {formatCurrency(total)}</span>

          {tipo === 'delivery' && (
            <>
              <span>Frete</span>
              <span>R$ {formatCurrency(frete)}</span>
            </>
          )}

          <span>Taxa de serviço (10%)</span>
          <span>R$ {formatCurrency(taxa)}</span>

          <span>Desconto</span>
          <span>R$ {formatCurrency(desconto)}</span>

          <span style={{ paddingTop: 10, color: '#222', fontWeight: 500 }}>Total final</span>
          <span style={{ paddingTop: 10, color: '#222', fontWeight: 600 }}>
            <span style={{ fontWeight: 300 }}>R$</span> {formatCurrency(totalFinal)}
          </span>
        </div>
      </div>

      <button
        onClick={handleConfirmar}
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
        Confirmar e Pagar
      </button>

      {enderecoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
          }}
          onClick={() => setEnderecoModal('')}
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
            aria-label="Endereço incompleto"
          >
            <h3
              style={{
                margin: '0 0 8px 0',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                color: '#222'
              }}
            >
              Endereço incompleto
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: '#666'
              }}
            >
              {enderecoModal}
            </p>

            <button
              type="button"
              onClick={() => setEnderecoModal('')}
              style={{
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
              Ok
            </button>
          </div>
        </div>
      )}
    </div>
  );
}