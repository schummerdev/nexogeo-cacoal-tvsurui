const { getSecureHeaders, checkRateLimit } = require('../_lib/security');
const databasePool = require('../_lib/database');

// Função para buscar participantes disponíveis
async function buscarParticipantesDisponiveis(req, res) {
  const { promocaoId } = req.query;
  
  if (!promocaoId) {
    return res.status(400).json({ message: 'ID da promoção é obrigatório' });
  }

  try {
    // Verificar/criar tabelas primeiro
    try {
      await databasePool.query(`SELECT 1 FROM participantes LIMIT 1`);
    } catch (tableError) {
      return res.status(200).json({ 
        success: true, 
        data: [],
        total: 0,
        message: 'Tabela participantes não encontrada'
      });
    }

    // Buscar participantes disponíveis para sorteio desta promoção
    const query = `
      SELECT 
        p.id,
        p.nome,
        p.email,
        p.telefone,
        p.cidade,
        p.bairro,
        p.participou_em as created_at
      FROM participantes p
      WHERE p.promocao_id = $1
      AND p.id NOT IN (
        SELECT DISTINCT participante_id 
        FROM ganhadores 
        WHERE promocao_id = $1 
        AND participante_id IS NOT NULL
        AND (cancelado = false OR cancelado IS NULL)
      )
      ORDER BY p.participou_em DESC
    `;
    
    const result = await databasePool.query(query, [promocaoId]);
    
    return res.status(200).json({ 
      success: true, 
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar participantes' 
    });
  }
}

