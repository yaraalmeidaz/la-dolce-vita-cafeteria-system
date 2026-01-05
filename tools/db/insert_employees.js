import { supabase } from './supabaseClient.mjs';

const employees = [
  {
    nome: 'Giulia Rossi',
    email: 'giulia.rossi@ladolcevita.com',
    senha: 'gestor123',
    role: 'admin',
    tipo_acesso: 'gestor',
    salario: 6500.00,
    cargo: 'Gerente Geral'
  },
  {
    nome: 'Matteo Bianchi',
    email: 'matteo.bianchi@ladolcevita.com',
    senha: 'gestor123',
    role: 'admin',
    tipo_acesso: 'gestor',
    salario: 4800.00,
    cargo: 'Coordenador Operacional'
  },
  {
    nome: 'Lucas Andrade',
    email: 'lucas.andrade@ladolcevita.com',
    senha: 'func123',
    role: 'admin',
    tipo_acesso: 'comum',
    salario: 3200.00,
    cargo: 'Barista Sênior'
  },
  {
    nome: 'Ana Luísa',
    email: 'ana.luisa@ladolcevita.com',
    senha: 'func123',
    role: 'admin',
    tipo_acesso: 'comum',
    salario: 2800.00,
    cargo: 'Barista'
  },
  {
    nome: 'Pedro Martins',
    email: 'pedro.martins@ladolcevita.com',
    senha: 'func123',
    role: 'admin',
    tipo_acesso: 'comum',
    salario: 2500.00,
    cargo: 'Atendente'
  },
  {
    nome: 'Sofia Lima',
    email: 'sofia.lima@ladolcevita.com',
    senha: 'func123',
    role: 'admin',
    tipo_acesso: 'comum',
    salario: 2500.00,
    cargo: 'Atendente'
  },
  {
    nome: 'Renata Costa',
    email: 'renata.costa@ladolcevita.com',
    senha: 'func123',
    role: 'admin',
    tipo_acesso: 'comum',
    salario: 2700.00,
    cargo: 'Aux. Cozinha/Pasticceria'
  }
];

async function insertEmployees() {
  try {
    console.log('Inserindo funcionários no banco de dados...');

    // Limpar funcionários existentes (apenas admins)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('role', 'admin');

    if (deleteError) {
      console.error('Erro ao limpar funcionários:', deleteError);
      return;
    }

    // Inserir novos funcionários
    const { data, error } = await supabase
      .from('users')
      .insert(employees)
      .select();

    if (error) {
      console.error('Erro ao inserir funcionários:', error);
    } else {
      console.log(`✅ ${data.length} funcionários inseridos com sucesso!`);
    }
  } catch (err) {
    console.error('Erro geral:', err);
  }
}

insertEmployees();