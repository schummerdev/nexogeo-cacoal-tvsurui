const { getSecureHeaders, checkRateLimit } = require('../_lib/security');
const databasePool = require('../_lib/database');
const { getCanonicalPhone } = require('../_lib/phoneUtils');

module.exports = async (req, res) => {
  // ============================================================
  // CORS
  // ============================================================
  const secureHeaders = getSecureHeaders(req.headers.origin);
  Object.entries(secureHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Content-Type', 'application/json');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ============================================================
  // Rate limiting
  // ============================================================
  const clientId =
    req.headers['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';

  const rateLimit = checkRateLimit(clientId, 30, 60000); // 30 req/min

  if (!rateLimit.allowed) {
    res.status(429).json({
      message: 'Muitas tentativas de participação. Aguarde antes de tentar novamente.',
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);

      // ============================================================
      // ENDPOINT DE DIAGNÓSTICO: Contagem de participantes por tabela
      // ============================================================
      if (url.searchParams.get('endpoint') === 'diagnostico') {
        console.log('🔍 [DIAGNOSTICO] Iniciando diagnóstico de participantes...');

        try {
          // 1. Contagem em participantes (regulares)
          const regularCount = await databasePool.query(`
            SELECT
              COUNT(*) as total,
              COUNT(DISTINCT telefone) as telefones_unicos
            FROM participantes
            WHERE deleted_at IS NULL
          `);

          const regularDuplicates = await databasePool.query(`
            SELECT telefone, COUNT(*) as quantidade
            FROM participantes
            WHERE deleted_at IS NULL
            GROUP BY telefone
            HAVING COUNT(*) > 1
            ORDER BY quantidade DESC
          `);

          // 2. Contagem em public_participants (públicos)
          const publicCount = await databasePool.query(`
            SELECT
              COUNT(*) as total,
              COUNT(DISTINCT phone) as telefones_unicos
            FROM public_participants
            WHERE deleted_at IS NULL
          `);

          const publicDuplicates = await databasePool.query(`
            SELECT phone, COUNT(*) as quantidade
            FROM public_participants
            WHERE deleted_at IS NULL
            GROUP BY phone
            HAVING COUNT(*) > 1
            ORDER BY quantidade DESC
          `);

          // 3. Sobreposição entre tabelas (telefones em AMBAS)
          const overlap = await databasePool.query(`
            SELECT COUNT(*) as telefones_em_ambas
            FROM (
              SELECT DISTINCT telefone as phone FROM participantes WHERE deleted_at IS NULL
              INTERSECT
              SELECT DISTINCT phone FROM public_participants WHERE deleted_at IS NULL
            ) as duplicados
          `);

          // 4. Total esperado após unificação correta (telefones únicos)
          const expected = await databasePool.query(`
            SELECT COUNT(DISTINCT phone) as total_esperado
            FROM (
              SELECT telefone as phone FROM participantes WHERE deleted_at IS NULL
              UNION ALL
              SELECT phone FROM public_participants WHERE deleted_at IS NULL
            ) as todos_participantes
          `);

          const diagnostico = {
            tabela_participantes: {
              total_registros: parseInt(regularCount.rows[0].total),
              telefones_unicos: parseInt(regularCount.rows[0].telefones_unicos),
              telefones_duplicados: regularDuplicates.rows.length,
              lista_duplicados: regularDuplicates.rows.slice(0, 10) // Top 10
            },
            tabela_public_participants: {
              total_registros: parseInt(publicCount.rows[0].total),
              telefones_unicos: parseInt(publicCount.rows[0].telefones_unicos),
              telefones_duplicados: publicDuplicates.rows.length,
              lista_duplicados: publicDuplicates.rows.slice(0, 10) // Top 10
            },
            sobreposicao: {
              telefones_em_ambas_tabelas: parseInt(overlap.rows[0].telefones_em_ambas)
            },
            total_esperado_apos_unificacao: parseInt(expected.rows[0].total_esperado),
            analise: {
              descricao: 'Se deduplicação estiver correta, deve mostrar total_esperado_apos_unificacao',
              atual_exibido: 'Verificar logs [REGULAR] ou [UNIFIED]'
            }
          };

          console.log('✅ [DIAGNOSTICO] Diagnóstico completo:', JSON.stringify(diagnostico, null, 2));

          return res.status(200).json({
            success: true,
            data: diagnostico
          });
        } catch (diagError) {
          console.error('❌ [DIAGNOSTICO] Erro:', diagError);
          return res.status(500).json({
            success: false,
            error: diagError.message
          });
        }
      }

      // ============================================================
      // ENDPOINT DE VERIFICAÇÃO POR TELEFONE (Para fluxo de Enquetes/Sorteio Público)
      // ============================================================
      if (url.searchParams.get('endpoint') === 'verificar') {
        const telefoneRaw = url.searchParams.get('telefone');
        if (!telefoneRaw) {
          return res.status(400).json({ success: false, message: 'Telefone é obrigatório.' });
        }

        const telefoneClean = getCanonicalPhone(telefoneRaw);
        const doubleClean = telefoneRaw.replace(/\D/g, ''); // Apenas números, sem remover o 9

        const promocaoId = parseInt(url.searchParams.get('promocao_id'));
        if (isNaN(promocaoId)) {
          return res.status(400).json({ success: false, message: 'ID da promoção inválido.' });
        }

        try {
          // 1. Busca básica para ver se o participante existe no sistema (qualquer promoção/público)
          // Verificamos tanto o formato canônico quanto o formato original (com 9 ou sem)
          console.log(`🔍 [PARTICIPANTES VERIFICAR] Buscando por: ${telefoneClean} ou ${doubleClean}`);

          const dbResult = await databasePool.query(`
                SELECT id, name AS nome, phone AS telefone, city AS cidade, neighborhood AS bairro
                FROM participantes_unicos
                WHERE phone IN ($1, $2)
                ORDER BY created_at DESC
                LIMIT 1
             `, [telefoneClean, doubleClean]);

          const exists = dbResult.rows.length > 0;
          let jaNaPromocao = false;
          let data = exists ? dbResult.rows[0] : null;

          // 2. Se existe e enviamos promocao_id, verificar se JÁ está nesta promoção específica
          if (exists && promocaoId) {
            const promoCheck = await databasePool.query(`
              SELECT id, nome, telefone, bairro, cidade FROM participantes 
              WHERE (telefone = $1 OR telefone = $2) AND promocao_id = $3 AND deleted_at IS NULL
              LIMIT 1
            `, [telefoneClean, doubleClean, promocaoId]);

            if (promoCheck.rows.length > 0) {
              jaNaPromocao = true;
              // IMPORTANTE: Retornar os dados e o ID específicos desta participação
              data = {
                ...dbResult.rows[0],
                id: promoCheck.rows[0].id,
                nome: promoCheck.rows[0].nome,
                telefone: promoCheck.rows[0].telefone,
                bairro: promoCheck.rows[0].bairro,
                cidade: promoCheck.rows[0].cidade
              };
            }
          }

          return res.status(200).json({
            success: true,
            exists,
            ja_na_promocao: jaNaPromocao,
            data
          });
        } catch (verifError) {
          console.error('❌ [PARTICIPANTES VERIFICAR] Erro ao buscar telefone:', verifError);
          return res.status(500).json({ success: false, message: 'Erro ao verificar cadastro.' });
        }
      }

      // SEMPRE usar modo unificado (sem deduplicação)
      // Lista TODOS os participantes das 2 tabelas
      const unified = true; // ✅ SEMPRE TRUE - sem deduplicação
      const includePublic = true; // ✅ SEMPRE incluir públicos

      console.log('🚨🚨🚨 [FORCE-DEPLOY] ANTES DO IF - unified:', unified, 'includePublic:', includePublic);
      console.log('🔍🔍🔍 [UNIFIED-ALWAYS] Modo unificado SEMPRE ativo - lista TODOS os participantes - VERSAO NOVA');

      // ============================================================
      // GET UNIFICADO: participantes regulares + públicos
      // (SEM DEDUPLICAÇÃO - lista TODOS os registros)
      // ============================================================
      console.log('🚨 [DEBUG] Entrando no IF unified? Valor:', unified);
      if (unified) {
        console.log('✅ [DEBUG] DENTRO DO IF UNIFIED - vai listar TODOS');
        let participantes = [];

        try {
          console.log('🔍 [UNIFIED] Iniciando busca de participantes regulares...');

          // IMPORTANTE:
          // - Campo de data na tabela: participou_em (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)
          // - Para listagem, usamos participou_em como created_at
          const regularResult = await databasePool.query(`
            SELECT
              p.id,
              p.nome AS name,
              p.telefone AS phone,
              p.bairro AS neighborhood,
              p.cidade AS city,
              p.latitude,
              p.longitude,
              p.promocao_id,
              CASE 
                WHEN p.origem_source LIKE 'tv_enquete%' THEN eq.titulo 
                ELSE pr.nome 
              END AS promocao_nome,
              p.origem_source,
              p.origem_medium,
              COALESCE(p.participou_em, CURRENT_TIMESTAMP) AS created_at,
              CASE 
                WHEN p.origem_source LIKE 'tv_enquete%' THEN 'enquete' 
                ELSE 'regular' 
              END AS participant_type,
              NULL AS opcao_escolhida,
              NULL AS referral_code,
              NULL AS extra_guesses,
              0 AS total_submissions,
              0 AS correct_guesses,
              p.email,
              p.deleted_at,
              p.deleted_by,
              p.origem
            FROM participantes p
            LEFT JOIN promocoes pr ON p.promocao_id = pr.id
            LEFT JOIN enquetes eq ON p.promocao_id = eq.id
            WHERE p.deleted_at IS NULL
            ORDER BY COALESCE(p.participou_em, CURRENT_TIMESTAMP) DESC
          `);

          participantes = regularResult.rows;
          console.log(`✅ [UNIFIED] ${regularResult.rows.length} participantes regulares encontrados`);

          if (includePublic) {
            console.log('🔍 [UNIFIED] Iniciando busca de participantes públicos...');

            try {
              const publicResult = await databasePool.query(`
                SELECT
                  pp.id,
                  pp.name,
                  pp.phone,
                  pp.neighborhood,
                  pp.city,
                  pp.latitude,
                  pp.longitude,
                  NULL AS promocao_id,
                  'Caixa Misteriosa' AS promocao_nome,
                  'caixa-misteriosa' AS origem_source,
                  'game' AS origem_medium,
                  pp.created_at,
                  'public' AS participant_type,
                  COALESCE(pp.referral_code, NULL) AS referral_code,
                  COALESCE(pp.extra_guesses, 0) AS extra_guesses,
                  COUNT(s.id) AS total_submissions,
                  SUM(CASE WHEN s.is_correct THEN 1 ELSE 0 END) AS correct_guesses,
                  NULL AS email,
                  NULL AS deleted_at,
                  NULL AS deleted_by,
                  'public_participant' AS origem
                FROM public_participants pp
                LEFT JOIN submissions s
                  ON pp.id = s.public_participant_id
                GROUP BY
                  pp.id,
                  pp.name,
                  pp.phone,
                  pp.neighborhood,
                  pp.city,
                  pp.latitude,
                  pp.longitude,
                  pp.created_at,
                  pp.referral_code,
                  pp.extra_guesses
                ORDER BY pp.created_at DESC
              `);

              console.log(
                `✅ [UNIFIED] ${publicResult.rows.length} participantes públicos encontrados`
              );
              participantes = [...participantes, ...publicResult.rows];
            } catch (publicError) {
              console.error(
                '⚠️ [UNIFIED] Erro ao buscar participantes públicos:',
                publicError.message
              );

              if (publicError.code === '42P01') {
                console.warn(
                  '⚠️ [UNIFIED] Tabela public_participants não existe. Retornando apenas participantes regulares.'
                );
              } else if (publicError.code === '42703') {
                console.warn(
                  '⚠️ [UNIFIED] Colunas esperadas não existem em public_participants. Verificar migrações.'
                );
              } else {
                console.error('❌ [UNIFIED] Erro inesperado ao buscar públicos:', publicError);
              }

              console.log('ℹ️ [UNIFIED] Continuando apenas com participantes regulares...');
            }
          }

          // 📊 DEBUG: Contar telefones únicos
          const uniquePhones = new Set(participantes.map(p => p.phone)).size;
          const totalParticipantes = participantes.length;

          console.log(
            `📊 [UNIFIED] Total retornado (sem deduplicação): ${totalParticipantes} participantes`
          );
          console.log(`📞 [UNIFIED] Telefones únicos: ${uniquePhones}`);
          console.log(`🔄 [UNIFIED] Potenciais duplicatas: ${totalParticipantes - uniquePhones}`);

          return res.status(200).json({
            success: true,
            data: participantes,
            stats: {
              total: participantes.length,
              regular: participantes.filter(
                p => p.participant_type === 'regular'
              ).length,
              public: participantes.filter(
                p => p.participant_type === 'public'
              ).length,
              duplicates_removed: 0,
              debug_info: {
                total_records: totalParticipantes,
                unique_phones: uniquePhones,
                potential_duplicates: totalParticipantes - uniquePhones,
                diagnosis: uniquePhones === 1
                  ? `✅ CORRETO: ${totalParticipantes} registros do mesmo telefone (mesma pessoa ${totalParticipantes}x)`
                  : uniquePhones === totalParticipantes
                    ? `⚠️ AVISO: Todos os ${totalParticipantes} telefones são únicos - não há duplicatas reais`
                    : `📊 INFO: ${uniquePhones} telefones únicos de ${totalParticipantes} registros - ${totalParticipantes - uniquePhones} duplicatas encontradas`
              }
            }
          });
        } catch (unifiedError) {
          console.error('❌ [UNIFIED] Erro ao buscar participantes unificados:', unifiedError);
          console.error('❌ [UNIFIED] Stack:', unifiedError.stack);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar participantes unificados',
            error: unifiedError.message,
            details:
              process.env.NODE_ENV === 'development' ? unifiedError.stack : undefined
          });
        }
      }

      // ============================================================
      // GET PADRÃO: apenas participantes regulares
      // (merge inteligente via ?merge=true)
      // ============================================================
      // url já foi declarado no início do bloco GET
      const merge = url.searchParams.get('merge') === 'true';

      let result = await databasePool.query(`
        SELECT
          p.id,
          p.nome AS name,
          p.telefone AS phone,
          p.bairro AS neighborhood,
          p.cidade AS city,
          p.latitude,
          p.longitude,
          p.promocao_id,
          pr.nome AS promocao_nome,
          p.origem_source,
          p.origem_medium,
          COALESCE(p.participou_em, CURRENT_TIMESTAMP) AS created_at,
          'regular' AS participant_type,
          NULL AS referral_code,
          NULL AS extra_guesses,
          0 AS total_submissions,
          0 AS correct_guesses,
          p.email,
          p.deleted_at,
          p.deleted_by,
          p.origem
        FROM participantes p
        LEFT JOIN promocoes pr ON p.promocao_id = pr.id
        WHERE p.deleted_at IS NULL
        ORDER BY COALESCE(p.participou_em, CURRENT_TIMESTAMP) DESC
      `);

      let rows = result.rows;
      let duplicatesRemoved = 0;

      // 📊 DEBUG: Contagem de telefones únicos ANTES da deduplicação
      const uniquePhones = new Set(rows.map(r => r.phone)).size;
      console.log(`📊 [REGULAR] Total de registros: ${rows.length}`);
      console.log(`📞 [REGULAR] Telefones únicos: ${uniquePhones}`);
      console.log(`🔄 [REGULAR] Duplicatas potenciais: ${rows.length - uniquePhones}`);

      if (merge) {
        const map = new Map();
        for (const r of rows) {
          const telClean = (r.phone || '').replace(/\D/g, '');
          if (!telClean) continue;
          const existing = map.get(telClean);

          // NOTA: created_at vem do alias SQL (linha 337): COALESCE(p.participou_em, CURRENT_TIMESTAMP) AS created_at
          // Compara datas e mantém o registro mais recente por telefone
          const dataAtual = new Date(r.created_at || r.participou_em || 0);
          const dataExistente = new Date(existing?.created_at || existing?.participou_em || 0);

          if (!existing || dataAtual > dataExistente) {
            map.set(telClean, r);
          }
        }
        rows = Array.from(map.values());
        duplicatesRemoved = result.rows.length - rows.length;
      }

      console.log(
        `📊 [REGULAR] Total retornado${merge ? ' (com merge por telefone)' : ''}: ${rows.length} participantes`
      );
      if (merge) console.log(`📊 [REGULAR] Registros mesclados (telefone duplicado): ${duplicatesRemoved}`);

      // Calcular telefones únicos no resultado final
      const totalBeforeMerge = rows.length + duplicatesRemoved;
      const uniquePhonesInResult = new Set(rows.map(r => r.phone)).size;

      return res.status(200).json({
        success: true,
        data: rows,
        stats: {
          total: rows.length,
          duplicates_removed: duplicatesRemoved,
          debug_info: {
            total_before_dedup: totalBeforeMerge,
            unique_phones_in_db: uniquePhones,
            unique_phones_in_result: uniquePhonesInResult,
            diagnosis: uniquePhones === 1
              ? 'CORRETO: Todos os registros são do mesmo telefone (mesma pessoa múltiplas vezes)'
              : `INCORRETO: Existem ${uniquePhones} telefones diferentes, mas deduplicação está removendo registros válidos!`
          }
        }
      });
    }

    // ============================================================
    // POST - Criar participante
    // ============================================================
    else if (req.method === 'POST') {
      try {
        console.log(`📝 [PARTICIPANTES] Recebendo POST. Body type: ${typeof req.body}`);

        // 1. Tentar dados já no req.body (Vercel)
        let data = req.body;

        // Se req.body for uma string (comum em alguns setups Vercel/Node), parsear
        if (data && typeof data === 'string') {
          try {
            console.log('📜 [PARTICIPANTES] req.body é string, tentando parsear JSON...');
            data = JSON.parse(data);
          } catch (e) {
            console.error('❌ [PARTICIPANTES] Falha ao parsear req.body como string:', e.message);
            // Se falhou o parse aqui, não abortamos ainda, tentamos o stream como fallback
          }
        }

        // Se após o parse temos um objeto válido com dados
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          console.log('📦 [PARTICIPANTES] Usando dados do body populado.');
          await processarParticipante(data, res);
          return;
        }

        // 2. Fallback: Ler stream manualmente (caso req.body esteja vazio/não-parseado)
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            console.log(`📜 [PARTICIPANTES] Stream finalizada. Tamanho: ${body.length}`);
            if (!body && (!data || Object.keys(data).length === 0)) {
              console.error('❌ [PARTICIPANTES] Nenhum dado recebido (body e stream vazios)');
              return res.status(400).json({ success: false, message: 'Dados não recebidos no corpo da requisição.' });
            }

            const streamData = JSON.parse(body || '{}');
            // Se o body stream tinha dados, usamos ele; senão usamos o que tínhamos no 'data' do req.body
            const finalData = Object.keys(streamData).length > 0 ? streamData : data;

            await processarParticipante(finalData, res);
          } catch (parseError) {
            console.error('❌ [PARTICIPANTES] Erro ao parsear JSON do stream:', parseError.message);
            res.status(400).json({ success: false, message: 'Dados inválidos (JSON malformado no stream)' });
          }
        });
      } catch (postError) {
        console.error('❌ [PARTICIPANTES] Erro fatal no bloco POST:', postError);
        res.status(500).json({ success: false, message: 'Erro interno ao processar cadastro' });
      }

      // Função auxiliar para processar o participante (chamada pelos dois métodos acima)
      async function processarParticipante(data, res) {
        const {
          nome,
          telefone,
          email,
          bairro,
          cidade,
          latitude,
          longitude,
          promocao_id,
          origem_source,
          origem_medium
        } = data;

        if (!nome || !telefone) {
          console.warn('⚠️ [PARTICIPANTES] Campos obrigatórios faltando:', {
            hasNome: !!nome,
            hasTelefone: !!telefone,
            nomeValue: nome,
            telefoneValue: telefone
          });
          return res.status(400).json({ success: false, message: 'Nome e telefone são obrigatórios' });
        }

        const telefoneClean = getCanonicalPhone(telefone);

        try {
          // 1. Verificação prévia de duplicidade por promoção
          if (promocao_id) {
            const existing = await databasePool.query(
              `SELECT id FROM participantes 
               WHERE telefone = $1 AND promocao_id = $2 AND deleted_at IS NULL
               LIMIT 1`,
              [telefoneClean, promocao_id]
            );

            if (existing.rows.length > 0) {
              return res.status(409).json({
                success: false,
                message: 'Você já participou desta promoção com este telefone!',
                error: 'DUPLICATE_PARTICIPATION'
              });
            }
          }

          // 2. Inserir participante
          const result = await databasePool.query(
            `
            INSERT INTO participantes
              (nome, telefone, email, bairro, cidade, latitude, longitude, promocao_id, origem_source, origem_medium)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
          `,
            [nome, telefoneClean, email, bairro, cidade, latitude, longitude, promocao_id, origem_source, origem_medium]
          );

          console.log(`✅ [PARTICIPANTES] Novo participante criado: ${nome} (ID: ${result.rows[0].id})`);
          return res.status(201).json({ success: true, data: result.rows[0] });

        } catch (dbError) {
          console.error('❌ [PARTICIPANTES] Erro DB ao inserir:', dbError.message);

          if (dbError.message.includes('unique constraint')) {
            return res.status(409).json({
              success: false,
              message: 'Participação duplicada detectada.',
              error: 'DUPLICATE_PARTICIPATION'
            });
          }

          return res.status(500).json({ success: false, message: 'Erro ao salvar no banco de dados' });
        }
      }
    }

    // ============================================================
    // PUT - Atualizar participante
    // ============================================================
    else if (req.method === 'PUT') {
      const url = new URL(req.url, 'http://localhost');
      const idParam = url.searchParams.get('id');
      const id = parseInt(idParam, 10);

      console.log('PUT request - ID:', { original: idParam, parsed: id }, 'URL:', req.url);

      if (
        !idParam ||
        idParam === 'undefined' ||
        idParam === 'null' ||
        !Number.isInteger(id) ||
        id <= 0
      ) {
        console.error('PUT request sem ID válido:', {
          idParam,
          parsed: id,
          url: req.url
        });
        res.status(400).json({
          message:
            'ID é obrigatório e deve ser um número inteiro positivo',
          received_id: idParam,
          parsed_id: id,
          url: req.url
        });
        return;
      }

      let body = '';
      req.on('data', chunk => (body += chunk.toString()));
      req.on('end', async () => {
        try {
          console.log('PUT body recebido:', body);
          const data = JSON.parse(body);
          console.log('PUT data parseado:', data);

          if (!data.nome || !data.telefone) {
            console.error('Campos obrigatórios ausentes:', {
              nome: data.nome,
              telefone: data.telefone
            });
            res.status(400).json({
              message: 'Nome e telefone são obrigatórios',
              received_data: data
            });
            return;
          }

          const {
            nome,
            telefone,
            email,
            bairro,
            cidade,
            latitude,
            longitude,
            promocao_id,
            promocao
          } = data;

          let finalPromocaoId = null;

          if (promocao_id !== undefined && promocao_id !== null && promocao_id !== '') {
            const promId = Number(promocao_id);
            if (!Number.isInteger(promId) || promId <= 0) {
              return res.status(400).json({
                success: false,
                message:
                  `Erro: promocao_id deve ser um número inteiro positivo (>0). ` +
                  `Recebido: ${promocao_id} (tipo: ${typeof promocao_id})`,
                received_value: promocao_id,
                received_type: typeof promocao_id
              });
            }
            finalPromocaoId = promId;
          } else if (promocao !== undefined && promocao !== null && promocao !== '') {
            const promValue = Number(promocao);
            if (!Number.isInteger(promValue) || promValue <= 0) {
              return res.status(400).json({
                success: false,
                message:
                  `Erro: campo 'promocao' deve ser um número inteiro positivo (>0). ` +
                  `Recebido: ${promocao} (tipo: ${typeof promocao})`,
                received_value: promocao,
                received_type: typeof promocao
              });
            }
            finalPromocaoId = promValue;
          }

          let finalLatitude = null;
          let finalLongitude = null;

          if (latitude !== undefined && String(latitude).trim() !== '') {
            const latNum = parseFloat(latitude);
            if (isNaN(latNum)) {
              return res.status(400).json({
                success: false,
                message:
                  `Latitude deve ser um número válido. Recebido: "${latitude}"`,
                field: 'latitude',
                received_value: latitude
              });
            }
            finalLatitude = latNum;
          }

          if (longitude !== undefined && String(longitude).trim() !== '') {
            const lonNum = parseFloat(longitude);
            if (isNaN(lonNum)) {
              return res.status(400).json({
                success: false,
                message:
                  `Longitude deve ser um número válido. Recebido: "${longitude}"`,
                field: 'longitude',
                received_value: longitude
              });
            }
            finalLongitude = lonNum;
          }

          console.log('Executando UPDATE com:', {
            nome,
            telefone,
            email,
            bairro,
            cidade,
            finalLatitude,
            finalLongitude,
            finalPromocaoId,
            id
          });

          let result = await databasePool.query(
            `
            UPDATE participantes
            SET nome = $1,
                telefone = $2,
                email = $3,
                bairro = $4,
                cidade = $5,
                latitude = $6,
                longitude = $7,
                promocao_id = $8
            WHERE id = $9
              AND deleted_at IS NULL
            RETURNING *
          `,
            [
              nome,
              telefone,
              email,
              bairro,
              cidade,
              finalLatitude,
              finalLongitude,
              finalPromocaoId,
              id
            ]
          );

          console.log('UPDATE result rows (participantes):', result.rows.length);

          if (result.rows.length === 0) {
            console.log(
              `⚠️ Participante não encontrado em 'participantes'. Tentando 'public_participants'...`
            );

            result = await databasePool.query(
              `
              UPDATE public_participants
              SET name = $1,
                  phone = $2,
                  latitude = $3,
                  longitude = $4,
                  neighborhood = $5,
                  city = $6
              WHERE id = $7
              RETURNING *
            `,
              [nome, telefone, finalLatitude, finalLongitude, bairro, cidade, id]
            );

            console.log(
              'UPDATE result rows (public_participants):',
              result.rows.length
            );
          }

          if (result.rows.length === 0) {
            res.status(404).json({
              success: false,
              message:
                `Participante com ID ${id} não encontrado em nenhuma tabela`
            });
          } else {
            res.status(200).json({ success: true, data: result.rows[0] });
          }
        } catch (parseError) {
          console.error('Erro completo no PUT:', parseError);

          if (
            parseError.code === '23505' &&
            parseError.message.includes(
              'idx_participante_unico_por_promocao'
            )
          ) {
            return res.status(409).json({
              message:
                'Este telefone já está sendo usado por outro participante nesta promoção!',
              error: 'DUPLICATE_PHONE_IN_PROMOTION'
            });
          }

          res.status(400).json({
            message: 'Erro interno: ' + parseError.message,
            error_type: parseError.name,
            error_code: parseError.code,
            stack: parseError.stack
          });
        }
      });
    }

    // ============================================================
    // DELETE - Excluir participante
    // ============================================================
    else if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');

      if (!id) {
        res.status(400).json({ message: 'ID é obrigatório para exclusão' });
        return;
      }

      try {
        const ganhadorAtivo = await databasePool.query(
          `
          SELECT id
          FROM ganhadores
          WHERE participante_id = $1
            AND deleted_at IS NULL
        `,
          [id]
        );

        if (ganhadorAtivo.rows.length > 0) {
          res.status(400).json({
            success: false,
            message:
              'Este participante não pode ser excluído pois foi sorteado como ganhador. Cancele o sorteio primeiro.'
          });
          return;
        }

        const result = await databasePool.query(
          'DELETE FROM participantes WHERE id = $1 RETURNING *',
          [id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ message: 'Participante não encontrado' });
        } else {
          res.status(200).json({
            success: true,
            message: 'Participante excluído com sucesso'
          });
        }
      } catch (deleteError) {
        console.error('Erro ao excluir participante:', deleteError);
        res.status(500).json({
          success: false,
          message:
            'Erro interno ao excluir participante: ' + deleteError.message
        });
      }
    }

    // ============================================================
    // Método não permitido
    // ============================================================
    else {
      res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API participantes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
