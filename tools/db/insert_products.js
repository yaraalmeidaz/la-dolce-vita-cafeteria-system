import { supabase } from './supabaseClient.mjs';
import { products } from '../../src/services/data.js';

async function insertProducts() {
  try {
    console.log('Inserindo produtos no banco de dados...');

    // Limpar produtos existentes
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .gte('id_produto', '00000000-0000-0000-0000-000000000000'); // Deleta todos

    if (deleteError) {
      console.error('Erro ao limpar produtos:', deleteError);
      return;
    }

    // Inserir novos produtos
    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (error) {
      console.error('Erro ao inserir produtos:', error);
    } else {
      console.log(`✅ ${data.length} produtos inseridos com sucesso!`);
    }
  } catch (err) {
    console.error('Erro geral:', err);
  }
}

insertProducts();