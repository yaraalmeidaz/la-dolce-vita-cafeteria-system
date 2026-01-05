-- Criar tabelas para o sistema de cafeteria

-- Necessário para gen_random_uuid() (em alguns projetos já vem habilitado)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários (clientes e funcionários)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  telefone VARCHAR(20),
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'cliente', -- 'cliente' ou 'admin'
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
  price DECIMAL(10,2) NOT NULL
);

-- Migração segura: adiciona coluna caso ainda não exista
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS custo_unitario DECIMAL(10,2) DEFAULT 0;

-- Tabela de apoio para analytics: itens vendidos com categoria (denormalizado)
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

-- Inserir dados iniciais

-- Funcionários (admins)
INSERT INTO users (nome, email, senha, role) VALUES
('Admin', 'admin@cafeteria.com', 'admin123', 'admin'),
('Funcionário 1', 'func1@cafeteria.com', 'func123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Produtos
INSERT INTO products (nome, categoria, custo_producao, preco_venda)
SELECT v.nome, v.categoria, v.custo_producao, v.preco_venda
FROM (
  VALUES
    ('Café Espresso', 'Café', 3.00::DECIMAL(10,2), 8.00::DECIMAL(10,2)),
    ('Bolo de Chocolate', 'Doce', 6.00::DECIMAL(10,2), 14.00::DECIMAL(10,2)),
    ('Cappuccino', 'Café', 4.00::DECIMAL(10,2), 10.00::DECIMAL(10,2)),
    ('Pão de Queijo', 'Salgado', 2.00::DECIMAL(10,2), 6.00::DECIMAL(10,2))
) AS v(nome, categoria, custo_producao, preco_venda)
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.nome = v.nome
);

-- Backfill (opcional, mas recomendado): popula/atualiza vendas_itens com histórico já existente
INSERT INTO vendas_itens (
  order_item_id, order_id, product_id, produto_nome, categoria, tipo, qty, price, order_created_at
)
SELECT
  oi.id AS order_item_id,
  oi.order_id,
  oi.product_id,
  p.nome AS produto_nome,
  p.categoria,
  o.tipo,
  oi.qty,
  oi.price,
  o.created_at AS order_created_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN products p ON p.id_produto = oi.product_id
ON CONFLICT (order_item_id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  product_id = EXCLUDED.product_id,
  produto_nome = EXCLUDED.produto_nome,
  categoria = EXCLUDED.categoria,
  tipo = EXCLUDED.tipo,
  qty = EXCLUDED.qty,
  price = EXCLUDED.price,
  order_created_at = EXCLUDED.order_created_at;

-- Políticas RLS (Row Level Security) para segurança

-- Nota: Desabilitado por enquanto, pois o projeto usa dados locais
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários podem ver/editar seus próprios dados
-- CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Admins podem ver tudo
-- CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
-- CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
-- CREATE POLICY "Admins can update orders" ON orders FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Clientes podem ver seus pedidos
-- CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (user_id = auth.uid());
-- CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));