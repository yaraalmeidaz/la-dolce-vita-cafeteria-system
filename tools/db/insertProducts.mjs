import { supabase } from './supabase.js';
import { products } from './data.js';

async function insertProducts() {
  try {
    // Gerar UUIDs para os produtos
    const productsWithUUID = products.map(p => ({
      ...p,
      id_produto: crypto.randomUUID()
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(productsWithUUID);

    if (error) {
      console.error('Erro ao inserir produtos:', error);
    } else {
      console.log('Produtos inseridos com sucesso:', data?.length, 'produtos');
    }
  } catch (err) {
    console.error('Erro:', err);
  }
}

insertProducts();