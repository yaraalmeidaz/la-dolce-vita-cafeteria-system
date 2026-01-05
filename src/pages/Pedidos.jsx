import { usePedidos } from "../context/PedidosContext";
import { useState, useEffect } from "react";

export default function Pedidos() {
  const { pedidos, updateStatus } = usePedidos();
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState("estabelecimento");

  const hojeLabel = new Date().toLocaleDateString('pt-BR');

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
    }, 300); // 300ms de delay

    return () => clearTimeout(timer);
  }, [busca]);

  const normalizeTipo = (tipo) => {
    const v = String(tipo || "").trim().toLowerCase();
    if (!v || v === "balcao" || v === "balcão") return "estabelecimento";
    if (v === "drive" || v === "drive thru" || v === "drive-thru") return "drive-thru";
    if (v === "entrega" || v === "delivery") return "delivery";
    return v;
  };

  const tipoLabel = (tipo) => {
    if (tipo === "estabelecimento") return "Estabelecimento";
    if (tipo === "drive-thru") return "Drive-thru";
    return "Delivery";
  };

  const pedidosDoTipo = (pedidos || []).filter(p => normalizeTipo(p.tipo) === tipoSelecionado);

  const statusTexto = (status, tipo) => {
    const t = normalizeTipo(tipo);
    switch (status) {
      case "enviado":
        return "Enviado";
      case "confirmado":
        return "Confirmado";
      case "andamento":
        // compatibilidade com status antigos
        return "Em Preparação";
      case "preparacao":
        return "Em Preparação";
      case "pronto":
        if (t === "estabelecimento") return "Disponível para retirada no balcão";
        if (t === "drive-thru") return "Pronto para Retirada";
        return "Pronto";
      case "a_caminho":
        return "A caminho";
      case "entregue":
        return "Chegou";
      case "chegou":
        // compatibilidade com status antigos
        return "Chegou";
      case "retirado":
        return "Finalizado";
      default:
        return "Status desconhecido";
    }
  };

  const getNextStep = (status, tipo) => {
    const t = normalizeTipo(tipo);
    if (status === "enviado") return { next: "confirmado", label: "Confirmar" };
    if (status === "confirmado") return { next: "preparacao", label: "Em preparação" };
    if (status === "andamento") return t === "delivery"
      ? { next: "a_caminho", label: "A caminho" }
      : { next: "pronto", label: "Pronto" };
    if (status === "preparacao") return t === "delivery"
      ? { next: "a_caminho", label: "A caminho" }
      : { next: "pronto", label: "Pronto" };
    if (status === "pronto") return { next: "retirado", label: "Confirmar retirada" };
    if (status === "a_caminho") return { next: "entregue", label: "Chegou" };
    return null;
  };

  const handleAvancar = (id, next) => updateStatus(id, next);

  const novos = pedidosDoTipo.filter(p => ["enviado", "confirmado"].includes(p.status));
  const emPreparacao = pedidosDoTipo.filter(p => ["preparacao", "andamento"].includes(p.status));
  const emFinalizacao = pedidosDoTipo.filter(p => ["pronto", "a_caminho"].includes(p.status));
  const finalizados = pedidosDoTipo.filter(p => ["entregue", "chegou", "retirado"].includes(p.status));

  const renderPedido = (p, acao) => {
    const tipo = normalizeTipo(p.tipo);
    const total = Number(p.total || 0);

    return (
      <div
        key={p.id}
        style={{
          border: "1px solid #e9e9e9",
          borderRadius: 14,
          padding: 14,
          background: "#fff"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              color: "#111",
              textTransform: "uppercase",
              letterSpacing: 0.3
            }}>
              {p.nome}
            </div>

            <div style={{
              marginTop: 6,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 300,
              color: "#666",
              display: "flex",
              flexWrap: "wrap",
              gap: 10
            }}>
              <span>Código: <span style={{ fontWeight: 600, color: "#222" }}>{p.codigo}</span></span>
              <span>•</span>
              <span>Tipo: <span style={{ fontWeight: 500, color: "#222" }}>{tipoLabel(tipo)}</span></span>
              <span>•</span>
              <span>Status: <span style={{ fontWeight: 500, color: "#222" }}>{statusTexto(p.status, tipo)}</span></span>
              {p.telefone ? (<><span>•</span><span>Tel: <span style={{ fontWeight: 500, color: "#222" }}>{p.telefone}</span></span></>) : null}
            </div>
          </div>

          <div style={{
            fontFamily: "'Montserrat', sans-serif",
            color: "#111",
            fontWeight: 600,
            whiteSpace: "nowrap"
          }}>
            <span style={{ fontWeight: 300 }}>R$</span> {total.toFixed(2)}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {acao}
        </div>
      </div>
    );
  };

  const pedidosFiltrados = (lista) => {
    if (!buscaDebounced.trim()) return lista;
    const termo = buscaDebounced.toLowerCase().trim();
    return lista.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      p.codigo.toLowerCase().includes(termo) ||
      p.tipo.toLowerCase().includes(termo) ||
      (p.telefone && p.telefone.includes(termo)) ||
      (p.email && p.email.toLowerCase().includes(termo))
    );
  };

  return (
    <div style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', margin: '6px 0 8px 0' }}>
        <h2 style={{
          margin: 0,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 900,
          color: "#111",
          letterSpacing: 0.2
        }}>
          Pedidos
        </h2>

        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          fontSize: 14,
          color: '#666',
          whiteSpace: 'nowrap'
        }}>
          Hoje • {hojeLabel}
        </div>
      </div>

      <div style={{
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 300,
        color: "#666",
        marginBottom: 14
      }}>
        Pedidos no {tipoLabel(tipoSelecionado)}
      </div>

      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 14
      }}>
        {[
          { key: "estabelecimento", label: "Estabelecimento" },
          { key: "drive-thru", label: "Drive-thru" },
          { key: "delivery", label: "Delivery" },
        ].map(t => {
          const active = tipoSelecionado === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTipoSelecionado(t.key)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: active ? "2px solid #111" : "1px solid #e5e5e5",
                background: active ? "#111" : "#fff",
                color: active ? "#fff" : "#111",
                cursor: "pointer",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        placeholder="Buscar por nome, código, tipo, telefone ou email..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{
          marginBottom: 18,
          padding: 12,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          borderRadius: 12,
          border: "1px solid #e5e5e5",
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 400,
          outline: "none"
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h3 style={{ margin: "0 0 10px 0", fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: "#111" }}>
            Novos
          </h3>
          {pedidosFiltrados(novos).length === 0 ? (
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, color: "#666" }}>Nenhum pedido novo</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pedidosFiltrados(novos).map(p => {
                const step = getNextStep(p.status, p.tipo);
                return renderPedido(
                  p,
                  step ? (
                    <button
                      onClick={() => handleAvancar(p.id, step.next)}
                      style={{
                        background: "#111",
                        color: "#fff",
                        padding: "10px 14px",
                        border: "2px solid #111",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 800
                      }}
                    >
                      {step.label}
                    </button>
                  ) : null
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ margin: "0 0 10px 0", fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: "#111" }}>
            Em preparação
          </h3>
          {pedidosFiltrados(emPreparacao).length === 0 ? (
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, color: "#666" }}>Nenhum pedido em preparação</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pedidosFiltrados(emPreparacao).map(p => {
                const step = getNextStep(p.status, p.tipo);
                return renderPedido(
                  p,
                  step ? (
                    <button
                      onClick={() => handleAvancar(p.id, step.next)}
                      style={{
                        background: "#fff",
                        color: "#111",
                        padding: "10px 14px",
                        border: "2px solid #111",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 800
                      }}
                    >
                      {step.label}
                    </button>
                  ) : null
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ margin: "0 0 10px 0", fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: "#111" }}>
            Em finalização
          </h3>
          {pedidosFiltrados(emFinalizacao).length === 0 ? (
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, color: "#666" }}>Nenhum pedido nesta etapa</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pedidosFiltrados(emFinalizacao).map(p => {
                const step = getNextStep(p.status, p.tipo);
                return renderPedido(
                  p,
                  step ? (
                    <button
                      onClick={() => handleAvancar(p.id, step.next)}
                      style={{
                        background: "#111",
                        color: "#fff",
                        padding: "10px 14px",
                        border: "2px solid #111",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 800
                      }}
                    >
                      {step.label}
                    </button>
                  ) : null
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ margin: "0 0 10px 0", fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: "#111" }}>
            Finalizados
          </h3>
          {pedidosFiltrados(finalizados).length === 0 ? (
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, color: "#666" }}>Nenhum pedido finalizado</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pedidosFiltrados(finalizados).map(p =>
                renderPedido(
                  p,
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#666" }}>Concluído</div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}