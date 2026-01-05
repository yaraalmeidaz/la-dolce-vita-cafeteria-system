import { useCart } from "../context/CartContext";

export default function CartItem({ item, onDecrease }) {
  const { increase, decrease } = useCart();

  const descricao = item.description || item.descricao || "";
  const itensDoCombo = Array.isArray(item.itens) ? item.itens : null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '20px',
      padding: '20px 0',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <div style={{
        minWidth: '120px',
        width: '120px',
        height: '120px',
        backgroundColor: 'transparent',
        borderRadius: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '40px' }}>🍰</span>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{
          margin: '0 0 8px 0',
          fontFamily: "'Montserrat', sans-serif",
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#222',
          textTransform: 'uppercase'
        }}>
          {item.name}
        </h3>

        {descricao && (
          <p style={{
            margin: '0 0 10px 0',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.95rem',
            fontWeight: 300,
            color: '#666',
            lineHeight: '1.5'
          }}>
            {descricao}
          </p>
        )}

        {itensDoCombo && itensDoCombo.length > 0 && (
          <p style={{
            margin: '0 0 10px 0',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 300,
            color: '#666',
            lineHeight: '1.5'
          }}>
            {itensDoCombo.join(' • ')}
          </p>
        )}

        <p style={{
          margin: 0,
          fontFamily: "'Montserrat', sans-serif",
          fontSize: '1.05rem',
          color: '#222'
        }}>
          <span style={{ fontWeight: 300 }}>R$</span>{' '}
          <span style={{ fontWeight: 300 }}>
            {Number(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </p>

      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', alignSelf: 'center' }}>
        <button
          onClick={() => {
            if (typeof onDecrease === 'function') {
              onDecrease(item);
              return;
            }
            decrease(item.id);
          }}
          style={{
            minWidth: '40px',
            width: '40px',
            height: '50px',
            backgroundColor: 'transparent',
            color: '#999',
            border: 'none',
            cursor: 'pointer',
            fontSize: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 300
          }}
          aria-label={`Diminuir ${item.name}`}
        >
          −
        </button>

        <span style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: '1.1rem',
          fontWeight: 600,
          minWidth: '30px',
          textAlign: 'center',
          color: '#333',
          userSelect: 'none'
        }}>
          {item.qty}
        </span>

        <button
          onClick={() => increase(item.id)}
          style={{
            minWidth: '40px',
            width: '40px',
            height: '50px',
            backgroundColor: 'transparent',
            color: '#999',
            border: 'none',
            cursor: 'pointer',
            fontSize: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 300
          }}
          aria-label={`Aumentar ${item.name}`}
        >
          ＋
        </button>
      </div>
    </div>
  );
}
