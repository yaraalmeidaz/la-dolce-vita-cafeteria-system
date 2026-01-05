import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { usePedidos } from "../context/PedidosContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import home4 from "../assets/home4.png";

export default function Login() {
  const { login } = useAuth();
  const { pedidos } = usePedidos();
  const navigate = useNavigate();

  const [loginValue, setLoginValue] = useState("");
  const [senha, setSenha] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const result = await login(loginValue, senha);

    if (!result.ok) {
      alert("Dados inválidos");
      return;
    }

    // Redirecionamento conforme tipo_acesso
    if (result.tipo_acesso === "gestor") {
      navigate("/admin/dashboard-lucro");
    } else if (result.tipo_acesso === "comum") {
      navigate("/admin/pedidos");
    } else {
      // Cliente
      navigate("/cardapio");
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Imagem de fundo */}
      <img
        src={home4}
        alt="Background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1
        }}
      />
      
      {/* Overlay escuro */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2
      }} />
      
      {/* Conteúdo (centraliza e permite scroll no celular) */}
      <div style={{
        position: 'relative',
        zIndex: 3,
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(18px, 6vw, 40px)'
      }}>
        <div style={{
          width: 'min(92vw, 450px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: 'clamp(18px, 7vw, 50px) clamp(16px, 7vw, 60px)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
        <h2 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 'clamp(1.6rem, 4.5vw, 2rem)',
          fontWeight: 900,
          textAlign: 'center',
          marginBottom: '30px',
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>Login</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <input
            placeholder="Email ou telefone"
            value={loginValue}
            onChange={e => setLoginValue(e.target.value)}
            style={{
              padding: '14px 18px',
              fontSize: '1rem',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              outline: 'none',
              transition: 'all 0.3s ease',
              fontFamily: "'Montserrat', sans-serif"
            }}
            onFocus={(e) => e.target.style.borderColor = '#2c5aa0'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            style={{
              padding: '14px 18px',
              fontSize: '1rem',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              outline: 'none',
              transition: 'all 0.3s ease',
              fontFamily: "'Montserrat', sans-serif"
            }}
            onFocus={(e) => e.target.style.borderColor = '#2c5aa0'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />

          <button 
            style={{
              padding: '16px',
              fontSize: '1rem',
              fontWeight: 700,
              backgroundColor: '#1a1a1a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: "'Montserrat', sans-serif",
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#333'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#1a1a1a'}
          >Entrar</button>
        </form>
        
        <p style={{
          textAlign: 'center',
          marginTop: '25px',
          fontSize: 'clamp(0.9rem, 2.5vw, 0.95rem)',
          color: '#666',
          fontFamily: "'Montserrat', sans-serif"
        }}>
          Não tem uma conta? <Link to="/cadastro" style={{ color: '#2c5aa0', fontWeight: 600, textDecoration: 'none' }}>Cadastre-se</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
