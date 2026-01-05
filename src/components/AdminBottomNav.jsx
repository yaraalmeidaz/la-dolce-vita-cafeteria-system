import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function IconHome({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10.5V21h13V10.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 21a8 8 0 10-16 0" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLogout({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10 7V5a2 2 0 012-2h7a2 2 0 012 2v14a2 2 0 01-2 2h-7a2 2 0 01-2-2v-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M7 8l-4 4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const items = useMemo(
    () => {
      const homePath = user?.tipo_acesso === "gestor" ? "/admin/dashboard-lucro" : "/admin/pedidos";
      return [
        { key: "inicio", label: "Início", path: homePath },
      { key: "dados", label: "Dados pessoais", path: "/dados-pessoais" },
      { key: "sair", label: "Sair", action: "logout" },
      ];
    },
    [user?.tipo_acesso]
  );

  const activeKey = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/dados-pessoais")) return "dados";
    if (p.startsWith("/admin")) return "inicio";
    return null;
  }, [location.pathname]);

  function handleClick(item) {
    if (item.action === "logout") {
      setShowLogoutModal(true);
      return;
    }

    if (item.path) {
      navigate(item.path);
    }
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
    setShowLogoutModal(false);
  }

  return (
    <>
      <nav
        className="bottom-nav"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#fff",
          borderTop: "1px solid #eee",
          paddingTop: 10,
          paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
          zIndex: 60,
          overflowX: "hidden",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        aria-label="Navegação"
      >
        <style>{`
          .bottom-nav::-webkit-scrollbar {
            display: none;
          }

          .bottom-nav__inner {
            max-width: 820px;
            margin: 0 auto;
            padding-left: 12px;
            padding-right: 12px;
            display: flex;
            justify-content: space-between;
            gap: 0px;
          }

          .bottom-nav__btn {
            flex: 1 1 0;
            min-width: 0;
            height: 48px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            font-size: 12px;
            line-height: 1.1;
            padding: 6px 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            position: relative;
            transition: all 0.2s ease;
          }

          .bottom-nav__label {
            display: block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          @media (max-width: 420px) {
            .bottom-nav__btn {
              font-size: 11px;
              padding: 6px 6px;
            }
          }
        `}</style>
        <div
          className="bottom-nav__inner"
        >
          {items.map((item) => {
            const isActive = activeKey === item.key;
            const color = isActive ? "#000" : "#999";
            const icon =
              item.key === "inicio" ? (
                <IconHome color={color} />
              ) : item.key === "dados" ? (
                <IconUser color={color} />
              ) : (
                <IconLogout color={color} />
              );

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleClick(item)}
                className="bottom-nav__btn"
                style={{
                  color,
                  fontWeight: isActive ? 500 : 400,
                  borderBottom: isActive ? "3px solid #000" : "3px solid transparent",
                }}
                aria-current={isActive ? "page" : undefined}
              >
                {icon}
                <span className="bottom-nav__label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showLogoutModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 24,
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.18)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 12px 0",
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: "#000",
                textAlign: "center",
              }}
            >
              Deseja sair da sua conta?
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 14,
                fontWeight: 400,
                color: "rgba(0, 0, 0, 0.62)",
                textAlign: "center",
              }}
            >
              Você precisará fazer login novamente para acessar sua conta.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: "#000",
                  color: "#fff",
                  border: "1px solid #000",
                  padding: "12px 24px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "'Montserrat', sans-serif",
                  minWidth: 120,
                }}
              >
                Sair
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  backgroundColor: "#fff",
                  color: "#000",
                  border: "1px solid rgba(0, 0, 0, 0.22)",
                  padding: "12px 24px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "'Montserrat', sans-serif",
                  minWidth: 120,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
