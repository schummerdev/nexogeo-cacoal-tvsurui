// api/inspect-db.js - Endpoint para inspecionar estrutura REAL do PostgreSQL
const databasePool = require('./_lib/database');
const { getSecureHeaders } = require('./_lib/security');

// ✅ SEGURANÇA: Whitelist de tabelas válidas
const VALID_TABLES = [
  'users',
  'promocoes',
  'participantes',
  'ganhadores',
  'audit_logs',
  'games',
  'submissions',
  'sponsors',
  'products',
  'public_participants',
  'clues',
  'rate_limits'
];

/**
 * ✅ Valida nome de tabela contra whitelist
 * @param {string} tableName - Nome da tabela a validar
 * @returns {boolean} true se válido, false caso contrário
 */
const isValidTableName = (tableName) => {
  if (!tableName || typeof tableName !== 'string') {
    return false;
  }
  return VALID_TABLES.includes(tableName.toLowerCase());
};

module.exports = async (req, res) => {
  const headers = getSecureHeaders();
  Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));

  // 🔐 SEGURANÇA: Bloquear endpoint em produção
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Endpoint disponível apenas em ambiente de desenvolvimento'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔍 Iniciando inspeção completa do banco PostgreSQL...');

    // 1. LISTAR TODAS AS TABELAS EXISTENTES
    const allTables = await databasePool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tabelas encontradas:', allTables.rows);

    // 2. ESTRUTURA DETALHADA DE CADA TABELA IMPORTANTE
    const tableStructures = {};
    const importantTables = ['promocoes', 'participantes', 'ganhadores', 'usuarios_admin'];

    for (const tableName of importantTables) {
      try {
        const columns = await databasePool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);

        tableStructures[tableName] = {
          exists: columns.rows.length > 0,
          columns: columns.rows
        };

        console.log(`📊 Estrutura ${tableName}:`, columns.rows);
      } catch (err) {
        tableStructures[tableName] = { exists: false, error: err.message };
        console.error(`❌ Erro ao verificar ${tableName}:`, err.message);
      }
    }

    // 3. CONTAGEM DE DADOS EM CADA TABELA
    const dataCounts = {};

    for (const tableName of importantTables) {
      if (tableStructures[tableName].exists) {
        try {
          // ✅ SEGURANÇA: Usar escaping de identifier PostgreSQL
          const escapedTable = `"${tableName}"`;
          const count = await databasePool.query(`SELECT COUNT(*) as total FROM ${escapedTable}`);
          dataCounts[tableName] = parseInt(count.rows[0].total);
          console.log(`🔢 ${tableName}: ${dataCounts[tableName]} registros`);
        } catch (err) {
          dataCounts[tableName] = { error: err.message };
          console.error(`❌ Erro ao contar ${tableName}:`, err.message);
        }
      }
    }

    // 4. AMOSTRAS DOS DADOS REAIS
    const sampleData = {};

    // ✅ SEGURANÇA (ALTO-003): Campos explícitos
    // Sample de promoções
    if (tableStructures.promocoes?.exists) {
      try {
        const promocoes = await databasePool.query(`
          SELECT id, nome, descricao, premio, status, data_inicio, data_fim, created_at
          FROM promocoes LIMIT 2
        `);
        sampleData.promocoes = promocoes.rows;
        console.log('🎯 Sample promoções:', promocoes.rows);
      } catch (err) {
        sampleData.promocoes = { error: err.message };
      }
    }

    // ✅ SEGURANÇA (ALTO-003): Campos explícitos
    // Sample de participantes
    if (tableStructures.participantes?.exists) {
      try {
        const participantes = await databasePool.query(`
          SELECT id, nome, telefone, email, cidade, bairro, promocao_id, created_at
          FROM participantes LIMIT 2
        `);
        sampleData.participantes = participantes.rows;
        console.log('👥 Sample participantes:', participantes.rows);
      } catch (err) {
        sampleData.participantes = { error: err.message };
      }
    }

    // 5. TESTE DAS QUERIES PROBLEMÁTICAS
    const queryTests = {};

    // Testar query de stats
    try {
      const statsTest = await databasePool.query(`
        SELECT
          (SELECT COUNT(*) FROM promocoes) as total_promocoes,
          (SELECT COUNT(*) FROM participantes) as total_participantes
      `);
      queryTests.basic_stats = { success: true, result: statsTest.rows[0] };
      console.log('✅ Query básica funciona:', statsTest.rows[0]);
    } catch (err) {
      queryTests.basic_stats = { success: false, error: err.message };
      console.error('❌ Query básica falhou:', err.message);
    }

    // Testar query com datas
    try {
      const dateTest = await databasePool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'participantes'
        AND (column_name LIKE '%created%' OR column_name LIKE '%participou%' OR column_name LIKE '%data%')
      `);
      queryTests.date_columns = { success: true, result: dateTest.rows };
      console.log('📅 Colunas de data encontradas:', dateTest.rows);
    } catch (err) {
      queryTests.date_columns = { success: false, error: err.message };
    }

    // ✅ SEGURANÇA: Endpoint opcional para inspecionar tabela específica
    // Exemplo: GET /api/inspect-db?table=promocoes
    let specificTableData = null;
    if (req.query.table && isValidTableName(req.query.table)) {
      const tableName = req.query.table.toLowerCase();
      const escapedTable = `"${tableName}"`;

      // ✅ SEGURANÇA (ALTO-003): Campos explícitos por tabela
      try {
        let selectQuery;
        switch(tableName) {
          case 'promocoes':
            selectQuery = `SELECT id, nome, descricao, premio, status, data_inicio, data_fim, created_at FROM ${escapedTable} LIMIT 5`;
            break;
          case 'participantes':
            selectQuery = `SELECT id, nome, telefone, email, cidade, bairro, promocao_id, created_at FROM ${escapedTable} LIMIT 5`;
            break;
          case 'ganhadores':
            selectQuery = `SELECT id, promocao_id, participante_id, premio, created_at, cancelado_em FROM ${escapedTable} LIMIT 5`;
            break;
          case 'audit_logs':
            selectQuery = `SELECT id, user_id, action, table_name, record_id, created_at FROM ${escapedTable} LIMIT 5`;
            break;
          case 'public_participants':
            selectQuery = `SELECT id, name, phone, neighborhood, reference_code, game_id, created_at FROM ${escapedTable} LIMIT 5`;
            break;
          case 'games':
            selectQuery = `SELECT id, sponsor_id, product_id, start_date, end_date, status, created_at FROM ${escapedTable} LIMIT 5`;
            break;
          default:
            selectQuery = `SELECT * FROM ${escapedTable} LIMIT 5`;
        }
        const tableData = await databasePool.query(selectQuery);
        specificTableData = {
          table: tableName,
          count: tableData.rows.length,
          data: tableData.rows
        };
        console.log(`📋 Dados específicos de ${tableName}:`, tableData.rows);
      } catch (err) {
        specificTableData = {
          table: tableName,
          error: err.message
        };
      }
    } else if (req.query.table) {
      // ✅ SEGURANÇA: Rejeitar tabelas não permitidas
      return res.status(400).json({
        success: false,
        error: `Tabela inválida: "${req.query.table}". Tabelas permitidas: ${VALID_TABLES.join(', ')}`
      });
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      inspection: {
        all_tables: allTables.rows,
        table_structures: tableStructures,
        data_counts: dataCounts,
        sample_data: sampleData,
        query_tests: queryTests,
        specific_table: specificTableData
      }
    });

  } catch (error) {
    console.error('❌ ERRO CRÍTICO na inspeção:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};