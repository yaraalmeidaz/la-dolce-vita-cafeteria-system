import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../auth/AuthContext";
import { products as produtosData } from "../services/data";
import { supabase } from "../services/supabase";
import { readCache, writeCache, readFlag, writeFlag } from "../services/localCache";
import cardapioLogo from "../assets/cardapio/cardapio.svg";
import ilCaffeLogo from "../assets/cardapio/IlCaffè.svg";
import frescamenteLogo from "../assets/cardapio/frescamente.svg";
import infusoesLogo from "../assets/cardapio/infusoes.svg";
import naturaleLogo from "../assets/cardapio/Naturale.png";
import ilSalatoLogo from "../assets/cardapio/IlSalato.png";
import iNostriDolciLogo from "../assets/cardapio/INostriDolci.png";
import bolosLogo from "../assets/cardapio/Bolos.png";
import tortasLogo from "../assets/cardapio/Tortas.png";
import cheesecakesLogo from "../assets/cardapio/cheescakes.png";
import browniesLogo from "../assets/cardapio/Brownies.png";
import cookiesLogo from "../assets/cardapio/Cookies.png";
import bebidasLogo from "../assets/cardapio/bebidas.png";
import iMomentiLogo from "../assets/cardapio/IMomenti.png";

function loadNumberedPngs(globResult) {
  const list = Object.entries(globResult)
    .map(([path, mod]) => ({ path, src: mod?.default || mod }))
    .filter((x) => x.src);

  list.sort((a, b) => {
    const aName = String(a.path).split('/').pop() || '';
    const bName = String(b.path).split('/').pop() || '';
    const aNum = Number.parseInt(aName.replace(/\.png$/i, ''), 10);
    const bNum = Number.parseInt(bName.replace(/\.png$/i, ''), 10);
    if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) return aNum - bNum;
    return aName.localeCompare(bName, 'pt-BR');
  });

  return list.map((x) => x.src);
}

const ilCaffeImagens = loadNumberedPngs(import.meta.glob('../assets/Ilcaffe/*.png', { eager: true }));
const frescamenteImagens = loadNumberedPngs(import.meta.glob('../assets/Frescamente/*.png', { eager: true }));
const infusoesImagens = loadNumberedPngs(import.meta.glob('../assets/Infusões/*.png', { eager: true }));
const naturaleImagens = loadNumberedPngs(import.meta.glob('../assets/Naturale/*.png', { eager: true }));
const ilSalatoImagens = loadNumberedPngs(import.meta.glob('../assets/IlSalato/*.png', { eager: true }));
const iNostriDolciImagens = loadNumberedPngs(import.meta.glob('../assets/INostriDolci/*.png', { eager: true }));
const bolosGourmetImagens = loadNumberedPngs(import.meta.glob('../assets/BolosGourmet/*.png', { eager: true }));
const tortasImagens = loadNumberedPngs(import.meta.glob('../assets/Tortas/*.png', { eager: true }));
const cheesecakesImagens = loadNumberedPngs(import.meta.glob('../assets/Cheesecakes/*.png', { eager: true }));
const browniesImagens = loadNumberedPngs(import.meta.glob('../assets/Brownies/*.png', { eager: true }));
const cookiesImagens = loadNumberedPngs(import.meta.glob('../assets/Cookies/*.png', { eager: true }));
const aperitivoDrinksImagens = loadNumberedPngs(import.meta.glob('../assets/Aperitivo&Drinks/*.png', { eager: true }));
const iMomentiImagens = loadNumberedPngs(import.meta.glob('../assets/IMomenti/*.png', { eager: true }));

