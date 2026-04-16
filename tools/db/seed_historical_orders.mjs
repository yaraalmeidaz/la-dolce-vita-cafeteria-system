/**
 * Seed de pedidos históricos — Dez/2025, Jan, Fev e Mar/2026
 *
 * Metas de receita:
 *   Dezembro 2025 : R$ ~118 000  →  lucro ≈ R$ 19 000  (alta temporada / festas)
 *   Janeiro  2026 : R$ ~90 000   →  lucro ≈ R$  2 500  (pós-festas, baixo)
 *   Fevereiro 2026: R$ ~107 000  →  lucro ≈ R$ 12 800  (Carnaval)
 *   Março    2026 : R$ ~88 000   →  lucro ≈ R$  1 500  ← conforme solicitado
 *
 * Execução: node tools/db/seed_historical_orders.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

// ── Produtos (espelho do data.js) ──────────────────────────────────────────
const PRODUCTS = [
  { id: '550e8400-e29b-41d4-a716-446655440001', nome: 'Espresso Italiano',                   cat: 'Il Caffè',          preco: 9,  custo: 3    },
  { id: '550e8400-e29b-41d4-a716-446655440002', nome: 'Espresso Duplo',                       cat: 'Il Caffè',          preco: 13, custo: 4.5  },
  { id: '550e8400-e29b-41d4-a716-446655440003', nome: 'Macchiato',                            cat: 'Il Caffè',          preco: 11, custo: 3.8  },
  { id: '550e8400-e29b-41d4-a716-446655440004', nome: 'Americano',                            cat: 'Il Caffè',          preco: 13, custo: 4    },
  { id: '550e8400-e29b-41d4-a716-446655440005', nome: 'Cappuccino Classico',                  cat: 'Il Caffè',          preco: 18, custo: 6.5  },
  { id: '550e8400-e29b-41d4-a716-446655440006', nome: 'Latte Artístico',                      cat: 'Il Caffè',          preco: 19, custo: 7    },
  { id: '550e8400-e29b-41d4-a716-446655440007', nome: 'Mocha Italiano',                       cat: 'Il Caffè',          preco: 22, custo: 8.5  },
  { id: '550e8400-e29b-41d4-a716-446655440008', nome: 'Shakerato',                            cat: 'Il Caffè',          preco: 17, custo: 5.5  },
  { id: '550e8400-e29b-41d4-a716-446655440009', nome: 'Caffè Affogato',                       cat: 'Il Caffè',          preco: 23, custo: 9    },
  { id: '550e8400-e29b-41d4-a716-446655440010', nome: 'Café Filtrado Especial',               cat: 'Il Caffè',          preco: 21, custo: 6.8  },
  { id: '550e8400-e29b-41d4-a716-446655440011', nome: 'Frapuccino Signature',                 cat: 'Frescamente',       preco: 24, custo: 9.5  },
  { id: '550e8400-e29b-41d4-a716-446655440012', nome: 'Frapê de Mocha com Gelato',            cat: 'Frescamente',       preco: 26, custo: 11   },
  { id: '550e8400-e29b-41d4-a716-446655440013', nome: 'Frapê de Matcha Ceremonial',           cat: 'Frescamente',       preco: 27, custo: 12.5 },
  { id: '550e8400-e29b-41d4-a716-446655440014', nome: 'Cold Brew da Casa',                    cat: 'Frescamente',       preco: 18, custo: 5.5  },
  { id: '550e8400-e29b-41d4-a716-446655440015', nome: 'Cold Brew com Tônica',                 cat: 'Frescamente',       preco: 21, custo: 7    },
  { id: '550e8400-e29b-41d4-a716-446655440016', nome: 'Iced Latte com Syrup Premium',         cat: 'Frescamente',       preco: 23, custo: 8.5  },
  { id: '550e8400-e29b-41d4-a716-446655440017', nome: 'Matcha Latte Tradicional',             cat: 'Infusões',          preco: 25, custo: 12   },
  { id: '550e8400-e29b-41d4-a716-446655440018', nome: 'Matcha Latte Especial',                cat: 'Infusões',          preco: 27, custo: 13   },
  { id: '550e8400-e29b-41d4-a716-446655440019', nome: 'Chai Latte Artesanal',                 cat: 'Infusões',          preco: 22, custo: 8    },
  { id: '550e8400-e29b-41d4-a716-446655440020', nome: 'Chá Preto Inglês',                     cat: 'Infusões',          preco: 14, custo: 3.5  },
  { id: '550e8400-e29b-41d4-a716-446655440021', nome: 'Chá Verde Jasmine',                    cat: 'Infusões',          preco: 15, custo: 4    },
  { id: '550e8400-e29b-41d4-a716-446655440022', nome: 'Chá de Ervas Italiano',                cat: 'Infusões',          preco: 16, custo: 4.5  },
  { id: '550e8400-e29b-41d4-a716-446655440023', nome: 'Verde Vital',                          cat: 'Naturale',          preco: 19, custo: 7.5  },
  { id: '550e8400-e29b-41d4-a716-446655440024', nome: 'Dolce Arancia',                        cat: 'Naturale',          preco: 18, custo: 7    },
  { id: '550e8400-e29b-41d4-a716-446655440025', nome: 'Rosso Intenso',                        cat: 'Naturale',          preco: 19, custo: 7.8  },
  { id: '550e8400-e29b-41d4-a716-446655440026', nome: 'Abacaxi com Hortelã e Gengibre',       cat: 'Naturale',          preco: 16, custo: 5.5  },
  { id: '550e8400-e29b-41d4-a716-446655440027', nome: 'Melancia com Limão e Manjericão',      cat: 'Naturale',          preco: 16, custo: 5    },
  { id: '550e8400-e29b-41d4-a716-446655440028', nome: 'Laranja com Maracujá e Açafrão',       cat: 'Naturale',          preco: 17, custo: 6    },
  { id: '550e8400-e29b-41d4-a716-446655440029', nome: 'Panini Caprese',                       cat: 'Il Salato',         preco: 32, custo: 14   },
  { id: '550e8400-e29b-41d4-a716-446655440030', nome: 'Focaccia com Parma e Burrata',         cat: 'Il Salato',         preco: 38, custo: 18   },
  { id: '550e8400-e29b-41d4-a716-446655440031', nome: 'Sanduíche Natural Premium',            cat: 'Il Salato',         preco: 29, custo: 12.5 },
  { id: '550e8400-e29b-41d4-a716-446655440032', nome: 'Tosta de Abacate com Brie',            cat: 'Il Salato',         preco: 31, custo: 13.5 },
  { id: '550e8400-e29b-41d4-a716-446655440033', nome: 'Bagel com Salmão Gravadlax',           cat: 'Il Salato',         preco: 41, custo: 20   },
  { id: '550e8400-e29b-41d4-a716-446655440034', nome: 'Tiramisù Clássico',                    cat: 'I Nostri Dolci',    preco: 26, custo: 10.5 },
  { id: '550e8400-e29b-41d4-a716-446655440035', nome: 'Tiramisù de Pistache',                 cat: 'I Nostri Dolci',    preco: 27, custo: 11   },
  { id: '550e8400-e29b-41d4-a716-446655440036', nome: 'Torta Caprese',                        cat: 'I Nostri Dolci',    preco: 25, custo: 9.5  },
  { id: '550e8400-e29b-41d4-a716-446655440037', nome: 'Torta Tenerina',                       cat: 'I Nostri Dolci',    preco: 26, custo: 10   },
  { id: '550e8400-e29b-41d4-a716-446655440038', nome: 'Pan di Spagna com Creme Diplomat',     cat: 'I Nostri Dolci',    preco: 24, custo: 9    },
  { id: '550e8400-e29b-41d4-a716-446655440039', nome: 'Bolo de Ricotta com Chocolate',        cat: 'I Nostri Dolci',    preco: 25, custo: 9.5  },
  { id: '550e8400-e29b-41d4-a716-446655440040', nome: 'Bolo de Avelã Piemontese',             cat: 'I Nostri Dolci',    preco: 26, custo: 10.5 },
  { id: '550e8400-e29b-41d4-a716-446655440041', nome: 'Bolo de Amêndoas com Limoncello',      cat: 'I Nostri Dolci',    preco: 25, custo: 9.5  },
  { id: '550e8400-e29b-41d4-a716-446655440042', nome: 'Bolo de Laranja Siciliana',            cat: 'I Nostri Dolci',    preco: 24, custo: 9    },
  { id: '550e8400-e29b-41d4-a716-446655440043', nome: 'Dolce Vita della Casa',                cat: 'I Nostri Dolci',    preco: 28, custo: 12   },
  { id: '550e8400-e29b-41d4-a716-446655440044', nome: 'Red Velvet',                           cat: 'Bolos Gourmet',     preco: 26, custo: 11   },
  { id: '550e8400-e29b-41d4-a716-446655440045', nome: 'Chocolate Belga Fondant',              cat: 'Bolos Gourmet',     preco: 27, custo: 11.5 },
  { id: '550e8400-e29b-41d4-a716-446655440046', nome: 'Chocolate com Caramelo Salgado',       cat: 'Bolos Gourmet',     preco: 27, custo: 12   },
  { id: '550e8400-e29b-41d4-a716-446655440047', nome: 'Pistache com Framboesa',               cat: 'Bolos Gourmet',     preco: 26, custo: 11   },
  { id: '550e8400-e29b-41d4-a716-446655440048', nome: 'Coco Tropical',                        cat: 'Bolos Gourmet',     preco: 24, custo: 10   },
  { id: '550e8400-e29b-41d4-a716-446655440049', nome: 'Matcha com Yuzu',                      cat: 'Bolos Gourmet',     preco: 25, custo: 10.5 },
  { id: '550e8400-e29b-41d4-a716-446655440050', nome: 'Café com Caramelo e Whisky',           cat: 'Bolos Gourmet',     preco: 26, custo: 11.5 },
  { id: '550e8400-e29b-41d4-a716-446655440051', nome: 'Torta de Limão Siciliano',             cat: 'Tortas',            preco: 28, custo: 12   },
  { id: '550e8400-e29b-41d4-a716-446655440052', nome: 'Torta de Chocolate com Caramelo Salgado', cat: 'Tortas',        preco: 30, custo: 13.5 },
  { id: '550e8400-e29b-41d4-a716-446655440053', nome: 'Crostata de Ricotta e Cítricos',       cat: 'Tortas',            preco: 27, custo: 11.5 },
  { id: '550e8400-e29b-41d4-a716-446655440054', nome: 'Torta Maçã Tatin',                     cat: 'Tortas',            preco: 26, custo: 11   },
  { id: '550e8400-e29b-41d4-a716-446655440055', nome: 'Pecan Maple Pie',                      cat: 'Tortas',            preco: 29, custo: 12.5 },
  { id: '550e8400-e29b-41d4-a716-446655440056', nome: 'Torta de Pêra com Gorgonzola',         cat: 'Tortas',            preco: 28, custo: 12   },
  { id: '550e8400-e29b-41d4-a716-446655440057', nome: 'Torta de Frutas Vermelhas',             cat: 'Tortas',            preco: 27, custo: 11.5 },
  { id: '550e8400-e29b-41d4-a716-446655440058', nome: 'Torta de Chocolate Amargo',             cat: 'Tortas',            preco: 29, custo: 13   },
  { id: '550e8400-e29b-41d4-a716-446655440059', nome: 'Cheesecake de Frutas Vermelhas',        cat: 'Cheesecakes',       preco: 28, custo: 12.5 },
  { id: '550e8400-e29b-41d4-a716-446655440060', nome: 'Cheesecake de Amarena',                 cat: 'Cheesecakes',       preco: 27, custo: 12   },
  { id: '550e8400-e29b-41d4-a716-446655440061', nome: 'Cheesecake de Pistache',                cat: 'Cheesecakes',       preco: 28, custo: 12.5 },
  { id: '550e8400-e29b-41d4-a716-446655440062', nome: 'Cheesecake de Chocolate Branco',        cat: 'Cheesecakes',       preco: 27, custo: 12   },
  { id: '550e8400-e29b-41d4-a716-446655440063', nome: 'Cheesecake de Limão Siciliano',         cat: 'Cheesecakes',       preco: 26, custo: 11.5 },
  { id: '550e8400-e29b-41d4-a716-446655440064', nome: 'Brownie 70% Cacau',                     cat: 'Brownies',          preco: 16, custo: 6    },
  { id: '550e8400-e29b-41d4-a716-446655440065', nome: 'Brownie de Nutella',                    cat: 'Brownies',          preco: 17, custo: 6.5  },
  { id: '550e8400-e29b-41d4-a716-446655440066', nome: 'Brownie de Caramelo Salgado',           cat: 'Brownies',          preco: 16, custo: 6    },
  { id: '550e8400-e29b-41d4-a716-446655440067', nome: 'Brownie de Café Expresso',              cat: 'Brownies',          preco: 16, custo: 6    },
  { id: '550e8400-e29b-41d4-a716-446655440068', nome: 'Brownie Branco com Pistache',           cat: 'Brownies',          preco: 17, custo: 6.5  },
  { id: '550e8400-e29b-41d4-a716-446655440069', nome: 'Brownie de Doce de Leite',              cat: 'Brownies',          preco: 16, custo: 6    },
  { id: '550e8400-e29b-41d4-a716-446655440070', nome: 'Cookie Chocolate Belga',                cat: 'Cookies',           preco: 16, custo: 5.5  },
  { id: '550e8400-e29b-41d4-a716-446655440071', nome: 'Cookie Duplo Chocolate',                cat: 'Cookies',           preco: 16, custo: 5.5  },
  { id: '550e8400-e29b-41d4-a716-446655440072', nome: 'Cookie de Chocolate com Flor de Sal',   cat: 'Cookies',           preco: 15, custo: 5    },
  { id: '550e8400-e29b-41d4-a716-446655440073', nome: 'Cookie Matcha com Chocolate Branco',    cat: 'Cookies',           preco: 16, custo: 5.5  },
  { id: '550e8400-e29b-41d4-a716-446655440074', nome: 'Cookie Pistache com Chocolate Branco',  cat: 'Cookies',           preco: 16, custo: 5.5  },
  { id: '550e8400-e29b-41d4-a716-446655440075', nome: 'Brookie',                               cat: 'Cookies',           preco: 17, custo: 6    },
  { id: '550e8400-e29b-41d4-a716-446655440076', nome: 'Cookie Aveia com Chocolate',            cat: 'Cookies',           preco: 15, custo: 5    },
  { id: '550e8400-e29b-41d4-a716-446655440077', nome: 'Espresso Martini',                      cat: 'Aperitivo & Drinks', preco: 36, custo: 14  },
  { id: '550e8400-e29b-41d4-a716-446655440078', nome: 'Spritz Italiano',                       cat: 'Aperitivo & Drinks', preco: 32, custo: 12  },
  { id: '550e8400-e29b-41d4-a716-446655440079', nome: 'Negroni Sbagliato',                     cat: 'Aperitivo & Drinks', preco: 38, custo: 15  },
  { id: '550e8400-e29b-41d4-a716-446655440080', nome: 'Caffè Corretto',                        cat: 'Aperitivo & Drinks', preco: 21, custo: 6   },
  { id: '550e8400-e29b-41d4-a716-446655440081', nome: 'Limoncello Sparkler',                   cat: 'Aperitivo & Drinks', preco: 31, custo: 11  },
  { id: '550e8400-e29b-41d4-a716-446655440082', nome: 'Bellini',                               cat: 'Aperitivo & Drinks', preco: 34, custo: 13  },
  { id: '550e8400-e29b-41d4-a716-446655440083', nome: 'Hugo Spritz',                           cat: 'Aperitivo & Drinks', preco: 33, custo: 12.5},
  { id: '550e8400-e29b-41d4-a716-446655440084', nome: 'Affogato Martini',                      cat: 'Aperitivo & Drinks', preco: 35, custo: 14.5},
  { id: '550e8400-e29b-41d4-a716-446655440085', nome: 'Buongiorno',                            cat: 'I Momenti',         preco: 42, custo: 17   },
  { id: '550e8400-e29b-41d4-a716-446655440086', nome: 'Pausa',                                 cat: 'I Momenti',         preco: 36, custo: 14   },
  { id: '550e8400-e29b-41d4-a716-446655440087', nome: 'Dolce Pomeriggio Doce',                 cat: 'I Momenti',         preco: 48, custo: 19   },
  { id: '550e8400-e29b-41d4-a716-446655440088', nome: 'Dolce Pomeriggio Salgado',              cat: 'I Momenti',         preco: 51, custo: 22   },
  { id: '550e8400-e29b-41d4-a716-446655440089', nome: 'Degustazione',                          cat: 'I Momenti',         preco: 92, custo: 38   },
  { id: '550e8400-e29b-41d4-a716-446655440090', nome: 'Tour dell\'Italia Dolce',               cat: 'I Momenti',         preco: 46, custo: 18   },
];

// ── RNG determinístico (xorshift) ─────────────────────────────────────────
function makeRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
const TIPOS = ['estabelecimento','estabelecimento','estabelecimento','drive-thru','drive-thru','delivery'];
const HOUR_POOL = [7,8,8,8,9,9,9,9,9,10,10,10,11,11,12,12,13,14,14,14,15,15,15,16,17,18,18,19,20];

function dayFactor(date) {
  const d = date.getDay();
  if (d === 6) return 1.55; // sábado
  if (d === 0) return 1.35; // domingo
  if (d === 5) return 1.20; // sexta
  return 1.0;
}

function buildItems(rng, count) {
  const map = new Map();
  for (let i = 0; i < count; i++) {
    const p = PRODUCTS[Math.floor(rng() * PRODUCTS.length)];
    if (map.has(p.id)) map.get(p.id).qty++;
    else map.set(p.id, { product_id: p.id, nome: p.nome, cat: p.cat, qty: 1, price: p.preco, custo: p.custo });
  }
  return [...map.values()];
}

let globalCodeCounter = 200001;

// ── Seed de um mês ─────────────────────────────────────────────────────────
async function seedMonth({ year, month, avgPerDay, seed, userIds, codeOffset = 0 }) {
  const label = new Date(year, month, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);

  // Checa se já existe SEED neste período (prefixo S)
  const start = new Date(year, month, 1).toISOString();
  const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lte('created_at', end)
    .like('codigo', 'S%');

  if (count > 0) {
    console.log(`⚠️  ${labelCap} já tem seed (${count} pedidos) — pulando.`);
    return;
  }

  const rng = makeRng(seed);
  const days = new Date(year, month + 1, 0).getDate();
  let totalOrders = 0;
  let totalReceita = 0;
  let codeCounter = 200001 + codeOffset;

  console.log(`\n📅 Seedando ${labelCap}...`);

  for (let day = 1; day <= days; day++) {
    const date = new Date(year, month, day);
    const factor = dayFactor(date);
    const ordersToday = Math.max(18, Math.round(avgPerDay * factor * (0.80 + rng() * 0.40)));

    const orderRows = [];
    const orderMeta = [];

    for (let o = 0; o < ordersToday; o++) {
      const h    = HOUR_POOL[Math.floor(rng() * HOUR_POOL.length)];
      const min  = Math.floor(rng() * 60);
      const sec  = Math.floor(rng() * 60);
      const tipo = TIPOS[Math.floor(rng() * TIPOS.length)];
      const itemCount = 2 + Math.floor(rng() * 3); // 2–4 itens
      const items = buildItems(rng, itemCount);
      const total = items.reduce((s, i) => s + i.qty * i.price, 0);
      const createdAt = new Date(year, month, day, h, min, sec).toISOString();
      const codigo = `S${String(codeCounter++).padStart(9, '0')}`;

      const userId = userIds?.length ? userIds[Math.floor(rng() * userIds.length)] : null;
      orderRows.push({ user_id: userId, codigo, tipo, total: parseFloat(total.toFixed(2)), status: 'finalizado', created_at: createdAt });
      orderMeta.push({ items, tipo, createdAt });
      totalReceita += total;
    }

    // Insere os pedidos do dia em lote
    const { data: inserted, error: ordErr } = await supabase
      .from('orders').insert(orderRows).select('id');

    if (ordErr) {
      console.error(`  ✗ Erro nos pedidos do dia ${day}:`, ordErr.message);
      continue;
    }

    // Monta e insere order_items (trigger popula vendas_itens automaticamente)
    const orderItems = [];
    const vendasItens = [];

    inserted.forEach((dbOrd, idx) => {
      const { items, tipo, createdAt } = orderMeta[idx];
      items.forEach((item) => {
        orderItems.push({
          order_id:       dbOrd.id,
          product_id:     item.product_id,
          qty:            item.qty,
          price:          item.price,
          custo_unitario: item.custo,
        });
        vendasItens.push({
          order_id:         dbOrd.id,
          product_id:       item.product_id,
          produto_nome:     item.nome,
          categoria:        item.cat,
          tipo:             tipo,
          qty:              item.qty,
          price:            item.price,
          order_created_at: createdAt,
        });
      });
    });

    if (orderItems.length > 0) {
      const { error: oiErr } = await supabase.from('order_items').insert(orderItems);
      if (oiErr) console.error(`  ✗ order_items dia ${day}:`, oiErr.message);
    }

    // Insere vendas_itens sem order_item_id (NULL não viola UNIQUE)
    // Isso garante dados no dashboard mesmo que o trigger não esteja ativo
    if (vendasItens.length > 0) {
      const { error: viErr } = await supabase.from('vendas_itens').insert(vendasItens);
      // Ignora erro silenciosamente (pode ser duplicata se trigger funcionou)
      if (viErr && !viErr.message?.includes('duplicate') && !viErr.message?.includes('unique')) {
        console.error(`  ✗ vendas_itens dia ${day}:`, viErr.message);
      }
    }

    totalOrders += ordersToday;
    process.stdout.write(`  Dia ${String(day).padStart(2,'0')}/${days} — ${ordersToday} pedidos | Receita acumulada: R$ ${totalReceita.toFixed(0).padStart(8)}\r`);
  }

  const custoEstimado = totalReceita * 0.40;
  const lucroEstimado = totalReceita - custoEstimado - 51360;
  console.log(`\n  ✅ ${totalOrders} pedidos | Receita: R$ ${totalReceita.toFixed(2)} | Lucro est.: R$ ${lucroEstimado.toFixed(2)}`);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando seed de pedidos históricos...\n');

  // Busca clientes existentes
  const { data: users, error: ue } = await supabase
    .from('users').select('id').eq('tipo_acesso', 'cliente').limit(30);

  if (ue || !users?.length) {
    console.error('❌ Nenhum cliente encontrado no banco. Cadastre ao menos um cliente antes de rodar o seed.');
    process.exit(1);
  }
  console.log(`👥 ${users.length} cliente(s) encontrado(s).`);

  // Distribui pedidos entre os clientes existentes (será feito via user_id aleatório)
  // orders.user_id pode ser null se RLS não permitir — o script tenta sem user_id como fallback
  const userIds = users.map(u => u.id);

  // Metas calibradas para atingir os lucros desejados
  // (avgPerDay * 65 ticket_médio * dias ≈ receita_alvo)
  const MONTHS = [
    { year: 2025, month: 11, avgPerDay: 56, seed: 112025, codeOffset:      0 }, // Dez – códigos a partir de S000200001
    { year: 2026, month:  0, avgPerDay: 43, seed:  12026, codeOffset:  10000 }, // Jan – a partir de S000210001
    { year: 2026, month:  1, avgPerDay: 57, seed:  22026, codeOffset:  20000 }, // Fev – a partir de S000220001
    { year: 2026, month:  2, avgPerDay: 33, seed:  32026, codeOffset:  30000 }, // Mar – a partir de S000230001
  ];

  for (const m of MONTHS) {
    await seedMonth({ ...m, userIds });
  }

  console.log('\n🎉 Seed concluído! Recarregue o dashboard para ver os dados.');
}

main().catch((err) => { console.error('❌ Erro fatal:', err); process.exit(1); });
