import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Entregas() {
  const [entregas, setEntregas] = useState([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    loadEntregasDoDia();
  }, []);

  async function loadEntregasDoDia() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users (nome, telefone)
      `)
      .eq('tipo', 'delivery')
      .gte('created_at', hoje + ' 00:00:00')
      .lte('created_at', hoje + ' 23:59:59')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEntregas(data);
    }
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setEntregas(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    }
  }

  const entregasFiltradas = entregas.filter(p =>
    p.users?.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigo.includes(busca) ||
    p.endereco?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <h2>Entregas</h2>

      <input
        type="text"
        placeholder="Buscar por nome, código ou endereço..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ marginBottom: 20, padding: 8, width: '100%' }}
      />

      {entregasFiltradas.map(p => (
        <div key={p.id} style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}>
          <p>Código: {p.codigo}</p>
          <p>Nome: {p.users?.nome}</p>
          <p>Telefone: {p.users?.telefone}</p>
          <p>Endereço: {p.endereco}</p>
          <p>Status: {p.status}</p>
          <p>Total: <span style={{ fontWeight: 300 }}>R$</span> {p.total.toFixed(2)}</p>

          {p.status === "preparacao" && (
            <button onClick={() => updateStatus(p.id, "a_caminho")}>
              Pedido a Caminho
            </button>
          )}

          {p.status === "a_caminho" && (
            <button onClick={() => updateStatus(p.id, "entregue")}>
              Pedido Entregue
            </button>
          )}
        </div>
      ))}
    </div>
  );
}