export default function Cardapio({ showPedidosAbertos = false }) {
  const { addItem, items, decrease } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todas");
  const [pedidosAbertos, setPedidosAbertos] = useState([]);

  const PRODUCTS_CACHE_KEY = "cafeteria_products_cache_v1";
  const PRODUCTS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
  const PRODUCTS_SYNC_FLAG_KEY = "cafeteria_products_sync_flag_v1";
  const PRODUCTS_SYNC_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

  const [products, setProducts] = useState(() => {
    const cached = readCache(PRODUCTS_CACHE_KEY, { ttlMs: PRODUCTS_CACHE_TTL_MS });
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = readCache(PRODUCTS_CACHE_KEY, { ttlMs: PRODUCTS_CACHE_TTL_MS });
    return !Array.isArray(cached) || cached.length === 0;
  });
  const [comboSelecionado, setComboSelecionado] = useState(null);
  const [itensCombo, setItensCombo] = useState({});
  const [quantidades, setQuantidades] = useState({});
  const [toastMessage, setToastMessage] = useState("");

  const aumentarQuantidade = (produtoId) => {
    setQuantidades(prev => ({
      ...prev,
      [produtoId]: (prev[produtoId] || 0) + 1
    }));
  };

  const diminuirQuantidade = (produtoId) => {
    setQuantidades(prev => {
      const novaQuantidade = (prev[produtoId] || 0) - 1;
      if (novaQuantidade <= 0) {
        const { [produtoId]: _, ...resto } = prev;
        return resto;
      }
      return {
        ...prev,
        [produtoId]: novaQuantidade
      };
    });
  };

  useEffect(() => {
    loadProducts();
    console.log('Cardapio useEffect - user:', user);
    if (user) {
      loadPedidosAbertos();
    }
  }, [user]);

  async function loadProducts() {
    console.log('Carregando produtos...');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('categoria', { ascending: true });

    console.log('Produtos carregados:', data?.length, 'erro:', error);
    if (!error && data) {
      // Verificar se temos todos os produtos necessários (pelo menos 90 produtos)
      const hasAllProducts = data.length >= 90;

      const syncFlag = readFlag(PRODUCTS_SYNC_FLAG_KEY, { maxAgeMs: PRODUCTS_SYNC_MAX_AGE_MS });
      const shouldRunHeavySync = !syncFlag || !hasAllProducts;

      let currentData = data;

      if (!hasAllProducts) {
        console.log('Cardápio incompleto. Adicionando produtos faltantes...');

        // Filtrar produtos que já existem (por nome)
        const existingNames = new Set(currentData.map(p => p.nome));
        const productsToAdd = produtosData.filter(p => !existingNames.has(p.nome));

        if (productsToAdd.length > 0) {
          console.log(`Adicionando ${productsToAdd.length} produtos...`);
          const { error: insertError } = await supabase
            .from('products')
            .insert(productsToAdd);

          if (insertError) {
            console.error('Erro ao inserir produtos:', insertError);
          } else {
            console.log('Produtos adicionados com sucesso!');
          }
        }

        // Recarregar após possível inserção
        const { data: reloadedData } = await supabase
          .from('products')
          .select('*')
          .order('categoria', { ascending: true });
        currentData = reloadedData || currentData;
      }

      // Correção leve (sempre): alguns cookies estavam cadastrados em "I Nostri Dolci".
      // Mantém o cardápio consistente sem depender da sync pesada (24h).
      const cookieFixes = [
        'Cookie Chocolate Belga',
        'Cookie Matcha com Chocolate Branco',
        'Cookie Aveia com Chocolate',
        'Cookie Pistache com Chocolate Branco',
      ];

      const needsCookieFix = cookieFixes.some((nome) => {
        const p = currentData.find((x) => x.nome === nome);
        return p && String(p.categoria || '') !== 'Cookies';
      });

      if (needsCookieFix) {
        await Promise.all(
          cookieFixes.map((nome) =>
            supabase
              .from('products')
              .update({ categoria: 'Cookies' })
              .eq('nome', nome)
          )
        );

        const { data: reloadedAfterFix } = await supabase
          .from('products')
          .select('*')
          .order('categoria', { ascending: true });

        currentData = reloadedAfterFix || currentData;
      }

      if (shouldRunHeavySync) {
        // Atualizar categorias dos produtos existentes
        console.log('Sincronizando categorias com data.js...');
        const updatePromises = produtosData.map(async (produtoLocal) => {
          const produtoDb = currentData.find(p => p.nome === produtoLocal.nome);
          if (produtoDb && produtoDb.categoria !== produtoLocal.categoria) {
            console.log(`Atualizando categoria de ${produtoLocal.nome}: ${produtoDb.categoria} -> ${produtoLocal.categoria}`);
            return supabase
              .from('products')
              .update({ categoria: produtoLocal.categoria })
              .eq('nome', produtoLocal.nome);
          }
          return null;
        });

        await Promise.all(updatePromises.filter(p => p !== null));

        // Recarregar após atualizações
        const { data: newData } = await supabase
          .from('products')
          .select('*')
          .order('categoria', { ascending: true });
        const finalData = newData || currentData || [];
        setProducts(finalData);
        writeCache(PRODUCTS_CACHE_KEY, finalData);
        writeFlag(PRODUCTS_SYNC_FLAG_KEY, true);
      } else {
        const finalData = currentData || [];
        setProducts(finalData);
        writeCache(PRODUCTS_CACHE_KEY, finalData);
      }
    }
    setLoading(false);
  }

  async function loadPedidosAbertos() {
    console.log('Carregando pedidos abertos para user:', user?.id);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'entregue')
      .order('created_at', { ascending: false });

    console.log('Pedidos abertos carregados:', data?.length, 'erro:', error);
    if (!error && data) {
      setPedidosAbertos(data);
    }
  }

  const combosConfig = {
    "Buongiorno": {
      preco: 42,
      itens: [
        { tipo: "Bebida", opcoes: ["Cappuccino Classico", "Latte Artístico", "Espresso Italiano"] },
        { tipo: "Salgado", opcoes: ["Tosta de Abacate com Brie", "Panini Caprese", "Sanduíche Natural Premium"] },
        { tipo: "Doce", opcoes: ["Cookie Chocolate Belga", "Cookie Duplo Chocolate", "Tiramisù Clássico"] }
      ]
    },
    "Pausa": {
      preco: 36,
      itens: [
        { tipo: "Bebida", opcoes: ["Espresso Italiano", "Americano", "Café Filtrado Especial"] },
        { tipo: "Doce", opcoes: ["Brownie 70% Cacau", "Brownie de Nutella", "Tiramisù Clássico"] }
      ]
    },
    "Dolce Pomeriggio Doce": {
      preco: 48,
      itens: [
        { tipo: "Bebida", opcoes: ["Frapuccino Signature", "Frapê de Mocha com Gelato", "Matcha Latte Tradicional"] },
        { tipo: "Doce 1", opcoes: ["Brownie 70% Cacau", "Brownie de Nutella", "Cookie Chocolate Belga"] },
        { tipo: "Doce 2", opcoes: ["Cookie Duplo Chocolate", "Cookie Pistache com Chocolate Branco", "Tiramisù Clássico"] }
      ]
    },
    "Dolce Pomeriggio Salgado": {
      preco: 51,
      itens: [
        { tipo: "Bebida", opcoes: ["Espresso Italiano", "Cold Brew da Casa", "Americano"] },
        { tipo: "Salgado", opcoes: ["Panini Caprese", "Sanduíche Natural Premium", "Focaccia com Parma e Burrata"] }
      ]
    },
    "Degustazione": {
      preco: 92,
      itens: [
        { tipo: "Doce 1", opcoes: ["Tiramisù Clássico", "Torta Caprese", "Cheesecake de Frutas Vermelhas"] },
        { tipo: "Doce 2", opcoes: ["Bolo de Avelã Piemontese", "Red Velvet", "Torta de Limão Siciliano"] },
        { tipo: "Doce 3", opcoes: ["Brownie 70% Cacau", "Cookie Chocolate Belga", "Dolce Vita della Casa"] },
        { tipo: "Fruta", opcoes: ["Verde Vital", "Dolce Arancia", "Abacaxi com Hortelã e Gengibre"] },
        { tipo: "Bebida", opcoes: ["Espresso Italiano", "Chá Verde Jasmine", "Cold Brew da Casa"] }
      ]
    },
    "Tour dell'Italia Dolce": {
      preco: 46,
      itens: [
        { tipo: "Bebida", opcoes: ["Espresso Italiano", "Macchiato", "Cappuccino Classico"] },
        { tipo: "Doce 1", opcoes: ["Tiramisù Clássico", "Torta Caprese", "Pan di Spagna com Creme Diplomat"] },
        { tipo: "Doce 2", opcoes: ["Bolo de Ricotta com Chocolate", "Dolce Vita della Casa", "Torta Tenerina"] },
        { tipo: "Doce 3", opcoes: ["Bolo de Laranja Siciliana", "Bolo de Amêndoas com Limoncello", "Tiramisù de Pistache"] }
      ]
    }
  };

  const descriçõesProdutos = {
    // Il Caffè
    "Espresso Italiano": "Clássico italiano, curto, encorpado e marcante.",
    "Espresso Duplo": "Dose dupla de espresso, intenso e aromático.",
    "Macchiato": "Espresso intenso finalizado com um toque delicado de espuma de leite.",
    "Americano": "Espresso diluído em água quente, sabor suave e elegante.",
    "Cappuccino Classico": "Equilíbrio perfeito entre espresso, leite vaporizado e espuma.",
    "Latte Artístico": "Leite vaporizado aveludado sobre espresso, com latte art.",
    "Mocha Italiano": "Espresso encorpado com chocolate belga e leite vaporizado.",
    "Shakerato": "Espresso batido com gelo, textura sedosa e refrescante.",
    "Caffè Affogato": "Gelato artesanal de baunilha servido com espresso quente.",
    "Café Filtrado Especial": "Café de origem selecionada, extração suave e aromática.",
    
    // Frescamente
    "Frapuccino Signature": "Café gelado batido, cremoso e refrescante.",
    "Frapê de Mocha com Gelato": "Café, chocolate e gelato artesanal de baunilha.",
    "Frapê de Matcha Ceremonial": "Matcha premium batido com leite gelado.",
    "Cold Brew da Casa": "Café extraído a frio por longa infusão.",
    "Cold Brew com Tônica": "Cold brew servido com água tônica e gelo.",
    "Iced Latte com Syrup Premium": "Espresso gelado com leite e xarope artesanal.",
    
    // Infusões
    "Matcha Latte Tradicional": "Matcha batido à mão com leite quente.",
    "Matcha Latte Especial": "Matcha cerimonial com leite vaporizado.",
    "Chai Latte Artesanal": "Chá preto com especiarias e leite cremoso.",
    "Chá Preto Inglês": "Clássico encorpado e aromático.",
    "Chá Verde Jasmine": "Chá verde delicado com notas florais.",
    "Chá de Ervas Italiano": "Blend aromático de ervas suaves e cítricas.",
    
    // Naturale
    "Verde Vital": "Maçã verde, folhas frescas e toque de gengibre.",
    "Dolce Arancia": "Laranja com notas suaves e adocicadas.",
    "Rosso Intenso": "Beterraba, frutas e frescor equilibrado.",
    "Abacaxi com Hortelã e Gengibre": "Tropical, refrescante e levemente picante.",
    "Melancia com Limão e Manjericão": "Refrescante e leve, ideal para dias quentes.",
    "Laranja com Maracujá e Açafrão": "Cítrico, aromático e levemente especiado.",
    
    // Il Salato
    "Panini Caprese": "Ciabatta crocante com muçarela de búfala e tomate.",
    "Focaccia com Parma e Burrata": "Focaccia artesanal com presunto parma e burrata.",
    "Sanduíche Natural Premium": "Pão integral com recheio leve e equilibrado.",
    "Tosta de Abacate com Brie": "Sourdough tostado com abacate e queijo brie.",
    "Bagel com Salmão Gravadlax": "Bagel macio com salmão curado e creme suave.",
    
    // I Nostri Dolci
    "Tiramisù Clássico": "Creme de mascarpone com café espresso.",
    "Tiramisù de Pistache": "Versão sofisticada com pistache italiano.",
    "Torta Caprese": "Chocolate intenso com amêndoas.",
    "Torta Tenerina": "Chocolate cremoso por dentro e delicado.",
    "Pan di Spagna com Creme Diplomat": "Massa leve com creme suave.",
    "Bolo de Ricotta com Chocolate": "Macio, delicado e levemente adocicado.",
    "Bolo de Avelã Piemontese": "Sabor intenso de avelãs italianas.",
    "Bolo de Amêndoas com Limoncello": "Notas cítricas e textura úmida.",
    "Bolo de Laranja Siciliana": "Aromático, leve e naturalmente adocicado.",
    "Dolce Vita della Casa": "Assinatura da casa com café e mascarpone.",
    
    // Bolos Gourmet
    "Red Velvet": "Clássico aveludado com cream cheese.",
    "Chocolate Belga Fondant": "Centro cremoso de chocolate intenso.",
    "Chocolate com Caramelo Salgado": "Equilíbrio perfeito entre doce e salgado.",
    "Pistache com Framboesa": "Combinação sofisticada e equilibrada.",
    "Coco Tropical": "Leve, aromático e delicadamente adocicado.",
    "Matcha com Yuzu": "Sabor único com notas cítricas.",
    "Café com Caramelo e Whisky": "Sofisticado e intenso.",
    
    // Tortas
    "Torta de Limão Siciliano": "Cítrica, cremosa e refrescante.",
    "Torta de Chocolate com Caramelo Salgado": "Chocolate intenso com toque salgado.",
    "Crostata de Ricotta e Cítricos": "Delicada e levemente adocicada.",
    "Torta Maçã Tatin": "Maçãs caramelizadas sobre massa crocante.",
    "Pecan Maple Pie": "Nozes pecã com xarope de maple.",
    "Torta de Pêra com Gorgonzola": "Combinação elegante de doce e salgado.",
    "Torta de Frutas Vermelhas": "Frescor e equilíbrio em cada fatia.",
    "Torta de Chocolate Amargo": "Intenso e pouco doce.",
    
    // Cheesecakes
    "Cheesecake de Frutas Vermelhas": "Cremoso com calda de frutas frescas.",
    "Cheesecake de Amarena": "Cerejas italianas sobre base cremosa.",
    "Cheesecake de Pistache": "Sofisticado e delicadamente adocicado.",
    "Cheesecake de Chocolate Branco": "Suave e aveludado.",
    "Cheesecake de Limão Siciliano": "Cítrico e refrescante.",
    
    // Brownies
    "Brownie 70% Cacau": "Chocolate intenso e pouco doce.",
    "Brownie de Nutella": "Chocolate intenso com recheio cremoso.",
    "Brownie de Caramelo Salgado": "Equilíbrio perfeito entre doce e salgado.",
    "Brownie de Café Expresso": "Chocolate com notas marcantes de café.",
    "Brownie Branco com Pistache": "Textura macia com pistache crocante.",
    "Brownie de Doce de Leite": "Cremoso e delicadamente adocicado.",
    
    // Cookies
    "Cookie de Chocolate Belga": "Chocolate premium com textura crocante.",
    "Cookie Duplo Chocolate": "Massa macia com pedaços generosos.",
    "Cookie de Chocolate com Flor de Sal": "Chocolate intenso com toque salgado.",
    "Cookie de Pistache com Chocolate Branco": "Combinação sofisticada e equilibrada.",
    "Brookie": "Metade brownie, metade cookie.",
    
    // Aperitivo & Drinks
    "Espresso Martini": "Café, vodka e cremosidade perfeita.",
    "Spritz Italiano": "Refrescante, leve e aromático.",
    "Negroni Sbagliato": "Clássico italiano com prosecco.",
    "Caffè Corretto": "Espresso com toque de licor italiano.",
    "Limoncello Sparkler": "Cítrico, leve e refrescante.",
    "Bellini": "Prosecco com purê de frutas.",
    "Hugo Spritz": "Prosecco com notas florais.",
    "Affogato Martini": "Drink cremoso com café e licor.",
    
    // I Momenti
    "Buongiorno": "Café da manhã completo e equilibrado.",
    "Pausa": "Café com doce artesanal.",
    "Dolce Pomeriggio Doce": "Bebida quente ou gelada com doces.",
    "Dolce Pomeriggio Salgado": "Café especial com opção salgada.",
    "Degustazione": "Seleção de doces e bebidas para compartilhar.",
    "Tour dell'Italia Dolce": "Trio de sobremesas italianas com espresso."
  };

  const abrirCombo = (comboNome) => {
    setComboSelecionado(comboNome);
    setItensCombo({});
  };

  const fecharCombo = () => {
    setComboSelecionado(null);
    setItensCombo({});
  };

  const selecionarItemCombo = (tipo, itemNome) => {
    setItensCombo(prev => ({
      ...prev,
      [tipo]: itemNome
    }));
  };

  const adicionarComboCarrinho = () => {
    const config = combosConfig[comboSelecionado];
    const itensSelecionados = Object.values(itensCombo);
    
    if (itensSelecionados.length !== config.itens.length) {
      setToastMessage("Por favor, selecione todos os itens do combo.");
      setTimeout(() => setToastMessage(""), 2600);
      return;
    }

    const iMomentiList = Array.isArray(products)
      ? products.filter((p) => p?.categoria === 'I Momenti')
      : [];
    const iMomentiIndex = iMomentiList.findIndex((p) => p?.nome === comboSelecionado);

    const comboCompleto = {
      id: `combo_${comboSelecionado}_${Date.now()}`,
      name: `${comboSelecionado} (Combo Personalizado)`,
      price: config.preco,
      itens: itensSelecionados,
      comboBase: comboSelecionado,
      image: iMomentiIndex >= 0 ? iMomentiImagens?.[iMomentiIndex] : undefined,
    };

    addItem(comboCompleto);
    fecharCombo();
    setToastMessage("");
  };

  const produtosFiltrados = products;

  const getComboQty = (comboNome) => {
    const list = Array.isArray(items) ? items : [];
    let total = 0;
    for (const it of list) {
      if (!it) continue;
      if (it.comboBase && it.comboBase === comboNome) {
        total += Number(it.qty || 0);
        continue;
      }
      // compatibilidade com combos antigos já no carrinho
      const id = String(it.id || '');
      const name = String(it.name || '');
      if (id.startsWith(`combo_${comboNome}_`) || name.startsWith(`${comboNome} (Combo`)) {
        total += Number(it.qty || 0);
      }
    }
    return total;
  };

  const removerUmCombo = (comboNome) => {
    const list = Array.isArray(items) ? items : [];
    // remove o último adicionado (mais recente), se possível
    for (let idx = list.length - 1; idx >= 0; idx -= 1) {
      const it = list[idx];
      if (!it) continue;
      if (it.comboBase && it.comboBase === comboNome) {
        decrease(it.id);
        return;
      }
      const id = String(it.id || '');
      const name = String(it.name || '');
      if (id.startsWith(`combo_${comboNome}_`) || name.startsWith(`${comboNome} (Combo`)) {
        decrease(it.id);
        return;
      }
    }
  };

  const formatarTipoCombo = (tipo) => {
    const valor = String(tipo || '').trim().toLowerCase();
    if (valor === 'doce 1' || valor === 'doce1') return 'Primeiro Doce';
    if (valor === 'doce 2' || valor === 'doce2') return 'Segundo Doce';
    if (valor === 'doce 3' || valor === 'doce3') return 'Terceiro Doce';
    return tipo;
  };

  // Ordem específica das categorias para exibição quando "Todas" está selecionado
  const ordemCategorias = [
    "Il Caffè",
    "Frescamente",
    "Infusões",
    "Naturale",
    "Il Salato",
    "I Nostri Dolci",
    "Bolos Gourmet",
    "Tortas",
    "Cheesecakes",
    "Brownies",
    "Cookies",
    "Aperitivo & Drinks",
    "I Momenti"
  ];

  const categorias = ["Todas", ...ordemCategorias];

  const sectionRefs = useRef({});
  const buttonRefs = useRef({});

  const slugCategoria = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const categoriaBtnId = (categoria) => `btn-${slugCategoria(categoria)}`;
  const categoriaSectionId = (categoria) => `categoria-${slugCategoria(categoria)}`;

  // Função para dar scroll suave até a categoria
  const scrollParaCategoria = (categoria) => {
    if (categoria === "Todas") {
      const elemento = document.getElementById('inicio-cardapio');
      if (elemento) {
        const elementPosition = elemento.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: elementPosition, behavior: 'smooth' });
      }
      setCategoriaSelecionada("Todas");
    } else {
      const elemento =
        sectionRefs.current?.[categoria] ||
        document.getElementById(categoriaSectionId(categoria));
      if (elemento) {
        const offset = 50; // Espaço mínimo para a barra sticky ficar coladinha
        const elementPosition = elemento.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      } else {
        console.warn('[Cardapio] Seção de categoria não encontrada para scroll:', {
          categoria,
          sectionId: categoriaSectionId(categoria),
          refsDisponiveis: Object.keys(sectionRefs.current || {})
        });
      }
    }
    
    // Scroll horizontal da barra de categorias para mostrar o botão selecionado
    setTimeout(() => {
      const botaoSelecionado =
        buttonRefs.current?.[categoria] ||
        document.getElementById(categoriaBtnId(categoria));
      if (botaoSelecionado) {
        botaoSelecionado.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        console.warn('[Cardapio] Botão de categoria não encontrado para scrollIntoView:', {
          categoria,
          buttonId: categoriaBtnId(categoria),
          refsDisponiveis: Object.keys(buttonRefs.current || {})
        });
      }
    }, 100);
  };

  // Agrupar produtos por categoria mantendo a ordem
  const produtosAgrupados = ordemCategorias.reduce((acc, categoria) => {
    const produtosDaCategoria = products.filter(p => p.categoria === categoria);
    if (produtosDaCategoria.length > 0) {
      acc.push({ categoria, produtos: produtosDaCategoria });
    }
    return acc;
  }, []);

  const statusTexto = (status, tipo) => {
    switch (status) {
      case "confirmado":
        return "Pedido Confirmado";
      case "andamento":
        return "Pedido em Andamento";
      case "preparacao":
        return "Pedido em Preparação";
      case "pronto":
        return tipo === "estabelecimento" ? "Pronto para Retirada" : "Pronto";
      case "a_caminho":
        return "A Caminho";
      default:
        return "Status Desconhecido";
    }
  };

  if (loading) {
    return <div>Carregando cardápio...</div>;
  }

  // Impedir funcionários de comprar/adicionar ao carrinho
  const isFuncionario = user && (user.tipo_acesso === 'gestor' || user.tipo_acesso === 'comum');

  const exibirBarraCarrinho = !isFuncionario && (items?.length || 0) > 0;

  const categoriaTitleImgStyle = {
    height: 'clamp(72px, 18vw, 150px)',
    width: 'auto',
    maxWidth: '100%',
    display: 'block',
    objectFit: 'contain'
  };

  const imagensPorCategoria = {
    'Il Caffè': ilCaffeImagens,
    Frescamente: frescamenteImagens,
    'Infusões': infusoesImagens,
    Naturale: naturaleImagens,
    'Il Salato': ilSalatoImagens,
    'I Nostri Dolci': iNostriDolciImagens,
    'Bolos Gourmet': bolosGourmetImagens,
    Tortas: tortasImagens,
    Cheesecakes: cheesecakesImagens,
    Brownies: browniesImagens,
    Cookies: cookiesImagens,
    'Aperitivo & Drinks': aperitivoDrinksImagens,
    'I Momenti': iMomentiImagens,
  };

  return (
    <div style={{ paddingBottom: exibirBarraCarrinho ? 80 : 0 }}>
      <div id="inicio-cardapio" style={{ marginBottom: '40px', textAlign: 'left' }}>
        <img src={cardapioLogo} alt="Cardápio" style={{ maxWidth: '600px', width: '100%', height: 'auto' }} />
      </div>

      {isFuncionario && (
        <div style={{background: '#ffe0e0', border: '1px solid #ff6b35', padding: 16, borderRadius: 8, marginBottom: 24, color: '#b71c1c', fontWeight: 'bold'}}>
          Funcionários não podem realizar compras ou adicionar itens ao carrinho.
        </div>
      )}



      {/* Barra de categorias com imagens */}
      <div
        className="categorias-bar"
        style={{ display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center', flexWrap: 'nowrap', position: 'sticky', top: 0, backgroundColor: 'white', padding: '15px 0', zIndex: 100, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .categorias-bar::-webkit-scrollbar {
            display: none;
          }

          .categorias-bar button {
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0.18);
          }

          .categorias-bar button:focus-visible {
            outline: 2px solid rgba(0, 0, 0, 0.55);
            outline-offset: 2px;
            box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.14);
            border-radius: 10px;
          }

          /* Evita "tremor"/reflow em telas pequenas por causa de scale() inline */
          @media (max-width: 520px) {
            .categorias-bar button {
              transform: none !important;
            }
          }
        `}</style>
        <button
          id={categoriaBtnId('Todas')}
          ref={(el) => {
            if (el) buttonRefs.current['Todas'] = el;
          }}
          onClick={() => {
            setCategoriaSelecionada("Todas");
            scrollParaCategoria("Todas");
          }}
          style={{ 
            background: 'transparent', 
            border: 'none',
            padding: '5px 15px',
            cursor: 'pointer',
            fontFamily: "'League Spartan', sans-serif",
            fontSize: '1rem',
            fontWeight: categoriaSelecionada === "Todas" ? 700 : 400,
            color: categoriaSelecionada === "Todas" ? '#000' : 'rgba(0,0,0,0.72)',
            textTransform: 'uppercase',
            opacity: categoriaSelecionada === "Todas" ? 1 : 0.6,
            transform: categoriaSelecionada === "Todas" ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
        >
          Todas
        </button>
        {categorias.filter(cat => cat !== "Todas").map(cat => (
          <button
            id={categoriaBtnId(cat)}
            ref={(el) => {
              if (el) buttonRefs.current[cat] = el;
            }}
            key={cat}
            onClick={() => {
              setCategoriaSelecionada(cat);
              scrollParaCategoria(cat);
            }}
            style={{ 
              background: 'transparent', 
              border: 'none',
              padding: '5px 15px',
              cursor: 'pointer',
              color: categoriaSelecionada === cat ? '#000' : 'rgba(0,0,0,0.72)',
              opacity: categoriaSelecionada === cat ? 1 : 0.6,
              transform: categoriaSelecionada === cat ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s ease',
              outline: 'none'
            }}
          >
            <span style={{ 
              fontFamily: "'League Spartan', sans-serif",
              fontSize: '1rem',
              fontWeight: categoriaSelecionada === cat ? 700 : 400,
              color: categoriaSelecionada === cat ? '#000' : 'rgba(0,0,0,0.72)',
              textTransform: 'uppercase'
            }}>
              {cat}
            </span>
          </button>
        ))}
      </div>

      {/* Renderização dos produtos */}
      {produtosAgrupados.map(grupo => (
        <div 
          key={grupo.categoria} 
          id={categoriaSectionId(grupo.categoria)}
          ref={(el) => {
            if (el) sectionRefs.current[grupo.categoria] = el;
          }}
          style={{ 
            position: 'relative',
            marginBottom: '40px',
            padding: '20px 14px',
            backgroundColor: categoriaSelecionada === grupo.categoria ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
            borderLeft: categoriaSelecionada === grupo.categoria ? '4px solid #000' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <style>{`
            .categoria-content {
              position: relative;
              z-index: 1;
            }

            .product-img-wrap {
              background: transparent;
              border: none;
              border-radius: 0;
              overflow: hidden;
            }

            .product-img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 180ms ease;
              will-change: transform;
            }

            .product-img-wrap:hover .product-img {
              transform: scale(1.06);
            }

            /* Responsividade do item: evita overflow/tremor em telas pequenas */
            .product-row {
              box-sizing: border-box;
              width: 100%;
            }

            .product-content {
              min-width: 0;
            }

            .product-actions {
              flex-shrink: 0;
            }

            @media (max-width: 520px) {
              .product-row {
                gap: 12px !important;
              }

              .product-thumb {
                width: 92px !important;
                min-width: 92px !important;
                height: 92px !important;
              }

              .product-actions button {
                width: 44px !important;
                min-width: 44px !important;
                height: 44px !important;
              }
            }
          `}</style>

          <div className="categoria-content">

            {/* Título da categoria */}
            <div style={{ marginBottom: '30px', marginTop: '30px', textAlign: 'left' }}>
              {grupo.categoria === "Il Caffè" && (
                <img src={ilCaffeLogo} alt="Il Caffè" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Frescamente" && (
                <img src={frescamenteLogo} alt="Frescamente" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Infusões" && (
                <img src={infusoesLogo} alt="Infusões" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Naturale" && (
                <img src={naturaleLogo} alt="Naturale" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Il Salato" && (
                <img src={ilSalatoLogo} alt="Il Salato" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "I Nostri Dolci" && (
                <img src={iNostriDolciLogo} alt="I Nostri Dolci" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Bolos Gourmet" && (
                <img src={bolosLogo} alt="Bolos Gourmet" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Tortas" && (
                <img src={tortasLogo} alt="Tortas" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Cheesecakes" && (
                <img src={cheesecakesLogo} alt="Cheesecakes" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Brownies" && (
                <img src={browniesLogo} alt="Brownies" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Cookies" && (
                <img src={cookiesLogo} alt="Cookies" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "Aperitivo & Drinks" && (
                <img src={bebidasLogo} alt="Aperitivo & Drinks" style={categoriaTitleImgStyle} />
              )}
              {grupo.categoria === "I Momenti" && (
                <img src={iMomentiLogo} alt="I Momenti" style={categoriaTitleImgStyle} />
              )}
            </div>
            
            {/* Produtos da categoria */}
            {grupo.produtos.map((p, index) => (
              <div key={p.id_produto} className="product-row" style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '20px',
                padding: '20px 0'
              }}>
                {/* Imagem placeholder */}
                <div className="product-img-wrap product-thumb" style={{
                  minWidth: '120px',
                  width: '120px',
                  height: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {imagensPorCategoria?.[grupo.categoria]?.[index] ? (
                    <img
                      src={imagensPorCategoria[grupo.categoria][index]}
                      alt={p.nome}
                      className="product-img"
                    />
                  ) : (
                    <span style={{ fontSize: '40px' }}>🍰</span>
                  )}
                </div>

                {/* Conteúdo do produto */}
                <div className="product-content" style={{ flex: 1 }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    textTransform: 'uppercase'
                  }}>
                    {p.nome}
                  </h3>
                  
                  <p style={{ 
                    margin: '0 0 12px 0',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '0.95rem',
                    fontWeight: 400,
                    color: '#666',
                    lineHeight: '1.5'
                  }}>
                    {descriçõesProdutos[p.nome] || "Delicioso produto artesanal."}
                  </p>
                  
                  <p style={{ 
                    margin: 0,
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '1.1rem',
                    color: '#1a1a1a'
                  }}>
                    <span style={{ fontWeight: 300 }}>R$</span> <span style={{ fontWeight: 400 }}>{p.preco_venda}</span>
                  </p>
                </div>

                  {/* Botão adicionar */}
                  {!isFuncionario && (
                    p.categoria === "I Momenti" ? (
                      (() => {
                        const comboQty = getComboQty(p.nome);
                        if (comboQty > 0) {
                          return (
                            <div className="product-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', alignSelf: 'center' }}>
                              <button
                                onClick={() => removerUmCombo(p.nome)}
                                style={{
                                  minWidth: '40px',
                                  width: '40px',
                                  height: '50px',
                                  backgroundColor: 'transparent',
                                  color: '#ccc',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 'clamp(22px, 6vw, 28px)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.3s ease',
                                  fontWeight: 400
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.color = '#333')}
                                onMouseOut={(e) => (e.currentTarget.style.color = '#ccc')}
                                aria-label={`Diminuir ${p.nome}`}
                              >
                                −
                              </button>

                              <span style={{
                                fontFamily: "'Montserrat', sans-serif",
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                minWidth: '30px',
                                textAlign: 'center',
                                color: '#1a1a1a',
                                userSelect: 'none'
                              }}>
                                {comboQty}
                              </span>

                              <button
                                onClick={() => abrirCombo(p.nome)}
                                style={{
                                  minWidth: '40px',
                                  width: '40px',
                                  height: '50px',
                                  backgroundColor: 'transparent',
                                  color: '#ccc',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 'clamp(24px, 7vw, 32px)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.3s ease',
                                  fontWeight: 400
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.color = '#333')}
                                onMouseOut={(e) => (e.currentTarget.style.color = '#ccc')}
                                aria-label={`Aumentar ${p.nome}`}
                              >
                                ＋
                              </button>
                            </div>
                          );
                        }

                        return (
                          <button 
                            onClick={() => abrirCombo(p.nome)}
                            style={{ 
                              minWidth: '50px',
                              width: '50px',
                              height: '50px',
                              backgroundColor: "transparent", 
                              color: "#999", 
                              border: "none", 
                              cursor: "pointer",
                              fontSize: 'clamp(24px, 7vw, 32px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              alignSelf: 'center',
                              transition: 'color 0.3s ease',
                              fontWeight: 400
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#333'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#999'}
                            aria-label={`Adicionar ${p.nome}`}
                          >
                            ＋
                          </button>
                        );
                      })()
                    ) : (
                      <div className="product-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', alignSelf: 'center' }}>
                        <button 
                          onClick={() => diminuirQuantidade(p.id_produto)}
                          style={{ 
                            minWidth: '40px',
                            width: '40px',
                            height: '50px',
                            backgroundColor: "transparent", 
                            color: quantidades[p.id_produto] > 0 ? "#ccc" : "transparent", 
                            border: "none", 
                            cursor: quantidades[p.id_produto] > 0 ? "pointer" : "default",
                            fontSize: "28px",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.3s ease',
                            fontWeight: 400,
                            pointerEvents: quantidades[p.id_produto] > 0 ? 'auto' : 'none'
                          }}
                          onMouseOver={(e) => quantidades[p.id_produto] > 0 && (e.currentTarget.style.color = '#333')}
                          onMouseOut={(e) => quantidades[p.id_produto] > 0 && (e.currentTarget.style.color = '#ccc')}
                        >
                          −
                        </button>
                        <span style={{ 
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          minWidth: '30px',
                          textAlign: 'center',
                          color: quantidades[p.id_produto] > 0 ? '#1a1a1a' : 'transparent',
                          userSelect: 'none'
                        }}>
                          {quantidades[p.id_produto] || 0}
                        </span>
                        <button 
                          onClick={() => {
                            aumentarQuantidade(p.id_produto);
                            addItem({
                              ...p,
                              id: p.id_produto,
                              name: p.nome,
                              price: p.preco_venda,
                              image: imagensPorCategoria?.[grupo.categoria]?.[index] || undefined,
                            });
                          }}
                          style={{ 
                            minWidth: '40px',
                            width: '40px',
                            height: '50px',
                            backgroundColor: "transparent", 
                            color: quantidades[p.id_produto] > 0 ? "#ccc" : "#999", 
                            border: "none", 
                            cursor: "pointer",
                            fontSize: quantidades[p.id_produto] > 0
                              ? 'clamp(22px, 6vw, 28px)'
                              : 'clamp(24px, 7vw, 32px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.3s ease',
                            fontWeight: 400
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#333'}
                          onMouseOut={(e) => e.currentTarget.style.color = quantidades[p.id_produto] > 0 ? '#ccc' : '#999'}
                        >
                          ＋
                        </button>
                      </div>
                    )
                  )}
                  
                  {isFuncionario && (
                    <div style={{
                      minWidth: '50px',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                      ,alignSelf: 'center'
                    }}>
                      <span style={{ color: '#eee', fontSize: 'clamp(24px, 7vw, 32px)', fontWeight: 400 }}>＋</span>
                    </div>
                  )}
                </div>
            ))}

          </div>
          </div>
        ))}

      {/* Modal de Personalização de Combo */}
      {!isFuncionario && comboSelecionado && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: 24,
            borderRadius: 14,
            maxWidth: 640,
            maxHeight: "80vh",
            overflow: "auto",
            width: "92%",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            border: "1px solid rgba(0,0,0,0.08)"
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  margin: 0,
                  color: "#000",
                  textAlign: "left",
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 0.2
                }}>
                  Personalizar {comboSelecionado}
                </h2>
                <p style={{
                  margin: '6px 0 0 0',
                  color: 'rgba(0,0,0,0.62)',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  Selecione uma opção por categoria
                </p>
              </div>
              <div style={{
                textAlign: 'right',
                fontFamily: "'Montserrat', sans-serif",
                color: '#000',
                fontWeight: 700,
                fontSize: 16,
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontWeight: 300 }}>R$</span> {combosConfig[comboSelecionado].preco}
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', margin: '14px 0 18px 0' }} />

            {combosConfig[comboSelecionado].itens.map((itemConfig, index) => (
              <div key={index} style={{
                marginBottom: 18,
                padding: 14,
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                backgroundColor: 'rgba(0,0,0,0.02)'
              }}>
                <h4 style={{
                  color: "#000",
                  margin: '0 0 10px 0',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: 0.2
                }}>
                  {formatarTipoCombo(itemConfig.tipo)}
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {itemConfig.opcoes.map(opcao => (
                    <button
                      key={opcao}
                      onClick={() => selecionarItemCombo(itemConfig.tipo, opcao)}
                      style={{
                        padding: "10px 14px",
                        border: itensCombo[itemConfig.tipo] === opcao ? "2px solid #000" : "1px solid rgba(0,0,0,0.18)",
                        borderRadius: 10,
                        backgroundColor: itensCombo[itemConfig.tipo] === opcao ? "rgba(0,0,0,0.06)" : "white",
                        cursor: "pointer",
                        fontSize: "14px",
                        transition: "all 0.15s ease",
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: itensCombo[itemConfig.tipo] === opcao ? 700 : 500,
                        color: "#000"
                      }}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
                {itensCombo[itemConfig.tipo] && (
                  <p style={{
                    margin: '14px 0 0 0',
                    color: "rgba(0,0,0,0.7)",
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 500,
                    fontSize: 13,
                    lineHeight: 1.35
                  }}>
                    <span style={{ fontWeight: 600 }}>Selecionado:</span>{' '}
                    <span style={{ fontWeight: 700, color: '#000' }}>{itensCombo[itemConfig.tipo]}</span>
                  </p>
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}>
              <button
                onClick={adicionarComboCarrinho}
                style={{
                  backgroundColor: "#000",
                  color: "#fff",
                  border: "1px solid #000",
                  padding: "12px 18px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: 600,
                  fontFamily: "'Montserrat', sans-serif",
                  minWidth: 220
                }}
              >
                Adicionar Combo ao Carrinho
              </button>
              <button
                onClick={fecharCombo}
                style={{
                  backgroundColor: "#fff",
                  color: "#000",
                  border: "1px solid rgba(0,0,0,0.22)",
                  padding: "12px 18px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: 600,
                  fontFamily: "'Montserrat', sans-serif",
                  minWidth: 140
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {exibirBarraCarrinho && (
        <button
          onClick={() => navigate("/carrinho")}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'calc(68px + env(safe-area-inset-bottom))',
            height: 64,
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            cursor: 'pointer',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 18,
            fontWeight: 700,
            textTransform: 'none'
          }}
          aria-label="Fazer pedido"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2Zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2ZM7.17 14h9.66c.75 0 1.4-.41 1.74-1.03L21 6H6.21L5.27 4H2v2h2l3.6 7.59-1.35 2.44C5.52 17.37 6.48 19 8 19h12v-2H8l1.17-2Z" fill="currentColor"/>
          </svg>
          Fazer Pedido
        </button>
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            zIndex: 1200,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              maxWidth: 560,
              width: '100%',
              backgroundColor: '#fff',
              color: '#000',
              border: '1px solid rgba(0,0,0,0.18)',
              borderRadius: 14,
              padding: '12px 14px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              textAlign: 'center'
            }}
          >
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
