// Script para comparar schema atual do banco com schema_atual.sql
require('dotenv').config();
const { pool } = require('./lib/db');

async function compareSchema() {
  console.log('='.repeat(70));
  console.log('COMPARAÇÃO: Banco de Dados vs schema_atual.sql (v2.3.0)');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const report = {
    tabelas: { ok: [], divergencias: [] },
    colunas: { ok: [], faltantes: [], extras: [], tipos_diferentes: [] },
    indices: { ok: [], faltantes: [] },
    views: { ok: [], faltantes: [] },
    funcoes: { ok: [], faltantes: [] },
    constraints: { ok: [], faltantes: [] }
  };

  try {
    // ========================================
    // 1. VERIFICAR TABELAS
    // ========================================
    console.log('📋 1. VERIFICANDO TABELAS...');

    const tabelasEsperadas = [
      'usuarios', 'configuracoes_emissora', 'promocoes', 'participantes',
      'ganhadores', 'sponsors', 'products', 'games', 'public_participants',
      'submissions', 'audit_logs', 'data_access_logs', 'consent_logs',
      'system_logs', 'rate_limits'
    ];

    const tabelasResult = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const tabelasExistentes = tabelasResult.rows.map(r => r.table_name);

    tabelasEsperadas.forEach(t => {
      if (tabelasExistentes.includes(t)) {
        report.tabelas.ok.push(t);
      } else {
        report.tabelas.divergencias.push({ tabela: t, status: 'FALTANTE' });
      }
    });

    const extras = tabelasExistentes.filter(t => !tabelasEsperadas.includes(t));
    extras.forEach(t => {
      report.tabelas.divergencias.push({ tabela: t, status: 'EXTRA (não no schema)' });
    });

    console.log(`   ✅ Tabelas OK: ${report.tabelas.ok.length}`);
    if (report.tabelas.divergencias.length > 0) {
      console.log(`   ⚠️  Divergências: ${report.tabelas.divergencias.length}`);
      report.tabelas.divergencias.forEach(d => console.log(`      - ${d.tabela}: ${d.status}`));
    }

    // ========================================
    // 2. VERIFICAR COLUNAS (detalhado)
    // ========================================
    console.log('\n📝 2. VERIFICANDO COLUNAS...');

    const schemaEsperado = {
      usuarios: {
        id: 'integer',
        usuario: 'character varying',
        senha_hash: 'character varying',
        role: 'character varying',
        google_id: 'character varying',
        created_at: 'timestamp with time zone'
      },
      configuracoes_emissora: {
        id: 'integer',
        nome: 'character varying',
        logo_url: 'text',
        tema_cor: 'character varying',
        website: 'character varying',
        telefone: 'character varying',
        endereco: 'text',
        cidade: 'character varying',
        instagram: 'character varying',
        facebook: 'character varying',
        youtube: 'character varying',
        linkedin: 'character varying',
        twitter: 'character varying',
        whatsapp: 'character varying',
        email: 'character varying',
        descricao: 'text',
        created_at: 'timestamp with time zone',
        updated_at: 'timestamp with time zone'
      },
      promocoes: {
        id: 'integer',
        nome: 'character varying',
        slug: 'character varying',
        descricao: 'text',
        data_inicio: 'date',
        data_fim: 'date',
        status: 'character varying',
        link_participacao: 'text',
        emissora_id: 'integer',
        numero_ganhadores: 'integer',
        is_drawing: 'boolean',
        criado_em: 'timestamp with time zone',
        deleted_at: 'timestamp with time zone',
        deleted_by: 'integer'
      },
      participantes: {
        id: 'integer',
        promocao_id: 'integer',
        nome: 'character varying',
        telefone: 'character varying',
        email: 'character varying',
        bairro: 'character varying',
        cidade: 'character varying',
        latitude: 'numeric',
        longitude: 'numeric',
        origem_source: 'character varying',
        origem_medium: 'character varying',
        participou_em: 'timestamp with time zone',
        deleted_at: 'timestamp with time zone',
        deleted_by: 'integer'
      },
      ganhadores: {
        id: 'integer',
        promocao_id: 'integer',
        participante_id: 'integer',
        posicao: 'integer',
        video_url: 'text',
        cancelado: 'boolean',
        cancelado_em: 'timestamp with time zone',
        cancelado_por: 'integer',
        motivo_cancelamento: 'text',
        sorteado_em: 'timestamp with time zone',
        deleted_at: 'timestamp with time zone'
      },
      sponsors: {
        id: 'integer',
        name: 'character varying',
        logo_url: 'text',
        facebook_url: 'text',
        instagram_url: 'text',
        whatsapp: 'character varying',
        address: 'text',
        created_at: 'timestamp with time zone',
        deleted_at: 'timestamp with time zone'
      },
      products: {
        id: 'integer',
        sponsor_id: 'integer',
        name: 'character varying',
        clues: 'ARRAY',
        created_at: 'timestamp with time zone',
        deleted_at: 'timestamp with time zone'
      },
      games: {
        id: 'integer',
        product_id: 'integer',
        status: 'character varying',
        revealed_clues_count: 'integer',
        winner_id: 'integer',
        winner_guess: 'text',
        finished_at: 'timestamp with time zone',
        created_at: 'timestamp with time zone',
        deleted_at: 'timestamp with time zone'
      },
      public_participants: {
        id: 'integer',
        name: 'character varying',
        phone: 'character varying',
        neighborhood: 'character varying',
        city: 'character varying',
        latitude: 'numeric',
        longitude: 'numeric',
        own_referral_code: 'character varying',
        reference_code: 'character varying',
        extra_guesses: 'integer',
        total_submissions: 'integer',
        correct_guesses: 'integer',
        game_id: 'integer',
        created_at: 'timestamp with time zone',
        deleted_at: 'timestamp with time zone'
      },
      submissions: {
        id: 'integer',
        game_id: 'integer',
        public_participant_id: 'integer',
        user_name: 'character varying',
        user_phone: 'character varying',
        user_neighborhood: 'character varying',
        user_city: 'character varying',
        guess: 'text',
        is_correct: 'boolean',
        submitted_at: 'timestamp with time zone',
        deleted_at: 'timestamp with time zone'
      },
      audit_logs: {
        id: 'integer',
        user_id: 'integer',
        action: 'character varying',
        table_name: 'character varying',
        record_id: 'integer',
        old_values: 'jsonb',
        new_values: 'jsonb',
        ip_address: 'inet',
        user_agent: 'text',
        session_id: 'character varying',
        request_method: 'character varying',
        request_url: 'text',
        response_status: 'integer',
        execution_time: 'integer',
        error_message: 'text',
        additional_data: 'jsonb',
        created_at: 'timestamp with time zone'
      },
      data_access_logs: {
        id: 'integer',
        user_id: 'integer',
        participant_id: 'integer',
        data_type: 'character varying',
        access_reason: 'character varying',
        legal_basis: 'character varying',
        masked_data: 'boolean',
        ip_address: 'inet',
        user_agent: 'text',
        created_at: 'timestamp with time zone'
      },
      consent_logs: {
        id: 'integer',
        participant_id: 'integer',
        consent_type: 'character varying',
        consent_given: 'boolean',
        consent_text: 'text',
        consent_version: 'character varying',
        ip_address: 'inet',
        user_agent: 'text',
        withdrawal_reason: 'text',
        created_at: 'timestamp with time zone'
      },
      system_logs: {
        id: 'integer',
        level: 'character varying',
        component: 'character varying',
        message: 'text',
        error_code: 'character varying',
        stack_trace: 'text',
        additional_data: 'jsonb',
        user_id: 'integer',
        ip_address: 'inet',
        created_at: 'timestamp with time zone'
      },
      rate_limits: {
        id: 'integer',
        key: 'character varying',
        endpoint: 'character varying',
        count: 'integer',
        window_start: 'timestamp with time zone',
        created_at: 'timestamp with time zone'
      }
    };

    let colunasOk = 0;
    let colunasDivergentes = 0;

    for (const [tabela, colunasEsperadas] of Object.entries(schemaEsperado)) {
      if (!tabelasExistentes.includes(tabela)) continue;

      const colunasResult = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tabela]);

      const colunasExistentes = {};
      colunasResult.rows.forEach(r => {
        // Normalizar tipo de dados
        let tipo = r.data_type;
        if (r.udt_name === '_text') tipo = 'ARRAY';
        colunasExistentes[r.column_name] = tipo;
      });

      // Verificar colunas esperadas
      for (const [coluna, tipoEsperado] of Object.entries(colunasEsperadas)) {
        if (!colunasExistentes[coluna]) {
          report.colunas.faltantes.push({ tabela, coluna, tipoEsperado });
          colunasDivergentes++;
        } else {
          const tipoAtual = colunasExistentes[coluna];
          // Comparação flexível de tipos
          const tipoOk = tipoAtual.includes(tipoEsperado) ||
                         tipoEsperado.includes(tipoAtual) ||
                         (tipoEsperado === 'ARRAY' && tipoAtual === 'ARRAY');

          if (!tipoOk) {
            report.colunas.tipos_diferentes.push({
              tabela, coluna, esperado: tipoEsperado, atual: tipoAtual
            });
            colunasDivergentes++;
          } else {
            colunasOk++;
          }
        }
      }

      // Verificar colunas extras (não esperadas)
      for (const coluna of Object.keys(colunasExistentes)) {
        if (!colunasEsperadas[coluna]) {
          report.colunas.extras.push({ tabela, coluna, tipo: colunasExistentes[coluna] });
        }
      }
    }

    console.log(`   ✅ Colunas OK: ${colunasOk}`);
    if (report.colunas.faltantes.length > 0) {
      console.log(`   ❌ Colunas faltantes: ${report.colunas.faltantes.length}`);
      report.colunas.faltantes.forEach(c =>
        console.log(`      - ${c.tabela}.${c.coluna} (${c.tipoEsperado})`)
      );
    }
    if (report.colunas.tipos_diferentes.length > 0) {
      console.log(`   ⚠️  Tipos diferentes: ${report.colunas.tipos_diferentes.length}`);
      report.colunas.tipos_diferentes.forEach(c =>
        console.log(`      - ${c.tabela}.${c.coluna}: esperado ${c.esperado}, atual ${c.atual}`)
      );
    }
    if (report.colunas.extras.length > 0) {
      console.log(`   ℹ️  Colunas extras (não no schema): ${report.colunas.extras.length}`);
      report.colunas.extras.forEach(c =>
        console.log(`      - ${c.tabela}.${c.coluna} (${c.tipo})`)
      );
    }

    // ========================================
    // 3. VERIFICAR ÍNDICES CRÍTICOS
    // ========================================
    console.log('\n🔍 3. VERIFICANDO ÍNDICES CRÍTICOS...');

    const indicesEsperados = [
      // Usuarios
      'idx_usuarios_role', 'idx_usuarios_google_id',
      // Promocoes
      'idx_promocoes_status', 'idx_promocoes_datas', 'idx_promocoes_criado_em', 'idx_promocoes_slug',
      // Participantes
      'idx_participantes_telefone', 'idx_participantes_nome', 'idx_participantes_cidade',
      'idx_participantes_bairro', 'idx_participantes_criado_em', 'idx_participantes_promocao_id',
      'idx_participantes_soft_delete', 'idx_participantes_geolocalizacao',
      'idx_participante_unico_por_promocao',
      // Ganhadores
      'idx_ganhadores_participante_id', 'idx_ganhadores_promocao_id',
      'idx_ganhadores_sorteado_em', 'idx_ganhadores_cancelado',
      // Caixa Misteriosa
      'idx_sponsors_deleted_at', 'idx_products_sponsor_id', 'idx_games_product_id',
      'idx_games_status', 'idx_public_participants_phone', 'idx_public_participants_referral',
      'idx_submissions_game_id', 'idx_submissions_participant_id',
      // Auditoria
      'idx_audit_logs_user_id', 'idx_audit_logs_action', 'idx_audit_logs_table_name',
      'idx_audit_logs_created_at', 'idx_audit_logs_record_id',
      'idx_data_access_logs_user_id', 'idx_data_access_logs_participant_id',
      'idx_data_access_logs_created_at', 'idx_data_access_logs_data_type',
      'idx_consent_logs_participant_id', 'idx_consent_logs_consent_type', 'idx_consent_logs_created_at',
      'idx_system_logs_level', 'idx_system_logs_component', 'idx_system_logs_created_at',
      // Rate Limits
      'idx_rate_limits_key_endpoint', 'idx_rate_limits_window'
    ];

    const indicesResult = await pool.query(`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `);
    const indicesExistentes = indicesResult.rows.map(r => r.indexname);

    indicesEsperados.forEach(idx => {
      if (indicesExistentes.includes(idx)) {
        report.indices.ok.push(idx);
      } else {
        report.indices.faltantes.push(idx);
      }
    });

    console.log(`   ✅ Índices OK: ${report.indices.ok.length}/${indicesEsperados.length}`);
    if (report.indices.faltantes.length > 0) {
      console.log(`   ❌ Índices faltantes: ${report.indices.faltantes.length}`);
      report.indices.faltantes.forEach(idx => console.log(`      - ${idx}`));
    }

    // ========================================
    // 4. VERIFICAR VIEWS
    // ========================================
    console.log('\n👁️  4. VERIFICANDO VIEWS...');

    const viewsEsperadas = ['participantes_unificados', 'participantes_unicos'];
    const viewsResult = await pool.query(`
      SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    `);
    const viewsExistentes = viewsResult.rows.map(r => r.table_name);

    viewsEsperadas.forEach(v => {
      if (viewsExistentes.includes(v)) {
        report.views.ok.push(v);
      } else {
        report.views.faltantes.push(v);
      }
    });

    console.log(`   ✅ Views OK: ${report.views.ok.length}/${viewsEsperadas.length}`);
    if (report.views.faltantes.length > 0) {
      console.log(`   ❌ Views faltantes:`);
      report.views.faltantes.forEach(v => console.log(`      - ${v}`));
    }

    // ========================================
    // 5. VERIFICAR FUNÇÕES
    // ========================================
    console.log('\n⚙️  5. VERIFICANDO FUNÇÕES...');

    const funcoesEsperadas = ['cleanup_old_logs'];
    const funcoesResult = await pool.query(`
      SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public'
    `);
    const funcoesExistentes = funcoesResult.rows.map(r => r.routine_name);

    funcoesEsperadas.forEach(f => {
      if (funcoesExistentes.includes(f)) {
        report.funcoes.ok.push(f);
      } else {
        report.funcoes.faltantes.push(f);
      }
    });

    console.log(`   ✅ Funções OK: ${report.funcoes.ok.length}/${funcoesEsperadas.length}`);
    if (report.funcoes.faltantes.length > 0) {
      console.log(`   ❌ Funções faltantes:`);
      report.funcoes.faltantes.forEach(f => console.log(`      - ${f}`));
    }

    // ========================================
    // 6. VERIFICAR CONSTRAINTS
    // ========================================
    console.log('\n🔒 6. VERIFICANDO CONSTRAINTS...');

    const constraintsEsperadas = [
      { tabela: 'promocoes', nome: 'check_datas_validas', tipo: 'CHECK' },
      { tabela: 'participantes', nome: 'participantes_promocao_id_fkey', tipo: 'FOREIGN KEY' },
      { tabela: 'ganhadores', nome: 'ganhadores_promocao_id_fkey', tipo: 'FOREIGN KEY' },
      { tabela: 'ganhadores', nome: 'ganhadores_participante_id_fkey', tipo: 'FOREIGN KEY' },
      { tabela: 'products', nome: 'products_sponsor_id_fkey', tipo: 'FOREIGN KEY' },
      { tabela: 'games', nome: 'games_product_id_fkey', tipo: 'FOREIGN KEY' },
      { tabela: 'submissions', nome: 'submissions_game_id_fkey', tipo: 'FOREIGN KEY' }
    ];

    const constraintsResult = await pool.query(`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
    `);

    const constraintsMap = {};
    constraintsResult.rows.forEach(r => {
      const key = `${r.table_name}.${r.constraint_name}`;
      constraintsMap[key] = r.constraint_type;
    });

    constraintsEsperadas.forEach(c => {
      const key = `${c.tabela}.${c.nome}`;
      if (constraintsMap[key]) {
        report.constraints.ok.push(`${c.tabela}.${c.nome}`);
      } else {
        report.constraints.faltantes.push(`${c.tabela}.${c.nome} (${c.tipo})`);
      }
    });

    console.log(`   ✅ Constraints OK: ${report.constraints.ok.length}/${constraintsEsperadas.length}`);
    if (report.constraints.faltantes.length > 0) {
      console.log(`   ❌ Constraints faltantes:`);
      report.constraints.faltantes.forEach(c => console.log(`      - ${c}`));
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('RESUMO FINAL DA COMPARAÇÃO');
    console.log('='.repeat(70));

    const totalDivergencias =
      report.tabelas.divergencias.filter(d => d.status === 'FALTANTE').length +
      report.colunas.faltantes.length +
      report.colunas.tipos_diferentes.length +
      report.indices.faltantes.length +
      report.views.faltantes.length +
      report.funcoes.faltantes.length +
      report.constraints.faltantes.length;

    if (totalDivergencias === 0) {
      console.log('\n🎉 SCHEMA 100% COMPATÍVEL COM schema_atual.sql v2.3.0!');
      console.log('   Todas as tabelas, colunas, índices, views e funções estão corretos.');
    } else {
      console.log(`\n⚠️  ENCONTRADAS ${totalDivergencias} DIVERGÊNCIAS:`);
      if (report.tabelas.divergencias.filter(d => d.status === 'FALTANTE').length > 0)
        console.log(`   - Tabelas faltantes: ${report.tabelas.divergencias.filter(d => d.status === 'FALTANTE').length}`);
      if (report.colunas.faltantes.length > 0)
        console.log(`   - Colunas faltantes: ${report.colunas.faltantes.length}`);
      if (report.colunas.tipos_diferentes.length > 0)
        console.log(`   - Tipos diferentes: ${report.colunas.tipos_diferentes.length}`);
      if (report.indices.faltantes.length > 0)
        console.log(`   - Índices faltantes: ${report.indices.faltantes.length}`);
      if (report.views.faltantes.length > 0)
        console.log(`   - Views faltantes: ${report.views.faltantes.length}`);
      if (report.funcoes.faltantes.length > 0)
        console.log(`   - Funções faltantes: ${report.funcoes.faltantes.length}`);
      if (report.constraints.faltantes.length > 0)
        console.log(`   - Constraints faltantes: ${report.constraints.faltantes.length}`);
    }

    // Informações extras
    if (report.tabelas.divergencias.filter(d => d.status.includes('EXTRA')).length > 0) {
      console.log(`\nℹ️  TABELAS EXTRAS (não no schema, mas podem ser úteis):`);
      report.tabelas.divergencias.filter(d => d.status.includes('EXTRA')).forEach(d =>
        console.log(`   - ${d.tabela}`)
      );
    }

    if (report.colunas.extras.length > 0) {
      console.log(`\nℹ️  COLUNAS EXTRAS (legado ou customizações):`);
      report.colunas.extras.forEach(c => console.log(`   - ${c.tabela}.${c.coluna}`));
    }

    // Salvar relatório
    const fs = require('fs');
    fs.writeFileSync('./schema-comparison-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Relatório detalhado salvo em: ./schema-comparison-report.json');

    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('❌ Erro na comparação:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

compareSchema().catch(console.error);
