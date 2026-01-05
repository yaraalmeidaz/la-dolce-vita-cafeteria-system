# ☕ La Dolce Vita Caffè & Pasticceria

Sistema completo de cafeteria (React + Supabase) com **3 perfis de usuário**: Cliente, Funcionário (Comum) e Gestor.

## 📽️ Apresentação do sistema (PDF)

A apresentação em slides está disponível no repositório e pode ser aberta diretamente no GitHub:

- [docs/ApresentaçãoDoSistema.pdf](docs/apresentacao-do-sistema.pdf) 

## 🌐 Sistema em execução (GitHub Pages)

*(deploy via GitHub Pages em preparação)*

➡️ https://SEU_USUARIO.github.io/la-dolce-vita

## ✅ Visão geral

O sistema cobre o fluxo ponta‑a‑ponta: **venda → produção → status do pedido → relatórios**.

Principais módulos:

- **Cliente**: cardápio, carrinho, checkout/pagamento, acompanhamento de pedidos e dados pessoais.
- **Funcionário (Comum)**: painel operacional para acompanhar pedidos e atualizar status.
- **Gestor**: dashboards e relatórios financeiros (vendas, custos, lucro e performance por categoria/itens).

## 🧱 Stack & Arquitetura

- **Frontend**: React (Vite), JavaScript, CSS modularizado
- **Backend as a Service**: Supabase (PostgreSQL + API)
- **Estado e fluxo**: estado local (Context) + sincronização com o banco
- **Relatórios**: consultas agregadas + tabela de apoio para analytics (`vendas_itens`)
- **Deploy**: ambiente preparado para GitHub Pages (frontend)

Arquitetura pensada para simular um **sistema real de produção**, separando interface do usuário, regras de negócio, persistência e relatórios.

## 🔄 Fluxo do pedido (end‑to‑end)

1. Cliente escolhe produtos no cardápio
2. Adiciona ao carrinho e confirma o checkout (balcão / drive‑thru / delivery)
3. Pedido é registrado no banco com status inicial
4. Funcionário acompanha e atualiza a produção/status
5. Gestor visualiza impacto do pedido nos relatórios
6. Pedido é finalizado (entregue / retirado)

Esse fluxo garante rastreabilidade do pedido, do cliente até o resultado financeiro.

## 👥 Perfis de usuário (com particularidades do sistema)

### Cliente

- **Cardápio por categorias com carregamento otimizado**: o catálogo é carregado do Supabase e usa cache local para abrir rápido em acessos repetidos.
- **Carrinho com confirmação de ações críticas**: ao limpar o carrinho ou remover o último item, o sistema pede confirmação para evitar perda acidental do pedido.
- **Checkout com 3 formas de atendimento**: Balcão (estabelecimento), Drive‑thru e Delivery. Para Delivery, o endereço é validado antes de avançar.
- **Pagamento e pedido confirmados**: o cliente finaliza com PIX, Cartão ou Dinheiro (com opção de troco) e recebe um **código do pedido**.
- **Histórico detalhado em “Meus pedidos”**: lista com status, recibo, itens e informações do pedido (inclui endereço quando for delivery).
- **Conta do cliente**: edição de nome/email/telefone e troca de senha.

### Funcionário (Comum)

- **Gestão operacional de pedidos**: visualiza pedidos recentes e organiza a produção/atendimento.
- **Atualização de status**: o pedido percorre estados como “enviado/confirmado”, “preparação”, “pronto”, “a caminho” e “entregue/retirado”, alinhado ao tipo (balcão/drive‑thru/delivery).
- **Compatibilidade com pedidos do dia anterior**: o carregamento considera **hoje e ontem** para evitar que pedidos pendentes (ex.: drive‑thru sem retirada) “sumam” no dia seguinte.

### Gestor

O perfil gestor é o mais completo: além da visão de operação, ele concentra a **gestão financeira** com filtros, consolidação e indicadores.

**1) Dashboard de lucro (resultado do período)**

- **Faturamento**: soma do total dos pedidos no período.
- **Custos de produtos (CMV)**: custo estimado a partir do custo unitário dos itens (com base no custo de produção dos produtos).
- **Salários**: soma do salário dos funcionários ativos (dados na tabela de usuários).
- **Custos fixos**: soma dos registros de custos fixos do período.
- **Lucro bruto e lucro líquido**: cálculo consolidado (receita − custos de produtos; e depois − salários − custos fixos).
- **Visualização**: cards de indicadores + gráfico de lucro líquido.

**2) Relatório de vendas (operacional + gerencial)**

