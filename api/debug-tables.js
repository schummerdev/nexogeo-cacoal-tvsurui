// api/debug-tables.js - Debug temporário para verificar dados das tabelas
const databasePool = require('./_lib/database');
const { getSecureHeaders } = require('./_lib/security');

module.exports = async (req, res) => {
  const headers = getSecureHeaders();
  Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 1. Verificar se as tabelas existem
    const tablesCheck = await databasePool.query(`
      SELECT table_name,
             (SELECT column_name FROM information_schema.columns
              WHERE table_name = t.table_name AND table_schema = 'public'
              LIMIT 5) as sample_column
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_name IN ('promocoes', 'participantes', 'ganhadores', 'usuarios_admin')
      ORDER BY table_name
    `);

    // 2. Verificar colunas das tabelas principais
    const promocoesColumns = await databasePool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'promocoes' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    const participantesColumns = await databasePool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'participantes' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    // 3. Verificar dados existentes
    const promocoesData = await databasePool.query('SELECT COUNT(*), status FROM promocoes GROUP BY status');
    const participantesData = await databasePool.query('SELECT COUNT(*) as total FROM participantes');
    const ganhadoresData = await databasePool.query('SELECT COUNT(*) as total FROM ganhadores');

    // 4. Sample dos dados
    const promocoesSample = await databasePool.query('SELECT id, nome, status, data_inicio, data_fim, criado_em FROM promocoes LIMIT 3');
    const participantesSample = await databasePool.query('SELECT id, nome, promocao_id, participou_em FROM participantes LIMIT 3');

    return res.status(200).json({
      success: true,
      debug: {
        tables_found: tablesCheck.rows,
        promocoes_columns: promocoesColumns.rows,
        participantes_columns: participantesColumns.rows,
        data_counts: {
          promocoes: promocoesData.rows,
          participantes: participantesData.rows[0],
          ganhadores: ganhadoresData.rows[0]
        },
        sample_data: {
          promocoes: promocoesSample.rows,
          participantes: participantesSample.rows
        }
      }
    });
  } catch (error) {
    console.error('Erro no debug das tabelas:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};