import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca]);

  async function loadClientes() {
    const { data, error } = await supabase
      .from('users')
      .select('nome, email, telefone, created_at')
      .eq('role', 'cliente')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClientes(data);
    }
  }

  const clientesFiltrados = clientes.filter(c => {
    if (!buscaDebounced.trim()) return true;
    const termo = buscaDebounced.toLowerCase().trim();
    return (
      c.nome.toLowerCase().includes(termo) ||
      c.email.toLowerCase().includes(termo) ||
      c.telefone.includes(termo)
    );
  });

  return (
    <div>
      <h2>Clientes Cadastrados</h2>

      <input
        type="text"
        placeholder="Buscar por nome, email ou telefone..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ marginBottom: 20, padding: 8, width: '100%' }}
      />

      {clientesFiltrados.map((c, index) => (
        <div key={index} style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}>
          <p><strong>Nome:</strong> {c.nome}</p>
          <p><strong>Email:</strong> {c.email}</p>
          <p><strong>Telefone:</strong> {c.telefone}</p>
          <p><strong>Cadastrado em:</strong> {new Date(c.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}