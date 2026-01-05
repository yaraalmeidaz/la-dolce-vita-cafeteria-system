import { products } from '../../src/services/data.js';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gerar UUIDs para os produtos
const productsWithUUIDs = products.map((product, index) => ({
  ...product,
  id_produto: '550e8400-e29b-41d4-a716-4466554400' + String(index + 1).padStart(2, '0')
}));

console.log('Primeiros produtos com UUIDs:');
productsWithUUIDs.slice(0, 3).forEach(p => console.log(' -', p.id_produto, p.nome));

// Reescrever o arquivo data.js
const content = 'export const products = ' + JSON.stringify(productsWithUUIDs, null, 2) + ';\n\nexport const sales = [\n  {\n    id_venda: 1,\n    data: "2025-01-15",\n    canal: "Balcão",\n    valor_total: 22,\n    forma_pagamento: "Cartão"\n  },\n  {\n    id_venda: 2,\n    data: "2025-01-16",\n    canal: "Delivery",\n    valor_total: 30,\n    forma_pagamento: "Pix"\n  }\n];';

writeFileSync(path.resolve(__dirname, '../../src/services/data.js'), content);
console.log('✅ Arquivo data.js atualizado com UUIDs!');