// Função para realizar sorteio
async function realizarSorteio(req, res) {
  try {
    // Ler o corpo da requisição
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
    }

    const { promocaoId } = JSON.parse(body || '{}');
    
    if (!promocaoId) {
      return res.status(400).json({ 
        success: false,
        message: 'ID da promoção é obrigatório' 
      });
    }

    // Criar tabela de ganhadores se não existir
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS ganhadores (
        id SERIAL PRIMARY KEY,
        participante_id INTEGER NOT NULL,
        promocao_id INTEGER NOT NULL,
        posicao INTEGER NOT NULL,
        premio VARCHAR(255),
        sorteado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelado BOOLEAN DEFAULT false,
        UNIQUE(participante_id, promocao_id)
      )
    `);

    // Adicionar colunas que podem estar faltando na tabela existente
    try {
      await databasePool.query(`
        ALTER TABLE ganhadores 
        ADD COLUMN IF NOT EXISTS posicao INTEGER DEFAULT 1
      `);
      await databasePool.query(`
        ALTER TABLE ganhadores 
        ADD COLUMN IF NOT EXISTS premio VARCHAR(255) DEFAULT '1º Lugar'
      `);
      await databasePool.query(`
        ALTER TABLE ganhadores 
        ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT false
      `);
    } catch (error) {
      console.log('Erro ao adicionar colunas (pode ser normal se já existirem):', error.message);
    }

    // Buscar informações da promoção incluindo número de ganhadores
    const promocaoInfo = await databasePool.query(`
      SELECT numero_ganhadores FROM promocoes WHERE id = $1
    `, [promocaoId]);

    if (promocaoInfo.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Promoção não encontrada' 
      });
    }

    let quantidade = parseInt(promocaoInfo.rows[0].numero_ganhadores, 10) || 3;

    // Validar que quantidade está entre 1 e 3
    if (isNaN(quantidade) || quantidade < 1) {
      quantidade = 1;
    } else if (quantidade > 3) {
      quantidade = 3;
    }

    console.log(`📊 [SORTEIO] Promo ${promocaoId} - numero_ganhadores do BD: ${promocaoInfo.rows[0].numero_ganhadores} (tipo: ${typeof promocaoInfo.rows[0].numero_ganhadores})`);
    console.log(`📊 [SORTEIO] Quantidade após parseInt: ${quantidade} (tipo: ${typeof quantidade})`);

    // Verificar se já existem ganhadores para esta promoção e cancelá-los automaticamente
    const existingWinners = await databasePool.query(`
      SELECT COUNT(*) as total FROM ganhadores 
      WHERE promocao_id = $1 AND (cancelado = false OR cancelado IS NULL)
    `, [promocaoId]);

    if (existingWinners.rows[0].total > 0) {
      // Cancelar ganhadores existentes automaticamente
      await databasePool.query(`
        UPDATE ganhadores 
        SET cancelado = true 
        WHERE promocao_id = $1 AND (cancelado = false OR cancelado IS NULL)
      `, [promocaoId]);
      
      console.log(`✅ Cancelados ${existingWinners.rows[0].total} ganhadores existentes da promoção ${promocaoId} para novo sorteio`);
    }

    // Buscar participantes disponíveis para o sorteio
    console.log(`📊 [SORTEIO] Buscando ${quantidade} participantes para promo ${promocaoId}`);
    const participantesResult = await databasePool.query(`
      SELECT p.*
      FROM participantes p
      WHERE p.promocao_id = $1
      ORDER BY RANDOM()
      LIMIT $2
    `, [promocaoId, quantidade]);

    console.log(`📊 [SORTEIO] Participantes retornados: ${participantesResult.rows.length}`);

    if (participantesResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum participante encontrado para esta promoção'
      });
    }

    // Criar os ganhadores
    const ganhadores = [];
    const premios = ['1º Lugar - R$ 10.000', '2º Lugar - R$ 5.000', '3º Lugar - R$ 2.000'];

    console.log(`📊 [SORTEIO] Iniciando loop para criar ganhadores - total a criar: ${quantidade}`);
    for (let i = 0; i < participantesResult.rows.length && i < quantidade; i++) {
      const participante = participantesResult.rows[i];
      const premio = premios[i] || `${i + 1}º Lugar`;

      console.log(`📊 [SORTEIO] Inserindo ganhador ${i + 1}/${quantidade}: ${participante.nome} (posição: ${i + 1})`);

      try {
        // Inserir ganhador na tabela
        // Usar ON CONFLICT para atualizar em vez de falhar se já existe (por ex: sorteio repetido)
        const insertResult = await databasePool.query(`
          INSERT INTO ganhadores (participante_id, promocao_id, posicao, premio, cancelado)
          VALUES ($1, $2, $3, $4, false)
          ON CONFLICT (participante_id, promocao_id)
          DO UPDATE SET posicao = $3, premio = $4, cancelado = false, sorteado_em = CURRENT_TIMESTAMP
          RETURNING *
        `, [participante.id, promocaoId, i + 1, premio]);

        ganhadores.push({
          id: `winner_${participante.id}`,
          participante_id: participante.id,
          promocao_id: promocaoId,
          nome: participante.nome,
          telefone: participante.telefone,
          cidade: participante.cidade,
          bairro: participante.bairro,
          posicao: i + 1,
          premio: premio,
          sorteado_em: insertResult.rows[0].sorteado_em,
          status: 'sorteado'
        });

        console.log(`✅ [SORTEIO] Ganhador ${i + 1} inserido com sucesso`);
      } catch (insertError) {
        console.error(`❌ [SORTEIO] ERRO ao inserir ganhador ${i + 1}:`, insertError.message);
        console.error('Detalhes do erro:', insertError);
        // Continuar com os próximos ganhadores mesmo se um falhar
      }
    }

    console.log(`📊 [SORTEIO] Sorteio finalizado com ${ganhadores.length} ganhador(es)`);
    return res.status(200).json({
      success: true,
      data: ganhadores,
      total: ganhadores.length,
      message: `Sorteio realizado com sucesso! ${ganhadores.length} ganhador(es) selecionado(s).`
    });

  } catch (error) {
    console.error('Erro ao realizar sorteio:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erro ao realizar sorteio: ' + error.message 
    });
  }
}

// Função para buscar ou cancelar ganhadores
async function processarGanhadores(req, res) {
  const { id: promocaoId } = req.query;

  if (!promocaoId) {
    return res.status(400).json({ message: 'ID da promoção é obrigatório' });
  }

  // Handle DELETE method for canceling draws
  if (req.method === 'DELETE') {
    try {
      // Criar tabela de ganhadores se não existir
      await databasePool.query(`
        CREATE TABLE IF NOT EXISTS ganhadores (
          id SERIAL PRIMARY KEY,
          participante_id INTEGER NOT NULL,
          promocao_id INTEGER NOT NULL,
          posicao INTEGER NOT NULL,
          premio VARCHAR(255),
          sorteado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          cancelado BOOLEAN DEFAULT false,
          UNIQUE(participante_id, promocao_id)
        )
      `);

      // Marcar ganhador como cancelado
      // O promocaoId aqui na verdade é o ID do ganhador (winner_XX ou winner_mock_XX)
      
      // Se for um ganhador mock, não pode ser cancelado pois não existe no banco
      if (promocaoId.startsWith('winner_mock_')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ganhadores mock não podem ser cancelados. Execute um sorteio real primeiro.' 
        });
      }

      let ganhadorId;
      if (promocaoId.startsWith('winner_')) {
        ganhadorId = promocaoId.replace('winner_', '');
      } else {
        ganhadorId = promocaoId;
      }

      // Validar se é um número válido
      if (isNaN(parseInt(ganhadorId))) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID do ganhador inválido: ' + promocaoId
        });
      }

      // Primeiro verificar se a coluna cancelado existe, se não existir, adicionar
      try {
        await databasePool.query(`
          ALTER TABLE ganhadores 
          ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT false
        `);
      } catch (error) {
        console.log('Coluna cancelado já existe ou erro ao criar:', error.message);
      }

      const result = await databasePool.query(`
        UPDATE ganhadores 
        SET cancelado = true 
        WHERE participante_id = $1
      `, [ganhadorId]);

      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Ganhador não encontrado' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: `Sorteio cancelado com sucesso` 
      });
    } catch (error) {
      console.error('Erro ao cancelar sorteio:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao cancelar sorteio: ' + error.message 
      });
    }
  }

  // GET method - buscar ganhadores
  let ganhadores = [];
  
  try {
    // Criar tabela de ganhadores se não existir
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS ganhadores (
        id SERIAL PRIMARY KEY,
        participante_id INTEGER NOT NULL,
        promocao_id INTEGER NOT NULL,
        posicao INTEGER NOT NULL,
        premio VARCHAR(255),
        sorteado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelado BOOLEAN DEFAULT false,
        UNIQUE(participante_id, promocao_id)
      )
    `);

    // Adicionar coluna cancelado se não existir
    try {
      await databasePool.query(`
        ALTER TABLE ganhadores 
        ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT false
      `);
    } catch (error) {
      console.log('Coluna cancelado já existe ou erro ao criar:', error.message);
    }

    // Buscar configuração de número de ganhadores da promoção
    let numeroGanhadores = 3; // padrão
    try {
      const promoConfig = await databasePool.query(`
        SELECT numero_ganhadores FROM promocoes WHERE id = $1
      `, [promocaoId]);
      if (promoConfig.rows.length > 0) {
        numeroGanhadores = parseInt(promoConfig.rows[0].numero_ganhadores, 10) || 3;
        // Validar bounds
        if (numeroGanhadores < 1) numeroGanhadores = 1;
        if (numeroGanhadores > 3) numeroGanhadores = 3;
      }
    } catch (error) {
      console.log('Não foi possível buscar numero_ganhadores, usando padrão 3:', error.message);
    }

    // Primeiro, buscar ganhadores já existentes
    let ganhadoresExistentes = await databasePool.query(`
      SELECT g.*, p.nome, p.telefone, p.cidade, p.bairro, pr.nome as promocao_nome
      FROM ganhadores g
      JOIN participantes p ON g.participante_id = p.id
      LEFT JOIN promocoes pr ON g.promocao_id = pr.id
      WHERE g.promocao_id = $1 AND (g.cancelado = false OR g.cancelado IS NULL)
      ORDER BY g.posicao
    `, [promocaoId]);

    console.log(`📊 [GANHADORES] Promo ${promocaoId} - Ganhadores existentes retornados: ${ganhadoresExistentes.rows.length}`);

    // Se não existem ganhadores, criar alguns baseado nos participantes
    if (ganhadoresExistentes.rows.length === 0) {
      const participantesResult = await databasePool.query(`
        SELECT p.*, pr.nome as promocao_nome
        FROM participantes p
        LEFT JOIN promocoes pr ON p.promocao_id = pr.id
        WHERE p.promocao_id = $1
        ORDER BY p.id
        LIMIT $2
      `, [promocaoId, numeroGanhadores]);

      if (participantesResult.rows.length > 0) {
        // Inserir ganhadores na tabela
        for (let i = 0; i < participantesResult.rows.length; i++) {
          const participante = participantesResult.rows[i];
          const premio = i === 0 ? '1º Lugar - R$ 10.000' : i === 1 ? '2º Lugar - R$ 5.000' : '3º Lugar - R$ 2.000';
          
          await databasePool.query(`
            INSERT INTO ganhadores (participante_id, promocao_id, posicao, premio)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (participante_id, promocao_id) DO NOTHING
          `, [participante.id, participante.promocao_id, i + 1, premio]);
        }
        
        // Buscar os ganhadores recém-criados
        ganhadoresExistentes = await databasePool.query(`
          SELECT g.*, p.nome, p.telefone, p.cidade, p.bairro, pr.nome as promocao_nome
          FROM ganhadores g
          JOIN participantes p ON g.participante_id = p.id
          LEFT JOIN promocoes pr ON g.promocao_id = pr.id
          WHERE g.promocao_id = $1 AND (g.cancelado = false OR g.cancelado IS NULL)
          ORDER BY g.posicao
        `, [promocaoId]);
      }
    }

    // Usar ganhadores da base de dados
    console.log(`📊 [GANHADORES] ganhadoresExistentes.rows.length ANTES do map: ${ganhadoresExistentes.rows.length}`);
    ganhadores = ganhadoresExistentes.rows.map((ganhador, idx) => {
      console.log(`📊 [GANHADORES] Mapeando ganhador ${idx}: ${ganhador.nome} - posicao: ${ganhador.posicao}`);
      return {
        id: `winner_${ganhador.participante_id}`,
        participante_id: ganhador.participante_id,
        promocao_id: ganhador.promocao_id,
        nome: ganhador.nome,
        telefone: ganhador.telefone,
        cidade: ganhador.cidade,
        bairro: ganhador.bairro,
        promocao_nome: ganhador.promocao_nome,
        posicao: ganhador.posicao,
        premio: ganhador.premio,
        sorteado_em: ganhador.sorteado_em,
        status: 'sorteado'
      };
    });
    console.log(`📊 [GANHADORES] ganhadores.length APÓS o map: ${ganhadores.length}`);

  } catch (queryError) {
    console.error('Erro ao buscar ganhadores:', queryError);
    // Se houver erro, retornar array vazio em vez de dados mock
    // Isso evita exibir dados fake quando a promoção não tem ganhadores
    ganhadores = [];
  }

  console.log(`📊 [GANHADORES] Response final - total: ${ganhadores.length}, data array length: ${ganhadores.length}`);
  ganhadores.forEach((g, idx) => {
    console.log(`  ${idx + 1}. ${g.nome} - Posição: ${g.posicao}`);
  });

  return res.status(200).json({
    success: true,
    data: ganhadores,
    total: ganhadores.length,
    promocao_id: parseInt(promocaoId),
    message: `${ganhadores.length} ganhadores encontrados para a promoção ${promocaoId}`
  });
}

