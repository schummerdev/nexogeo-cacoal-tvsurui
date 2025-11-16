// Script para executar todas as correções de schema
// Executa em etapas para melhor controle e rollback

require('dotenv').config();
const { pool } = require('./lib/db');

const fixes = {
  // 1. TABELAS LGPD (PRIORIDADE ALTA)
  lgpdTables: `
    -- ============================================================
    -- TABELAS DE AUDITORIA LGPD
    -- ============================================================

    -- 1.1 LOGS DE ACESSO A DADOS PESSOAIS (LGPD Art. 37)
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

    COMMENT ON TABLE data_access_logs IS 'Log específico de acesso a dados pessoais conforme Art. 37 da LGPD';

    CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_data_access_logs_participant_id ON data_access_logs(participant_id);
    CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_type ON data_access_logs(data_type);

    -- 1.2 LOGS DE CONSENTIMENTO
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

    COMMENT ON TABLE consent_logs IS 'Registro de consentimentos e retiradas conforme LGPD';

    CREATE INDEX IF NOT EXISTS idx_consent_logs_participant_id ON consent_logs(participant_id);
    CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type ON consent_logs(consent_type);
    CREATE INDEX IF NOT EXISTS idx_consent_logs_created_at ON consent_logs(created_at);

    -- 1.3 LOGS DE SISTEMA
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

    COMMENT ON TABLE system_logs IS 'Logs técnicos do sistema para monitoramento e debugging';

    CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
    CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
    CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
  `,

  // 2. COLUNAS SOFT DELETE (PRIORIDADE ALTA)
  softDeleteColumns: `
    -- ============================================================
    -- COLUNAS DELETED_AT PARA SOFT DELETE
    -- ============================================================

    ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE public_participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE games ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  `,

  // 3. COLUNAS ADICIONAIS (PRIORIDADE MÉDIA)
  additionalColumns: `
    -- ============================================================
    -- COLUNAS ADICIONAIS PARA COMPLETUDE
    -- ============================================================

    -- configuracoes_emissora
    ALTER TABLE configuracoes_emissora ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE configuracoes_emissora ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    -- ganhadores (auditoria de cancelamento)
    ALTER TABLE ganhadores ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE ganhadores ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMP WITH TIME ZONE;
    ALTER TABLE ganhadores ADD COLUMN IF NOT EXISTS cancelado_por INTEGER;
    ALTER TABLE ganhadores ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

    -- games (registro de vencedor)
    ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_id INTEGER;
    ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_guess TEXT;
    ALTER TABLE games ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

    -- public_participants (estatísticas e referência)
    ALTER TABLE public_participants ADD COLUMN IF NOT EXISTS reference_code VARCHAR(50);
    ALTER TABLE public_participants ADD COLUMN IF NOT EXISTS total_submissions INTEGER DEFAULT 0;
    ALTER TABLE public_participants ADD COLUMN IF NOT EXISTS correct_guesses INTEGER DEFAULT 0;
    ALTER TABLE public_participants ADD COLUMN IF NOT EXISTS game_id INTEGER;

    -- submissions (timestamp alternativo)
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `,

  // 4. ÍNDICES CRÍTICOS (PRIORIDADE ALTA)
  criticalIndexes: `
    -- ============================================================
    -- ÍNDICES CRÍTICOS PARA PERFORMANCE
    -- ============================================================

    -- Participantes
    CREATE INDEX IF NOT EXISTS idx_participantes_telefone ON participantes(telefone);
    CREATE INDEX IF NOT EXISTS idx_participantes_promocao_id ON participantes(promocao_id) WHERE deleted_at IS NULL;

    -- Índice único para evitar duplicação
    CREATE UNIQUE INDEX IF NOT EXISTS idx_participante_unico_por_promocao
      ON participantes(promocao_id, telefone)
      WHERE deleted_at IS NULL AND promocao_id IS NOT NULL;

    -- Ganhadores
    CREATE INDEX IF NOT EXISTS idx_ganhadores_promocao_id ON ganhadores(promocao_id);
    CREATE INDEX IF NOT EXISTS idx_ganhadores_participante_id ON ganhadores(participante_id);
    CREATE INDEX IF NOT EXISTS idx_ganhadores_sorteado_em ON ganhadores(sorteado_em DESC);
    CREATE INDEX IF NOT EXISTS idx_ganhadores_cancelado ON ganhadores(cancelado);

    -- Promoções
    CREATE INDEX IF NOT EXISTS idx_promocoes_status ON promocoes(status) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_promocoes_datas ON promocoes(data_inicio, data_fim) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_promocoes_criado_em ON promocoes(criado_em DESC) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_promocoes_slug ON promocoes(slug) WHERE deleted_at IS NULL;

    -- Public Participants
    CREATE INDEX IF NOT EXISTS idx_public_participants_phone ON public_participants(phone);
    CREATE INDEX IF NOT EXISTS idx_public_participants_referral ON public_participants(own_referral_code);
    CREATE INDEX IF NOT EXISTS idx_public_participants_deleted ON public_participants(deleted_at);

    -- Submissions
    CREATE INDEX IF NOT EXISTS idx_submissions_game_id ON submissions(game_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_participant_id ON submissions(public_participant_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_deleted ON submissions(deleted_at);
  `,

  // 5. VIEWS (PRIORIDADE MÉDIA)
  views: `
    -- ============================================================
    -- VIEWS ÚTEIS
    -- ============================================================

    -- View para participantes unificados (regulares + públicos)
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

    COMMENT ON VIEW participantes_unificados IS 'View combinada de participantes regulares e públicos';

    -- View para participantes únicos (sem duplicação de telefone)
    CREATE OR REPLACE VIEW participantes_unicos AS
    SELECT DISTINCT ON (phone) *
    FROM participantes_unificados
    ORDER BY phone, created_at DESC;

    COMMENT ON VIEW participantes_unicos IS 'Participantes únicos baseado no telefone (mais recente por telefone)';
  `,

  // 6. FUNÇÃO DE LIMPEZA (PRIORIDADE BAIXA)
  cleanupFunction: `
    -- ============================================================
    -- FUNÇÃO DE LIMPEZA AUTOMÁTICA
    -- ============================================================

    CREATE OR REPLACE FUNCTION cleanup_old_logs()
    RETURNS INTEGER AS $$
    DECLARE
        deleted_count INTEGER := 0;
    BEGIN
        -- Audit logs: manter 2 anos
        DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
        GET DIAGNOSTICS deleted_count = ROW_COUNT;

        -- Data access logs: manter 1 ano (LGPD)
        DELETE FROM data_access_logs WHERE created_at < NOW() - INTERVAL '1 year';

        -- System logs: manter 6 meses (INFO/WARN/DEBUG) ou 1 ano (ERROR)
        DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '6 months' AND level != 'ERROR';
        DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '1 year' AND level = 'ERROR';

        -- Consent logs: manter 5 anos (conformidade legal)
        DELETE FROM consent_logs WHERE created_at < NOW() - INTERVAL '5 years';

        RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;

    COMMENT ON FUNCTION cleanup_old_logs() IS 'Remove logs antigos conforme política de retenção';
  `
};

