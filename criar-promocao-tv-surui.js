// Script para criar a promoção "TV Surui - Comando na TV"
const { Pool } = require('pg');

async function criarPromocaoTvSurui() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Iniciando criação da promoção TV Surui...');
    
    // Verificar se a promoção já existe
    const existeResult = await pool.query(`
      SELECT * FROM promocoes 
      WHERE LOWER(nome) LIKE '%tv surui%' 
      OR LOWER(nome) LIKE '%comando na tv%'
    `);
    
    if (existeResult.rows.length > 0) {
      console.log('✅ Promoção já existe:', existeResult.rows[0].nome);
      console.log('ID:', existeResult.rows[0].id);
      await pool.end();
      return;
    }
    
    // Criar a promoção
    const resultado = await pool.query(`
      INSERT INTO promocoes (
        nome, 
        descricao, 
        status, 
        data_inicio, 
        data_fim,
        created_at
      ) VALUES (
        'TV Surui - Comando na TV',
        'Participação diária dos telespectadores',
        'ativa',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '365 days',
        NOW()
      ) RETURNING *
    `);
    
    console.log('✅ Promoção criada com sucesso!');
    console.log('Nome:', resultado.rows[0].nome);
    console.log('Descrição:', resultado.rows[0].descricao);
    console.log('ID:', resultado.rows[0].id);
    console.log('Status:', resultado.rows[0].status);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro ao criar promoção:', error);
    await pool.end();
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  criarPromocaoTvSurui();
}

module.exports = criarPromocaoTvSurui;