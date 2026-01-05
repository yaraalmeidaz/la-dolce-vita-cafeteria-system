import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../auth/AuthContext';

function Funcionarios() {
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscaFuncionario, setBuscaFuncionario] = useState('');
  const [funcionarioDetalheId, setFuncionarioDetalheId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [salarioDraft, setSalarioDraft] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (user?.tipo_acesso === 'gestor') {
      const cacheKey = `funcionarios_cache_${user?.id || 'gestor'}`;
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.data)) {
            setFuncionarios(parsed.data);
            setLoading(false);
          }
        }
      } catch {
        // ignore cache errors
      }

      // Atualiza em background (sem travar a tela)
      carregarFuncionarios({ background: true, cacheKey });
    }
  }, [user]);

  async function carregarFuncionarios({ background = false, cacheKey } = {}) {
    if (!background) setLoading(true);
    setMsg(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFuncionarios(data || []);

      try {
        const key = cacheKey || (user?.id ? `funcionarios_cache_${user.id}` : 'funcionarios_cache_gestor');
        localStorage.setItem(key, JSON.stringify({ data: data || [], savedAt: Date.now() }));
      } catch {
        // ignore cache write errors
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(func) {
    setMsg(null);
    setEditId(func.id);
    setSalarioDraft(String(func.salario ?? ''));
  }

  function cancelEdit() {
    setEditId(null);
    setSalarioDraft('');
  }

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function filtrarFuncionarios(lista) {
    const q = normalizeText(buscaFuncionario);
    if (!q) return lista;
    return (lista || []).filter((f) => {
      const nome = normalizeText(f.nome);
      const email = normalizeText(f.email);
      const cargo = normalizeText(f.cargo);
      const tipo = normalizeText(f.tipo_acesso);
      return nome.includes(q) || email.includes(q) || cargo.includes(q) || tipo.includes(q);
    });
  }

  function formatDateBR(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  }

  function parseSalario(raw) {
    const cleaned = String(raw ?? '')
      .trim()
      .replace(/\s/g, '')
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  async function saveSalario(id) {
    setMsg(null);
    const parsed = parseSalario(salarioDraft);
    if (parsed === null || parsed < 0) {
      setMsg({ type: 'error', text: 'Salário inválido.' });
      return;
    }

    setSavingId(id);
    try {
      const { error } = await supabase
        .from('users')
        .update({ salario: parsed })
        .eq('id', id);

      if (error) throw error;

      setFuncionarios((prev) => {
        const next = prev.map((f) => (f.id === id ? { ...f, salario: parsed } : f));
        try {
          const key = user?.id ? `funcionarios_cache_${user.id}` : 'funcionarios_cache_gestor';
          localStorage.setItem(key, JSON.stringify({ data: next, savedAt: Date.now() }));
        } catch {
          // ignore cache write errors
        }
        return next;
      });
      setMsg({ type: 'success', text: 'Salário atualizado com sucesso.' });
      setEditId(null);
      setSalarioDraft('');
    } catch (e) {
      console.error('Erro ao atualizar salário:', e);
      setMsg({ type: 'error', text: 'Não foi possível atualizar o salário no Supabase.' });
    } finally {
      setSavingId(null);
    }
  }

  if (user?.tipo_acesso !== 'gestor') {
    return <div>Acesso negado. Apenas gestores podem ver esta página.</div>;
  }

  if (loading) {
    return <div>Carregando funcionários...</div>;
  }

  const totalSalarios = funcionarios.reduce((sum, f) => sum + (Number(f.salario) || 0), 0);

  return (
    <div className="funcionarios">
      <div className="page-title">Dados dos funcionários</div>
      <div className="page-sub">Consulte e edite salários dos funcionários.</div>

      {msg && (
        <div className={`msg ${msg.type === 'success' ? 'msg--success' : 'msg--error'}`}>
          {msg.text}
        </div>
      )}

      <section className="card" aria-label="Resumo">
        <div className="total-row">
          <div className="total-label">Total salários mensais</div>
          <div className="total-value"><span className="rs">R$</span> {totalSalarios.toFixed(2)}</div>
        </div>
      </section>

      <section className="card" aria-label="Funcionários">
        <div className="card-head">
          <div className="card-title">Funcionários</div>
          <div className="search-wrap">
            <input
              type="text"
              placeholder="Buscar funcionário..."
              value={buscaFuncionario}
              onChange={(e) => setBuscaFuncionario(e.target.value)}
              className="search-input"
            />
            <span className="search-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
          </div>
        </div>

        <div className="contact-list" role="list">
          {filtrarFuncionarios(funcionarios).length === 0 && (
            <div className="empty">Nenhum funcionário encontrado.</div>
          )}

          {filtrarFuncionarios(funcionarios).map((func) => {
            const aberto = funcionarioDetalheId === func.id;
            const tipoLabel = func.tipo_acesso === 'gestor' ? 'Gestor' : 'Comum';
            const salarioNumber = Number(func.salario) || 0;
            const editing = editId === func.id;

            return (
              <div key={func.id} className="contact-item" role="listitem">
                <div className="contact-row">
                  <div className="contact-name">{func.nome}</div>
                  <button
                    type="button"
                    className="contact-btn"
                    onClick={() => {
                      setMsg(null);
                      if (aberto) {
                        setFuncionarioDetalheId(null);
                        if (editing) cancelEdit();
                      } else {
                        setFuncionarioDetalheId(func.id);
                      }
                    }}
                  >
                    {aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </button>
                </div>

                {aberto && (
                  <div className="detail">
                    <div className="detail-grid">
                      <div className="detail-item"><span className="detail-k">Cargo</span><span className="detail-v">{func.cargo || '-'}</span></div>
                      <div className="detail-item"><span className="detail-k">Tipo de acesso</span><span className="detail-v">{tipoLabel}</span></div>
                      <div className="detail-item"><span className="detail-k">Email</span><span className="detail-v">{func.email || '-'}</span></div>
                      <div className="detail-item"><span className="detail-k">Telefone</span><span className="detail-v">{func.telefone || '-'}</span></div>
                      <div className="detail-item"><span className="detail-k">Cadastrado em</span><span className="detail-v">{formatDateBR(func.created_at)}</span></div>
                      <div className="detail-item detail-item--salary">
                        <span className="detail-k">Salário</span>
                        {editing ? (
                          <div className="salary-edit">
                            <div className="salary-input-row">
                              <span className="rs">R$</span>
                              <input
                                value={salarioDraft}
                                onChange={(e) => setSalarioDraft(e.target.value)}
                                inputMode="decimal"
                                className="salary-input"
                                placeholder="0,00"
                                disabled={savingId === func.id}
                              />
                            </div>
                            <div className="salary-actions">
                              <button
                                type="button"
                                className="action-btn action-btn--primary"
                                onClick={() => saveSalario(func.id)}
                                disabled={savingId === func.id}
                              >
                                {savingId === func.id ? 'Salvando…' : 'Salvar'}
                              </button>
                              <button
                                type="button"
                                className="action-btn"
                                onClick={cancelEdit}
                                disabled={savingId === func.id}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="salary-view">
                            <div className="salary-value"><span className="rs">R$</span> {salarioNumber.toFixed(2)}</div>
                            <button type="button" className="action-btn" onClick={() => startEdit(func)}>
                              Editar salário
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <style jsx>{`
        .funcionarios {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Montserrat', sans-serif;
          color: #000;
          width: 100%;
          box-sizing: border-box;
        }

        .funcionarios * { box-sizing: border-box; }

        .page-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .page-sub {
          margin-top: 6px;
          font-size: 13px;
          color: rgba(0,0,0,0.62);
          font-weight: 600;
        }

        .msg {
          margin-top: 12px;
          margin-bottom: 14px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.12);
          color: rgba(0,0,0,0.75);
          font-size: 13px;
          background: rgba(0,0,0,0.03);
        }

        .msg--error { background: rgba(0,0,0,0.04); }

        .card {
          margin-top: 14px;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 18px;
          padding: 16px;
          background: #fff;
        }

        .total-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }

        .total-label {
          font-size: 12px;
          font-weight: 800;
          color: rgba(0,0,0,0.62);
        }

        .total-value {
          font-size: 16px;
          font-weight: 900;
          color: rgba(0,0,0,0.86);
          white-space: nowrap;
        }

        .rs { font-weight: 300; }

        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }

        .search-wrap {
          position: relative;
          min-width: 0;
          width: 100%;
          max-width: 420px;
          flex: 1 1 320px;
          margin-left: auto;
        }

        .search-input {
          width: 100%;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 38px 0 12px;
          font-size: 13px;
          outline: none;
        }

        .search-input:focus { border-color: rgba(0,0,0,0.32); }

        .search-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0,0,0,0.55);
          pointer-events: none;
        }

        .contact-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 14px;
        }

        .contact-item {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
        }

        .contact-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px;
        }

        .contact-name {
          font-size: 14px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .contact-btn {
          flex: 0 0 auto;
          border: 1px solid rgba(0,0,0,0.18);
          background: #fff;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(0,0,0,0.75);
          cursor: pointer;
        }

        .contact-btn:hover { border-color: rgba(0,0,0,0.30); }

        .detail {
          border-top: 1px solid rgba(0,0,0,0.10);
          background: rgba(0,0,0,0.02);
          padding: 14px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        .detail-item {
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 14px;
          padding: 12px;
          background: #fff;
        }

        .detail-item--salary {
          grid-column: 1 / -1;
        }

        .detail-k {
          display: block;
          font-size: 11px;
          font-weight: 800;
          color: rgba(0,0,0,0.52);
          margin-bottom: 2px;
        }

        .detail-v {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: rgba(0,0,0,0.82);
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .salary-view {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .salary-value {
          font-size: 14px;
          font-weight: 900;
          color: rgba(0,0,0,0.86);
        }

        .salary-edit {
          display: grid;
          gap: 10px;
        }

        .salary-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .salary-input {
          width: 140px;
          max-width: 100%;
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 10px;
          font-size: 13px;
          outline: none;
          background: #fff;
          color: #000;
        }

        .salary-input:focus { border-color: rgba(0,0,0,0.32); }

        .salary-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-btn {
          border: 1px solid rgba(0,0,0,0.18);
          background: #fff;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(0,0,0,0.75);
          cursor: pointer;
          flex: 0 0 auto;
        }

        .action-btn:hover { border-color: rgba(0,0,0,0.30); }

        .action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .action-btn--primary {
          background: #000;
          border-color: #000;
          color: #fff;
        }

        .empty {
          padding: 12px 4px;
          font-size: 13px;
          color: rgba(0,0,0,0.62);
        }

        @media (max-width: 720px) {
          .detail-grid { grid-template-columns: 1fr; }
          .search-wrap { max-width: none; }
          .card-head { flex-wrap: wrap; align-items: flex-end; }
        }
      `}</style>
    </div>
  );
}

export default Funcionarios;