async function executeFix(name, sql) {
  console.log(`\n🔧 Executando: ${name}`);
  console.log('-'.repeat(50));

  try {
    await pool.query(sql);
    console.log(`✅ ${name} - SUCESSO`);
    return { name, success: true };
  } catch (error) {
    console.error(`❌ ${name} - ERRO: ${error.message}`);
    return { name, success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('EXECUTANDO CORREÇÕES DE SCHEMA - NexoGeo Database');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const results = [];

  // Executar cada correção em ordem
  console.log('\n📋 ETAPA 1: Tabelas LGPD (PRIORIDADE ALTA)');
  results.push(await executeFix('Tabelas LGPD', fixes.lgpdTables));

  console.log('\n📋 ETAPA 2: Colunas Soft Delete (PRIORIDADE ALTA)');
  results.push(await executeFix('Colunas Soft Delete', fixes.softDeleteColumns));

  console.log('\n📋 ETAPA 3: Colunas Adicionais (PRIORIDADE MÉDIA)');
  results.push(await executeFix('Colunas Adicionais', fixes.additionalColumns));

  console.log('\n📋 ETAPA 4: Índices Críticos (PRIORIDADE ALTA)');
  results.push(await executeFix('Índices Críticos', fixes.criticalIndexes));

  console.log('\n📋 ETAPA 5: Views (PRIORIDADE MÉDIA)');
  results.push(await executeFix('Views', fixes.views));

  console.log('\n📋 ETAPA 6: Função de Limpeza (PRIORIDADE BAIXA)');
  results.push(await executeFix('Função de Limpeza', fixes.cleanupFunction));

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('RESUMO DAS CORREÇÕES');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Sucesso: ${successful}/${results.length}`);
  console.log(`❌ Falhas: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\nFalhas detalhadas:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('CORREÇÕES CONCLUÍDAS');
  console.log('='.repeat(60));

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
