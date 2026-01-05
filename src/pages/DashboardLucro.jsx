import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../auth/AuthContext';

function getSaudacaoAgora() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function MiniCalendario({ date }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=dom
  const daysInMonth = lastDay.getDate();
  const today = new Date();

  const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const weekdayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  return (
    <div className="mini-cal">
      <div className="mini-cal__title">{monthLabel}</div>
      <div className="mini-cal__weekdays" aria-hidden="true">
        {weekdayLabels.map((w) => (
          <div key={w} className="mini-cal__weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="mini-cal__days" role="grid" aria-label="Calendário">
        {cells.map((d, idx) => {
          const isToday =
            d &&
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === d;
          return (
            <div
              key={idx}
              className={`mini-cal__day ${d ? '' : 'is-empty'} ${isToday ? 'is-today' : ''}`}
              role="gridcell"
              aria-label={d ? String(d) : undefined}
            >
              {d ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatMoneyBRL(value) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LucroChart({ series }) {
  const data = Array.isArray(series) ? series : [];
  const values = data.map((d) => Number(d?.value) || 0);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const width = 920;
  const height = 220;
  const padX = 18;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const range = max - min || 1;
  const yFor = (v) => {
    const t = (v - min) / range;
    return padY + (1 - t) * innerH;
  };

  const xForIndex = (i) => {
    if (data.length <= 1) return padX + innerW / 2;
    return padX + (i / (data.length - 1)) * innerW;
  };

  const points = data.map((d, i) => {
    const v = Number(d?.value) || 0;
    return { x: xForIndex(i), y: yFor(v), v, label: d?.label || '' };
  });

  const dPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  const showZero = min < 0 && max > 0;
  const yZero = yFor(0);

  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, i) => {
    const y = padY + (i / ticks) * innerH;
    return y;
  });

  return (
    <div className="chart">
      <div className="chart__head">
        <div className="chart__title">Gráfico de lucro líquido</div>
        <div className="chart__subtitle">dez/2025 → dez/2026</div>
      </div>

      {data.length === 0 ? (
        <div className="chart__empty">Sem dados para exibir.</div>
      ) : (
        <div className="chart__wrap" aria-label="Gráfico de lucro líquido">
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" role="img">
            <rect x="0" y="0" width={width} height={height} fill="#fff" rx="12" />

            {grid.map((y, idx) => (
              <line
                key={idx}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="rgba(0,0,0,0.08)"
                strokeWidth="1"
              />
            ))}

            {showZero && (
              <line
                x1={padX}
                y1={yZero}
                x2={width - padX}
                y2={yZero}
                stroke="rgba(0,0,0,0.22)"
                strokeWidth="1"
              />
            )}

            <path d={dPath} fill="none" stroke="#000" strokeWidth="2" />

            {points.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r="3.2" fill="#000" />
            ))}
          </svg>

          <div className="chart__x">
            <span>dez/2025</span>
            <span>dez/2026</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardLucro() {
  const { user } = useAuth();
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatorioAviso, setRelatorioAviso] = useState(null);
  const [lucroSerie, setLucroSerie] = useState([]);
  const [novoLembrete, setNovoLembrete] = useState('');
  const [lembretes, setLembretes] = useState([]);

  useEffect(() => {
    if (user?.tipo_acesso === 'gestor') {
      carregarRelatorio();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const key = `gestor_reminders_${user.id}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setLembretes([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((l) => {
            if (!l) return null;
            if (typeof l === 'string') {
              return {
                id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                texto: l,
                done: false,
                createdAt: new Date().toISOString(),
              };
            }
            return {
              id: l.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
              texto: l.texto || '',
              done: Boolean(l.done),
              createdAt: l.createdAt || new Date().toISOString(),
            };
          })
          .filter((l) => l && l.texto);
        setLembretes(normalized);
      } else {
        setLembretes([]);
      }
    } catch {
      setLembretes([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const key = `gestor_reminders_${user.id}`;
    try {
      localStorage.setItem(key, JSON.stringify(lembretes));
    } catch {
      // Se o storage falhar, apenas não persiste.
    }
  }, [lembretes, user?.id]);

  function addLembrete() {
    const texto = (novoLembrete || '').trim();
    if (!texto) return;
    const item = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      texto,
      done: false,
      createdAt: new Date().toISOString(),
    };
    setLembretes((prev) => [item, ...prev]);
    setNovoLembrete('');
  }

  function toggleLembrete(id) {
    setLembretes((prev) => prev.map((l) => (l.id === id ? { ...l, done: !l.done } : l)));
  }

  function removeLembrete(id) {
    setLembretes((prev) => prev.filter((l) => l.id !== id));
  }

  async function carregarRelatorio() {
    setLoading(true);
    setRelatorioAviso(null);
    try {
      const num = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const fetchOrderItemsForOrders = async (orderIds, { withOrderId = false } = {}) => {
        const selWithCost = withOrderId
          ? 'order_id, qty, custo_unitario, products(custo_producao)'
          : 'qty, custo_unitario, products(custo_producao)';
        const selFallback = withOrderId
          ? 'order_id, qty, products(custo_producao)'
          : 'qty, products(custo_producao)';

        let res = await supabase
          .from('order_items')
          .select(selWithCost)
          .in('order_id', orderIds);

        const msg = String(res?.error?.message || '');
        if (res?.error && msg.toLowerCase().includes('custo_unitario')) {
          res = await supabase
            .from('order_items')
            .select(selFallback)
            .in('order_id', orderIds);
        }

        return res;
      };

      const monthKey = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      };

      // Range do gráfico: dez/2025 -> dez/2026 (13 meses)
      const chartStart = new Date(2025, 11, 1, 0, 0, 0, 0);
      const chartEndExclusive = new Date(2027, 0, 1, 0, 0, 0, 0);

      const months = [];
      {
        const cur = new Date(chartStart);
        while (cur < chartEndExclusive) {
          const key = monthKey(cur);
          const label = cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
          months.push({ key, label });
          cur.setMonth(cur.getMonth() + 1);
        }
      }

      // Baseline salários (mensal)
      let salariosBase = 0;
      const { data: funcionarios, error: funcionariosError } = await supabase
        .from('users')
        .select('salario')
        .eq('role', 'admin')
        .eq('ativo', true);

      if (funcionariosError) {
        setRelatorioAviso('Não foi possível carregar salários do banco.');
      } else {
        salariosBase = (funcionarios || []).reduce((sum, f) => sum + num(f?.salario), 0);
      }

      // Custos fixos baseline (mensal)
      let custosFixosBase = 0;
      let custosFixosByMonth = {};
      {
        const { data: cfAll, error: cfAllError } = await supabase
          .from('custos_fixos')
          .select('valor');

        if (cfAllError) {
          setRelatorioAviso((prev) => prev || 'Não foi possível carregar custos fixos do banco.');
        } else {
          custosFixosBase = (cfAll || []).reduce((sum, c) => sum + num(c?.valor), 0);
          // Se houver lançamentos com data, usa por mês; senão aplica baseline.
          const { data: cfRange, error: cfRangeError } = await supabase
            .from('custos_fixos')
            .select('valor,data')
            .gte('data', '2025-12-01')
            .lte('data', '2026-12-31');

          if (!cfRangeError && Array.isArray(cfRange) && cfRange.length > 0) {
            custosFixosByMonth = cfRange.reduce((acc, row) => {
              const dt = row?.data ? new Date(`${row.data}T00:00:00`) : null;
              if (!dt) return acc;
              const k = monthKey(dt);
              acc[k] = (acc[k] || 0) + num(row?.valor);
              return acc;
            }, {});
          }
        }
      }

      // Pedidos (range do gráfico)
      const { data: pedidosRange, error: pedidosRangeError } = await supabase
        .from('orders')
        .select('id,total,created_at')
        .gte('created_at', chartStart.toISOString())
        .lt('created_at', chartEndExclusive.toISOString());

      if (pedidosRangeError) throw pedidosRangeError;

      const orderIdToMonth = {};
      const faturamentoByMonth = months.reduce((acc, m) => {
        acc[m.key] = 0;
        return acc;
      }, {});

      const allOrderIds = [];
      (pedidosRange || []).forEach((p) => {
        const createdAt = p?.created_at ? new Date(p.created_at) : null;
        if (!createdAt) return;
        const k = monthKey(createdAt);
        if (!(k in faturamentoByMonth)) return;
        faturamentoByMonth[k] += num(p?.total);
        orderIdToMonth[p.id] = k;
        allOrderIds.push(p.id);
      });

      // Itens (range do gráfico)
      const custosProdutosByMonth = months.reduce((acc, m) => {
        acc[m.key] = 0;
        return acc;
      }, {});

      if (allOrderIds.length > 0) {
        const { data: itensRange, error: itensRangeError } = await fetchOrderItemsForOrders(allOrderIds, { withOrderId: true });

        if (itensRangeError) throw itensRangeError;

        (itensRange || []).forEach((i) => {
          const k = orderIdToMonth[i?.order_id];
          if (!k) return;
          const qty = num(i?.qty);
          if (qty <= 0) return;
          const unitCost = num(i?.custo_unitario) || num(i?.products?.custo_producao);
          custosProdutosByMonth[k] += qty * unitCost;
        });
      }

      // Série do lucro líquido (mensal)
      const serie = months.map((m) => {
        const faturamento = faturamentoByMonth[m.key] || 0;
        const custosProdutos = custosProdutosByMonth[m.key] || 0;
        const custosFixos = (m.key in custosFixosByMonth) ? custosFixosByMonth[m.key] : custosFixosBase;
        const lucroBruto = faturamento - custosProdutos;
        const lucroLiquido = lucroBruto - salariosBase - (Number.isFinite(custosFixos) ? custosFixos : 0);
        return { key: m.key, label: m.label, value: lucroLiquido };
      });
      setLucroSerie(serie);

      // Mês atual (range fechado-aberto para evitar problemas de horário)
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0);
      const inicioMesSeguinte = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1, 0, 0, 0, 0);
      const inicioMesISO = inicioMes.toISOString();
      const inicioMesSeguinteISO = inicioMesSeguinte.toISOString();

      // 1) Pedidos do mês (faturamento)
      const { data: pedidos, error: pedidosError } = await supabase
        .from('orders')
        .select('id,total')
        .gte('created_at', inicioMesISO)
        .lt('created_at', inicioMesSeguinteISO);

      if (pedidosError) throw pedidosError;

      const faturamento = (pedidos || []).reduce((sum, p) => sum + num(p?.total), 0);
      const orderIds = (pedidos || []).map((p) => p.id).filter(Boolean);

      // 2) Custo dos produtos (somatório de qty * custo_producao)
      let custosProdutos = 0;
      if (orderIds.length > 0) {
        const { data: itens, error: itensError } = await fetchOrderItemsForOrders(orderIds, { withOrderId: false });

        if (itensError) throw itensError;

        let missingCostCount = 0;
        custosProdutos = (itens || []).reduce((sum, i) => {
          const qty = num(i?.qty);
          if (qty <= 0) return sum;
          const unitCost = num(i?.custo_unitario) || num(i?.products?.custo_producao);
          if (unitCost <= 0) missingCostCount += 1;
          return sum + qty * unitCost;
        }, 0);

        if (missingCostCount > 0) {
          setRelatorioAviso((prev) => prev || 'Alguns itens não possuem custo de produção registrado no banco. Cadastre o custo do item (ex.: em order_items.custo_unitario) para o cálculo ficar 100% correto.');
        }
      }

      const salarios = salariosBase;

      // Custos fixos do mês (usa por mês se existir; senão baseline)
      const kHoje = monthKey(hoje);
      const custosFixosTotal = (kHoje in custosFixosByMonth) ? custosFixosByMonth[kHoje] : custosFixosBase;

      const lucroBruto = faturamento - custosProdutos;
      const lucroLiquido = lucroBruto - salarios - custosFixosTotal;

      setRelatorio({
        faturamento,
        custosProdutos,
        salarios,
        custosFixos: custosFixosTotal,
        lucroBruto,
        lucroLiquido
      });
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      setRelatorio({
        faturamento: 0,
        custosProdutos: 0,
        salarios: 0,
        custosFixos: 0,
        lucroBruto: 0,
        lucroLiquido: 0,
      });
      setRelatorioAviso('Falha ao carregar dados financeiros do banco.');
      setLucroSerie([]);
    } finally {
      setLoading(false);
    }
  }

  if (user?.tipo_acesso !== 'gestor') {
    return <div>Acesso negado. Apenas gestores podem ver este dashboard.</div>;
  }

  if (loading) {
    return <div>Carregando relatório...</div>;
  }

  const nome = user?.nome || 'Gestor';
  const safeRelatorio = relatorio || {
    faturamento: 0,
    custosProdutos: 0,
    salarios: 0,
    custosFixos: 0,
    lucroBruto: 0,
    lucroLiquido: 0,
  };

  return (
    <div className="dashboard-lucro">
      <div className="topo">
        <div>
          <div className="saudacao">{getSaudacaoAgora()}, {nome}.</div>
          <div className="subtitulo">
            Dashboard do mês atual — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="top-widgets" aria-label="Resumo do dia">
        <div className="top-widgets__col">
          <MiniCalendario date={new Date()} />
        </div>
        <div className="top-widgets__col is-wide">
          <div className="lembretes">
            <div className="lembretes__title">Lembretes</div>
            <div className="lembretes__composer">
              <input
                className="lembretes__input"
                type="text"
                value={novoLembrete}
                onChange={(e) => setNovoLembrete(e.target.value)}
                placeholder="Digite um lembrete…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addLembrete();
                }}
              />
              <button
                type="button"
                className="lembretes__add"
                onClick={addLembrete}
                disabled={!novoLembrete.trim()}
              >
                Adicionar
              </button>
            </div>

            {lembretes.length === 0 ? (
              <div className="lembretes__body">Sem lembretes no momento.</div>
            ) : (
              <div className="lembretes__list" role="list" aria-label="Lista de lembretes">
                {lembretes.map((l) => (
                  <div
                    key={l.id}
                    className={`lembretes__item ${l.done ? 'is-done' : ''}`}
                    role="listitem"
                  >
                    <label className="lembretes__check">
                      <input
                        type="checkbox"
                        checked={Boolean(l.done)}
                        onChange={() => toggleLembrete(l.id)}
                        aria-label="Marcar lembrete como concluído"
                      />
                      <span className="lembretes__box" aria-hidden="true" />
                    </label>
                    <div className="lembretes__text">{l.texto}</div>
                    <button
                      type="button"
                      className="lembretes__remove"
                      onClick={() => removeLembrete(l.id)}
                      aria-label="Remover lembrete"
                      title="Remover"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {relatorioAviso && (
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.14)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 16,
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 13,
            color: 'rgba(0,0,0,0.7)',
            background: 'rgba(0,0,0,0.03)',
          }}
        >
          {relatorioAviso}
        </div>
      )}

      <LucroChart series={lucroSerie} />

      <div className="kpi-grid" aria-label="Indicadores do mês atual">
        <div className="kpi">
          <div className="kpi__label">Faturamento</div>
          <div className="kpi__value"><span className="kpi__currency">R$</span> {formatMoneyBRL(safeRelatorio.faturamento)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Custos Produtos</div>
          <div className="kpi__value"><span className="kpi__currency">R$</span> {formatMoneyBRL(safeRelatorio.custosProdutos)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Salários</div>
          <div className="kpi__value"><span className="kpi__currency">R$</span> {formatMoneyBRL(safeRelatorio.salarios)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Custos Fixos</div>
          <div className="kpi__value"><span className="kpi__currency">R$</span> {formatMoneyBRL(safeRelatorio.custosFixos)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Lucro Bruto</div>
          <div className="kpi__value"><span className="kpi__currency">R$</span> {formatMoneyBRL(safeRelatorio.lucroBruto)}</div>
        </div>
        <div className={`kpi ${safeRelatorio.lucroLiquido < 0 ? 'kpi--neg' : ''}`}>
          <div className="kpi__label">Lucro Líquido</div>
          <div className="kpi__value"><span className="kpi__currency">R$</span> {formatMoneyBRL(safeRelatorio.lucroLiquido)}</div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-lucro {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .topo {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 16px;
        }

        .saudacao {
          font-family: 'Montserrat', sans-serif;
          font-size: 22px;
          font-weight: 600;
          color: #000;
        }

        .subtitulo {
          margin-top: 6px;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: rgba(0, 0, 0, 0.6);
        }

        .top-widgets {
          display: flex;
          gap: 16px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .top-widgets__col {
          flex: 1;
          min-width: 0;
          display: flex;
        }

        .top-widgets__col.is-wide {
          flex: 2;
        }

        .chart {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          background: #fff;
          padding: 14px;
          margin-bottom: 16px;
        }

        .chart__head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .chart__title {
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #000;
        }

        .chart__subtitle {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.6);
        }

        .chart__wrap {
          border-radius: 12px;
          overflow: hidden;
        }

        .chart__x {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
        }

        .chart__empty {
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          color: rgba(0, 0, 0, 0.6);
          border: 1px dashed rgba(0, 0, 0, 0.18);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.02);
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-top: 10px;
        }

        .kpi {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 14px;
          background: #fff;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kpi--neg {
          background: rgba(0, 0, 0, 0.02);
          border-color: rgba(0, 0, 0, 0.18);
        }

        .kpi__label {
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.62);
        }

        .kpi__value {
          font-family: 'Montserrat', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #000;
          letter-spacing: -0.2px;
        }

        .kpi__currency {
          font-weight: 300;
        }

        .mini-cal {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          background: #fff;
          padding: 14px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .mini-cal__title {
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          text-transform: capitalize;
          margin-bottom: 10px;
        }

        .mini-cal__weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 6px;
        }

        .mini-cal__days {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: 1fr;
          gap: 6px;
          min-height: 0;
        }

        .mini-cal__weekday {
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.55);
          text-align: center;
          padding: 2px 0;
        }

        .mini-cal__day {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.72);
          text-align: center;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
        }

        .mini-cal__day.is-empty {
          border: 1px solid transparent;
          background: transparent;
        }

        .mini-cal__day.is-today {
          color: #000;
          border-color: rgba(0, 0, 0, 0.22);
        }

        .lembretes {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          background: #fff;
          padding: 14px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .lembretes__title {
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          margin-bottom: 10px;
        }

        .lembretes__composer {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
        }

        .lembretes__input {
          flex: 1;
          min-width: 0;
          height: 40px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          padding: 0 12px;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          outline: none;
        }

        .lembretes__input:focus {
          border-color: rgba(0, 0, 0, 0.32);
        }

        .lembretes__add {
          height: 40px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid #000;
          background: #000;
          color: #fff;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .lembretes__add:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .lembretes__list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: auto;
          max-height: calc(3 * 44px + 2 * 10px);
          padding-right: 4px;
        }

        .lembretes__item {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 10px;
          padding: 10px 12px;
          background: #fff;
          min-height: 44px;
        }

        .lembretes__item.is-done {
          border-color: rgba(0, 0, 0, 0.10);
          background: rgba(0, 0, 0, 0.02);
        }

        .lembretes__check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #fff;
          cursor: pointer;
          position: relative;
          flex: 0 0 auto;
        }

        .lembretes__check input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .lembretes__box {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          border: 2px solid rgba(0, 0, 0, 0.55);
          background: transparent;
          box-sizing: border-box;
        }

        .lembretes__item.is-done .lembretes__box {
          border-color: #000;
          background: #000;
        }

        .lembretes__text {
          flex: 1;
          min-width: 0;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.78);
          word-break: break-word;
        }

        .lembretes__item.is-done .lembretes__text {
          color: rgba(0, 0, 0, 0.55);
          text-decoration: line-through;
        }

        .lembretes__remove {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #fff;
          color: rgba(0, 0, 0, 0.7);
          font-family: 'Montserrat', sans-serif;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }

        .lembretes__body {
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(0, 0, 0, 0.62);
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10px;
          border: 1px dashed rgba(0, 0, 0, 0.18);
          border-radius: 10px;
        }

        @media (max-width: 780px) {
          .top-widgets {
            flex-direction: column;
          }
          .top-widgets__col.is-wide {
            flex: 1;
          }
        }

        /* estilos antigos de cards (metricas/metrica) removidos */
      `}</style>
    </div>
  );
}

export default DashboardLucro;