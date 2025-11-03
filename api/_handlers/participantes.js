const { getSecureHeaders, checkRateLimit } = require('../_lib/security');
const databasePool = require('../_lib/database');

module.exports = async (req, res) => {
  // Configurar CORS seguro
  const secureHeaders = getSecureHeaders(req.headers.origin);
  Object.entries(secureHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Rate limiting para participantes (crítico para evitar spam)
  const clientId = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientId, 30, 60000); // 30 requests per minute (mais restritivo)
  
  if (!rateLimit.allowed) {
    res.status(429).json({ 
      message: 'Muitas tentativas de participação. Aguarde antes de tentar novamente.',
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    });
    return;
  }

  try {
    databasePool;

    if (req.method === 'GET') {
      // Verificar se é requisição unificada (participantes regulares + públicos)
      const url = new URL(req.url, `http://${req.headers.host}`);
      const unified = url.searchParams.get('unified') === 'true';
      const includePublic = url.searchParams.get('includePublic') !== 'false'; // Default true

      if (unified) {
        // ENDPOINT UNIFICADO: Retorna participantes regulares + públicos
        let participantes = [];

        try {
          console.log('🔍 [UNIFIED] Iniciando busca de participantes regulares...');
          // 1. Buscar participantes regulares (tabela participantes)
          // NOTA: Não filtramos por latitude/longitude aqui - o frontend decide o filtro
          const regularResult = await databasePool.query(`
            SELECT
              p.id,
              p.nome as name,
              p.telefone as phone,
              p.bairro as neighborhood,
              p.cidade as city,
              p.latitude,
              p.longitude,
              p.promocao_id,
              p.origem_source,
              p.origem_medium,
              COALESCE(p.participou_em, CURRENT_TIMESTAMP) as created_at,
              'regular' as participant_type,
              NULL as referral_code,
              NULL as extra_guesses,
              0 as total_submissions,
              0 as correct_guesses
            FROM participantes p
            WHERE p.deleted_at IS NULL
          `);

          participantes = regularResult.rows;
          console.log(`✅ [UNIFIED] ${regularResult.rows.length} participantes regulares encontrados`);

          // 2. Buscar participantes públicos (tabela public_participants) se includePublic=true
          if (includePublic) {
            console.log('🔍 [UNIFIED] Iniciando busca de participantes públicos...');

            // Tentar buscar participantes públicos com tratamento de erro
            // NOTA: Não filtramos por latitude/longitude aqui - o frontend decide o filtro
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
                  NULL as promocao_id,
                  'caixa-misteriosa' as origem_source,
                  'game' as origem_medium,
                  pp.created_at,
                  'public' as participant_type,
                  COALESCE(pp.referral_code, NULL) as referral_code,
                  COALESCE(pp.extra_guesses, 0) as extra_guesses,
                  COUNT(s.id) as total_submissions,
                  SUM(CASE WHEN s.is_correct THEN 1 ELSE 0 END) as correct_guesses
                FROM public_participants pp
                LEFT JOIN submissions s ON pp.id = s.public_participant_id
                GROUP BY pp.id, pp.name, pp.phone, pp.neighborhood, pp.city,
                         pp.latitude, pp.longitude, pp.created_at,
                         pp.referral_code, pp.extra_guesses
              `);

              console.log(`✅ [UNIFIED] ${publicResult.rows.length} participantes públicos encontrados`);
              participantes = [...participantes, ...publicResult.rows];
            } catch (publicError) {
              console.error('⚠️ [UNIFIED] Erro ao buscar participantes públicos:', publicError.message);

              // Se a tabela não existe ou faltam colunas, continuar apenas com participantes regulares
              if (publicError.code === '42P01') {
                console.warn('⚠️ [UNIFIED] Tabela public_participants não existe. Retornando apenas participantes regulares.');
              } else if (publicError.code === '42703') {
                console.warn('⚠️ [UNIFIED] Coluna latitude/longitude não existe na tabela. Execute a migração add-geolocation-to-public-participants.sql');
              } else {
                console.error('❌ [UNIFIED] Erro inesperado:', publicError);
              }

              // Não lançar erro - continuar com apenas participantes regulares
              console.log('ℹ️ [UNIFIED] Continuando apenas com participantes regulares...');
            }
          }

          // === DEDUPLICAÇÃO POR TELEFONE ===
          console.log(`📊 [UNIFIED] Antes da deduplicação: ${participantes.length} participantes`);

          // Agrupar por telefone e manter apenas o registro mais recente
          const participantesUnicos = {};

          participantes.forEach(p => {
            const phone = p.phone;

            // Se não existe participante com esse telefone, adiciona
            if (!participantesUnicos[phone]) {
              participantesUnicos[phone] = p;
            } else {
              // Se já existe, compara as datas e mantém o mais recente
              const existente = participantesUnicos[phone];
              const dataExistente = new Date(existente.created_at);
              const dataNovo = new Date(p.created_at);

              // Priorizar: 1) Mais recente, 2) Participante público (Caixa Misteriosa)
              if (dataNovo > dataExistente ||
                  (dataNovo.getTime() === dataExistente.getTime() && p.participant_type === 'public')) {
                participantesUnicos[phone] = p;
                console.log(`🔄 [DEDUP] Substituindo ${existente.name} (${existente.participant_type}, ${existente.created_at}) por ${p.name} (${p.participant_type}, ${p.created_at}) - telefone: ${phone}`);
              }
            }
          });

          // Converter objeto de volta para array
          const participantesDeduplicados = Object.values(participantesUnicos);

          console.log(`✅ [UNIFIED] Após deduplicação: ${participantesDeduplicados.length} participantes únicos`);
          console.log(`🎯 [UNIFIED] Total de ${participantesDeduplicados.length} participantes (${participantesDeduplicados.filter(p => p.participant_type === 'regular').length} regulares + ${participantesDeduplicados.filter(p => p.participant_type === 'public').length} públicos)`);

          return res.status(200).json({
            success: true,
            data: participantesDeduplicados,
            stats: {
              total: participantesDeduplicados.length,
              regular: participantesDeduplicados.filter(p => p.participant_type === 'regular').length,
              public: participantesDeduplicados.filter(p => p.participant_type === 'public').length,
              duplicates_removed: participantes.length - participantesDeduplicados.length
            }
          });
        } catch (unifiedError) {
          console.error('❌ [UNIFIED] Erro ao buscar participantes unificados:', unifiedError);
          console.error('❌ [UNIFIED] Stack:', unifiedError.stack);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar participantes unificados',
            error: unifiedError.message,
            details: process.env.NODE_ENV === 'development' ? unifiedError.stack : undefined
          });
        }
      }

      // Endpoint padrão (apenas participantes regulares)
      const result = await databasePool.query(`
        SELECT p.*, pr.nome as promocao_nome,
               COALESCE(p.participou_em, CURRENT_TIMESTAMP) as data_participacao
        FROM participantes p
        LEFT JOIN promocoes pr ON p.promocao_id = pr.id
        WHERE p.deleted_at IS NULL
        ORDER BY COALESCE(p.participou_em, CURRENT_TIMESTAMP) DESC
      `);

      // === DEDUPLICAÇÃO POR TELEFONE (ENDPOINT PADRÃO) ===
      console.log(`📊 [REGULAR] Antes da deduplicação: ${result.rows.length} participantes`);

      const participantesUnicos = {};

      result.rows.forEach(p => {
        const phone = p.telefone;

        // Se não existe participante com esse telefone, adiciona
        if (!participantesUnicos[phone]) {
          participantesUnicos[phone] = p;
        } else {
          // Se já existe, compara as datas e mantém o mais recente
          const existente = participantesUnicos[phone];
          const dataExistente = new Date(existente.data_participacao);
          const dataNovo = new Date(p.data_participacao);

          if (dataNovo > dataExistente) {
            participantesUnicos[phone] = p;
            console.log(`🔄 [DEDUP-REGULAR] Substituindo ${existente.nome} (${existente.data_participacao}) por ${p.nome} (${p.data_participacao}) - telefone: ${phone}`);
          }
        }
      });

      const participantesDeduplicados = Object.values(participantesUnicos);

      console.log(`✅ [REGULAR] Após deduplicação: ${participantesDeduplicados.length} participantes únicos`);
      console.log(`📉 [REGULAR] Duplicatas removidas: ${result.rows.length - participantesDeduplicados.length}`);

            res.status(200).json({
        success: true,
        data: participantesDeduplicados,
        stats: {
          total: participantesDeduplicados.length,
          duplicates_removed: result.rows.length - participantesDeduplicados.length
        }
      });

    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const { nome, telefone, email, bairro, cidade, latitude, longitude, promocao_id, origem_source, origem_medium } = JSON.parse(body);
          
          if (!nome || !telefone) {
                        res.status(400).json({ message: 'Nome e telefone são obrigatórios' });
            return;
          }

          const result = await databasePool.query(`
            INSERT INTO participantes (nome, telefone, email, bairro, cidade, latitude, longitude, promocao_id, origem_source, origem_medium) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *
          `, [nome, telefone, email, bairro, cidade, latitude, longitude, promocao_id, origem_source, origem_medium]);
          
                    res.status(201).json({ success: true, data: result.rows[0] });
          
        } catch (parseError) {
                    console.error('Erro ao processar participante:', parseError);
          
          // Tratar erro de constraint única
          if (parseError.message.includes('duplicate key value violates unique constraint')) {
            if (parseError.message.includes('idx_participante_unico_por_promocao')) {
              return res.status(409).json({ 
                message: 'Você já participou desta promoção com este telefone!',
                error: 'DUPLICATE_PARTICIPATION',
                details: 'Cada telefone pode participar apenas uma vez por promoção.'
              });
            }
          }
          
          res.status(400).json({ 
            message: 'Dados inválidos', 
            error: parseError.message,
            received_body: body 
          });
        }
      });
      
    } else if (req.method === 'PUT') {
      const url = new URL(req.url, 'http://localhost');
      const idParam = url.searchParams.get('id');

      // ✅ FIXADO: Converter ID para número inteiro
      const id = parseInt(idParam, 10);

      console.log('PUT request - ID:', { original: idParam, parsed: id }, 'URL:', req.url);

      if (!idParam || idParam === 'undefined' || idParam === 'null' || !Number.isInteger(id) || id <= 0) {
        console.error('PUT request sem ID válido:', { idParam, parsed: id, url: req.url });
        res.status(400).json({
          message: 'ID é obrigatório e deve ser um número inteiro positivo',
          received_id: idParam,
          parsed_id: id,
          url: req.url
        });
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          console.log('PUT body recebido:', body);
          const data = JSON.parse(body);
          console.log('PUT data parseado:', data);
          
          // Validar campos obrigatórios
          if (!data.nome || !data.telefone) {
                        console.error('Campos obrigatórios ausentes:', { nome: data.nome, telefone: data.telefone });
            res.status(400).json({ 
              message: 'Nome e telefone são obrigatórios',
              received_data: data 
            });
            return;
          }
          
          // Extract data
          const { nome, telefone, email, bairro, cidade, latitude, longitude, promocao_id, promocao } = data;

          // ✅ FIXADO: Validar que promocao_id é número inteiro, null, ou undefined (nunca string)
          let finalPromocaoId = null;

          // Se promocao_id foi fornecido e não é vazio
          if (promocao_id !== undefined && promocao_id !== null && promocao_id !== '') {
            const promId = Number(promocao_id);
            // Validar que é número inteiro positivo
            if (!Number.isInteger(promId) || promId <= 0) {
              return res.status(400).json({
                success: false,
                message: `Erro: promocao_id deve ser um número inteiro positivo (>0). Recebido: ${promocao_id} (tipo: ${typeof promocao_id})`,
                received_value: promocao_id,
                received_type: typeof promocao_id,
                suggestion: 'Se não há promoção associada, deixe o campo em branco ou null'
              });
            }
            finalPromocaoId = promId;
          }
          // Se promocao_id é vazio, null, ou undefined, tenta usar o campo 'promocao'
          else if (promocao !== undefined && promocao !== null && promocao !== '') {
            const promValue = Number(promocao);
            if (!Number.isInteger(promValue) || promValue <= 0) {
              return res.status(400).json({
                success: false,
                message: `Erro: campo 'promocao' deve ser um número inteiro positivo (>0). Recebido: ${promocao} (tipo: ${typeof promocao})`,
                received_value: promocao,
                received_type: typeof promocao,
                suggestion: 'Se não há promoção associada, deixe o campo em branco ou null'
              });
            }
            finalPromocaoId = promValue;
          }
          // Senão, finalPromocaoId permanece null (participante sem promoção)

          // ✅ VALIDAÇÃO: Latitude e Longitude não podem ser strings vazias
          // Converter "" para NULL ou validar número
          let finalLatitude = null;
          let finalLongitude = null;

          if (latitude && latitude.trim() !== '') {
            const latNum = parseFloat(latitude);
            if (isNaN(latNum)) {
              return res.status(400).json({
                success: false,
                message: `Latitude deve ser um número válido. Recebido: "${latitude}"`,
                field: 'latitude',
                received_value: latitude
              });
            }
            finalLatitude = latNum;
          }

          if (longitude && longitude.trim() !== '') {
            const lonNum = parseFloat(longitude);
            if (isNaN(lonNum)) {
              return res.status(400).json({
                success: false,
                message: `Longitude deve ser um número válido. Recebido: "${longitude}"`,
                field: 'longitude',
                received_value: longitude
              });
            }
            finalLongitude = lonNum;
          }

          console.log('Executando UPDATE com:', {
            nome, telefone, email, bairro, cidade, finalLatitude, finalLongitude, finalPromocaoId, id,
            received_promocao_id: { tipo: typeof promocao_id, valor: promocao_id },
            received_promocao: { tipo: typeof promocao, valor: promocao }
          });

          // ✅ CORREÇÃO: Tentar atualizar em participantes primeiro, depois em public_participants
          let result = await databasePool.query(`
            UPDATE participantes
            SET nome = $1, telefone = $2, email = $3, bairro = $4, cidade = $5, latitude = $6, longitude = $7, promocao_id = $8
            WHERE id = $9 AND deleted_at IS NULL
            RETURNING *
          `, [nome, telefone, email, bairro, cidade, finalLatitude, finalLongitude, finalPromocaoId, id]);

          console.log('UPDATE result rows (participantes):', result.rows.length);

          // Se não encontrou em participantes, tentar em public_participants
          if (result.rows.length === 0) {
            console.log(`⚠️ Participante não encontrado em tabela 'participantes'. Tentando 'public_participants'...`);

            result = await databasePool.query(`
              UPDATE public_participants
              SET name = $1, phone = $2, latitude = $3, longitude = $4, neighborhood = $5, city = $6
              WHERE id = $7 AND deleted_at IS NULL
              RETURNING *
            `, [nome, telefone, finalLatitude, finalLongitude, bairro, cidade, id]);

            console.log('UPDATE result rows (public_participants):', result.rows.length);
          }

          if (result.rows.length === 0) {
            res.status(404).json({
              success: false,
              message: `Participante com ID ${id} não encontrado em nenhuma tabela (participantes ou public_participants)`,
              participant_id: id
            });
          } else {
            res.status(200).json({ success: true, data: result.rows[0] });
          }
          
        } catch (parseError) {
          console.error('Erro completo no PUT:', parseError);
                    
          // Tratar erro de constraint única específico para updates
          if (parseError.code === '23505' && parseError.message.includes('idx_participante_unico_por_promocao')) {
            return res.status(409).json({ 
              message: 'Este telefone já está sendo usado por outro participante nesta promoção!',
              error: 'DUPLICATE_PHONE_IN_PROMOTION',
              details: 'Cada telefone pode participar apenas uma vez por promoção.'
            });
          }
          
          res.status(400).json({ 
            message: 'Erro interno: ' + parseError.message,
            received_body: body,
            error_type: parseError.name,
            error_code: parseError.code,
            stack: parseError.stack
          });
        }
      });
      
    } else if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      
      if (!id) {
                res.status(400).json({ message: 'ID é obrigatório para exclusão' });
        return;
      }

      try {
        // Verificar se o participante é ganhador ativo (não cancelado)
        // ✅ SEGURANÇA (ALTO-005): Soft Delete - filtrar registros deletados
        const ganhadorAtivo = await databasePool.query(`
          SELECT id FROM ganhadores
          WHERE participante_id = $1 AND deleted_at IS NULL
        `, [id]);
        
        if (ganhadorAtivo.rows.length > 0) {
                    res.status(400).json({ 
            success: false,
            message: 'Este participante não pode ser excluído pois foi sorteado como ganhador. Cancele o sorteio primeiro.' 
          });
          return;
        }
        
        // Se chegou aqui, pode excluir (ou é ganhador cancelado)
        // Primeiro remover registros de ganhadores cancelados
        // ✅ SEGURANÇA (ALTO-005): Soft Delete already applied via cancelado/deleted_at
        // Ganhadores cancelados já estão soft-deleted, então podemos pular hard delete
        // await databasePool.query(`
        //   DELETE FROM ganhadores
        //   WHERE participante_id = $1 AND cancelado = true
        // `, [id]);
        
        // Agora excluir o participante
        const result = await databasePool.query('DELETE FROM participantes WHERE id = $1 RETURNING *', [id]);
        
                if (result.rows.length === 0) {
          res.status(404).json({ message: 'Participante não encontrado' });
        } else {
          res.status(200).json({ success: true, message: 'Participante excluído com sucesso' });
        }

      } catch (deleteError) {
                console.error('Erro ao excluir participante:', deleteError);
        
        res.status(500).json({ 
          success: false,
          message: 'Erro interno ao excluir participante: ' + deleteError.message
        });
      }
      
    } else {
            res.status(405).json({ message: 'Método não permitido' });
    }
    
  } catch (error) {
    console.error('Erro na API participantes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};