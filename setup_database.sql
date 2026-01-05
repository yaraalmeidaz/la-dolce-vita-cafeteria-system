-- SQL para criar tabelas no Supabase
-- Execute este SQL no SQL Editor do Supabase

-- Tabela de usuários (clientes e funcionários)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  telefone VARCHAR(20),
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'cliente', -- 'cliente' ou 'admin'
  tipo_acesso VARCHAR(50) DEFAULT 'cliente', -- 'cliente', 'gestor', 'comum'
  salario DECIMAL(10,2),
  cargo VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id_produto UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  custo_producao DECIMAL(10,2),
  preco_venda DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  codigo VARCHAR(10) UNIQUE NOT NULL, -- código de 5 dígitos
  tipo VARCHAR(50) NOT NULL, -- 'estabelecimento', 'delivery', 'drive-thru'
  endereco TEXT,
  total DECIMAL(10,2) NOT NULL,
  forma_pagamento VARCHAR(50), -- 'pix', 'cartao', 'dinheiro'
  troco DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'confirmado', -- 'confirmado', 'andamento', 'pronto', 'a_caminho', 'entregue'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id_produto),
  qty INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  custo_unitario DECIMAL(10,2) DEFAULT 0
);

-- Tabela de apoio para analytics: itens vendidos com categoria (denormalizado)
-- Serve para relatórios como "item mais vendido por categoria".
CREATE TABLE IF NOT EXISTS vendas_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,
  produto_nome TEXT,
  categoria TEXT,
  tipo VARCHAR(50),
  qty INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  order_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION sync_vendas_itens_from_order_items()
RETURNS TRIGGER AS $$
DECLARE
  v_tipo TEXT;
  v_created_at TIMESTAMPTZ;
  v_nome TEXT;
  v_categoria TEXT;
BEGIN
  SELECT tipo, created_at INTO v_tipo, v_created_at FROM orders WHERE id = NEW.order_id;
  SELECT nome, categoria INTO v_nome, v_categoria FROM products WHERE id_produto = NEW.product_id;

  INSERT INTO vendas_itens (
    order_item_id, order_id, product_id, produto_nome, categoria, tipo, qty, price, order_created_at
  ) VALUES (
    NEW.id, NEW.order_id, NEW.product_id, v_nome, v_categoria, v_tipo, NEW.qty, NEW.price, v_created_at
  )
  ON CONFLICT (order_item_id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    product_id = EXCLUDED.product_id,
    produto_nome = EXCLUDED.produto_nome,
    categoria = EXCLUDED.categoria,
    tipo = EXCLUDED.tipo,
    qty = EXCLUDED.qty,
    price = EXCLUDED.price,
    order_created_at = EXCLUDED.order_created_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_vendas_itens_on_order_item_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM vendas_itens WHERE order_item_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_vendas_itens ON order_items;
CREATE TRIGGER trg_sync_vendas_itens
AFTER INSERT OR UPDATE OF qty, price, product_id, order_id ON order_items
FOR EACH ROW EXECUTE FUNCTION sync_vendas_itens_from_order_items();

DROP TRIGGER IF EXISTS trg_delete_vendas_itens ON order_items;
CREATE TRIGGER trg_delete_vendas_itens
AFTER DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION delete_vendas_itens_on_order_item_delete();

-- Tabela custos fixos
CREATE TABLE IF NOT EXISTS custos_fixos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela relatórios financeiros
CREATE TABLE IF NOT EXISTS relatorios_financeiros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes DATE NOT NULL,
  faturamento DECIMAL(10,2) DEFAULT 0,
  custos_produtos DECIMAL(10,2) DEFAULT 0,
  salarios DECIMAL(10,2) DEFAULT 0,
  custos_fixos DECIMAL(10,2) DEFAULT 0,
  lucro_bruto DECIMAL(10,2) DEFAULT 0,
  lucro_liquido DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir dados iniciais

-- Funcionários (admins)
INSERT INTO users (nome, email, senha, role, tipo_acesso, salario, cargo) VALUES
('Giulia Rossi', 'giulia.rossi@ladolcevita.com', 'gestor123', 'admin', 'gestor', 6500.00, 'Gerente Geral'),
('Matteo Bianchi', 'matteo.bianchi@ladolcevita.com', 'gestor123', 'admin', 'gestor', 4800.00, 'Coordenador Operacional'),
('Lucas Andrade', 'lucas.andrade@ladolcevita.com', 'func123', 'admin', 'comum', 3200.00, 'Barista Sênior'),
('Ana Luísa', 'ana.luisa@ladolcevita.com', 'func123', 'admin', 'comum', 2800.00, 'Barista'),
('Pedro Martins', 'pedro.martins@ladolcevita.com', 'func123', 'admin', 'comum', 2500.00, 'Atendente'),
('Sofia Lima', 'sofia.lima@ladolcevita.com', 'func123', 'admin', 'comum', 2500.00, 'Atendente'),
('Renata Costa', 'renata.costa@ladolcevita.com', 'func123', 'admin', 'comum', 2700.00, 'Aux. Cozinha/Pasticceria');

-- Inserir custos fixos mensais
INSERT INTO custos_fixos (descricao, valor) VALUES
('Aluguel', 9500.00),
('Água', 600.00),
('Luz', 1200.00),
('Internet', 200.00),
('Limpeza e manutenção', 1000.00),
('Sistema / software', 300.00);

-- Adicionar coluna cargo se não existir
ALTER TABLE users ADD COLUMN IF NOT EXISTS cargo VARCHAR(255);