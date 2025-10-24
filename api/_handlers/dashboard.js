// api/dashboard.js - Consolidação de todas as funções do dashboard
const databasePool = require('./_lib/database');
const { getSecureHeaders } = require('./_lib/security');

module.exports = async (req, res) => {
  const headers = getSecureHeaders();
  Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { action } = req.query;

  try {
    switch (action) {
      // Admin actions
      case 'admin-stats':
        return await getAdminStats(req, res);
      case 'recent-activities':
        return await getRecentActivities(req, res);
      case 'system-health':
        return await getSystemHealth(req, res);
      case 'user-metrics':
        return await getUserMetrics(req, res);

      // User actions
      case 'user-stats':
        return await getUserStats(req, res);
      case 'user-activity':
        return await getUserActivity(req, res);
      case 'available-promotions':
        return await getAvailablePromotions(req, res);

      // Viewer actions
      case 'reports-summary':
        return await getReportsSummary(req, res);
      case 'analytics-data':
        return await getAnalyticsData(req, res);
      case 'charts-data':
        return await getChartsData(req, res);

      // Chart-specific endpoints for dashboard
      case 'participantes-por-promocao':
        return await getParticipantesPorPromocao(req, res);
      case 'origem-cadastros':
        return await getOrigemCadastros(req, res);

      // Moderator actions
      case 'moderator-stats':
        return await getModeratorStats(req, res);
      case 'pending-actions':
        return await getPendingActions(req, res);
      case 'recent-promotions':
        return await getRecentPromotions(req, res);
      case 'sorteio-stats':
        return await getSorteioStats(req, res);

      case 'debug':
        return await debugTables(req, res);
      case 'inspect':
        return await inspectDatabase(req, res);

      default:
        // Se não há action, retornar stats padrão do admin
        return await getAdminStats(req, res);
    }
  } catch (error) {
    console.error('Erro no dashboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

// Função para estatísticas administrativas
async function getAdminStats(req, res) {
  // Verificar se as tabelas existem e têm dados
  try {
    const tablesCheck = await databasePool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('promocoes', 'participantes', 'ganhadores')
    `);
    console.log('📋 Tabelas existentes:', tablesCheck.rows.map(r => r.table_name));
  } catch (err) {
    console.error('❌ Erro ao verificar tabelas:', err.message);
  }

  // Buscar estatísticas administrativas - SOMENTE DADOS REAIS
  const statsQuery = `
    SELECT
      (SELECT COUNT(*) FROM promocoes) as total_promocoes,
      (SELECT COUNT(*) FROM promocoes
       WHERE status = 'ativa'
       AND DATE(data_inicio) <= CURRENT_DATE
       AND DATE(data_fim) >= CURRENT_DATE) as promocoes_ativas,
      (SELECT COUNT(*) FROM participantes) as total_participantes,
      (SELECT COUNT(*) FROM participantes
       WHERE DATE(COALESCE(participou_em, created_at)) = CURRENT_DATE) as participantes_hoje,
      (SELECT COUNT(*) FROM ganhadores) as total_ganhadores,
      (SELECT COUNT(*) FROM usuarios_admin) as total_admins,
      (SELECT COUNT(*) FROM audit_logs WHERE DATE(created_at) = CURRENT_DATE) as atividades_hoje
  `;

  const result = await databasePool.query(statsQuery);
  const stats = result.rows[0];

  console.log('📊 Stats raw do banco:', JSON.stringify(stats, null, 2));
  console.log('📊 Stats do dashboard (SOMENTE DADOS REAIS):', {
    total_promocoes: stats.total_promocoes,
    promocoes_ativas: stats.promocoes_ativas,
    total_participantes: stats.total_participantes,
    participantes_hoje: stats.participantes_hoje
  });

  // Buscar estatísticas por período
  const periodStatsQuery = `
    SELECT
      DATE_TRUNC('day', COALESCE(participou_em, created_at)) as data,
      COUNT(*) as participantes
    FROM participantes
    WHERE COALESCE(participou_em, created_at) >= NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', COALESCE(participou_em, created_at))
    ORDER BY data DESC
  `;

  const periodResult = await databasePool.query(periodStatsQuery);

  // Buscar top promoções
  const topPromocoesQuery = `
    SELECT
      p.nome,
      COUNT(pa.id) as participantes_count
    FROM promocoes p
    LEFT JOIN participantes pa ON p.id = pa.promocao_id
    GROUP BY p.id, p.nome
    ORDER BY participantes_count DESC
    LIMIT 5
  `;

  const topPromocoesResult = await databasePool.query(topPromocoesQuery);

  return res.status(200).json({
    success: true,
    data: {
      totals: {
        promocoes: parseInt(stats.total_promocoes) || 0,
        promocoes_ativas: parseInt(stats.promocoes_ativas) || 0,
        participantes: parseInt(stats.total_participantes) || 0,
        participantes_hoje: parseInt(stats.participantes_hoje) || 0,
        ganhadores: parseInt(stats.total_ganhadores) || 0,
        admins: parseInt(stats.total_admins) || 0,
        atividades_hoje: parseInt(stats.atividades_hoje) || 0
      },
      period_stats: periodResult.rows,
      top_promocoes: topPromocoesResult.rows
    }
  });
}

// Função para atividades recentes
async function getRecentActivities(req, res) {
  const activitiesQuery = `
    SELECT
      al.action,
      al.details,
      al.created_at,
      ua.usuario as user_name,
      ua.role as user_role
    FROM audit_logs al
    LEFT JOIN usuarios_admin ua ON al.user_id = ua.id
    ORDER BY al.created_at DESC
    LIMIT 20
  `;

  const result = await databasePool.query(activitiesQuery);

  // Formatar atividades
  const activities = result.rows.map(activity => ({
    id: activity.id,
    action: activity.action,
    details: activity.details,
    user: activity.user_name || 'Sistema',
    role: activity.user_role || 'system',
    timestamp: activity.created_at,
    time_ago: getTimeAgo(activity.created_at)
  }));

  return res.status(200).json({
    success: true,
    data: { activities }
  });
}

// Função para saúde do sistema
async function getSystemHealth(req, res) {
  const healthChecks = [];

  try {
    // Verificar conexão com banco
    const dbResult = await databasePool.query('SELECT NOW()');
    healthChecks.push({
      service: 'database',
      status: 'healthy',
      message: 'Conectado',
      timestamp: dbResult.rows[0].now
    });
  } catch (error) {
    healthChecks.push({
      service: 'database',
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date()
    });
  }

  // Verificar tabelas essenciais
  try {
    const tableChecks = await Promise.all([
      databasePool.query("SELECT COUNT(*) FROM promocoes"),
      databasePool.query("SELECT COUNT(*) FROM participantes"),
      databasePool.query("SELECT COUNT(*) FROM usuarios_admin")
    ]);

    healthChecks.push({
      service: 'tables',
      status: 'healthy',
      message: 'Todas as tabelas acessíveis',
      details: {
        promocoes: parseInt(tableChecks[0].rows[0].count),
        participantes: parseInt(tableChecks[1].rows[0].count),
        usuarios: parseInt(tableChecks[2].rows[0].count)
      }
    });
  } catch (error) {
    healthChecks.push({
      service: 'tables',
      status: 'unhealthy',
      message: 'Erro ao acessar tabelas: ' + error.message
    });
  }

  const overallStatus = healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

  return res.status(200).json({
    success: true,
    data: {
      status: overallStatus,
      checks: healthChecks,
      timestamp: new Date()
    }
  });
}

// Função para métricas de usuário
async function getUserMetrics(req, res) {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id é obrigatório' });
  }

  try {
    // Buscar métricas do usuário específico
    const userStatsQuery = `
      SELECT
        COUNT(CASE WHEN al.action LIKE '%create%' THEN 1 END) as actions_create,
        COUNT(CASE WHEN al.action LIKE '%update%' THEN 1 END) as actions_update,
        COUNT(CASE WHEN al.action LIKE '%delete%' THEN 1 END) as actions_delete,
        COUNT(*) as total_actions,
        MAX(al.created_at) as last_activity
      FROM audit_logs al
      WHERE al.user_id = $1
        AND al.created_at >= NOW() - INTERVAL '30 days'
    `;

    const result = await databasePool.query(userStatsQuery, [user_id]);
    const userStats = result.rows[0];

    // Buscar atividade por dia (últimos 7 dias)
    const dailyActivityQuery = `
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as actions
      FROM audit_logs
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `;

    const dailyResult = await databasePool.query(dailyActivityQuery, [user_id]);

    return res.status(200).json({
      success: true,
      data: {
        user_id,
        stats: {
          total_actions: parseInt(userStats.total_actions) || 0,
          actions_create: parseInt(userStats.actions_create) || 0,
          actions_update: parseInt(userStats.actions_update) || 0,
          actions_delete: parseInt(userStats.actions_delete) || 0,
          last_activity: userStats.last_activity
        },
        daily_activity: dailyResult.rows
      }
    });

  } catch (error) {
    throw error;
  }
}

// Função utilitária para calcular tempo decorrido
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}min atrás`;
  return 'agora';
}

// User Dashboard Functions
async function getUserStats(req, res) {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM participantes WHERE user_email = $1) as minhas_participacoes,
        (SELECT COUNT(*) FROM ganhadores WHERE user_email = $1) as meus_premios,
        (SELECT COUNT(*) FROM promocoes WHERE status = 'ativa') as promocoes_ativas
    `;

    const result = await databasePool.query(statsQuery, [req.user?.email || '']);

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    throw error;
  }
}

async function getUserActivity(req, res) {
  try {
    const activityQuery = `
      SELECT
        'participacao' as type,
        p.nome as title,
        'Participação registrada' as details,
        par.created_at as timestamp
      FROM participantes par
      JOIN promocoes p ON p.id = par.promocao_id
      WHERE par.user_email = $1
      ORDER BY par.created_at DESC
      LIMIT 10
    `;

    const result = await databasePool.query(activityQuery, [req.user?.email || '']);

    return res.status(200).json({
      success: true,
      activities: result.rows
    });
  } catch (error) {
    throw error;
  }
}

async function getAvailablePromotions(req, res) {
  try {
    const promotionsQuery = `
      SELECT
        id, nome, descricao, premio, data_inicio, data_fim,
        (SELECT COUNT(*) FROM participantes WHERE promocao_id = p.id) as total_participantes
      FROM promocoes p
      WHERE status = 'ativa'
        AND data_inicio <= NOW()
        AND data_fim >= NOW()
      ORDER BY data_inicio DESC
      LIMIT 20
    `;

    const result = await databasePool.query(promotionsQuery);

    return res.status(200).json({
      success: true,
      promotions: result.rows
    });
  } catch (error) {
    throw error;
  }
}

// Viewer Dashboard Functions
async function getReportsSummary(req, res) {
  try {
    const reportsQuery = `
      SELECT
        (SELECT COUNT(*) FROM promocoes) as total_promocoes,
        (SELECT COUNT(*) FROM participantes) as total_participantes,
        (SELECT COUNT(*) FROM ganhadores) as total_ganhadores,
        (SELECT AVG(EXTRACT(day FROM data_fim - data_inicio)) FROM promocoes WHERE data_fim IS NOT NULL) as duracao_media
    `;

    const result = await databasePool.query(reportsQuery);

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    throw error;
  }
}

async function getAnalyticsData(req, res) {
  try {
    const analyticsQuery = `
      SELECT
        DATE_TRUNC('day', participou_em) as date,
        COUNT(*) as participantes
      FROM participantes
      WHERE participou_em >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', participou_em)
      ORDER BY date ASC
    `;

    const result = await databasePool.query(analyticsQuery);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    throw error;
  }
}

async function getChartsData(req, res) {
  try {
    const chartsQuery = `
      SELECT
        p.nome,
        COUNT(par.id) as participantes
      FROM promocoes p
      LEFT JOIN participantes par ON par.promocao_id = p.id
      WHERE COALESCE(p.criado_em, p.created_at) >= NOW() - INTERVAL '90 days'
      GROUP BY p.id, p.nome
      ORDER BY participantes DESC
      LIMIT 10
    `;

    const result = await databasePool.query(chartsQuery);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    throw error;
  }
}

// Moderator Dashboard Functions
async function getModeratorStats(req, res) {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM promocoes WHERE status = 'pendente') as promocoes_pendentes,
        (SELECT COUNT(*) FROM participantes WHERE status = 'pendente') as participacoes_pendentes,
        (SELECT COUNT(*) FROM promocoes WHERE status = 'ativa') as promocoes_ativas,
        (SELECT COUNT(*) FROM ganhadores WHERE DATE(created_at) = CURRENT_DATE) as ganhadores_hoje
    `;

    const result = await databasePool.query(statsQuery);

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    throw error;
  }
}

async function getPendingActions(req, res) {
  try {
    const actionsQuery = `
      SELECT
        'promocao' as type,
        p.nome as title,
        'Aguardando aprovação' as details,
        p.created_at as timestamp,
        p.id
      FROM promocoes p
      WHERE p.status = 'pendente'
      UNION ALL
      SELECT
        'participante' as type,
        pr.nome as title,
        'Participação pendente' as details,
        par.created_at as timestamp,
        par.id
      FROM participantes par
      JOIN promocoes pr ON pr.id = par.promocao_id
      WHERE par.status = 'pendente'
      ORDER BY timestamp DESC
      LIMIT 20
    `;

    const result = await databasePool.query(actionsQuery);

    return res.status(200).json({
      success: true,
      actions: result.rows
    });
  } catch (error) {
    throw error;
  }
}

async function getRecentPromotions(req, res) {
  try {
    const promotionsQuery = `
      SELECT
        id, nome, descricao, status, data_inicio, data_fim,
        (SELECT COUNT(*) FROM participantes WHERE promocao_id = p.id) as total_participantes
      FROM promocoes p
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const result = await databasePool.query(promotionsQuery);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    throw error;
  }
}

async function getSorteioStats(req, res) {
  try {
    const sorteioQuery = `
      SELECT
        COUNT(*) as total_sorteios,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as sorteios_hoje,
        COUNT(CASE WHEN DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as sorteios_semana,
        AVG(CASE WHEN premio_valor IS NOT NULL THEN premio_valor END) as valor_medio_premio
      FROM ganhadores
    `;

    const result = await databasePool.query(sorteioQuery);

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    throw error;
  }
}

// Função para dados do gráfico "Participantes por Promoção" (últimas 4 promoções)
async function getParticipantesPorPromocao(req, res) {
  try {
    const participantesQuery = `
      SELECT
        p.nome as promocao,
        p.id,
        COUNT(par.id) as participantes
      FROM promocoes p
      LEFT JOIN participantes par ON par.promocao_id = p.id
      WHERE COALESCE(p.criado_em, p.created_at) >= NOW() - INTERVAL '6 months'
      GROUP BY p.id, p.nome
      HAVING COUNT(par.id) > 0
      ORDER BY COALESCE(p.criado_em, p.created_at) DESC
      LIMIT 4
    `;

    const result = await databasePool.query(participantesQuery);
    console.log('📊 Query resultado participantes por promoção (SOMENTE DADOS REAIS):', result.rows);

    return res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        promocao: row.promocao,
        participantes: parseInt(row.participantes) || 0
      }))
    });
  } catch (error) {
    console.error('Erro em getParticipantesPorPromocao:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados reais de participantes por promoção',
      data: []
    });
  }
}

// Função para dados do gráfico "Origem dos Cadastros"
async function getOrigemCadastros(req, res) {
  try {
    const { promocao_id } = req.query;
    console.log('🔍 Buscando origem cadastros para promoção:', promocao_id);

    let origemQuery = `
      SELECT
        CASE
          WHEN origem_source IS NULL OR origem_source = '' THEN 'Não informado'
          ELSE INITCAP(origem_source)
        END as origem,
        COUNT(*) as total
      FROM participantes
    `;

    let queryParams = [];

    // Se uma promoção específica foi selecionada
    if (promocao_id && promocao_id !== 'todas') {
      origemQuery += ` WHERE promocao_id = $1`;
      queryParams.push(promocao_id);
    }

    origemQuery += `
      GROUP BY
        CASE
          WHEN origem_source IS NULL OR origem_source = '' THEN 'Não informado'
          ELSE INITCAP(origem_source)
        END
      HAVING COUNT(*) > 0
      ORDER BY total DESC
      LIMIT 8
    `;

    const result = await databasePool.query(origemQuery, queryParams);
    console.log('🍰 Dados origem dos cadastros (SOMENTE DADOS REAIS):', result.rows);

    return res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        origem: row.origem,
        total: parseInt(row.total)
      }))
    });
  } catch (error) {
    console.error('Erro em getOrigemCadastros:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados reais de origem dos cadastros',
      data: []
    });
  }
}

// Função temporária de debug para verificar estrutura das tabelas
async function debugTables(req, res) {
  try {
    // 1. Verificar se as tabelas existem
    const tablesCheck = await databasePool.query(`
      SELECT table_name
      FROM information_schema.tables
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
    let promocoesData, participantesData, ganhadoresData;
    try {
      promocoesData = await databasePool.query('SELECT COUNT(*) as total, status FROM promocoes GROUP BY status');
    } catch (e) {
      promocoesData = { rows: [], error: e.message };
    }

    try {
      participantesData = await databasePool.query('SELECT COUNT(*) as total FROM participantes');
    } catch (e) {
      participantesData = { rows: [{ total: 0 }], error: e.message };
    }

    try {
      ganhadoresData = await databasePool.query('SELECT COUNT(*) as total FROM ganhadores');
    } catch (e) {
      ganhadoresData = { rows: [{ total: 0 }], error: e.message };
    }

    // 4. Sample dos dados
    let promocoesSample, participantesSample;
    try {
      promocoesSample = await databasePool.query('SELECT * FROM promocoes LIMIT 2');
    } catch (e) {
      promocoesSample = { rows: [], error: e.message };
    }

    try {
      participantesSample = await databasePool.query('SELECT * FROM participantes LIMIT 2');
    } catch (e) {
      participantesSample = { rows: [], error: e.message };
    }

    return res.status(200).json({
      success: true,
      debug: {
        tables_found: tablesCheck.rows,
        promocoes_columns: promocoesColumns.rows,
        participantes_columns: participantesColumns.rows,
        data_counts: {
          promocoes: promocoesData.rows || [],
          participantes: participantesData.rows?.[0] || { total: 0 },
          ganhadores: ganhadoresData.rows?.[0] || { total: 0 }
        },
        sample_data: {
          promocoes: promocoesSample.rows || [],
          participantes: participantesSample.rows || []
        },
        errors: {
          promocoes: promocoesData.error || null,
          participantes: participantesData.error || null,
          ganhadores: ganhadoresData.error || null,
          promocoes_sample: promocoesSample.error || null,
          participantes_sample: participantesSample.error || null
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
}

// Função completa de inspeção do banco PostgreSQL
async function inspectDatabase(req, res) {
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

    // 2. ESTRUTURA DETALHADA - PARTICIPANTES
    let participantesStructure;
    try {
      const columns = await databasePool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'participantes' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      participantesStructure = { exists: true, columns: columns.rows };
    } catch (err) {
      participantesStructure = { exists: false, error: err.message };
    }

    // 3. CONTAGEM BÁSICA
    let participantesCount = 0;
    try {
      const count = await databasePool.query('SELECT COUNT(*) as total FROM participantes');
      participantesCount = parseInt(count.rows[0].total);
    } catch (err) {
      participantesCount = { error: err.message };
    }

    // 4. SAMPLE DE PARTICIPANTES
    let participantesSample;
    try {
      const sample = await databasePool.query('SELECT * FROM participantes LIMIT 1');
      participantesSample = sample.rows;
    } catch (err) {
      participantesSample = { error: err.message };
    }

    // 5. TESTE QUERY BÁSICA
    let basicStatsTest;
    try {
      const test = await databasePool.query('SELECT COUNT(*) as total FROM participantes');
      basicStatsTest = { success: true, result: test.rows[0] };
    } catch (err) {
      basicStatsTest = { success: false, error: err.message };
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      debug_inspection: {
        all_tables: allTables.rows,
        participantes_structure: participantesStructure,
        participantes_count: participantesCount,
        participantes_sample: participantesSample,
        basic_stats_test: basicStatsTest
      }
    });

  } catch (error) {
    console.error('❌ ERRO CRÍTICO na inspeção:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}