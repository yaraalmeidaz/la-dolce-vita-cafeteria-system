import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div>
      <h2>Painel do Funcionário</h2>

      <button onClick={() => navigate("/admin/clientes")}>Clientes</button>
      <button onClick={() => navigate("/admin/pedidos")}>Pedidos</button>
      <button onClick={() => navigate("/admin/entregas")}>Entregas</button>

      {user?.tipo_acesso === 'gestor' && (
        <>
          <h3>Acesso Gestor</h3>
          <button onClick={() => navigate("/admin/dashboard-lucro")}>Dashboard de Lucro</button>
          <button onClick={() => navigate("/admin/funcionarios")}>Funcionários e Salários</button>
          <button onClick={() => navigate("/admin/dashboard-gestor")}>Dashboard Completo do Gestor</button>
        </>
      )}
    </div>
  );
}
