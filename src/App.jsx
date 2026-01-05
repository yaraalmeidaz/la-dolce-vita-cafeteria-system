import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./context/CartContext";
import { PedidosProvider } from "./context/PedidosContext";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cardapio from "./pages/Cardapio";
import Admin from "./pages/Admin";
import Clientes from "./pages/Clientes";
import Pedidos from "./pages/Pedidos";
import Entregas from "./pages/Entregas";
import Checkout from "./pages/Checkout";
import Pagamento from "./pages/Pagamento";
import Status from "./pages/Status";
import MeusPedidos from "./pages/MeusPedidos";
import DashboardLucro from "./pages/DashboardLucro";
import Funcionarios from "./pages/Funcionarios";
import DashboardGestor from "./pages/DashboardGestor";
import { useAuth } from "./auth/AuthContext";
import BottomNav from "./components/BottomNav";
import AdminBottomNav from "./components/AdminBottomNav";
import GestorBottomNav from "./components/GestorBottomNav";
import DadosPessoais from "./pages/DadosPessoais";

export default function App() {
  // Wrapper para proteger rotas
  function ProtectedRoute({ children, allow }) {
    const { user } = useAuth();
    if (!user || (allow && !allow.includes(user.tipo_acesso))) {
      return <div style={{padding: 40, textAlign: 'center'}}>Acesso negado.</div>;
    }
    return children;
  }

  function AppLayout() {
    const { user } = useAuth();
    const location = useLocation();

    useEffect(() => {
      const baseTitle = "La Dolce Vita Caffè & Pasticceria";
      const path = location.pathname;

      const pageName = (() => {
        if (path === "/") return "Início";
        if (path === "/login") return "Login";
        if (path === "/cadastro") return "Cadastro";
        if (path === "/cardapio") return "Cardápio";
        if (path === "/carrinho") return "Carrinho";
        if (path === "/checkout") return "Checkout";
        if (path === "/pagamento") return "Pagamento";
        if (path === "/status") return "Status";
        if (path === "/meus-pedidos") return "Meus pedidos";
        if (path === "/dados-pessoais") return "Dados pessoais";

        if (path === "/admin") return "Admin";
        if (path === "/admin/clientes") return "Admin - Clientes";
        if (path === "/admin/pedidos") return "Admin - Pedidos";
        if (path === "/admin/entregas") return "Admin - Entregas";
        if (path === "/admin/dashboard-lucro") return "Admin - Relatório de lucro";
        if (path === "/admin/funcionarios") return "Admin - Funcionários";
        if (path === "/admin/dashboard-gestor") return "Admin - Dashboard";

        if (path.startsWith("/admin")) return "Admin";
        return "Página";
      })();

      document.title = `${baseTitle} | ${pageName}`;
    }, [location.pathname]);

    const hideNav =
      location.pathname === "/" ||
      location.pathname === "/login" ||
      location.pathname === "/cadastro" ||
      false;

    const isAdminArea = location.pathname.startsWith("/admin");
    const isDadosPessoais = location.pathname.startsWith("/dados-pessoais");

    const showClientNav = Boolean(user && user.role === "cliente" && !hideNav && !isAdminArea);
    const showGestorNav = Boolean(user && user.tipo_acesso === "gestor" && !hideNav && isAdminArea);
    const showAdminNav = Boolean(
      user &&
        ["gestor", "comum"].includes(user.tipo_acesso) &&
        !hideNav &&
        (isDadosPessoais || (isAdminArea && user.tipo_acesso !== "gestor"))
    );

    const showAnyNav = showClientNav || showGestorNav || showAdminNav;

    return (
      <div style={{ paddingBottom: showAnyNav ? "calc(68px + env(safe-area-inset-bottom))" : 0 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/cardapio" element={<Cardapio />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pagamento" element={<Pagamento />} />
          <Route path="/status" element={<Status />} />
          <Route path="/meus-pedidos" element={<MeusPedidos />} />
          <Route
            path="/dados-pessoais"
            element={<ProtectedRoute><DadosPessoais /></ProtectedRoute>}
          />
          <Route path="/admin" element={<ProtectedRoute allow={['gestor','comum']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/clientes" element={<ProtectedRoute allow={['gestor','comum']}><Clientes /></ProtectedRoute>} />
          <Route path="/admin/pedidos" element={<ProtectedRoute allow={['gestor','comum']}><Pedidos /></ProtectedRoute>} />
          <Route path="/admin/entregas" element={<ProtectedRoute allow={['gestor','comum']}><Entregas /></ProtectedRoute>} />
          <Route path="/admin/dashboard-lucro" element={<ProtectedRoute allow={['gestor']}><DashboardLucro /></ProtectedRoute>} />
          <Route path="/admin/funcionarios" element={<ProtectedRoute allow={['gestor']}><Funcionarios /></ProtectedRoute>} />
          <Route path="/admin/dashboard-gestor" element={<ProtectedRoute allow={['gestor']}><DashboardGestor /></ProtectedRoute>} />
        </Routes>

        {showClientNav && <BottomNav />}
        {showGestorNav && <GestorBottomNav />}
        {showAdminNav && <AdminBottomNav />}
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <PedidosProvider>
          <CartProvider>
            <AppLayout />
          </CartProvider>
        </PedidosProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
