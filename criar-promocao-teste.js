// Script para criar promoção de teste
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'frontend/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Inserir promoção de teste
const promocao = {
  nome: "Grande Sorteio de Verão 2024",
  slug: "grande-sorteio-verao-2024", 
  descricao: "Participe do nosso grande sorteio de verão! Concorra a prêmios incríveis todos os dias.",
  data_inicio: "2024-08-01",
  data_fim: "2024-12-31",
  status: "ativa",
  link_participacao: "http://localhost:3000/participar?slug=grande-sorteio-verao-2024"
};

db.run(`INSERT INTO promocoes (nome, slug, descricao, data_inicio, data_fim, status, link_participacao) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [promocao.nome, promocao.slug, promocao.descricao, promocao.data_inicio, promocao.data_fim, promocao.status, promocao.link_participacao], 
        function(err) {
  if (err) {
    console.error('Erro ao inserir promoção:', err.message);
  } else {
    console.log('✅ Promoção de teste criada com sucesso!');
    console.log('📝 ID da promoção:', this.lastID);
    console.log('🔗 Link de teste:', `http://localhost:3000/participar?id=${this.lastID}`);
    console.log('🔗 Link com slug:', `http://localhost:3000/participar?slug=${promocao.slug}`);
  }
  db.close();
});