import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../auth/AuthContext';

function DashboardGestor() {
  const { user } = useAuth();
  const custosFixosFallback = [
    { nome: 'Aluguel', valor: 9500 },
    { nome: 'Água', valor: 600 },
    { nome: 'Luz', valor: 1200 },
    { nome: 'Internet', valor: 200 },
    { nome: 'Limpeza e manutenção', valor: 1000 },
    { nome: 'Sistema / software', valor: 300 },
  ];

  const [aba, setAba] = useState('clientes');

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState({});
  const [clientesLista, setClientesLista] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteDetalheId, setClienteDetalheId] = useState(null);

  const [custosFixos, setCustosFixos] = useState(custosFixosFallback);
  const [totalSalarios, setTotalSalarios] = useState(0);
  const [msg, setMsg] = useState(null);
  const [isEditingCustos, setIsEditingCustos] = useState(false);
  const [savingCustos, setSavingCustos] = useState(false);
  const [custosDraft, setCustosDraft] = useState([]);
  const [custosPodeEditar, setCustosPodeEditar] = useState(false);

  const [periodo, setPeriodo] = useState('mensal');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loadingVendas, setLoadingVendas] = useState(true);
  const [canalVendas, setCanalVendas] = useState('todas');
  const [buscaVendasCliente, setBuscaVendasCliente] = useState('');

  const pedidosRequestIdRef = useRef(0);

  const [topCategorias, setTopCategorias] = useState([]);
  const [loadingTopCategorias, setLoadingTopCategorias] = useState(false);
  const [topCategoriasAviso, setTopCategoriasAviso] = useState(null);

  const totalFixosSemSalarios = (custosFixos || []).reduce((acc, c) => acc + (Number(c.valor) || 0), 0);

  useEffect(() => {
    if (user?.tipo_acesso === 'gestor') {
      // Garante que o período padrão (mensal) já filtre o mês atual.
      if (periodo !== 'personalizado' && !dataInicio && !dataFim) {
        const { inicio, fim } = getRangeForPeriodo(periodo);
        setDataInicio(inicio);
        setDataFim(fim);
      }
      carregarClientes();
      carregarCustosFixos();
      carregarTotalSalarios();
    }
    // eslint-disable-next-line
  }, [user, periodo, dataInicio, dataFim]);

  // Mantém o relatório de vendas sempre baseado no banco (Supabase), atualizando automaticamente.
  useEffect(() => {
    if (user?.tipo_acesso !== 'gestor') return;
    if (aba !== 'vendas') return;

    let isAlive = true;
    let inFlight = false;

    const refresh = async () => {
      if (!isAlive) return;
      if (inFlight) return;
      inFlight = true;
      try {
        await carregarPedidos();
      } finally {
        inFlight = false;
      }
    };

    refresh();
    const id = setInterval(refresh, 15000);
    return () => {
      isAlive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, aba, dataInicio, dataFim, canalVendas]);

  // Função para atualizar datas conforme filtro
  function handlePeriodoChange(e) {
    const value = e.target.value;
    setPeriodo(value);
    if (value === 'personalizado') {
      setDataInicio('');
      setDataFim('');
    } else {
      const { inicio, fim } = getRangeForPeriodo(value);
      setDataInicio(inicio);
      setDataFim(fim);
    }
  }

  function getRangeForPeriodo(p) {
    const hoje = new Date();
    let inicio;
    let fim;
    if (p === 'semanal') {
      const diaSemana = hoje.getDay();
      inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - diaSemana);
      fim = new Date(hoje);
    } else if (p === 'mensal') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje);
    } else if (p === 'anual') {
      inicio = new Date(hoje.getFullYear(), 0, 1);
      fim = new Date(hoje);
    }
    return {
      inicio: inicio ? inicio.toISOString().slice(0, 10) : '',
      fim: fim ? fim.toISOString().slice(0, 10) : '',
    };
  }

  function formatMoney(v) {
    const n = Number(v);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function formatDateTimeBR(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    const data = d.toLocaleDateString('pt-BR');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${data} ${hora}`;
  }

  function normalizeTipoVenda(tipo) {
    const t = String(tipo || '').trim().toLowerCase();
    if (!t) return '';
    if (t.includes('delivery')) return 'delivery';
    if (t.includes('drive') || t.includes('thru') || t.includes('drive_thru') || t.includes('drivethru') || t.includes('drivethu')) return 'drive-thru';
    if (t.includes('estabele') || t.includes('local') || t.includes('balcao') || t.includes('balcão') || t.includes('mesa')) return 'estabelecimento';
    return t;
  }

  function getPedidosFiltradosVendas() {
    // As datas (início/fim) já são aplicadas na query do Supabase em `carregarPedidos()`.
    // Evita re-filtrar aqui, pois `new Date('YYYY-MM-DD')` considera meia-noite em UTC e pode
    // cortar vendas do próprio dia (parecendo "desatualizado").
    let pedidosFiltrados = pedidos;

    if (canalVendas !== 'todas') {
      pedidosFiltrados = (pedidosFiltrados || []).filter((p) => normalizeTipoVenda(p.tipo) === canalVendas);
    }

    const q = normalizeText(buscaVendasCliente);
    if (q) {
      pedidosFiltrados = (pedidosFiltrados || []).filter((p) => {
        const nomeCliente = clientes[p.user_id] || p.nome_cliente || p.nome || '';
        return normalizeText(nomeCliente).includes(q);
      });
    }

    return pedidosFiltrados || [];
  }

  useEffect(() => {
    if (user?.tipo_acesso !== 'gestor') return;
    if (aba !== 'vendas') return;
    if (loadingVendas) return;

    const pedidosFiltrados = getPedidosFiltradosVendas();
    const orderIds = pedidosFiltrados.map((p) => p.id).filter(Boolean);
    if (orderIds.length === 0) {
      setTopCategorias([]);
      setTopCategoriasAviso(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingTopCategorias(true);
      setTopCategoriasAviso(null);
      try {
        const PAGE_SIZE = 1000;
        const ORDER_IDS_CHUNK = 200;

        const chunks = [];
        for (let i = 0; i < orderIds.length; i += ORDER_IDS_CHUNK) {
          chunks.push(orderIds.slice(i, i + ORDER_IDS_CHUNK));
        }

        const data = [];
        for (const idsChunk of chunks) {
          let from = 0;
          while (true) {
            let query = supabase
              .from('vendas_itens')
              .select('order_id,categoria,produto_nome,qty,price')
              .in('order_id', idsChunk)
              .order('order_id', { ascending: true })
              .order('order_item_id', { ascending: true })
              .range(from, from + PAGE_SIZE - 1);

            if (dataInicio && dataFim) {
              query = query
                .gte('order_created_at', dataInicio + 'T00:00:00')
                .lte('order_created_at', dataFim + 'T23:59:59');
            }

            if (canalVendas !== 'todas') {
              query = query.eq('tipo', canalVendas);
            }

            const { data: page, error } = await query;

            if (error) {
              const msg = String(error?.message || '');
              if (!cancelled) {
                setTopCategorias([]);
                setTopCategoriasAviso(
                  msg.toLowerCase().includes('vendas_itens')
                    ? 'Tabela "vendas_itens" não encontrada no banco. Execute o SQL do projeto para criar a tabela e triggers.'
                    : 'Não foi possível carregar os itens vendidos por categoria.'
                );
              }
              return;
            }

            if (page && page.length) data.push(...page);

            if (!page || page.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
          }
        }

        const byCatAndItem = new Map();
        (data || []).forEach((row) => {
          const categoria = String(row?.categoria || 'Sem categoria');
          const item = String(row?.produto_nome || 'Item');
          const qty = Number(row?.qty || 0);
          const price = Number(row?.price || 0);
          if (!qty) return;
          const key = `${categoria}__${item}`;
          const prev = byCatAndItem.get(key) || { categoria, item, qty: 0, receita: 0 };
          prev.qty += qty;
          prev.receita += qty * price;
          byCatAndItem.set(key, prev);
        });

        const bestByCategoria = new Map();
        byCatAndItem.forEach((row) => {
          const prev = bestByCategoria.get(row.categoria);
          if (!prev) {
            bestByCategoria.set(row.categoria, row);
            return;
          }
          if (row.qty > prev.qty) {
            bestByCategoria.set(row.categoria, row);
            return;
          }
          if (row.qty === prev.qty && row.receita > prev.receita) {
            bestByCategoria.set(row.categoria, row);
          }
        });

        const result = Array.from(bestByCategoria.values()).sort((a, b) =>
          a.categoria.localeCompare(b.categoria, 'pt-BR')
        );

        if (!cancelled) setTopCategorias(result);
      } catch {
        if (!cancelled) {
          setTopCategorias([]);
          setTopCategoriasAviso('Não foi possível carregar os itens vendidos por categoria.');
        }
      } finally {
        if (!cancelled) setLoadingTopCategorias(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, aba, loadingVendas, pedidos, dataInicio, dataFim, canalVendas, buscaVendasCliente, clientes]);

  async function carregarPedidos() {
    const requestId = ++pedidosRequestIdRef.current;
    setLoadingVendas(true);

    try {
      const PAGE_SIZE = 1000;
      let from = 0;
      const all = [];

      while (true) {
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (dataInicio && dataFim) {
          query = query.gte('created_at', dataInicio + 'T00:00:00').lte('created_at', dataFim + 'T23:59:59');
        }

        if (canalVendas !== 'todas') {
          query = query.eq('tipo', canalVendas);
        }

        const { data, error } = await query;
        if (requestId !== pedidosRequestIdRef.current) return;
        if (error) throw error;

        if (data && data.length) all.push(...data);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      if (requestId !== pedidosRequestIdRef.current) return;
      setPedidos(all);
    } catch {
      if (requestId !== pedidosRequestIdRef.current) return;
      setPedidos([]);
    } finally {
      if (requestId !== pedidosRequestIdRef.current) return;
      setLoadingVendas(false);
    }
  }

  async function carregarClientes() {
    // Busca todos os clientes para mapear id -> nome e lista completa
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email, telefone, tipo_acesso, created_at')
      .order('nome');
    if (!error && data) {
      const map = {};
      data.forEach(u => { map[u.id] = u.nome; });
      setClientes(map);
      setClientesLista(data);
    }
  }

  async function carregarCustosFixos() {
    setMsg(null);
    try {
      const { data, error } = await supabase
        .from('custos_fixos')
        .select('id, descricao, valor')
        .order('created_at', { ascending: true });

      if (error) {
        setCustosFixos(custosFixosFallback);
        setCustosPodeEditar(false);
        setMsg('Não foi possível carregar custos fixos do banco.');
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setCustosFixos(data.map((c) => ({ id: c.id, nome: c.descricao, valor: Number(c.valor) || 0 })));
        setCustosPodeEditar(true);
      } else {
        setCustosFixos(custosFixosFallback);
        setCustosPodeEditar(false);
      }
    } catch {
      setCustosFixos(custosFixosFallback);
      setCustosPodeEditar(false);
      setMsg('Não foi possível carregar custos fixos do banco.');
    }
  }

  function parseMoneyBR(text) {
    if (typeof text !== 'string') return Number(text) || 0;
    const cleaned = text
      .trim()
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function startEditCustos() {
    if (!custosPodeEditar) return;
    setCustosDraft(custosFixos.map((c) => ({ ...c, valorInput: String(c.valor ?? 0).replace('.', ',') })));
    setIsEditingCustos(true);
  }

  function cancelEditCustos() {
    setIsEditingCustos(false);
    setSavingCustos(false);
    setCustosDraft([]);
  }

  async function saveCustos() {
    if (!custosPodeEditar || savingCustos) return;
    setSavingCustos(true);
    setMsg(null);

    try {
      const updates = custosDraft
        .filter((c) => c.id)
        .map((c) => ({ id: c.id, valor: parseMoneyBR(c.valorInput) }));

      const byId = new Map(custosFixos.filter((c) => c.id).map((c) => [c.id, Number(c.valor) || 0]));
      const changed = updates.filter((u) => byId.has(u.id) && byId.get(u.id) !== u.valor);

      if (changed.length > 0) {
        const results = await Promise.all(
          changed.map((u) =>
            supabase
              .from('custos_fixos')
              .update({ valor: u.valor })
              .eq('id', u.id)
          )
        );

        const anyError = results.some((r) => r.error);
        if (anyError) {
          setMsg('Não foi possível salvar todos os custos fixos.');
          setSavingCustos(false);
          return;
        }
      }

      await carregarCustosFixos();
      setIsEditingCustos(false);
      setCustosDraft([]);
    } catch {
      setMsg('Não foi possível salvar os custos fixos.');
    } finally {
      setSavingCustos(false);
    }
  }

  async function carregarTotalSalarios() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('salario')
        .eq('role', 'admin')
        .eq('ativo', true);

      if (error || !data) {
        setTotalSalarios(0);
        return;
      }
      const total = data.reduce((acc, f) => acc + (Number(f.salario) || 0), 0);
      setTotalSalarios(total);
    } catch {
      setTotalSalarios(0);
    }
  }

  function filtrarClientes(lista) {
    const q = buscaCliente.trim().toLowerCase();
    return (lista || [])
      .filter((c) => c.tipo_acesso === 'cliente')
      .filter((c) => {
        if (!q) return true;
        return (
          c.nome?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.telefone?.toLowerCase().includes(q)
        );
      });
  }

  return (
    <div className="dash-gestor">
      <div className="dash-head">
        <div>
          <div className="dash-title">Dashboard do Gestor</div>
          <div className="dash-sub">Clientes, custos e vendas</div>
        </div>
      </div>

      <div className="dash-tabs" role="tablist" aria-label="Categorias">
        {[
          { key: 'clientes', label: 'Clientes cadastrados' },
          { key: 'custos', label: 'Custos fixos' },
          { key: 'vendas', label: 'Relatório de vendas' },
        ].map((t) => {
          const active = aba === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAba(t.key)}
              className={`dash-tab ${active ? 'is-active' : ''}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {msg && <div className="dash-msg">{msg}</div>}

      {aba === 'clientes' && (
        <section className="dash-card" aria-label="Clientes cadastrados">
          <div className="card-head">
            <div className="card-title">Clientes cadastrados</div>
            <div className="search-wrap">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="search-input"
              />
              <span className="search-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
            </div>
          </div>

          <div className="contact-list" role="list">
            {filtrarClientes(clientesLista).length === 0 && (
              <div className="empty">Nenhum cliente cadastrado.</div>
            )}

            {filtrarClientes(clientesLista).map((cliente) => {
              const aberto = clienteDetalheId === cliente.id;

              return (
                <div key={cliente.id} className="contact-item" role="listitem">
                  <div className="contact-row">
                    <div className="contact-name">{cliente.nome}</div>
                    <button
                      type="button"
                      className="contact-btn"
                      onClick={() => setClienteDetalheId(aberto ? null : cliente.id)}
                    >
                      {aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                  </div>

                  {aberto && (
                    <div className="contact-details">
                      <div className="detail-grid">
                        <div className="detail-item">
                          <div className="detail-label">Email</div>
                          <div className="detail-value">{cliente.email || '-'}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Telefone</div>
                          <div className="detail-value">{cliente.telefone || '-'}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Data de cadastro</div>
                          <div className="detail-value">{cliente.created_at ? new Date(cliente.created_at).toLocaleDateString() : '-'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {aba === 'custos' && (
        <section className="dash-card" aria-label="Custos fixos">
          <div className="card-head">
            <div>
              <div className="card-title">Custos fixos</div>
              <div className="card-sub">Total fixo + salários (mensal)</div>
            </div>

            <div className="card-actions">
              {!isEditingCustos ? (
                <button
                  type="button"
                  className="action-btn"
                  onClick={startEditCustos}
                  disabled={!custosPodeEditar}
                  title={!custosPodeEditar ? 'Sem acesso para editar custos fixos' : 'Editar custos fixos'}
                >
                  Editar
                </button>
              ) : (
                <div className="action-group">
                  <button type="button" className="action-btn action-btn--primary" onClick={saveCustos} disabled={savingCustos}>
                    {savingCustos ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" className="action-btn" onClick={cancelEditCustos} disabled={savingCustos}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="costs" aria-label="Lista de custos fixos e resumo">
            <div className="costs__grid" role="list" aria-label="Custos fixos">
              {(isEditingCustos ? custosDraft : custosFixos).map((c, i) => (
                <div key={c.id ?? i} className="cost-item" role="listitem">
                  <div className="cost-name">{c.nome}</div>
                  <div className="cost-value">
                    <span className="rs">R$</span>{' '}
                    {!isEditingCustos ? (
                      <span>{formatMoney(c.valor)}</span>
                    ) : (
                      <input
                        className="money-input"
                        inputMode="decimal"
                        value={c.valorInput ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustosDraft((prev) => prev.map((x) => (x.id === c.id ? { ...x, valorInput: v } : x)));
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="costs__summary" role="list" aria-label="Resumo de custos">
              <div className="cost-row" role="listitem">
                <div className="cost-name">Total custos fixos (sem salários)</div>
                <div className="cost-value"><span className="rs">R$</span> {formatMoney(totalFixosSemSalarios)}</div>
              </div>
              <div className="cost-row" role="listitem">
                <div className="cost-name">Salários</div>
                <div className="cost-value"><span className="rs">R$</span> {formatMoney(totalSalarios)}</div>
              </div>
              <div className="cost-row cost-row--strong" role="listitem">
                <div className="cost-name">Total (fixos + salários)</div>
                <div className="cost-value"><span className="rs">R$</span> {formatMoney(totalFixosSemSalarios + totalSalarios)}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {aba === 'vendas' && (
        <section className="dash-card" aria-label="Relatório de vendas">
          <div className="card-head card-head--vendas">
            <div>
              <div className="card-title">Relatório de vendas</div>
              <div className="card-sub">Filtre por período e consulte as vendas.</div>
            </div>
            <div className="filters">
              <label className="label">Período
                <div className="select-wrap">
                  <select value={periodo} onChange={handlePeriodoChange} className="select">
                    <option value="semanal">Semana</option>
                    <option value="mensal">Mês</option>
                    <option value="anual">Ano</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true" />
                </div>
              </label>

              <label className="label">Canal
                <div className="select-wrap">
                  <select value={canalVendas} onChange={(e) => setCanalVendas(e.target.value)} className="select">
                    <option value="todas">Todas</option>
                    <option value="estabelecimento">Estabelecimento</option>
                    <option value="drive-thru">Drive-thru</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true" />
                </div>
              </label>

              {periodo === 'personalizado' && (
                <>
                  <label className="label">Início
                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input" />
                  </label>
                  <label className="label">Fim
                    <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input" />
                  </label>
                </>
              )}
            </div>
          </div>

          {loadingVendas ? (
            <div className="loading">Carregando vendas...</div>
          ) : (
            <div>
              {(() => {
                const pedidosFiltrados = getPedidosFiltradosVendas();

                const totalVendido = pedidosFiltrados.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
                const labelPeriodo =
                  periodo === 'semanal'
                    ? 'na semana'
                    : periodo === 'mensal'
                      ? 'no mês'
                      : periodo === 'anual'
                        ? 'no ano'
                        : 'no período';

                const labelCanal =
                  canalVendas === 'todas'
                    ? ''
                    : canalVendas === 'estabelecimento'
                      ? ' — Estabelecimento'
                      : canalVendas === 'drive-thru'
                        ? ' — Drive-thru'
                        : canalVendas === 'delivery'
                          ? ' — Delivery'
                          : '';

                if (pedidosFiltrados.length === 0) {
                  return (
                    <>
                      <div className="sales-total">
                        <div className="sales-total__label">Total vendido {labelPeriodo}{labelCanal}</div>
                        <div className="sales-total__value"><span className="rs">R$</span> {formatMoney(0)}</div>
                      </div>

                      <div className="sales-search" aria-label="Buscar cliente no relatório">
                        <input
                          type="text"
                          placeholder="Buscar cliente..."
                          value={buscaVendasCliente}
                          onChange={(e) => setBuscaVendasCliente(e.target.value)}
                          className="sales-search__input"
                        />
                        <span className="sales-search__icon" aria-hidden="true">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </span>
                      </div>

                      <div className="empty">Nenhuma venda realizada.</div>
                    </>
                  );
                }

                return (
                  <>
                    <div className="sales-total">
                      <div className="sales-total__label">Total vendido {labelPeriodo}{labelCanal}</div>
                      <div className="sales-total__value"><span className="rs">R$</span> {formatMoney(totalVendido)}</div>
                    </div>

                    <div className="sales-search" aria-label="Buscar cliente no relatório">
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={buscaVendasCliente}
                        onChange={(e) => setBuscaVendasCliente(e.target.value)}
                        className="sales-search__input"
                      />
                      <span className="sales-search__icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </span>
                    </div>

                    <div className="topcats" aria-label="Item mais vendido por categoria">
                      <div className="topcats__head">
                        <div className="topcats__title">Item mais vendido por categoria</div>
                        <div className="topcats__hint">{loadingTopCategorias ? 'Carregando...' : ''}</div>
                      </div>

                      {topCategoriasAviso && (
                        <div className="topcats__warn">{topCategoriasAviso}</div>
                      )}

                      {!topCategoriasAviso && topCategorias.length === 0 ? (
                        <div className="topcats__empty">Sem dados de itens para o período selecionado.</div>
                      ) : (
                        <div className="topcats__grid">
                          {topCategorias.map((r) => (
                            <div key={`${r.categoria}-${r.item}`} className="topcats__item">
                              <div className="topcats__cat">{r.categoria}</div>
                              <div className="topcats__name">{r.item}</div>
                              <div className="topcats__meta">
                                <span><span className="topcats__k">Qtd</span> <span className="topcats__v">{r.qty}</span></span>
                                <span className="topcats__dot">•</span>
                                <span><span className="topcats__k">Total</span> <span className="topcats__v"><span className="rs">R$</span> {formatMoney(r.receita)}</span></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {pedidosFiltrados.length === 0 && (
                      <div className="empty">Nenhuma venda realizada.</div>
                    )}

                    {pedidosFiltrados.map((p) => (
                      <div key={p.id} className="sale">
                        <div className="sale__grid">
                          <div><span className="sale__k">Código</span><span className="sale__v">{p.codigo}</span></div>
                          <div><span className="sale__k">Nome</span><span className="sale__v">{clientes[p.user_id] || p.nome_cliente || p.nome || p.user_id}</span></div>
                          <div><span className="sale__k">Data/Horário</span><span className="sale__v">{formatDateTimeBR(p.created_at || p.data || p.data_pedido)}</span></div>
                          <div><span className="sale__k">Tipo</span><span className="sale__v">{p.tipo}</span></div>
                          <div><span className="sale__k">Total</span><span className="sale__v"><span className="rs">R$</span> {Number(p.total || 0).toFixed(2)}</span></div>
                        </div>
                        <div className="sale__status">
                          {['pronto', 'a_caminho', 'entregue', 'finalizado', 'retirado', 'chegou'].includes(p.status)
                            ? 'Pedido finalizado'
                            : `Status: ${p.status}`}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </section>
      )}

      <style>{`
        .dash-gestor {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Montserrat', sans-serif;
          color: #000;
          width: 100%;
          box-sizing: border-box;
        }

        .dash-gestor * {
          box-sizing: border-box;
        }

        .dash-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .dash-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }

        .dash-sub {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(0,0,0,0.60);
        }

        .dash-tabs {
          display: flex;
          justify-content: center;
          gap: 14px;
          padding: 10px 12px;
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 14px;
          background: #fff;
          margin-bottom: 16px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .dash-tabs::-webkit-scrollbar { display: none; }

        .dash-tab {
          border: none;
          background: transparent;
          padding: 10px 12px;
          border-bottom: 3px solid transparent;
          color: rgba(0,0,0,0.62);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .dash-tab.is-active {
          color: #000;
          border-bottom-color: #000;
        }

        .dash-msg {
          border: 1px solid rgba(0,0,0,0.14);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 13px;
          color: rgba(0,0,0,0.72);
          background: rgba(0,0,0,0.03);
        }

        .dash-card {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          background: #fff;
          padding: 16px;
          max-width: 100%;
        }

        .card-head {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .card-title {
          font-size: 16px;
          font-weight: 700;
        }

        .card-sub {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(0,0,0,0.58);
        }

        .card-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .action-group {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .action-btn {
          border: 1px solid rgba(0,0,0,0.18);
          background: #fff;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.75);
          cursor: pointer;
          flex: 0 0 auto;
        }

        .action-btn:hover {
          border-color: rgba(0,0,0,0.30);
        }

        .action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .action-btn--primary {
          background: #000;
          border-color: #000;
          color: #fff;
        }

        .search-wrap {
          position: relative;
          min-width: 0;
          width: 100%;
          max-width: 420px;
          flex: 1 1 320px;
          margin-left: auto;
          box-sizing: border-box;
        }

        .search-input {
          width: 100%;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 38px 0 12px;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
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
          gap: 10px;
        }

        .contact-item {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          background: #fff;
          padding: 12px;
        }

        .contact-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .contact-name {
          font-size: 14px;
          font-weight: 700;
          color: rgba(0,0,0,0.86);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .contact-btn {
          border: 1px solid rgba(0,0,0,0.18);
          background: #fff;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.75);
          cursor: pointer;
          flex: 0 0 auto;
        }

        .contact-btn:hover {
          border-color: rgba(0,0,0,0.30);
        }

        .contact-details {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(0,0,0,0.10);
        }

        .costs {
          display: grid;
          gap: 12px;
          max-width: 860px;
          margin: 0 auto;
        }

        .costs__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        .cost-item {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          background: #fff;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .cost-name {
          font-size: 13px;
          font-weight: 700;
          color: rgba(0,0,0,0.82);
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .cost-value {
          font-size: 13px;
          font-weight: 700;
          color: rgba(0,0,0,0.82);
          flex: 0 0 auto;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .costs__summary {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          background: rgba(0,0,0,0.02);
          padding: 12px;
        }

        .cost-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
        }

        .cost-row + .cost-row {
          border-top: 1px solid rgba(0,0,0,0.10);
        }

        .cost-row--strong {
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 12px;
          padding: 12px;
          margin-top: 10px;
        }

        .cost-row--strong + .cost-row {
          border-top: none;
        }

        .money-input {
          width: 110px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 10px;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          text-align: right;
          background: #fff;
          color: #000;
        }

        .money-input:focus {
          border-color: rgba(0,0,0,0.32);
        }

        @media (max-width: 720px) {
          .costs__grid { grid-template-columns: 1fr; }
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        .detail-item {
          min-width: 0;
        }

        .detail-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(0,0,0,0.52);
          margin-bottom: 2px;
        }

        .detail-value {
          font-size: 13px;
          font-weight: 600;
          color: rgba(0,0,0,0.82);
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .table-wrap {
          overflow-x: hidden;
          overflow-y: auto;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08);
          width: 100%;
          max-width: 100%;
        }

        .table-wrap--narrow {
          max-width: 760px;
          margin: 0 auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          background: #fff;
        }

        .table thead th {
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.62);
          padding: 12px;
          background: rgba(0,0,0,0.03);
          border-bottom: 1px solid rgba(0,0,0,0.10);
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .table tbody td {
          padding: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          font-size: 13px;
          color: rgba(0,0,0,0.80);
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .table tbody tr:last-child td { border-bottom: none; }

        .table-empty {
          text-align: center;
          padding: 20px;
          color: rgba(0,0,0,0.60);
        }

        .table-total td {
          font-weight: 700;
          background: rgba(0,0,0,0.02);
        }

        .table-total--strong td {
          background: rgba(0,0,0,0.04);
        }

        .rs { font-weight: 300; }

        .filters {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .card-head--vendas {
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
        }

        .card-head--vendas .filters {
          width: 100%;
          justify-content: flex-start;
          margin-top: 10px;
        }

        .label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.62);
        }

        .select-wrap {
          position: relative;
          width: 100%;
          max-width: 220px;
        }

        .select, .input {
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.18);
          padding: 0 10px;
          font-size: 13px;
          outline: none;
          background: #fff;
          color: #000;
        }

        .select {
          width: 100%;
          padding-right: 34px;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: none;
        }

        .select option {
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #000;
          background: #fff;
        }

        .select option:checked {
          background: rgba(0,0,0,0.06);
        }

        .select-arrow {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-35%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid rgba(0,0,0,0.55);
          pointer-events: none;
        }

        .select:focus, .input:focus { border-color: rgba(0,0,0,0.32); }

        .loading, .empty {
          padding: 16px 4px;
          font-size: 13px;
          color: rgba(0,0,0,0.62);
        }

        .sale {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          margin-top: 12px;
        }

        .sales-total {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 14px;
          background: rgba(0,0,0,0.02);
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-top: 4px;
        }

        .sales-search {
          position: relative;
          width: 100%;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 0;
          background: #fff;
          margin-top: 10px;
        }

        .sales-search__input {
          width: 100%;
          height: 44px;
          border: none;
          outline: none;
          border-radius: 14px;
          padding: 0 44px 0 14px;
          font-size: 13px;
          font-weight: 600;
          color: #000;
          background: transparent;
        }

        .sales-search__icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0,0,0,0.55);
          pointer-events: none;
        }

        .sales-total__label {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.60);
        }

        .sales-total__value {
          font-size: 16px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          white-space: nowrap;
        }

        .sale__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        .topcats {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          margin-top: 12px;
        }

        .topcats__head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .topcats__title {
          font-size: 13px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
        }

        .topcats__hint {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.50);
          min-height: 16px;
        }

        .topcats__warn, .topcats__empty {
          font-size: 12px;
          font-weight: 600;
          color: rgba(0,0,0,0.62);
          padding: 8px 0 2px 0;
        }

        .topcats__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        @media (max-width: 720px) {
          .topcats__grid {
            grid-template-columns: 1fr;
          }
        }

        .topcats__item {
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 12px;
          padding: 12px;
          background: rgba(0,0,0,0.02);
        }

        .topcats__cat {
          font-size: 11px;
          font-weight: 800;
          color: rgba(0,0,0,0.55);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 4px;
        }

        .topcats__name {
          font-size: 13px;
          font-weight: 800;
          color: rgba(0,0,0,0.86);
          margin-bottom: 6px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .topcats__meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.60);
        }

        .topcats__k {
          font-weight: 800;
          color: rgba(0,0,0,0.52);
        }

        .topcats__v {
          font-weight: 800;
          color: rgba(0,0,0,0.84);
        }

        .topcats__dot {
          color: rgba(0,0,0,0.30);
        }

        .sale__k {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: rgba(0,0,0,0.52);
          margin-bottom: 2px;
        }

        .sale__v {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: rgba(0,0,0,0.82);
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .sale__status {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.10);
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.70);
        }

        @media (max-width: 720px) {
          .table thead th { padding: 10px; font-size: 11px; }
          .table tbody td { padding: 10px; font-size: 12px; }
          .sale__grid { grid-template-columns: 1fr; }
          .search-wrap { max-width: none; }
          .detail-grid { grid-template-columns: 1fr; }
          .costs { max-width: 100%; }
        }

        @media (max-width: 520px) {
          .dash-card { padding: 14px; }
          .dash-tabs {
            flex-wrap: wrap;
            justify-content: center;
            overflow-x: hidden;
          }
          .cost-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .cost-value {
            width: 100%;
            text-align: right;
          }
          .cost-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .cost-row .cost-value {
            width: 100%;
            text-align: right;
          }
          .card-actions {
            width: 100%;
            justify-content: flex-end;
          }
          .action-group {
            width: 100%;
            justify-content: flex-end;
          }
          .money-input {
            width: 140px;
          }
        }
      `}</style>
    </div>
  );
}

export default DashboardGestor;
