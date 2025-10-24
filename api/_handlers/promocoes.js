const { getSecureHeaders, checkRateLimit } = require('./_lib/security');
const databasePool = require('./_lib/database');
const cacheManager = require('./_lib/cache');

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

  // Rate limiting
  const clientId = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientId, 100, 60000); // 100 requests per minute
  
  if (!rateLimit.allowed) {
    res.status(429).json({ 
      message: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    });
    return;
  }

  try {

    // Adicionar coluna numero_ganhadores se não existir
    try {
      await databasePool.query(`
        ALTER TABLE promocoes 
        ADD COLUMN IF NOT EXISTS numero_ganhadores INTEGER DEFAULT 3
      `);
    } catch (error) {
      console.log('Erro ao adicionar coluna numero_ganhadores (pode ser normal se já existir):', error.message);
    }

    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const promocaoId = url.searchParams.get('id');
      const status = url.searchParams.get('status');
      
      // Verificar cache primeiro (apenas para listagem geral)
      if (!promocaoId && !status) {
        const cachedPromocoes = await cacheManager.getCachedPromocoes();
        if (cachedPromocoes) {
          console.log('📦 Retornando promoções do cache');
          return res.status(200).json({
            success: true,
            data: cachedPromocoes,
            cached: true
          });
        }
      }
      
      let query;
      let params = [];
      
      if (promocaoId) {
        // Buscar promoção específica por ID
        console.log('Buscando promoção por ID:', promocaoId);
        query = `
          SELECT p.*, e.nome as emissora_nome,
                 COALESCE(COUNT(pt.id), 0) as participantes
          FROM promocoes p 
          LEFT JOIN emissoras e ON p.emissora_id = e.id 
          LEFT JOIN participantes pt ON p.id = pt.promocao_id
          WHERE p.id = $1
          GROUP BY p.id, e.nome
        `;
        params = [promocaoId];
      } else {
        // Buscar todas as promoções com contagem de participantes
        if (status) {
          console.log('Buscando promoções com status:', status);
          query = `
            SELECT p.*, e.nome as emissora_nome,
                   COALESCE(COUNT(pt.id), 0) as participantes
            FROM promocoes p 
            LEFT JOIN emissoras e ON p.emissora_id = e.id 
            LEFT JOIN participantes pt ON p.id = pt.promocao_id
            WHERE p.status = $1
            GROUP BY p.id, e.nome
            ORDER BY p.id DESC
          `;
          params = [status];
        } else {
          console.log('Buscando todas as promoções...');
          query = `
            SELECT p.*, e.nome as emissora_nome,
                   COALESCE(COUNT(pt.id), 0) as participantes
            FROM promocoes p 
            LEFT JOIN emissoras e ON p.emissora_id = e.id 
            LEFT JOIN participantes pt ON p.id = pt.promocao_id
            GROUP BY p.id, e.nome
            ORDER BY p.id DESC
          `;
        }
      }
      
      const result = await databasePool.query(query, params);
      console.log('Query executada, linhas:', result.rows.length);
      
      // Cache a listagem geral de promoções
      if (!promocaoId && !status) {
        await cacheManager.cachePromocoes(result.rows, 300); // Cache por 5 minutos
        console.log('💾 Promoções salvas no cache');
      }
      
      res.status(200).json({ success: true, data: result.rows, cached: false });
      
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const { nome, descricao, data_inicio, data_fim, status, link_participacao, numero_ganhadores } = JSON.parse(body);
          
          if (!nome || !data_inicio || !data_fim) {
                  res.status(400).json({ message: 'Nome, data_inicio e data_fim são obrigatórios' });
            return;
          }

          // Gerar slug automaticamente baseado no nome
          const slug = nome
            .toLowerCase()
            .replace(/[áàãâ]/g, 'a')
            .replace(/[éêë]/g, 'e')
            .replace(/[íîï]/g, 'i')
            .replace(/[óôõ]/g, 'o')
            .replace(/[úûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();

          // Gerar link de participação automaticamente se não fornecido
          const linkParticipacao = link_participacao || `/participar?slug=${slug}`;

          console.log('Criando promoção:', { nome, slug, linkParticipacao });

          const result = await databasePool.query(`
            INSERT INTO promocoes (nome, descricao, data_inicio, data_fim, status, link_participacao, slug, numero_ganhadores) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
          `, [nome, descricao, data_inicio, data_fim, status || 'ativa', linkParticipacao, slug, numero_ganhadores || 3]);
          
          // Invalidar cache após criar promoção
          await cacheManager.invalidatePromocoes();
          console.log('🗑️ Cache de promoções invalidado após criação');
          
          res.status(201).json({ success: true, data: result.rows[0] });
          
        } catch (parseError) {
              res.status(400).json({ message: 'Dados inválidos' });
        }
      });
      
    } else if (req.method === 'PUT') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      
      if (!id) {
          res.status(400).json({ message: 'ID é obrigatório para atualização' });
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const { nome, descricao, data_inicio, data_fim, status, link_participacao, numero_ganhadores } = JSON.parse(body);
          
          const result = await databasePool.query(`
            UPDATE promocoes 
            SET nome = $1, descricao = $2, data_inicio = $3, data_fim = $4, status = $5, link_participacao = $6, numero_ganhadores = $7
            WHERE id = $8 
            RETURNING *
          `, [nome, descricao, data_inicio, data_fim, status, link_participacao, numero_ganhadores, id]);
          
              if (result.rows.length === 0) {
            res.status(404).json({ message: 'Promoção não encontrada' });
          } else {
            res.status(200).json({ success: true, data: result.rows[0] });
          }
          
        } catch (parseError) {
              res.status(400).json({ message: 'Dados inválidos' });
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
        // Primeiro tentar excluir diretamente
        const result = await databasePool.query('DELETE FROM promocoes WHERE id = $1 RETURNING *', [id]);
        
        // Invalidar cache após deletar promoção
        await cacheManager.invalidatePromocoes();
        console.log('🗑️ Cache de promoções invalidado após exclusão');
        
          if (result.rows.length === 0) {
          res.status(404).json({ message: 'Promoção não encontrada' });
        } else {
          res.status(200).json({ success: true, message: 'Promoção excluída com sucesso' });
        }

      } catch (deleteError) {
          console.error('Erro ao excluir promoção:', deleteError);
        
        // Verificar se é erro de constraint de chave estrangeira
        if (deleteError.code === '23503') {
          // Tentar identificar que tipo de constraint foi violada
          if (deleteError.detail && deleteError.detail.includes('participantes')) {
            res.status(400).json({ 
              success: false,
              message: 'Esta promoção não pode ser excluída pois possui participantes vinculados. Remova os participantes primeiro.' 
            });
          } else if (deleteError.detail && deleteError.detail.includes('ganhadores')) {
            res.status(400).json({ 
              success: false,
              message: 'Esta promoção não pode ser excluída pois possui ganhadores vinculados. Cancele os sorteios primeiro.' 
            });
          } else {
            res.status(400).json({ 
              success: false,
              message: 'Esta promoção não pode ser excluída pois possui dados vinculados. Remova participantes e ganhadores primeiro.' 
            });
          }
        } else {
          res.status(500).json({ 
            success: false,
            message: 'Erro interno ao excluir promoção. Verifique se não há dados vinculados.' 
          });
        }
      }
      
    } else if (req.method === 'PATCH') {
      // Handler para atualizar status da promoção
      const url = new URL(req.url, 'http://localhost');
      const action = url.searchParams.get('action');
      
      if (action === 'status') {
        // Ler o corpo da requisição
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }

        const { promocaoId, status } = JSON.parse(body || '{}');

        // Validação básica
        if (!promocaoId || !status) {
              return res.status(400).json({
            success: false,
            message: 'promocaoId e status são obrigatórios'
          });
        }

        // Validar status permitidos
        const statusPermitidos = ['ativa', 'pausada', 'encerrada'];
        if (!statusPermitidos.includes(status)) {
              return res.status(400).json({
            success: false,
            message: `Status inválido. Valores permitidos: ${statusPermitidos.join(', ')}`
          });
        }

        // Verificar se a promoção existe
        const checkQuery = 'SELECT id, nome, status FROM promocoes WHERE id = $1';
        const checkResult = await databasePool.query(checkQuery, [promocaoId]);

        if (checkResult.rows.length === 0) {
              return res.status(404).json({ 
            success: false,
            message: 'Promoção não encontrada.' 
          });
        }

        const promocaoAtual = checkResult.rows[0];
        
        // Atualizar o status
        const updateQuery = 'UPDATE promocoes SET status = $1 WHERE id = $2 RETURNING id, nome, status';
        const result = await databasePool.query(updateQuery, [status, promocaoId]);

        console.log(`✅ Status da promoção "${promocaoAtual.nome}" (ID: ${promocaoId}) alterado de "${promocaoAtual.status}" para "${status}"`);

        // Invalidar cache após alterar status
        await cacheManager.invalidatePromocoes();
        console.log('🗑️ Cache de promoções invalidado após atualização de status');
  
        res.status(200).json({
          success: true,
          message: `Status da promoção "${promocaoAtual.nome}" atualizado para "${status}" com sucesso!`,
          data: result.rows[0]
        });
      } else if (action === 'dashboard') {
        // Estatísticas do dashboard
        try {
          // Buscar estatísticas
          const promocoesResult = await databasePool.query('SELECT COUNT(*) as total FROM promocoes');
          const participantesResult = await databasePool.query('SELECT COUNT(*) as total FROM participantes');
          const ativasResult = await databasePool.query("SELECT COUNT(*) as total FROM promocoes WHERE status = 'ativa'");
          
          // Buscar participações de hoje - tentar diferentes colunas de data
          let hojeResult;
          try {
            hojeResult = await databasePool.query(`
              SELECT COUNT(*) as total FROM participantes 
              WHERE DATE(created_at) = CURRENT_DATE
            `);
          } catch (error) {
            try {
              hojeResult = await databasePool.query(`
                SELECT COUNT(*) as total FROM participantes 
                WHERE DATE(criado_em) = CURRENT_DATE
              `);
            } catch (error2) {
              try {
                hojeResult = await databasePool.query(`
                  SELECT COUNT(*) as total FROM participantes 
                  WHERE DATE(participou_em) = CURRENT_DATE
                `);
              } catch (error3) {
                hojeResult = { rows: [{ total: '0' }] };
              }
            }
          }

          const totalPromocoes = promocoesResult.rows[0].total;
          const totalParticipantes = participantesResult.rows[0].total;
          const promocoesAtivas = ativasResult.rows[0].total;
          const participantesHoje = hojeResult.rows[0].total;

          res.status(200).json({
            success: true,
            totais: {
              totalPromocoes: parseInt(totalPromocoes),
              totalParticipantes: parseInt(totalParticipantes),
              promocoesAtivas: parseInt(promocoesAtivas),
              participacoesHoje: parseInt(participantesHoje)
            }
          });
          
        } catch (error) {
          console.error('Erro ao buscar estatísticas do dashboard:', error);
          res.status(500).json({ message: 'Erro interno do servidor' });
        }
        
      } else {
        res.status(400).json({ 
          success: false,
          message: 'Parâmetro action é obrigatório para PATCH. Use action=status ou action=dashboard' 
        });
      }
      
    } else {
      res.status(405).json({ message: 'Método não permitido' });
    }
    
  } catch (error) {
    console.error('Erro na API promocoes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};