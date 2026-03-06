// Sistema de Migração Automatizado para NexoGeo
// Executa migrações pendentes de forma segura e ordenada

const databasePool = require('../_lib/database');

// Definição das migrações
const migrations = [
  {
    id: 'v2.3.0-001',
    name: 'Criar tabelas de auditoria LGPD',
    priority: 'ALTA',
    sql: `
      -- Tabela de logs de acesso a dados pessoais (LGPD Art. 37)
      CREATE TABLE IF NOT EXISTS data_access_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        participant_id INTEGER,
        data_type VARCHAR(50) NOT NULL,
        access_reason VARCHAR(100),
        legal_basis VARCHAR(50),
        masked_data BOOLEAN DEFAULT true,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de logs de consentimento
      CREATE TABLE IF NOT EXISTS consent_logs (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER,
        consent_type VARCHAR(50) NOT NULL,
        consent_given BOOLEAN NOT NULL,
        consent_text TEXT,
        consent_version VARCHAR(20),
        ip_address INET,
        user_agent TEXT,
        withdrawal_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de logs do sistema
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(10) NOT NULL,
        component VARCHAR(50),
        message TEXT NOT NULL,
        error_code VARCHAR(20),
        stack_trace TEXT,
        additional_data JSONB,
        user_id INTEGER,
        ip_address INET,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    id: 'v2.3.0-002',
    name: 'Criar índices para tabelas de auditoria',
    priority: 'ALTA',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_participant_id ON data_access_logs(participant_id);
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_type ON data_access_logs(data_type);

      CREATE INDEX IF NOT EXISTS idx_consent_logs_participant_id ON consent_logs(participant_id);
      CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type ON consent_logs(consent_type);
      CREATE INDEX IF NOT EXISTS idx_consent_logs_created_at ON consent_logs(created_at);

      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
      CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
      CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
    `
  },
  {
    id: 'v2.3.0-003',
    name: 'Criar índices críticos para participantes',
    priority: 'ALTA',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_participantes_telefone ON participantes(telefone);

      CREATE INDEX IF NOT EXISTS idx_participantes_promocao_id ON participantes(promocao_id) WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_participantes_nome ON participantes(nome) WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_participantes_cidade ON participantes(cidade) WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_participantes_bairro ON participantes(bairro) WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_participantes_criado_em ON participantes(participou_em DESC) WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_participantes_soft_delete ON participantes(deleted_at);

      CREATE INDEX IF NOT EXISTS idx_participantes_geolocalizacao ON participantes(latitude, longitude);
    `
  },
  {
    id: 'v2.3.0-004',
    name: 'Criar índice único para evitar duplicação de telefone por promoção',
    priority: 'ALTA',
    sql: `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_participante_unico_por_promocao
        ON participantes(promocao_id, telefone)
        WHERE deleted_at IS NULL AND promocao_id IS NOT NULL;
    `
  },
  {
    id: 'v2.3.0-005',
    name: 'Criar índices para ganhadores',
    priority: 'ALTA',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_ganhadores_promocao_id ON ganhadores(promocao_id);
      CREATE INDEX IF NOT EXISTS idx_ganhadores_participante_id ON ganhadores(participante_id);
      CREATE INDEX IF NOT EXISTS idx_ganhadores_sorteado_em ON ganhadores(sorteado_em DESC);
      CREATE INDEX IF NOT EXISTS idx_ganhadores_cancelado ON ganhadores(cancelado);
    `
  },
  {
    id: 'v2.3.0-006',
    name: 'Criar índices para promoções',
    priority: 'ALTA',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_promocoes_status ON promocoes(status) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_promocoes_datas ON promocoes(data_inicio, data_fim) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_promocoes_criado_em ON promocoes(criado_em DESC) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_promocoes_slug ON promocoes(slug) WHERE deleted_at IS NULL;
    `
  },
  {
    id: 'v2.3.0-007',
    name: 'Criar view participantes_unificados',
    priority: 'MEDIA',
    sql: `
      CREATE OR REPLACE VIEW participantes_unificados AS
      SELECT
        id,
        promocao_id,
        nome AS name,
        telefone AS phone,
        bairro AS neighborhood,
        cidade AS city,
        latitude,
        longitude,
        email,
        origem_source,
        origem_medium,
        participou_em AS created_at,
        'regular' AS participant_type
      FROM participantes
      WHERE deleted_at IS NULL

      UNION ALL

      SELECT
        id,
        NULL AS promocao_id,
        name,
        phone,
        neighborhood,
        city,
        latitude,
        longitude,
        NULL AS email,
        'caixa_misteriosa' AS origem_source,
        'game' AS origem_medium,
        created_at,
        'public' AS participant_type
      FROM public_participants
      WHERE deleted_at IS NULL;
    `
  },
  {
    id: 'v2.3.0-008',
    name: 'Criar view participantes_unicos',
    priority: 'MEDIA',
    sql: `
      CREATE OR REPLACE VIEW participantes_unicos AS
      SELECT DISTINCT ON (phone) *
      FROM participantes_unificados
      ORDER BY phone, created_at DESC;
    `
  },
  {
    id: 'v2.3.0-009',
    name: 'Criar função cleanup_old_logs',
    priority: 'MEDIA',
    sql: `
      CREATE OR REPLACE FUNCTION cleanup_old_logs()
      RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER := 0;
      BEGIN
        DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        DELETE FROM data_access_logs WHERE created_at < NOW() - INTERVAL '1 year';
        DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '6 months' AND level != 'ERROR';
        DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '1 year' AND level = 'ERROR';
        DELETE FROM consent_logs WHERE created_at < NOW() - INTERVAL '5 years';
        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `
  },
  {
    id: 'v2.3.0-010',
    name: 'Adicionar colunas faltantes em configuracoes_emissora',
    priority: 'BAIXA',
    sql: `
      ALTER TABLE configuracoes_emissora
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE configuracoes_emissora
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `
  },
  {
    id: 'v2.3.0-011',
    name: 'Adicionar coluna video_url em ganhadores',
    priority: 'BAIXA',
    sql: `
      ALTER TABLE ganhadores
      ADD COLUMN IF NOT EXISTS video_url TEXT;
    `
  },
  {
    id: 'v2.3.0-012',
    name: 'Adicionar colunas de estatísticas em public_participants',
    priority: 'BAIXA',
    sql: `
      ALTER TABLE public_participants
      ADD COLUMN IF NOT EXISTS total_submissions INT DEFAULT 0;

      ALTER TABLE public_participants
      ADD COLUMN IF NOT EXISTS correct_guesses INT DEFAULT 0;

      ALTER TABLE public_participants
      ADD COLUMN IF NOT EXISTS game_id INT;
    `
  },
  {
    id: 'v2.3.0-013',
    name: 'Adicionar comentários nas tabelas de auditoria',
    priority: 'BAIXA',
    sql: `
      COMMENT ON TABLE data_access_logs IS 'Log específico de acesso a dados pessoais conforme Art. 37 da LGPD';
      COMMENT ON TABLE consent_logs IS 'Registro de consentimentos e retiradas conforme LGPD';
      COMMENT ON TABLE system_logs IS 'Logs técnicos do sistema para monitoramento e debugging';
      COMMENT ON VIEW participantes_unificados IS 'View combinada de participantes regulares e públicos';
      COMMENT ON VIEW participantes_unicos IS 'Participantes únicos baseado no telefone (mais recente por telefone)';
      COMMENT ON FUNCTION cleanup_old_logs() IS 'Remove logs antigos conforme política de retenção';
    `
  },
  {
    id: 'v2.3.0-014',
    name: 'Criar tabelas de Enquetes para TV',
    priority: 'ALTA',
    sql: `
      CREATE TABLE IF NOT EXISTS enquetes (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(100) NOT NULL,
        pergunta VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'inativa' CHECK (status IN ('inativa', 'ativa', 'encerrada')),
        cor_tema VARCHAR(50) DEFAULT 'nexogeo',
        data_inicio TIMESTAMP WITH TIME ZONE,
        data_fim TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS enquete_opcoes (
        id SERIAL PRIMARY KEY,
        enquete_id INTEGER REFERENCES enquetes(id) ON DELETE CASCADE,
        texto_opcao VARCHAR(100) NOT NULL,
        cor_grafico VARCHAR(50) DEFAULT '#4F46E5',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enquete_votos (
        id SERIAL PRIMARY KEY,
        enquete_id INTEGER REFERENCES enquetes(id) ON DELETE CASCADE,
        opcao_id INTEGER REFERENCES enquete_opcoes(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        session_cookie VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_enquete_votos_enquete_id ON enquete_votos(enquete_id);
      CREATE INDEX IF NOT EXISTS idx_enquete_votos_ip ON enquete_votos(enquete_id, ip_address);
      CREATE INDEX IF NOT EXISTS idx_enquetes_status ON enquetes(status) WHERE deleted_at IS NULL;
    `
  },
  {
    id: 'v2.4.0-015',
    name: 'Vincular votos de enquetes à tabela de participantes',
    priority: 'ALTA',
    sql: `
      TRUNCATE TABLE enquete_votos;

      ALTER TABLE enquete_votos 
      ADD COLUMN IF NOT EXISTS participante_id INTEGER NOT NULL REFERENCES participantes(id) ON DELETE CASCADE;

      DROP INDEX IF EXISTS idx_enquete_votos_ip;

      CREATE UNIQUE INDEX IF NOT EXISTS unq_voto_por_participante ON enquete_votos(enquete_id, participante_id);

      CREATE INDEX IF NOT EXISTS idx_enquete_votos_participante_id ON enquete_votos(participante_id);
    `
  },
  {
    id: 'v2.4.0-016',
    name: 'Adicionar coluna mostrar_votos na tabela enquetes',
    priority: 'NORMAL',
    sql: `
      ALTER TABLE enquetes ADD COLUMN IF NOT EXISTS mostrar_votos BOOLEAN DEFAULT true;
    `
  },
  {
    id: 'v2.4.0-017',
    name: 'Remover constraint restritiva de promocao_id em participantes',
    priority: 'ALTA',
    sql: `
      -- Permite que promocao_id aceite IDs de enquetes sem violar FK de promocoes
      ALTER TABLE participantes DROP CONSTRAINT IF EXISTS participantes_promocao_id_fkey;
    `
  },
  {
    id: 'v2.4.0-018',
    name: 'Garantir colunas de software delete em tabelas críticas',
    priority: 'ALTA',
    sql: `
      -- Tabela participantes
      ALTER TABLE participantes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE participantes ADD COLUMN IF NOT EXISTS deleted_by INTEGER;

      -- Tabela public_participants
      ALTER TABLE public_participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public_participants ADD COLUMN IF NOT EXISTS deleted_by INTEGER;

      -- Tabela enquetes
      ALTER TABLE enquetes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE enquetes ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
    `
  },
  {
    id: 'v2.4.0-019',
    name: 'Sincronizar nomes de colunas em Views do Dashboard',
    priority: 'ALTA',
    sql: `
      -- Recriar views com mapeamento correto para o handler de participantes
      CREATE OR REPLACE VIEW participantes_unificados AS
      SELECT
        id,
        promocao_id,
        nome AS name,
        telefone AS phone,
        bairro AS neighborhood,
        cidade AS city,
        latitude,
        longitude,
        email,
        origem_source,
        origem_medium,
        participou_em AS created_at,
        'regular' AS participant_type
      FROM participantes
      WHERE deleted_at IS NULL

      UNION ALL

      SELECT
        id,
        NULL AS promocao_id,
        name,
        phone,
        neighborhood,
        city,
        latitude,
        longitude,
        NULL AS email,
        'caixa_misteriosa' AS origem_source,
        'game' AS origem_medium,
        created_at,
        'public' AS participant_type
      FROM public_participants
      WHERE deleted_at IS NULL;

      CREATE OR REPLACE VIEW participantes_unicos AS
      SELECT DISTINCT ON (phone) *
      FROM participantes_unificados
      ORDER BY phone, created_at DESC;
    `
  }
];

async function checkMigrationTable() {
  // Criar tabela de controle de migrações se não existir
  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      success BOOLEAN DEFAULT true,
      error_message TEXT
    )
  `);
}

async function getMigrationStatus() {
  await checkMigrationTable();

  const result = await databasePool.query(`
    SELECT id, name, executed_at, success
    FROM schema_migrations
    ORDER BY executed_at
  `);

  const executed = result.rows.map(r => r.id);

  return {
    executed,
    pending: migrations.filter(m => !executed.includes(m.id)),
    total: migrations.length,
    executedCount: executed.length
  };
}

async function runMigration(migration) {
  console.log(`🔄 Executando migração ${migration.id}: ${migration.name}`);

  try {
    // Executar SQL da migração
    await databasePool.query(migration.sql);

    // Registrar sucesso
    await databasePool.query(`
      INSERT INTO schema_migrations (id, name, success)
      VALUES ($1, $2, true)
      ON CONFLICT (id) DO UPDATE SET
        executed_at = CURRENT_TIMESTAMP,
        success = true,
        error_message = NULL
    `, [migration.id, migration.name]);

    console.log(`✅ Migração ${migration.id} executada com sucesso`);
    return { success: true, id: migration.id, name: migration.name };

  } catch (error) {
    console.error(`❌ Erro na migração ${migration.id}:`, error.message);

    // Registrar falha
    await databasePool.query(`
      INSERT INTO schema_migrations (id, name, success, error_message)
      VALUES ($1, $2, false, $3)
      ON CONFLICT (id) DO UPDATE SET
        executed_at = CURRENT_TIMESTAMP,
        success = false,
        error_message = $3
    `, [migration.id, migration.name, error.message]);

    return { success: false, id: migration.id, name: migration.name, error: error.message };
  }
}

async function runAllPendingMigrations() {
  const status = await getMigrationStatus();

  if (status.pending.length === 0) {
    return {
      success: true,
      message: 'Nenhuma migração pendente',
      executed: [],
      failed: [],
      status
    };
  }

  console.log(`📋 ${status.pending.length} migrações pendentes encontradas`);

  const results = {
    executed: [],
    failed: [],
    skipped: []
  };

  // Executar migrações na ordem
  for (const migration of status.pending) {
    const result = await runMigration(migration);

    if (result.success) {
      results.executed.push(result);
    } else {
      results.failed.push(result);
      // Continuar mesmo com falha (algumas migrações podem ser independentes)
    }
  }

  // Obter status atualizado
  const finalStatus = await getMigrationStatus();

  return {
    success: results.failed.length === 0,
    message: results.failed.length === 0
      ? `✅ Todas as ${results.executed.length} migrações executadas com sucesso`
      : `⚠️ ${results.executed.length} migrações executadas, ${results.failed.length} falharam`,
    executed: results.executed,
    failed: results.failed,
    status: finalStatus
  };
}

async function rollbackMigration(migrationId) {
  // Por segurança, apenas marca como não executada (não reverte alterações)
  await databasePool.query(`
    DELETE FROM schema_migrations WHERE id = $1
  `, [migrationId]);

  return { success: true, message: `Migração ${migrationId} marcada como não executada` };
}

module.exports = {
  migrations,
  getMigrationStatus,
  runMigration,
  runAllPendingMigrations,
  rollbackMigration
};
