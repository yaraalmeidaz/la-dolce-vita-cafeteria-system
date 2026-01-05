import { supabase } from './supabaseClient.mjs';

async function checkProducts() {
  try {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Erro:', error);
    } else {
      console.log('Total de produtos:', count);
    }

    // Verificar alguns produtos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('nome, categoria')
      .limit(5);

    if (productsError) {
      console.error('Erro ao buscar produtos:', productsError);
    } else {
      console.log('Primeiros produtos:', products);
    }
  } catch (err) {
    console.error('Erro geral:', err);
  }
}

checkProducts();