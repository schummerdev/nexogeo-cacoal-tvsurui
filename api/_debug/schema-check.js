// Script para verificar schema atual do banco vs schema documentado
// Execute via: /api/?route=debug&endpoint=schema-check

const databasePool = require('../_lib/database');

async function checkSchema() {
  const report = {
    timestamp: new Date().toISOString(),
    tabelas: {},
    views: {},
    indices: {},
    funcoes: {},
    problemas: [],
    recomendacoes: []
  };

  try {
    // 1. VERIFICAR TABELAS EXISTENTES
    console.log('🔍 Verificando tabelas...');
    const tabelasResult = await databasePool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tabelasExistentes = tabelasResult.rows.map(r => r.table_name);

    // Tabelas esperadas (do schema_atual.sql)
    const tabelasEsperadas = [
      'usuarios',
      'configuracoes_emissora',
      'promocoes',
      'participantes',
      'ganhadores',
      'sponsors',
      'products',
      'games',
      'public_participants',
      'submissions',
      'audit_logs',
      'data_access_logs',
      'consent_logs',
      'system_logs',
      'rate_limits'
    ];

    report.tabelas = {
      existentes: tabelasExistentes,
      esperadas: tabelasEsperadas,
      faltantes: tabelasEsperadas.filter(t => !tabelasExistentes.includes(t)),
      extras: tabelasExistentes.filter(t => !tabelasEsperadas.includes(t))
    };

    // 2. VERIFICAR COLUNAS DE CADA TABELA CRÍTICA
    console.log('🔍 Verificando colunas...');

    // Definição das colunas esperadas por tabela
    const colunasEsperadas = {
      usuarios: ['id', 'usuario', 'senha_hash', 'role', 'google_id', 'created_at'],
      configuracoes_emissora: ['id', 'nome', 'logo_url', 'tema_cor', 'website', 'telefone', 'endereco', 'cidade', 'instagram', 'facebook', 'youtube', 'linkedin', 'twitter', 'whatsapp', 'email', 'descricao', 'created_at', 'updated_at'],
      promocoes: ['id', 'nome', 'slug', 'descricao', 'data_inicio', 'data_fim', 'status', 'link_participacao', 'emissora_id', 'numero_ganhadores', 'is_drawing', 'criado_em', 'deleted_at', 'deleted_by'],
      participantes: ['id', 'promocao_id', 'nome', 'telefone', 'email', 'bairro', 'cidade', 'latitude', 'longitude', 'origem_source', 'origem_medium', 'participou_em', 'deleted_at', 'deleted_by'],
      ganhadores: ['id', 'promocao_id', 'participante_id', 'posicao', 'video_url', 'cancelado', 'cancelado_em', 'cancelado_por', 'motivo_cancelamento', 'sorteado_em', 'deleted_at'],
      sponsors: ['id', 'name', 'logo_url', 'facebook_url', 'instagram_url', 'whatsapp', 'address', 'created_at', 'deleted_at'],
      products: ['id', 'sponsor_id', 'name', 'clues', 'created_at', 'deleted_at'],
      games: ['id', 'product_id', 'status', 'revealed_clues_count', 'winner_id', 'winner_guess', 'finished_at', 'created_at', 'deleted_at'],
      public_participants: ['id', 'name', 'phone', 'neighborhood', 'city', 'latitude', 'longitude', 'own_referral_code', 'reference_code', 'extra_guesses', 'total_submissions', 'correct_guesses', 'game_id', 'created_at', 'deleted_at'],
      submissions: ['id', 'game_id', 'public_participant_id', 'user_name', 'user_phone', 'user_neighborhood', 'user_city', 'guess', 'is_correct', 'submitted_at', 'deleted_at']
    };

    report.colunas = {};

    for (const [tabela, colunasEsperadasTabela] of Object.entries(colunasEsperadas)) {
      if (!tabelasExistentes.includes(tabela)) {
        report.colunas[tabela] = { erro: 'Tabela não existe' };
        continue;
      }

      const colunasResult = await databasePool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tabela]);

      const colunasExistentes = colunasResult.rows.map(r => r.column_name);

      report.colunas[tabela] = {
        existentes: colunasExistentes,
        faltantes: colunasEsperadasTabela.filter(c => !colunasExistentes.includes(c)),
        extras: colunasExistentes.filter(c => !colunasEsperadasTabela.includes(c)),
        detalhes: colunasResult.rows.reduce((acc, row) => {
          acc[row.column_name] = {
            tipo: row.data_type,
            nullable: row.is_nullable,
            default: row.column_default
          };
          return acc;
        }, {})
      };

      // Adicionar problemas para colunas faltantes
      if (report.colunas[tabela].faltantes.length > 0) {
        report.problemas.push({
          tipo: 'COLUNAS_FALTANTES',
          tabela: tabela,
          colunas: report.colunas[tabela].faltantes
        });
      }
    }

    // 3. VERIFICAR VIEWS
    console.log('🔍 Verificando views...');
    const viewsResult = await databasePool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const viewsEsperadas = ['participantes_unificados', 'participantes_unicos'];
    const viewsExistentes = viewsResult.rows.map(r => r.table_name);

    report.views = {
      existentes: viewsExistentes,
      esperadas: viewsEsperadas,
      faltantes: viewsEsperadas.filter(v => !viewsExistentes.includes(v))
    };

    if (report.views.faltantes.length > 0) {
      report.problemas.push({
        tipo: 'VIEWS_FALTANTES',
        views: report.views.faltantes
      });
    }

    // 4. VERIFICAR ÍNDICES CRÍTICOS
    console.log('🔍 Verificando índices...');
    const indicesResult = await databasePool.query(`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    report.indices = {
      total: indicesResult.rows.length,
      por_tabela: {}
    };

    indicesResult.rows.forEach(row => {
      if (!report.indices.por_tabela[row.tablename]) {
        report.indices.por_tabela[row.tablename] = [];
      }
      report.indices.por_tabela[row.tablename].push({
        nome: row.indexname,
        definicao: row.indexdef
      });
    });

    // Verificar índices críticos
    const indicesCriticos = [
      'idx_participantes_telefone',
      'idx_participantes_promocao_id',
      'idx_participante_unico_por_promocao',
      'idx_public_participants_phone',
      'idx_public_participants_referral',
      'idx_ganhadores_promocao_id',
      'idx_promocoes_status'
    ];

    const indicesExistentes = indicesResult.rows.map(r => r.indexname);
    const indicesFaltantes = indicesCriticos.filter(i => !indicesExistentes.includes(i));

    if (indicesFaltantes.length > 0) {
      report.problemas.push({
        tipo: 'INDICES_FALTANTES',
        indices: indicesFaltantes
      });
    }

    // 5. VERIFICAR FUNÇÕES
    console.log('🔍 Verificando funções...');
    const funcoesResult = await databasePool.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name
    `);

    report.funcoes = {
      existentes: funcoesResult.rows.map(r => r.routine_name)
    };

    if (!report.funcoes.existentes.includes('cleanup_old_logs')) {
      report.problemas.push({
        tipo: 'FUNCAO_FALTANTE',
        funcao: 'cleanup_old_logs'
      });
    }

    // 6. VERIFICAR CONSTRAINTS
    console.log('🔍 Verificando constraints...');
    const constraintsResult = await databasePool.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `);

    report.constraints = {};
    constraintsResult.rows.forEach(row => {
      if (!report.constraints[row.table_name]) {
        report.constraints[row.table_name] = [];
      }
      report.constraints[row.table_name].push({
        nome: row.constraint_name,
        tipo: row.constraint_type,
        coluna: row.column_name
      });
    });

    // 7. GERAR RECOMENDAÇÕES
    console.log('🔍 Gerando recomendações...');

    if (report.tabelas.faltantes.length > 0) {
      report.recomendacoes.push({
        prioridade: 'ALTA',
        acao: 'CRIAR_TABELAS',
        descricao: `Criar tabelas faltantes: ${report.tabelas.faltantes.join(', ')}`,
        sql: `-- Executar schema_atual.sql para criar tabelas faltantes`
      });
    }

    if (report.views.faltantes.length > 0) {
      report.recomendacoes.push({
        prioridade: 'MEDIA',
        acao: 'CRIAR_VIEWS',
        descricao: `Criar views faltantes: ${report.views.faltantes.join(', ')}`,
        sql: `-- Executar seção de VIEWS do schema_atual.sql`
      });
    }

    // Verificar se tem colunas faltantes importantes
    for (const [tabela, info] of Object.entries(report.colunas)) {
      if (info.faltantes && info.faltantes.length > 0) {
        const colunasCriticas = ['deleted_at', 'deleted_by', 'is_drawing', 'slug'];
        const faltantesCriticas = info.faltantes.filter(c => colunasCriticas.includes(c));

        if (faltantesCriticas.length > 0) {
          report.recomendacoes.push({
            prioridade: 'ALTA',
            acao: 'ADICIONAR_COLUNAS',
            tabela: tabela,
            descricao: `Adicionar colunas críticas em ${tabela}: ${faltantesCriticas.join(', ')}`,
            sql: faltantesCriticas.map(col => {
              if (col === 'deleted_at') return `ALTER TABLE ${tabela} ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;`;
              if (col === 'deleted_by') return `ALTER TABLE ${tabela} ADD COLUMN deleted_by INT;`;
              if (col === 'is_drawing') return `ALTER TABLE ${tabela} ADD COLUMN is_drawing BOOLEAN DEFAULT false;`;
              if (col === 'slug') return `ALTER TABLE ${tabela} ADD COLUMN slug VARCHAR(255) UNIQUE;`;
              return `-- Adicionar coluna ${col}`;
            }).join('\n')
          });
        }
      }
    }

    // 8. ESTATÍSTICAS GERAIS
    console.log('🔍 Coletando estatísticas...');
    const statsResult = await databasePool.query(`
      SELECT
        (SELECT COUNT(*) FROM participantes WHERE deleted_at IS NULL) as total_participantes,
        (SELECT COUNT(*) FROM public_participants WHERE deleted_at IS NULL) as total_public_participants,
        (SELECT COUNT(*) FROM promocoes WHERE deleted_at IS NULL) as total_promocoes,
        (SELECT COUNT(*) FROM ganhadores WHERE deleted_at IS NULL) as total_ganhadores,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios
    `);

    report.estatisticas = statsResult.rows[0];

    console.log('✅ Verificação de schema concluída');

  } catch (error) {
    console.error('❌ Erro ao verificar schema:', error);
    report.erro = error.message;
  }

  return report;
}

module.exports = { checkSchema };
