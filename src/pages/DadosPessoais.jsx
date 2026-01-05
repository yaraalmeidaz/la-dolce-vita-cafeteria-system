import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../auth/AuthContext";

export default function DadosPessoais() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [nome, setNome] = useState(user?.nome || "");
  const [email, setEmail] = useState(user?.email || "");
  const [telefone, setTelefone] = useState(user?.telefone || "");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingSenha, setSavingSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState("");

  const inputStyle = useMemo(
    () => ({
      width: "100%",
      height: 48,
      borderRadius: 10,
      border: "1px solid #ddd",
      padding: "0 12px",
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 400,
      color: "#222",
      backgroundColor: "#fff",
      outline: "none",
      boxSizing: "border-box",
    }),
    []
  );

  async function handleSalvar() {
    setMsg("");

    if (!user?.id) {
      setMsg("Você precisa estar logado para editar seus dados.");
      return;
    }

    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      setMsg("Preencha nome, email e telefone.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
        })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) {
        setMsg("Não foi possível salvar. Tente novamente.");
        return;
      }

      if (data) {
        setUser({ ...user, ...data });
      }

      setMsg("Dados atualizados com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAlterarSenha() {
    setMsgSenha("");

    if (!user?.id) {
      setMsgSenha("Você precisa estar logado para alterar sua senha.");
      return;
    }

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setMsgSenha("Preencha senha atual, nova senha e confirmar senha.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMsgSenha("A nova senha e a confirmação não conferem.");
      return;
    }

    setSavingSenha(true);
    try {
      const { data: valida, error: validaError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .eq("senha", senhaAtual)
        .single();

      if (validaError || !valida) {
        setMsgSenha("Senha atual incorreta.");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .update({ senha: novaSenha })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) {
        setMsgSenha("Não foi possível alterar a senha. Tente novamente.");
        return;
      }

      if (data) {
        setUser({ ...user, ...data });
      }

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setMsgSenha("Senha alterada com sucesso.");
    } finally {
      setSavingSenha(false);
    }
  }

  if (!user) {
    return (
      <div style={{ padding: 16, paddingBottom: 96, maxWidth: 820, margin: "0 auto" }}>
        <h2
          style={{
            margin: "0 0 18px 0",
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 600,
            color: "#222",
          }}
        >
          Dados pessoais
        </h2>

        <div
          style={{
            border: "1px solid #f0f0f0",
            borderRadius: 12,
            padding: 16,
            backgroundColor: "#fff",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 300,
              color: "#666",
            }}
          >
            Faça login para editar seus dados.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              marginTop: 14,
              width: "100%",
              height: 52,
              backgroundColor: "#000",
              color: "#fff",
              border: "2px solid #000",
              borderRadius: 12,
              cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, paddingBottom: 96, maxWidth: 820, margin: "0 auto" }}>
      <h2
        style={{
          margin: "0 0 18px 0",
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          color: "#222",
        }}
      >
        Dados pessoais
      </h2>

      <div
        style={{
          border: "1px solid #f0f0f0",
          borderRadius: 12,
          padding: 16,
          backgroundColor: "#fff",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: "#666",
                marginBottom: 8,
              }}
            >
              Nome
            </label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: "#666",
                marginBottom: 8,
              }}
            >
              Email
            </label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: "#666",
                marginBottom: 8,
              }}
            >
              Telefone
            </label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} />
          </div>

          {msg && (
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 12,
                padding: 12,
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: "#444",
                backgroundColor: "#fff",
              }}
            >
              {msg}
            </div>
          )}

          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving}
            style={{
              width: "100%",
              height: 56,
              backgroundColor: "#000",
              color: "#fff",
              border: "2px solid #000",
              borderRadius: 12,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 16,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #f0f0f0",
          borderRadius: 12,
          padding: 16,
          backgroundColor: "#fff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3
            style={{
              margin: "0 0 4px 0",
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              color: "#222",
              fontSize: 18,
            }}
          >
            Alterar senha
          </h3>

          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: "#666",
                marginBottom: 8,
              }}
            >
              Senha atual
            </label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: "#666",
                marginBottom: 8,
              }}
            >
              Nova senha
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: "#666",
                marginBottom: 8,
              }}
            >
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>

          {msgSenha && (
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 12,
                padding: 12,
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 300,
                color: "#444",
                backgroundColor: "#fff",
              }}
            >
              {msgSenha}
            </div>
          )}

          <button
            type="button"
            onClick={handleAlterarSenha}
            disabled={savingSenha}
            style={{
              width: "100%",
              height: 56,
              backgroundColor: "#000",
              color: "#fff",
              border: "2px solid #000",
              borderRadius: 12,
              cursor: savingSenha ? "not-allowed" : "pointer",
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 16,
              opacity: savingSenha ? 0.7 : 1,
            }}
          >
            {savingSenha ? "Alterando..." : "Alterar senha"}
          </button>
        </div>
      </div>
    </div>
  );
}
