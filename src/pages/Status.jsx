import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePedidos } from "../context/PedidosContext";

export default function Status() {
  const location = useLocation();
  const { pedidos } = usePedidos();
  const { tipo, codigo, nome } = location.state || {};

  const [notificacao, setNotificacao] = useState("");

  const pedido = pedidos.find(p => p.codigo === codigo);

  useEffect(() => {
    if (pedido) {
      let msg = "";
      if (pedido.status === "pronto") {
        if (tipo === "estabelecimento") {
          msg = "Seu pedido está pronto para retirada!";
        } else if (tipo === "drive-thru") {
          msg = "Seu pedido está pronto para retirada no drive-thru!";
        }
      } else if (pedido.status === "a_caminho") {
        msg = "Seu pedido está a caminho!";
      } else if (pedido.status === "entregue") {
        msg = "Seu pedido foi entregue!";
      }

      if (msg && !notificacao) {
        setNotificacao(msg);
        alert(msg); // Notificação simples
      }
    }
  }, [pedido, tipo, notificacao]);

  const statusTexto = () => {
    if (!pedido) return "Pedido não encontrado";

    switch (pedido.status) {
      case "confirmado":
        return "Pedido Confirmado";
      case "andamento":
        return "Pedido em Andamento";
      case "preparacao":
        return "Pedido em Preparação";
      case "pronto":
        return tipo === "estabelecimento" ? "Aguardando retirada no balcão" : "Pronto";
      case "retirado":
        return "Pedido retirado";
      case "a_caminho":
        return "A Caminho";
      case "entregue":
        return "Entregue";
      default:
        return "Status Desconhecido";
    }
  };

  return (
    <div>
      <h2>Status do Pedido</h2>

      <p>Código: {codigo}</p>
      <p>Nome: {nome}</p>
      <p>Status: {statusTexto()}</p>

      {notificacao && (
        <div style={{ background: "#d4edda", color: "#155724", padding: 10, marginTop: 10 }}>
          <strong>Notificação:</strong> {notificacao}
        </div>
      )}
    </div>
  );
}