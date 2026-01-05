import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../services/supabase";
import home1 from "../assets/home1.png";
import home2 from "../assets/home2.png";
import home3 from "../assets/home3.png";
import home4 from "../assets/home4.png";
import home5 from "../assets/home5.png";
import home6 from "../assets/home6.png";

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasPedidosAbertos, setHasPedidosAbertos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imagemAtual, setImagemAtual] = useState(0);

  const imagens = [home1, home2, home3, home4, home5, home6];

  useEffect(() => {
    if (user) {
      checkPedidosAbertos();
      return;
    }

    setLoading(false);
  }, [user]);

  // Carrossel automático
  useEffect(() => {
    const interval = setInterval(() => {
      setImagemAtual((prev) => (prev + 1) % imagens.length);
    }, 6000); // Muda a cada 6 segundos

    return () => clearInterval(interval);
  }, [imagens.length]);

  async function checkPedidosAbertos() {
    const { data: pedidosAbertos } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .neq('status', 'entregue');

    setHasPedidosAbertos(pedidosAbertos && pedidosAbertos.length > 0);
    setLoading(false);
  }

  function handleContinuar() {
    if (user && user.tipo_acesso === 'gestor') {
      navigate("/admin/dashboard-lucro");
    } else if (user && user.tipo_acesso === 'comum') {
      navigate("/admin/pedidos");
    } else if (user && user.role === 'cliente') {
      navigate("/cardapio");
    } else if (hasPedidosAbertos) {
      navigate("/meus-pedidos");
    } else {
      navigate("/cardapio");
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', minHeight: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      {/* Carrossel de imagens */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0, padding: 0, zIndex: 1 }}>
        {imagens.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`Home ${index + 1}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imagemAtual === index ? 1 : 0,
              transition: 'opacity 1s ease-in-out'
            }}
          />
        ))}
      </div>

      {/* Overlay escuro para melhor legibilidade do texto */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 2
      }} />

      {/* Conteúdo por cima da imagem */}
      <div style={{
        position: 'absolute',
        top: 'clamp(14px, 4vw, 30px)',
        left: 'clamp(14px, 4vw, 30px)',
        textAlign: 'left',
        color: 'white',
        zIndex: 3,
        maxWidth: 'min(1200px, 92vw)'
      }}>
        <h1 style={{ 
          fontSize: 'clamp(2.6rem, 10vw, 10rem)', 
          marginBottom: '1.5rem', 
          textShadow: 'none',
          fontFamily: "'League Spartan', sans-serif",
          fontWeight: 900,
          lineHeight: 0.85,
          textTransform: 'uppercase',
          letterSpacing: '-0.035em',
          margin: 0,
          whiteSpace: 'normal'
        }}>
          La Dolce Vita
        </h1>
        <h1 style={{ 
          fontSize: 'clamp(2.6rem, 10vw, 10rem)', 
          marginBottom: '1.5rem', 
          textShadow: 'none',
          fontFamily: "'League Spartan', sans-serif",
          fontWeight: 900,
          lineHeight: 0.85,
          textTransform: 'uppercase',
          letterSpacing: '-0.035em',
          margin: 0,
          whiteSpace: 'normal'
        }}>
          Caffè
        </h1>
        <h1 style={{ 
          fontSize: 'clamp(2.6rem, 10vw, 10rem)', 
          marginBottom: '0.5rem', 
          textShadow: 'none',
          fontFamily: "'League Spartan', sans-serif",
          fontWeight: 900,
          lineHeight: 0.85,
          textTransform: 'uppercase',
          letterSpacing: '-0.035em',
          margin: 0,
          whiteSpace: 'normal'
        }}>
          & Pasticceria
        </h1>
        <p style={{ 
          fontSize: 'clamp(1.0rem, 2.2vw, 1.5rem)', 
          marginTop: '2rem',
          marginBottom: '0.8rem', 
          textShadow: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontWeight: 700,
          fontFamily: "'Montserrat', sans-serif",
          whiteSpace: 'normal'
        }}>
          MAIS NOVA DELÍCIA!
        </p>
        <p style={{ 
          fontSize: 'clamp(0.9rem, 1.6vw, 1.1rem)', 
          textShadow: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontFamily: "'Montserrat', sans-serif",
          maxWidth: 'min(600px, 92vw)',
          lineHeight: 1.4,
          fontWeight: 400,
          whiteSpace: 'normal'
        }}>
          VOCÊ PRECISA CONHECER A MELHOR CAFETERIA DA CIDADE
        </p>
      </div>

      {user ? (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 3 }}>
          <p style={{ 
            fontSize: 'clamp(1.0rem, 2.2vw, 1.5rem)',
            marginBottom: '0.8rem',
            color: 'white',
            textShadow: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontWeight: 700,
            fontFamily: "'Montserrat', sans-serif",
            whiteSpace: 'normal'
          }}>Bem-vindo de volta, {user.nome}!</p>
          {hasPedidosAbertos && (
            <p style={{ 
              fontSize: 'clamp(0.9rem, 1.6vw, 1.1rem)',
              color: 'white',
              textShadow: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              fontFamily: "'Montserrat', sans-serif",
              lineHeight: 1.4,
              fontWeight: 700,
              whiteSpace: 'normal',
              margin: 0
            }}>Você tem pedidos em andamento.</p>
          )}
        </div>
      ) : null}

      {/* Botões continuar/sair - sempre na parte inferior quando logado */}
      {user && (
        <div style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 96px)', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center', zIndex: 3, width: 'min(620px, 92vw)' }}>
          <button onClick={handleContinuar} style={{
            width: '100%',
            height: '56px',
            padding: '0 24px',
            fontSize: '1.1rem',
            backgroundColor: 'transparent',
            color: 'white',
            border: '3px solid white',
            borderRadius: '50px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '2px',
            transition: 'all 0.3s ease',
            fontFamily: "'Montserrat', sans-serif",
            textAlign: 'center'
          }}>
            Continuar
          </button>

          <button onClick={handleLogout} style={{
            width: '100%',
            height: '56px',
            padding: '0 24px',
            fontSize: '1.1rem',
            backgroundColor: 'transparent',
            color: 'white',
            border: '3px solid white',
            borderRadius: '50px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '2px',
            transition: 'all 0.3s ease',
            fontFamily: "'Montserrat', sans-serif",
            textAlign: 'center'
          }}>
            Sair
          </button>
        </div>
      )}
      
      {/* Botões de cadastro/login - sempre na parte inferior */}
      {!user && (
        <div style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 96px)', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center', zIndex: 3, width: 'min(620px, 92vw)' }}>
          <Link to="/cadastro" style={{ textDecoration: 'none', flex: 1 }}>
            <button style={{
              width: '100%',
              height: '56px',
              padding: '0 24px',
              fontSize: '1.1rem',
              backgroundColor: 'transparent',
              color: 'white',
              border: '3px solid white',
              borderRadius: '50px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '2px',
              transition: 'all 0.3s ease',
              fontFamily: "'Montserrat', sans-serif",
              textAlign: 'center'
            }}>Cadastre-se</button>
          </Link>
          <Link to="/login" style={{ textDecoration: 'none', flex: 1 }}>
            <button style={{
              width: '100%',
              height: '56px',
              padding: '0 24px',
              fontSize: '1.1rem',
              backgroundColor: 'transparent',
              color: 'white',
              border: '3px solid white',
              borderRadius: '50px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '2px',
              transition: 'all 0.3s ease',
              fontFamily: "'Montserrat', sans-serif",
              textAlign: 'center'
            }}>Login</button>
          </Link>
        </div>
      )}
      
      {/* Indicadores do carrossel - sempre na parte inferior */}
      {!user && (
        <div style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 32px)', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', zIndex: 3 }}>
          {imagens.map((_, index) => (
            <div
              key={index}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: imagemAtual === index ? 'white' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setImagemAtual(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