// Função para estatísticas
async function obterEstatisticas(req, res) {
  try {
    // Criar tabelas se não existirem
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS ganhadores (
        id SERIAL PRIMARY KEY,
        participante_id INTEGER NOT NULL,
        promocao_id INTEGER NOT NULL,
        posicao INTEGER NOT NULL,
        premio VARCHAR(255),
        sorteado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelado BOOLEAN DEFAULT false,
        UNIQUE(participante_id, promocao_id)
      )
    `);

    // Buscar estatísticas reais do banco de dados
    const [totalGanhadoresResult, promocoesComGanhadoresResult, participantesDisponiveisResult, participantesTotalResult] = await Promise.all([
      // Total de ganhadores não cancelados
      databasePool.query(`
        SELECT COUNT(*) as count 
        FROM ganhadores 
        WHERE cancelado = false OR cancelado IS NULL
      `),
      
      // Promoções com ganhadores
      databasePool.query(`
        SELECT COUNT(DISTINCT promocao_id) as count 
        FROM ganhadores 
        WHERE cancelado = false OR cancelado IS NULL
      `),
      
      // Participantes disponíveis (que não ganharam ainda)
      databasePool.query(`
        SELECT COUNT(*) as count 
        FROM participantes p 
        WHERE p.id NOT IN (
          SELECT DISTINCT participante_id 
          FROM ganhadores g 
          WHERE g.participante_id IS NOT NULL 
          AND (g.cancelado = false OR g.cancelado IS NULL)
        )
      `),
      
      // Total de participantes
      databasePool.query(`SELECT COUNT(*) as count FROM participantes`)
    ]);

    const estatisticas = {
      totalGanhadores: parseInt(totalGanhadoresResult.rows[0]?.count || 0),
      promocoesComGanhadores: parseInt(promocoesComGanhadoresResult.rows[0]?.count || 0),
      participantesDisponiveis: parseInt(participantesDisponiveisResult.rows[0]?.count || 0),
      participantesTotal: parseInt(participantesTotalResult.rows[0]?.count || 0),
      ultima_atualizacao: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: estatisticas,
      message: 'Estatísticas de sorteio carregadas'
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    
    // Retornar dados zerados em caso de erro
    const estatisticasDefault = {
      totalGanhadores: 0,
      promocoesComGanhadores: 0,
      participantesDisponiveis: 0,
      participantesTotal: 0,
      ultima_atualizacao: new Date().toISOString()
    };
    
    return res.status(200).json({
      success: true,
      data: estatisticasDefault,
      message: 'Erro ao carregar estatísticas, exibindo dados padrão'
    });
  }
}

// Função para limpar dados de teste
async function limparDadosTeste(req, res) {
  try {
    // Remover todos os ganhadores de teste
    await databasePool.query(`DELETE FROM ganhadores`);
    
    // Resetar a sequência de IDs
    await databasePool.query(`ALTER SEQUENCE ganhadores_id_seq RESTART WITH 1`);
    
    return res.status(200).json({
      success: true,
      message: 'Dados de teste removidos com sucesso'
    });
  } catch (error) {
    console.error('Erro ao limpar dados de teste:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erro ao limpar dados de teste: ' + error.message 
    });
  }
}

// Função para buscar últimas 5 promoções encerradas com ganhadores
async function buscarPromocoesEncerradas(req, res) {
  try {
    console.log('🔍 Buscando últimas 5 promoções encerradas com ganhadores...');
    
    // Buscar as últimas 5 promoções encerradas que possuem ganhadores
    const queryPromocoes = `
      SELECT DISTINCT 
        p.id,
        p.nome,
        p.status,
        p.data_inicio,
        p.data_fim,
        COUNT(g.id) as total_ganhadores
      FROM promocoes p
      INNER JOIN ganhadores g ON p.id = g.promocao_id
      WHERE p.status = 'encerrada'
        AND (g.cancelado = false OR g.cancelado IS NULL)
      GROUP BY p.id, p.nome, p.status, p.data_inicio, p.data_fim
      ORDER BY p.data_fim DESC, p.id DESC
      LIMIT 5
    `;
    
    const promocoesResult = await databasePool.query(queryPromocoes);
    const promocoesEncerradas = promocoesResult.rows;
    
    console.log(`✅ Encontradas ${promocoesEncerradas.length} promoções encerradas`);
    
    // Para cada promoção, buscar seus ganhadores
    const promocoesComGanhadores = await Promise.all(
      promocoesEncerradas.map(async (promocao) => {
        const queryGanhadores = `
          SELECT 
            g.id as ganhador_id,
            g.participante_id,
            g.sorteado_em,
            g.cancelado,
            pt.nome as nome_ganhador,
            pt.email as email_ganhador,
            pt.telefone as telefone_ganhador,
            pt.cidade as cidade_ganhador,
            pt.bairro as bairro_ganhador
          FROM ganhadores g
          LEFT JOIN participantes pt ON g.participante_id = pt.id
          WHERE g.promocao_id = $1
            AND (g.cancelado = false OR g.cancelado IS NULL)
          ORDER BY g.sorteado_em DESC
        `;
        
        const ganhadoresResult = await databasePool.query(queryGanhadores, [promocao.id]);
        
        return {
          ...promocao,
          ganhadores: ganhadoresResult.rows
        };
      })
    );
    
    console.log(`📊 Retornando ${promocoesComGanhadores.length} promoções com seus ganhadores`);
    
    return res.status(200).json({
      success: true,
      data: promocoesComGanhadores,
      total: promocoesComGanhadores.length,
      message: `${promocoesComGanhadores.length} promoções encerradas encontradas`
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar promoções encerradas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar promoções encerradas: ' + error.message
    });
  }
}

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

  // Rate limiting para sorteios (crítico - operações sensíveis)
  const clientId = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientId, 20, 60000); // 20 requests per minute (muito restritivo)
  
  if (!rateLimit.allowed) {
    res.status(429).json({ 
      message: 'Muitas operações de sorteio. Aguarde antes de tentar novamente.',
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    });
    return;
  }

  databasePool;

  try {
    // Roteamento baseado na URL
    const { action } = req.query;

    if (action === 'participantes') {
      if (req.method !== 'GET') {
        res.status(405).json({ message: 'Método não permitido' });
        return;
      }
      await buscarParticipantesDisponiveis(req, res);
      
    } else if (action === 'sortear') {
      if (req.method !== 'POST') {
        res.status(405).json({ message: 'Método não permitido' });
        return;
      }
      await realizarSorteio(req, res);
      
    } else if (action === 'ganhadores') {
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        res.status(405).json({ message: 'Método não permitido' });
        return;
      }
      await processarGanhadores(req, res);
      
    } else if (action === 'estatisticas') {
      if (req.method !== 'GET') {
        res.status(405).json({ message: 'Método não permitido' });
        return;
      }
      await obterEstatisticas(req, res);
      
    } else if (action === 'limpar') {
      if (req.method !== 'DELETE') {
        res.status(405).json({ message: 'Método não permitido' });
        return;
      }
      await limparDadosTeste(req, res);
      
    } else if (action === 'encerradas') {
      if (req.method !== 'GET') {
        res.status(405).json({ message: 'Método não permitido' });
        return;
      }
      await buscarPromocoesEncerradas(req, res);
      
    } else {
      res.status(400).json({ message: 'Ação não especificada. Use ?action=participantes|sortear|ganhadores|estatisticas|limpar|encerradas' });
    }
    
  } catch (error) {
    console.error('Erro na API sorteio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    try {
          } catch (poolError) {
      console.error('Erro ao fechar pool:', poolError);
    }
  }
};