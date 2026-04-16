import { supabase } from './supabaseClient.mjs';

async function deleteMarch() {
  const start = '2026-03-01T00:00:00.000Z';
  const end   = '2026-03-31T23:59:59.999Z';

  let total = 0;
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    const { data, error: selErr } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', start)
      .lte('created_at', end)
      .like('codigo', 'S%')
      .limit(50);

    if (selErr) { console.error('Erro na busca:', selErr.message); break; }
    if (!data || data.length === 0) break;

    const ids = data.map(r => r.id);
    const { error: delErr } = await supabase
      .from('orders')
      .delete()
      .in('id', ids);

    if (delErr) {
      console.error('Erro no delete:', delErr.message);
      break;
    }

    total += ids.length;
    console.log(`  Deletados: ${total}`);
  }

  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lte('created_at', end)
    .like('codigo', 'S%');

  console.log(`\nRestantes após deleção: ${count}`);
  console.log(`Total deletado: ${total}`);
}

deleteMarch().catch(e => { console.error(e); process.exit(1); });
