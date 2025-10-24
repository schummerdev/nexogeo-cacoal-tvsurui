// api/ganhadores.js - Consolidação de operações com ganhadores
const databasePool = require('./_lib/database');
const { getSecureHeaders } = require('./_lib/security');

module.exports = async (req, res) => {
  const headers = getSecureHeaders();
  Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));

  const { action } = req.query;

  try {
    switch (action) {
      case 'cancelar':
        return await cancelarGanhador(req, res);
      case 'listar':
        return await listarGanhadores(req, res);
      default:
        return res.status(400).json({ error: 'Ação não especificada ou inválida' });
    }
  } catch (error) {
    console.error('Erro em ganhadores:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

// Função para cancelar ganhador
async function cancelarGanhador(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido'
    });
  }

  const { ganhador_id, motivo, user_id } = req.body;

  if (!ganhador_id) {
    return res.status(400).json({
      success: false,
      error: 'ID do ganhador é obrigatório'
    });
  }

  const client = await databasePool.connect();

  try {
    await client.query('BEGIN');

    // 1. Buscar dados do ganhador antes de cancelar
    const ganhadorQuery = `
      SELECT
        g.*,
        p.nome as promocao_nome,
        pa.nome as participante_nome,
        pa.telefone as participante_telefone,
        pa.email as participante_email
      FROM ganhadores g
      JOIN promocoes p ON p.id = g.promocao_id
      JOIN participantes pa ON pa.id = g.participante_id
      WHERE g.id = $1
    `;

    const ganhadorResult = await client.query(ganhadorQuery, [ganhador_id]);

    if (ganhadorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Ganhador não encontrado'
      });
    }

    const ganhador = ganhadorResult.rows[0];

    // 2. Verificar se o ganhador não foi cancelado anteriormente
    if (ganhador.cancelado_em) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Este ganhador já foi cancelado anteriormente'
      });
    }

    // 3. Atualizar o ganhador como cancelado
    const updateQuery = `
      UPDATE ganhadores
      SET
        cancelado_em = CURRENT_TIMESTAMP,
        motivo_cancelamento = $2,
        cancelado_por = $3
      WHERE id = $1
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [
      ganhador_id,
      motivo || 'Cancelado pelo administrador',
      user_id
    ]);

    // 4. Registrar log de auditoria
    const auditQuery = `
      INSERT INTO audit_logs (
        user_id, action, table_name, record_id,
        old_values, new_values, ip_address, additional_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await client.query(auditQuery, [
      user_id,
      'CANCEL_WINNER',
      'ganhadores',
      ganhador_id,
      JSON.stringify({ cancelado_em: null, motivo_cancelamento: null }),
      JSON.stringify({
        cancelado_em: new Date().toISOString(),
        motivo_cancelamento: motivo || 'Cancelado pelo administrador'
      }),
      req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress,
      JSON.stringify({
        promocao_nome: ganhador.promocao_nome,
        participante_nome: ganhador.participante_nome,
        motivo: motivo || 'Cancelado pelo administrador'
      })
    ]);

    // 5. Opcional: Adicionar o participante de volta ao pool de elegíveis
    const promocaoStatusQuery = `
      SELECT status FROM promocoes WHERE id = $1
    `;
    const promocaoStatus = await client.query(promocaoStatusQuery, [ganhador.promocao_id]);

    if (promocaoStatus.rows[0]?.status === 'ativa') {
      // Remover restrição de "já ganhou" se existir
      await client.query(`
        UPDATE participantes
        SET ja_ganhou = false
        WHERE id = $1
      `, [ganhador.participante_id]);
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Ganhador cancelado com sucesso',
      data: {
        ganhador_id,
        participante_nome: ganhador.participante_nome,
        promocao_nome: ganhador.promocao_nome,
        cancelado_em: updateResult.rows[0].cancelado_em,
        motivo_cancelamento: updateResult.rows[0].motivo_cancelamento
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Função para listar ganhadores
async function listarGanhadores(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido'
    });
  }

  try {
    const { promocao_id, incluir_cancelados } = req.query;

    let query = `
      SELECT
        g.*,
        p.nome as promocao_nome,
        pa.nome as participante_nome,
        pa.telefone as participante_telefone,
        pa.email as participante_email,
        pa.cidade as participante_cidade
      FROM ganhadores g
      JOIN promocoes p ON p.id = g.promocao_id
      JOIN participantes pa ON pa.id = g.participante_id
    `;

    const params = [];
    const conditions = [];

    if (promocao_id) {
      conditions.push(`g.promocao_id = $${params.length + 1}`);
      params.push(promocao_id);
    }

    if (incluir_cancelados !== 'true') {
      conditions.push('g.cancelado_em IS NULL');
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY g.created_at DESC';

    const result = await databasePool.query(query, params);

    return res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    throw error;
  }
}