- **Filtros de período**: semanal, mensal, anual e personalizado.
- **Filtros por canal**: todas, delivery, drive‑thru ou estabelecimento.
- **Busca por cliente**: pesquisa por nome para encontrar pedidos rapidamente.
- **Atualização automática**: a aba de vendas é atualizada em intervalos (mantém o relatório “vivo” durante a operação).

**3) Performance por categoria e itens (analytics)**

- Relatórios de **itens vendidos por categoria** (quantidade e receita), suportando perguntas como “o que mais vende no delivery?” e “qual categoria performa melhor no mês?”.
- Usa a tabela `vendas_itens` (denormalizada) para facilitar consultas de analytics.

**4) Gestão de base e parâmetros do negócio**

- **Clientes**: listagem e detalhamento dos clientes cadastrados.
- **Custos fixos**: leitura e totalização de custos fixos cadastrados no banco.
- **Salários**: totalização de salários a partir dos usuários com perfil de funcionário.

## 🧠 Decisões técnicas relevantes

- Uso de **tabela `vendas_itens` denormalizada** para facilitar queries de analytics e reduzir custo de agregação em tempo real.
- Separação clara de **perfis e permissões** (cliente / comum / gestor) para simular controle de acesso real.
- Consideração de pedidos de **hoje e ontem** no painel operacional, evitando inconsistências do dia seguinte.
- Cálculo de lucro estruturado em camadas (receita → CMV → custos → resultado), refletindo o raciocínio do negócio.

## 🗄️ Banco de dados (Supabase)

O schema principal está em:

- [setup_database.sql](setup_database.sql) (recomendado: cria tabelas + dados de seed)
- [supabase_setup.sql](supabase_setup.sql) (variante simplificada)

Tabelas relevantes:

- `users`: clientes e funcionários (inclui `role`, `tipo_acesso`, `salario` e `cargo`).
- `products`: catálogo com `custo_producao` e `preco_venda`.
- `orders`: pedidos (tipo, total, forma de pagamento, status, etc.).
- `order_items`: itens do pedido (qty, price e custo unitário quando disponível).
- `custos_fixos`: custos mensais do negócio.
- `relatorios_financeiros`: estrutura para consolidação mensal.
- `vendas_itens`: apoio para analytics (itens vendidos por categoria/itens com triggers de sincronização).

## 🚀 Como rodar (local)

### 1) Pré‑requisitos

- Node.js + npm
- Projeto criado no Supabase

### 2) Instalação

1. `npm install`

### 3) Configurar Supabase

1. Crie um projeto no Supabase.
2. Crie o arquivo `.env` baseado em [.env.example](.env.example) e preencha:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
3. Execute o SQL de criação/seed no Supabase:
	- [setup_database.sql](setup_database.sql)

### 4) Executar

1. `npm run dev`
2. Abra a URL exibida no terminal.

## 🔒 Segurança e privacidade

- **Não existe nenhum dado do meu banco neste repositório.**
- **Não existe nenhuma chave do Supabase versionada aqui.** Sem `.env`, ninguém acessa nada.
- Para testar, você cria o **seu** Supabase e executa o SQL de seed.

Observação importante: o login do projeto é **customizado via tabela `users`** (email/telefone + senha). Para um ambiente real de produção, a abordagem recomendada é usar Supabase Auth + RLS.

## 🔑 Credenciais de teste

As credenciais abaixo são inseridas pelo SQL de seed em [setup_database.sql](setup_database.sql).

### Gestores (acesso total)

- Email: giulia.rossi@ladolcevita.com | Senha: gestor123
- Email: matteo.bianchi@ladolcevita.com | Senha: gestor123

### Funcionários comuns (acesso operacional)

- Email: lucas.andrade@ladolcevita.com | Senha: func123
- Email: ana.luisa@ladolcevita.com | Senha: func123
- Email: pedro.martins@ladolcevita.com | Senha: func123
- Email: sofia.lima@ladolcevita.com | Senha: func123
- Email: renata.costa@ladolcevita.com | Senha: func123

### Clientes

- Cadastre‑se normalmente na tela de registro.

## 🧰 Scripts úteis (db)

Scripts auxiliares ficam em [tools/db/](tools/db/).

- [tools/db/insertProducts.mjs](tools/db/insertProducts.mjs)
- [tools/db/check_products.js](tools/db/check_products.js)
- [tools/db/insert_employees.js](tools/db/insert_employees.js)
- [tools/db/insert_products.js](tools/db/insert_products.js)
- [tools/db/update_uuids.js](tools/db/update_uuids.js)
# cafeteria-system-
