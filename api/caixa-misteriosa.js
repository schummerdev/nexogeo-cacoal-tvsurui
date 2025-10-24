// Handler consolidado para toda a lógica do Caixa Misteriosa

const { query } = require('../lib/db.js');
const { getAuthenticatedUser } = require('./_handlers/authHelper.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Função de Auditoria ---
const logAuditAction = async (logData) => {
  try {
    await query(`
      INSERT INTO audit_logs (
        user_id, action, table_name, record_id, old_values, new_values,
        ip_address, user_agent, request_method, request_url,
        response_status, execution_time, error_message, additional_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      logData.user_id || null,
      logData.action,
      logData.table_name || 'caixa_misteriosa',
      logData.record_id || null,
      logData.old_values || null,
      logData.new_values || null,
      logData.ip_address || null,
      logData.user_agent || null,
      logData.request_method || 'API',
      logData.request_url || null,
      logData.response_status || 200,
      logData.execution_time || 0,
      logData.error_message || null,
      logData.additional_data || null
    ]);
  } catch (error) {
    console.error('❌ Erro ao inserir log de auditoria:', error);
  }
};

const getClientIP = (req) => {
  return req.ip ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         (req.connection?.socket ? req.connection.socket.remoteAddress : null);
};

// --- Funções Auxiliares ---

/**
 * Normaliza um texto para comparação flexível de palpites
 * Remove: acentos, preposições, artigos, espaços extras
 * Ex: "maquina de lavar" -> "maquina lavar"
 * Ex: "fogão a gás" -> "fogao gas"
 */
function normalizeGuess(text) {
    if (!text) return '';

    // Remove acentos e converte para minúsculas
    let normalized = text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // Remove preposições e artigos comuns em português
    const wordsToRemove = ['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas'];

    // Divide em palavras, remove as palavras da lista e junta novamente
    normalized = normalized
        .split(/\s+/)
        .filter(word => !wordsToRemove.includes(word))
        .join(' ')
        .trim();

    return normalized;
}

// --- Algoritmo de Distância de Levenshtein ---
/**
 * Calcula a distância de Levenshtein entre duas strings.
 * É o número de edições (inserções, exclusões ou substituições) necessárias para transformar uma string na outra.
 */
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}


// --- Funções de Moderação com IA ---

/**
 * Modera o palpite usando IA (Gemini)
 * Verifica: palavrões, conteúdo ofensivo, sexual
 * Corrige: erros ortográficos simples
 * Retorna: { approved: boolean, correctedGuess: string, reason: string, needsReview: boolean }
 */
// 🚫 Lista de palavras ofensivas para fallback quando IA não disponível
const OFFENSIVE_WORDS = [
    'viado', 'viada', 'gay', 'bicha', 'sapatao', 'sapatão',
    'puta', 'puto', 'vadia', 'prostituta', 'vagabunda',
    'merda', 'bosta', 'caralho', 'porra', 'foder', 'foda',
    'cu', 'buceta', 'pinto', 'pau', 'rola', 'piroca',
    'arrombado', 'desgraçado', 'filho da puta', 'fdp',
    'pqp', 'vsf', 'vai se fuder', 'vai tomar no cu'
];

// Função de fallback para moderação simples (quando IA não disponível)
function simpleModeration(guess) {
    const normalizedGuess = guess.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove acentos

    // Verifica palavras ofensivas
    for (const word of OFFENSIVE_WORDS) {
        const normalizedWord = word.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (normalizedGuess.includes(normalizedWord)) {
            console.log('🚫 Moderação SIMPLES bloqueou:', { guess, palavra: word });
            return {
                approved: false,
                correctedGuess: guess,
                reason: 'Conteúdo inapropriado detectado',
                needsReview: true
            };
        }
    }

    return {
        approved: true,
        correctedGuess: guess,
        reason: 'Aprovado por moderação simples',
        needsReview: false
    };
}

async function moderateGuess(guess) {
    try {
        console.log('🤖 [MODERAÇÃO] Iniciando moderação para:', guess);

        // Se não tiver API key, usa moderação simples como fallback
        if (!process.env.GOOGLE_API_KEY) {
            console.log('⚠️ GOOGLE_API_KEY não configurada - usando moderação SIMPLES');
            return simpleModeration(guess);
        }

        // Inicializa Google AI com a SDK correta (@google/generative-ai)
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
Você é um moderador de conteúdo para um jogo de adivinhação de produtos.
Analise o palpite abaixo e responda APENAS com um JSON válido.

PALPITE: "${guess}"

REGRAS DE MODERAÇÃO:
1. REJEITAR se contém:
   - Palavrões ou linguagem ofensiva
   - Conteúdo sexual ou adulto
   - Discurso de ódio ou discriminação
   - Spam ou propaganda

2. MARCAR PARA REVISÃO se:
   - Texto suspeito ou ambíguo
   - Possível tentativa de burlar moderação

3. CORRIGIR AUTOMATICAMENTE erros ortográficos e de digitação:

   EXEMPLOS DE ERROS E CORREÇÕES (PRESTE ATENÇÃO ESPECIAL):
   - Letras trocadas: "geladeiro" → "geladeira", "selular" → "celular"
   - Letras faltando: "geladeir" → "geladeira", "notbook" → "notebook", "arcondicionad" → "ar condicionado"
   - Letras extras: "ar condicionador" → "ar condicionado", "maquinna" → "máquina", "fogaão" → "fogão"
   - Sufixo errado: "condicionador" → "condicionado" (quando referir-se a ar condicionado)
   - Acentuação: "arvore" → "árvore", "maquina" → "máquina", "fogao" → "fogão"
   - Espaçamento CRÍTICO:
     * "arcondicionado" → "ar condicionado" (SEMPRE adicione espaço)
     * "arcondicionad" → "ar condicionado"
     * "ar-condicionado" → "ar condicionado"
     * "maquinadelavar" → "máquina de lavar"
     * "microondas" → "micro-ondas" OU "microondas" (ambos aceitos)
   - Variações: "geladeisa" → "geladeira", "geladeyra" → "geladeira", "condicionado de ar" → "ar condicionado", "frezer" → "freezer"

   ATENÇÃO ESPECIAL: Se encontrar "arcondicionado" (SEM ESPAÇO), SEMPRE corrija para "ar condicionado" (COM ESPAÇO)!

   REGRAS DE CORREÇÃO:
   - Compare com palavras conhecidas de produtos domésticos
   - Corrija letras duplicadas desnecessárias (ex: "maquinna" → "máquina")
   - Adicione letras faltantes óbvias (ex: "geladei" → "geladeira")
   - Remova letras extras óbvias (ex: "condicionador" → "condicionado" quando for ar condicionado)
   - Mantenha o sentido original do palpite
   - Use sempre a grafia correta em português brasileiro
   - Se houver múltiplas interpretações possíveis, escolha o produto mais comum

IMPORTANTE:
- SEMPRE retorne a correção no campo "correctedGuess", mesmo para erros pequenos
- Para produtos compostos (ex: "ar condicionado"), corrija TODOS os componentes
- Se o palpite estiver 80%+ correto mas com erro de digitação, CORRIJA
- Priorize produtos domésticos comuns: geladeira, fogão, máquina de lavar, ar condicionado, etc.

FORMATO DE RESPOSTA (JSON):
{
  "approved": true/false,
  "correctedGuess": "palpite corrigido ou original",
  "reason": "motivo da decisão",
  "needsReview": true/false
}

Retorne APENAS o JSON, sem texto adicional antes ou depois.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Remove markdown code blocks se houver
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const moderation = JSON.parse(text);

        console.log('🤖 [MODERAÇÃO IA]', {
            original: guess,
            corrected: moderation.correctedGuess,
            approved: moderation.approved,
            needsReview: moderation.needsReview,
            reason: moderation.reason
        });

        return moderation;

    } catch (error) {
        console.error('❌ Erro na moderação com IA:', error);
        console.log('🔄 Usando moderação SIMPLES como fallback após erro');
        // Em caso de erro da IA, usa moderação simples como fallback
        return simpleModeration(guess);
    }
}

/**
 * Valida se um palpite está semanticamente correto
 * ORDEM DE VALIDAÇÃO:
 * 1️⃣ Validação local (rápida, sem custo)
 * 2️⃣ Se rejeitar, tenta com IA (para casos de variação)
 */
async function validateGuessWithAI(guess, correctAnswer) {
    try {
        console.log('🎯 [VALIDAÇÃO] Iniciando validação:', { guess, correctAnswer });

        // 1️⃣ PRIMEIRA TENTATIVA: Validação Levenshtein (robusta para typos)
        const levenshteinValidation = validateWithLevenshtein(guess, correctAnswer);
        if (levenshteinValidation.isCorrect) {
            console.log('✅ [VALIDAÇÃO LEVENSHTEIN] Palpite correto!', levenshteinValidation);
            return levenshteinValidation;
        }

        console.log('❌ [VALIDAÇÃO LEVENSHTEIN] Palpite rejeitado. Tentando com IA...');

        // 2️⃣ SEGUNDA TENTATIVA: Validação com IA (apenas se Levenshtein falhou)
        if (!process.env.GOOGLE_API_KEY) {
            console.log('⚠️ GOOGLE_API_KEY não configurada - mantendo resultado Levenshtein');
            return levenshteinValidation; // Retorna o resultado da primeira etapa
        }

        console.log('🤖 [VALIDAÇÃO IA] Chamando Google Gemini...');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
Você é um validador de palpites para um jogo de adivinhação de produtos.
Determine se o PALPITE do usuário se refere ao mesmo PRODUTO CORRETO.

PRODUTO CORRETO: "${correctAnswer}"
PALPITE DO USUÁRIO: "${guess}"

REGRAS DE VALIDAÇÃO:
1. ACEITAR se o palpite se refere claramente ao mesmo produto, mesmo com:
   - Variações de singular/plural (ex: "roupa" vs "roupas")
   - Ordem diferente de palavras (ex: "lavar roupa máquina" vs "máquina de lavar roupa")
   - Artigos ou preposições diferentes (ex: "máquina lavar roupa" vs "máquina de lavar roupa")
   - Palavras extras descritivas (ex: "máquina de lavar roupas elétrica" para "máquina de lavar roupa")
   - Sinônimos comuns (ex: "geladeira" vs "refrigerador")
   - Erros de digitação pequenos já corrigidos

2. REJEITAR se:
   - É um produto completamente diferente (ex: "geladeira" para "fogão")
   - O palpite é muito genérico e não específico (ex: "eletrodoméstico" para "geladeira")
   - Faltam características essenciais do produto

EXEMPLOS DE VALIDAÇÃO:

CORRETO: "máquina de lavar roupa" → PALPITE: "máquina de lavar roupas" → ACEITAR (plural/singular)
CORRETO: "ar condicionado" → PALPITE: "ar condicionado split" → ACEITAR (característica extra)
CORRETO: "geladeira" → PALPITE: "refrigerador" → ACEITAR (sinônimo)
CORRETO: "micro-ondas" → PALPITE: "microondas" → ACEITAR (variação ortográfica)
CORRETO: "freezer" → PALPITE: "frezer" → ACEITAR (erro de digitação comum)
CORRETO: "máquina de lavar roupa" → PALPITE: "lava roupas" → ACEITAR (forma abreviada comum)
CORRETO: "fogão" → PALPITE: "geladeira" → REJEITAR (produto diferente)
CORRETO: "geladeira" → PALPITE: "eletrodoméstico" → REJEITAR (muito genérico)

FORMATO DE RESPOSTA (JSON):
{
  "isCorrect": true/false,
  "confidence": 0.0-1.0,
  "reason": "explicação breve da decisão"
}

Retorne APENAS o JSON, sem texto adicional.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const validation = JSON.parse(text);

        if (validation.isCorrect) {
            console.log('✅ [VALIDAÇÃO IA] Palpite ACEITO pela IA:', { guess, correctAnswer, confidence: validation.confidence, reason: validation.reason });
        } else {
            console.log('❌ [VALIDAÇÃO IA] Palpite REJEITADO pela IA:', { guess, correctAnswer, confidence: validation.confidence, reason: validation.reason });
        }

        return validation;

    } catch (error) {
        console.error('❌ Erro na validação com IA:', error);
        console.log('🔄 Retornando resultado da validação Levenshtein após erro na IA');
        return validateWithLevenshtein(guess, correctAnswer);
    }
}

/**
 * Validação usando distância de Levenshtein para typos.
 */
function validateWithLevenshtein(guess, correctAnswer) {
    const normalizedGuess = normalizeGuess(guess);
    const normalizedAnswer = normalizeGuess(correctAnswer);

    const distance = levenshteinDistance(normalizedGuess, normalizedAnswer);

    // Define um threshold de tolerância para a distância.
    // Para palavras curtas, a tolerância é menor.
    let tolerance = 2;
    if (normalizedAnswer.length <= 5) {
        tolerance = 1;
    } else if (normalizedAnswer.length <= 10) {
        tolerance = 2;
    } else {
        tolerance = 3;
    }

    const isCorrect = distance <= tolerance;

    console.log('📏 [VALIDAÇÃO LEVENSHTEIN]:', {
        guess: normalizedGuess,
        answer: normalizedAnswer,
        distance,
        tolerance,
        isCorrect
    });

    return {
        isCorrect,
        confidence: isCorrect ? 1.0 - (distance / normalizedAnswer.length) : 0.1,
        reason: isCorrect
            ? `Palpite aceito por ter uma semelhança ortográfica alta (distância: ${distance})`
            : `O palpite não é ortograficamente similar à resposta (distância: ${distance})`
    };
}

// --- Funções de Lógica (anteriormente nos controllers) ---

async function getLastFinishedGame(req, res) {
    try {
        // Find the last game with status 'finished'
        const gameResult = await query(`
            SELECT id, product_id, winner_submission_id, ended_at, (SELECT name FROM products WHERE id = product_id) as product_name
            FROM games
            WHERE status = 'finished'
            ORDER BY ended_at DESC
            LIMIT 1
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Nenhum jogo finalizado encontrado.' });
        }

        const lastGame = gameResult.rows[0];
        let winnerData = null;

        if (lastGame.winner_submission_id) {
            const winnerResult = await query(`
                SELECT user_name, user_neighborhood, user_phone
                FROM submissions
                WHERE id = $1
            `, [lastGame.winner_submission_id]);

            if (winnerResult.rows.length > 0) {
                winnerData = winnerResult.rows[0];
            }
        }

        res.status(200).json({
            success: true,
            lastGame: {
                id: lastGame.id,
                productName: lastGame.product_name,
                ended_at: lastGame.ended_at,
                winner: winnerData
            }
        });

    } catch (error) {
        console.error('❌ Erro em getLastFinishedGame:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar último jogo.' });
    }
}

async function getGameById(req, res, gameId) {
    // ROTA PÚBLICA - não requer autenticação
    try {
        // Busca jogo específico por ID
        const gameResult = await query(`
            SELECT 
                g.*, 
                p.id as product_id, p.name as product_name, p.clues, 
                s.id as sponsor_id, s.name as sponsor_name, s.logo_url as sponsor_logo_url, s.facebook_url as sponsor_facebook_url, s.instagram_url as sponsor_instagram_url, s.whatsapp as sponsor_whatsapp, s.address as sponsor_address
            FROM games g
            JOIN products p ON g.product_id = p.id
            JOIN sponsors s ON p.sponsor_id = s.id
            WHERE g.id = $1
            LIMIT 1
        `, [gameId]);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Jogo não encontrado'
            });
        }

        const game = gameResult.rows[0];

        // Busca cidade padrão das configurações da emissora
        let defaultCity = '';
        try {
            const configResult = await query('SELECT cidade, endereco FROM configuracoes_emissora ORDER BY id DESC LIMIT 1');
            if (configResult.rows.length > 0) {
                if (configResult.rows[0].cidade) {
                    defaultCity = configResult.rows[0].cidade;
                } else if (configResult.rows[0].endereco) {
                    const endereco = configResult.rows[0].endereco;
                    const match = endereco.match(/^([^-,]+)/);
                    if (match) {
                        defaultCity = match[1].trim();
                    }
                }
            }
        } catch (err) {
            console.error('Erro ao buscar cidade padrão:', err);
        }

        // Busca as submissões do jogo
        const submissionsResult = await query(`
            SELECT user_name, user_neighborhood, guess, created_at
            FROM submissions
            WHERE game_id = $1
            ORDER BY created_at DESC
        `, [game.id]);

        // Busca o ganhador se existir
        let winner = null;
        if (game.winner_submission_id) {
            const winnerResult = await query(`
                SELECT user_name, user_neighborhood, user_phone, guess, created_at
                FROM submissions
                WHERE id = $1
            `, [game.winner_submission_id]);

            if (winnerResult.rows.length > 0) {
                const winnerData = winnerResult.rows[0];
                winner = {
                    userName: winnerData.user_name,
                    userNeighborhood: winnerData.user_neighborhood,
                    userPhone: winnerData.user_phone,
                    guess: winnerData.guess,
                    timestamp: winnerData.created_at
                };
            }
        }

        const liveGame = {
            id: game.id,
            status: game.status,
            giveaway: {
                product: {
                    id: game.product_id,
                    name: game.product_name,
                    clues: game.clues,
                    sponsor_id: game.sponsor_id
                },
                sponsor: {
                    id: game.sponsor_id,
                    name: game.sponsor_name,
                    logo_url: game.sponsor_logo_url,
                    facebook_url: game.sponsor_facebook_url,
                    instagram_url: game.sponsor_instagram_url,
                    whatsapp: game.sponsor_whatsapp,
                    address: game.sponsor_address
                }
            },
            revealedCluesCount: game.revealed_clues_count,
            submissions: submissionsResult.rows.map(sub => ({
                id: sub.id,
                userName: sub.user_name,
                userNeighborhood: sub.user_neighborhood,
                guess: sub.guess,
                created_at: sub.created_at
            })),
            winner: winner,
            defaultCity: defaultCity
        };

        res.status(200).json(liveGame);
    } catch (error) {
        console.error('❌ Erro em getGameById:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar jogo'
        });
    }
}

async function getLiveGame(req, res) {
    // ROTA PÚBLICA - não requer autenticação
    try {
        console.log('🎮 [getLiveGame] Iniciando busca de jogo ativo...');

        // Busca o jogo ativo (accepting ou closed - NÃO finished)
        // Jogos finished devem ser acessados via /game/{id} se necessário
        const gameResult = await query(`
            SELECT g.*,
                   p.id as product_id, p.name as product_name, p.clues,
                   s.id as sponsor_id, s.name as sponsor_name, s.logo_url as sponsor_logo_url, s.facebook_url as sponsor_facebook_url, s.instagram_url as sponsor_instagram_url, s.whatsapp as sponsor_whatsapp, s.address as sponsor_address
            FROM games g
            JOIN products p ON g.product_id = p.id
            JOIN sponsors s ON p.sponsor_id = s.id
            WHERE g.status IN ('accepting', 'closed')
            ORDER BY g.created_at DESC
            LIMIT 1
        `);

        console.log('🎮 [getLiveGame] Query executada, resultados:', gameResult.rows.length);

        if (gameResult.rows.length === 0) {
            console.log('🎮 [getLiveGame] Nenhum jogo encontrado (404)');
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo ativo encontrado'
            });
        }

        const game = gameResult.rows[0];
        console.log('🎮 [getLiveGame] Jogo encontrado:', {
            id: game.id,
            status: game.status,
            product_name: game.product_name,
            sponsor_name: game.sponsor_name,
            has_clues: !!game.clues
        });

        // Busca cidade padrão das configurações da emissora
        console.log('🎮 [getLiveGame] Buscando cidade padrão...');
        let defaultCity = '';
        try {
            const configResult = await query('SELECT cidade, endereco FROM configuracoes_emissora ORDER BY id DESC LIMIT 1');
            if (configResult.rows.length > 0) {
                if (configResult.rows[0].cidade) {
                    defaultCity = configResult.rows[0].cidade;
                } else if (configResult.rows[0].endereco) {
                    const endereco = configResult.rows[0].endereco;
                    const match = endereco.match(/^([^-,]+)/);
                    if (match) {
                        defaultCity = match[1].trim();
                    }
                }
            }
        } catch (err) {
            console.error('⚠️ [getLiveGame] Erro ao buscar cidade padrão:', err);
        }

        // Busca as submissões do jogo
        console.log('🎮 [getLiveGame] Buscando submissões do jogo', game.id, '...');
        const submissionsResult = await query(`
            SELECT id, user_name, user_neighborhood, guess, created_at
            FROM submissions
            WHERE game_id = $1
            ORDER BY created_at DESC
        `, [game.id]);
        console.log('🎮 [getLiveGame] Submissões encontradas:', submissionsResult.rows.length);

        // Busca o ganhador se existir
        let winner = null;
        if (game.winner_submission_id) {
            console.log('🎮 [getLiveGame] Buscando ganhador (submission_id:', game.winner_submission_id, ')...');
            const winnerResult = await query(`
                SELECT user_name, user_neighborhood, user_phone, guess, created_at
                FROM submissions
                WHERE id = $1
            `, [game.winner_submission_id]);

            if (winnerResult.rows.length > 0) {
                const winnerData = winnerResult.rows[0];
                winner = {
                    userName: winnerData.user_name,
                    userNeighborhood: winnerData.user_neighborhood,
                    userPhone: winnerData.user_phone,
                    guess: winnerData.guess,
                    timestamp: winnerData.created_at
                };
                console.log('🎮 [getLiveGame] Ganhador encontrado:', winner.userName);
            } else {
                console.log('⚠️ [getLiveGame] Ganhador não encontrado para submission_id:', game.winner_submission_id);
            }
        }

        console.log('🎮 [getLiveGame] Montando objeto liveGame...');

        let clues = game.clues;
        if (!clues || !Array.isArray(clues)) {
            console.warn('⚠️ [getLiveGame] Clues inválido ou null, usando array vazio. Valor:', clues);
            clues = [];
        }

        const liveGame = {
            id: game.id,
            status: game.status,
            giveaway: {
                product: {
                    id: game.product_id,
                    name: game.product_name || 'Produto desconhecido',
                    clues: clues,
                    sponsor_id: game.sponsor_id
                },
                sponsor: {
                    id: game.sponsor_id,
                    name: game.sponsor_name || 'Patrocinador desconhecido',
                    logo_url: game.sponsor_logo_url || null,
                    facebook_url: game.sponsor_facebook_url || null,
                    instagram_url: game.sponsor_instagram_url || null,
                    whatsapp: game.sponsor_whatsapp || null,
                    address: game.sponsor_address || null
                }
            },
            revealedCluesCount: game.revealed_clues_count || 0,
            submissions: submissionsResult.rows.map(sub => ({
                id: sub.id,
                userName: sub.user_name,
                userNeighborhood: sub.user_neighborhood,
                guess: sub.guess,
                created_at: sub.created_at
            })),
            winner: winner,
            defaultCity: defaultCity
        };

        console.log('🎮 [getLiveGame] ✅ Retornando jogo:', {
            id: liveGame.id,
            status: liveGame.status,
            submissions_count: liveGame.submissions.length,
            has_winner: !!liveGame.winner
        });
        res.status(200).json(liveGame);
    } catch (error) {
        console.error('❌ [getLiveGame] ERRO FATAL:', error);
        console.error('❌ [getLiveGame] Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar jogo ativo',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

async function submitGuess(req, res) {
    // ROTA PÚBLICA - não requer autenticação
    // Suporta tanto o formato antigo quanto o novo com participantes públicos
    let { userName, userPhone, userNeighborhood, userCity, guess, publicParticipantId, gameId } = req.body; // Adicionado gameId

    // 🔧 FIX: Limpar telefone - manter apenas dígitos
    if (userPhone) {
        userPhone = userPhone.replace(/\D/g, '');
    }

    try {
        // Validação mínima - palpite é obrigatório para ESTA rota
        if (!guess || !guess.trim()) {
            return res.status(400).json({
                success: false,
                message: 'O palpite é obrigatório'
            });
        }

        // Validação de ID de participante ou dados de usuário
        if (!publicParticipantId && (!userName || !userPhone)) {
            return res.status(400).json({
                success: false,
                message: 'ID do participante ou dados de usuário são necessários'
            });
        }

        // 🤖 MODERAÇÃO COM IA
        const moderation = await moderateGuess(guess.trim());

        // Se o palpite foi rejeitado
        if (!moderation.approved) {
            console.log('🚫 Palpite rejeitado pela moderação:', {
                original: guess,
                reason: moderation.reason
            });
            return res.status(400).json({
                success: false,
                message: `Palpite não permitido: ${moderation.reason}`,
                moderation: {
                    approved: false,
                    reason: moderation.reason
                }
            });
        }

        // Usa o palpite corrigido (se houve correção ortográfica)
        const finalGuess = moderation.correctedGuess || guess.trim();
        const needsReview = moderation.needsReview || false;

        if (finalGuess !== guess.trim()) {
            console.log('✏️ Palpite corrigido pela IA:', {
                original: guess.trim(),
                corrected: finalGuess
            });
        }

        // 💥 PONTO CRÍTICO: O gameId DEVE ser fornecido no corpo da requisição
        if (!gameId) {
            console.error('❌ Erro em submitGuess: gameId não foi fornecido no corpo da requisição.');
            return res.status(400).json({
                success: false,
                message: 'Erro ao buscar jogo: ID do jogo não especificado.'
            });
        }

        // Busca o jogo pelo ID fornecido
        const gameResult = await query(`
            SELECT id FROM games
            WHERE id = $1 AND status = 'accepting'
        `, [gameId]);

        if (gameResult.rows.length === 0) {
            console.error(`❌ Erro em submitGuess: Jogo ativo não encontrado com ID: ${gameId}`);
            return res.status(400).json({
                success: false,
                message: 'Jogo não encontrado ou não está aceitando palpites no momento.'
            });
        }

        // O gameId é o mesmo que foi validado
        const validatedGameId = gameResult.rows[0].id;

        // Modo novo: com participante público
        if (publicParticipantId) {
            // Verifica participante e palpites disponíveis
            const participantResult = await query(`
                SELECT id, name, phone, neighborhood, city, extra_guesses,
                (SELECT COUNT(*) FROM submissions
                 WHERE (public_participant_id = $1 OR user_phone = (SELECT phone FROM public_participants WHERE id = $1))
                 AND game_id = $2) as used_guesses
                FROM public_participants WHERE id = $1
            `, [publicParticipantId, validatedGameId]);

            if (participantResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Participante não encontrado'
                });
            }

            const participant = participantResult.rows[0];
            const availableGuesses = 1 + participant.extra_guesses;

            if (participant.used_guesses >= availableGuesses) {
                return res.status(400).json({
                    success: false,
                    message: `Você já usou todos os seus palpites (${availableGuesses})`
                });
            }

            // Insere o palpite do participante público com public_participant_id
            await query(`
                INSERT INTO submissions (
                    game_id, user_name, user_phone, user_neighborhood, user_city, guess, public_participant_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [validatedGameId, participant.name, participant.phone, participant.neighborhood, participant.city, finalGuess, publicParticipantId]);

            console.log('✅ Novo palpite de participante público:', {
                participantId: publicParticipantId,
                name: participant.name,
                originalGuess: guess,
                finalGuess: finalGuess,
                wasCorrected: finalGuess !== guess.trim(),
                needsReview
            });

            // Log de auditoria para palpite público
            await logAuditAction({
                user_id: null,
                action: 'SUBMIT_GUESS',
                table_name: 'submissions',
                record_id: publicParticipantId,
                new_values: { participant: participant.name, guess: finalGuess },
                ip_address: getClientIP(req),
                user_agent: req.headers['user-agent'],
                request_method: req.method,
                request_url: req.originalUrl || req.url,
                additional_data: {
                    game_id: validatedGameId,
                    participant_id: publicParticipantId,
                    participant_name: participant.name,
                    participant_neighborhood: participant.neighborhood,
                    was_corrected: finalGuess !== guess.trim(),
                    original_guess: guess.trim(),
                    final_guess: finalGuess,
                    remaining_guesses: availableGuesses - (participant.used_guesses + 1)
                }
            });

            let responseMessage = 'Palpite enviado com sucesso!';
            if (finalGuess !== guess.trim()) {
                responseMessage = `Palpite corrigido e enviado: "${finalGuess}"`;
            }

            return res.status(201).json({
                success: true,
                message: responseMessage,
                remainingGuesses: availableGuesses - (participant.used_guesses + 1),
                moderation: {
                    wasCorrected: finalGuess !== guess.trim(),
                    originalGuess: guess.trim(),
                    finalGuess: finalGuess
                }
            });
        }

        // Modo legado (sem publicParticipantId) - usado pelo /register
        const existingSubmission = await query(`
            SELECT id FROM submissions WHERE game_id = $1 AND user_phone = $2
        `, [validatedGameId, userPhone]);

        if (existingSubmission.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Você já enviou um palpite para este jogo'
            });
        }

        await query(`
            INSERT INTO submissions (game_id, user_name, user_phone, user_neighborhood, user_city, guess)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [validatedGameId, userName, userPhone, userNeighborhood, userCity, finalGuess]);

        console.log('✅ Novo palpite salvo (modo legado):', {
            userName,
            userPhone,
            originalGuess: guess,
            finalGuess,
            wasCorrected: finalGuess !== guess.trim()
        });

        let responseMessage = 'Palpite enviado com sucesso!';
        if (finalGuess !== guess.trim()) {
            responseMessage = `Palpite corrigido e enviado: "${finalGuess}"`;
        }

        res.status(201).json({
            success: true,
            message: responseMessage,
            moderation: {
                wasCorrected: finalGuess !== guess.trim(),
                originalGuess: guess.trim(),
                finalGuess: finalGuess
            }
        });
    } catch (error) {
        console.error('❌ Erro em submitGuess:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar palpite'
        });
    }
}

// Nova função para registrar participante sem exigir palpite
async function registerParticipant(req, res) {
    let { name, phone, neighborhood, city, referralCode, latitude, longitude } = req.body;

    if (!name || !phone || !neighborhood || !city) {
        return res.status(400).json({ success: false, message: 'Nome, telefone, bairro e cidade são obrigatórios.' });
    }

    // Limpa e valida o telefone
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        return res.status(400).json({ success: false, message: 'Telefone inválido.' });
    }

    try {
        let existingParticipantResult;
        try {
            existingParticipantResult = await query('SELECT * FROM public_participants WHERE phone = $1', [cleanPhone]);
        } catch (dbError) {
            dbError.message = `Erro na etapa de SELECT do participante: ${dbError.message}`;
            throw dbError;
        }

        let participant;
        let message = 'Cadastro realizado com sucesso!';

        if (existingParticipantResult.rows.length > 0) {
            // Atualiza participante existente
            participant = existingParticipantResult.rows[0];
            try {
                const updateResult = await query(
                    'UPDATE public_participants SET name = $1, neighborhood = $2, city = $3, latitude = $4, longitude = $5 WHERE id = $6 RETURNING id',
                    [name, neighborhood, city, latitude, longitude, participant.id]
                );
                if (!updateResult.rows || updateResult.rows.length === 0) {
                    throw new Error('Falha ao atualizar o participante. O ID não foi retornado pelo banco de dados.');
                }
                participant.id = updateResult.rows[0].id;
            } catch (dbError) {
                dbError.message = `Erro na etapa de UPDATE do participante: ${dbError.message}`;
                throw dbError;
            }
            message = `Olá ${name}, bem-vindo novamente! Seus dados foram atualizados.`;
            console.log('🔄 Participante atualizado:', { id: participant.id, name, latitude, longitude });

        } else {
            // Cria novo participante
            const ownReferralCode = `cm-${cleanPhone.slice(-4)}${Math.random().toString(36).substring(2, 6)}`;
            try {
                const insertResult = await query(
                    'INSERT INTO public_participants (name, phone, neighborhood, city, own_referral_code, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                    [name, cleanPhone, neighborhood, city, ownReferralCode, latitude, longitude]
                );
                participant = insertResult.rows[0];
            } catch (dbError) {
                dbError.message = `Erro na etapa de INSERT do participante: ${dbError.message}`;
                throw dbError;
            }
            console.log('✅ Novo participante criado:', { id: participant.id, name });

            // Se usou um código de referência, dá um palpite extra para quem indicou
            if (referralCode) {
                try {
                    console.log(`🔗 Tentando aplicar bônus de referência para o código: ${referralCode}`);
                    const referrerResult = await query(
                        'UPDATE public_participants SET extra_guesses = extra_guesses + 1 WHERE own_referral_code = $1 RETURNING id, name, extra_guesses',
                        [referralCode]
                    );
                    if (!referrerResult.rows || referrerResult.rows.length === 0) {
                        console.warn('⚠️ Referrer não encontrado ou não atualizado.');
                    } else {
                        console.log(`🎉 Bônus aplicado para: ${referrerResult.rows[0].name} (Total de palpites extras: ${referrerResult.rows[0].extra_guesses})`);
                    }
                } catch (dbError) {
                    console.warn(`⚠️ Falha ao aplicar bônus de referência: ${dbError.message}`);
                }
            }
        }

        // Gera URL de compartilhamento para o participante
        const protocol = req?.protocol || 'https';
        const host = req?.headers?.host || process.env.NEXT_PUBLIC_BASE_URL || 'nexogeo.vercel.app';
        const shareUrl = `${protocol}://${host}/caixa-misteriosa-pub?user=${cleanPhone}-1`;

        res.status(200).json({
            success: true,
            message,
            participantId: participant.id,
            shareUrl
        });

    } catch (error) {
        console.error('❌ Erro em registerParticipant:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno ao processar cadastro.',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

// Nova função para buscar participante por ID
async function getParticipantById(req, res, participantId) {
    try {
        const result = await query('SELECT id, name, phone, neighborhood, city, extra_guesses, own_referral_code FROM public_participants WHERE id = $1', [participantId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Participante não encontrado.' });
        }
        res.status(200).json({ success: true, participant: result.rows[0] });
    } catch (error) {
        console.error('❌ Erro em getParticipantById:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar participante.', error: error.message });
    }
}

// Nova função para buscar palpites de um participante em um jogo específico
async function getSubmissionsByParticipantAndGame(req, res) {
    const { gameId, participantId } = req.query;

    if (!gameId || !participantId) {
        return res.status(400).json({ success: false, message: 'Game ID e Participant ID são obrigatórios.' });
    }

    try {
        const result = await query(`
            SELECT id, user_name, user_neighborhood, guess, created_at, is_correct
            FROM submissions
            WHERE game_id = $1 AND public_participant_id = $2
            ORDER BY created_at DESC
        `, [gameId, participantId]);

        res.status(200).json({ success: true, submissions: result.rows });
    } catch (error) {
        console.error('❌ Erro em getSubmissionsByParticipantAndGame:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar palpites.', error: error.message });
    }
}

// Nova função para buscar referências de um participante
async function getReferralsByParticipant(req, res, participantId) {
    try {
        const result = await query(`
            SELECT id, name, phone, created_at as registeredAt,
                   (SELECT COUNT(*) FROM submissions WHERE public_participant_id = public_participants.id) > 0 as isRegistered
            FROM public_participants
            WHERE referred_by_id = $1
            ORDER BY created_at DESC
        `, [participantId]);

        res.status(200).json({ success: true, referrals: result.rows });
    } catch (error) {
        console.error('❌ Erro em getReferralsByParticipant:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar referências.', error: error.message });
    }
}

/**
 * Endpoint público para validar palpites com IA
 * POST /api/caixa-misteriosa/validate-guess
 */
async function validateGuessEndpoint(req, res) {
    // ROTA PÚBLICA - usada pelo frontend para validação em tempo real
    const { guess, correctAnswer } = req.body;

    try {
        if (!guess || !correctAnswer) {
            return res.status(400).json({
                success: false,
                message: 'Palpite e resposta correta são obrigatórios'
            });
        }

        const validation = await validateGuessWithAI(guess, correctAnswer);

        return res.status(200).json({
            success: true,
            ...validation
        });

    } catch (error) {
        console.error('❌ Erro no endpoint de validação:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao validar palpite',
            error: error.message
        });
    }
}

async function startGame(req, res) {
    const { productId } = req.body;

    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);
        console.log('🎮 [START_GAME] Iniciando jogo:', { productId, type: typeof productId });

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID é obrigatório'
            });
        }

        // Verifica se já existe um jogo ativo
        const activeGame = await query(`
            SELECT id FROM games
            WHERE status IN ('accepting', 'closed')
        `);

        if (activeGame.rows.length > 0) {
            console.log('⚠️ [START_GAME] Jogo ativo encontrado:', activeGame.rows[0]);
            return res.status(400).json({
                success: false,
                message: 'Já existe um jogo ativo. Finalize-o antes de iniciar um novo.'
            });
        }

        // Verifica se o produto existe
        console.log('🔍 [START_GAME] Buscando produto no banco:', productId);
        const productResult = await query(`
            SELECT p.*, s.name as sponsor_name
            FROM products p
            JOIN sponsors s ON p.sponsor_id = s.id
            WHERE p.id = $1
        `, [productId]);

        console.log('📊 [START_GAME] Produtos encontrados:', productResult.rows.length);

        if (productResult.rows.length === 0) {
            // Buscar todos produtos para debug
            const allProducts = await query(`SELECT id, name FROM products LIMIT 10`);
            console.log('🔍 [START_GAME] Produtos disponíveis no banco:', allProducts.rows);

            return res.status(404).json({
                success: false,
                message: `Produto não encontrado com ID: ${productId}`,
                availableProducts: allProducts.rows
            });
        }

        const product = productResult.rows[0];

        // Verifica se o produto tem 5 dicas
        if (!product.clues || product.clues.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'O produto deve ter exatamente 5 dicas para iniciar o jogo'
            });
        }

        // Cria o novo jogo e libera primeira dica automaticamente
        const gameResult = await query(`
            INSERT INTO games (product_id, status, revealed_clues_count)
            VALUES ($1, 'accepting', 1)
            RETURNING id
        `, [productId]);

        const gameId = gameResult.rows[0].id;

        console.log('✅ Novo jogo iniciado com primeira dica liberada:', { gameId, productId, productName: product.name });

        // Log de auditoria
        const user = await getAuthenticatedUser(req, ['admin']);
        await logAuditAction({
            user_id: user.id,
            action: 'START_GAME',
            table_name: 'games',
            record_id: gameId,
            new_values: { productId, productName: product.name, sponsorName: product.sponsor_name },
            ip_address: getClientIP(req),
            user_agent: req.headers['user-agent'],
            request_method: req.method,
            request_url: req.originalUrl || req.url,
            additional_data: { product: product.name, sponsor: product.sponsor_name, initial_clues: 1 }
        });

        res.status(201).json({
            success: true,
            message: `Jogo iniciado com sucesso! Produto: ${product.name}. Primeira dica liberada automaticamente.`,
            gameId: gameId
        });
    } catch (error) {
        console.error('❌ Erro em startGame:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao iniciar jogo',
            error: error.message, // Adicionado para debug
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined // Adicionado para debug
        });
    }
}

async function generateCluesWithAI(req, res) {
    const { productName, customPrompt } = req.body;

    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);

        if (!productName) {
            return res.status(400).json({
                success: false,
                message: 'Nome do produto é obrigatório'
            });
        }

        // 🔥 VERIFICAÇÃO CRÍTICA: API Key configurada?
        if (!process.env.GOOGLE_API_KEY) {
            console.error('❌ GOOGLE_API_KEY NÃO CONFIGURADA NO AMBIENTE!');
            console.error('⚠️ Configure a variável de ambiente GOOGLE_API_KEY no Vercel');

            return res.status(500).json({
                success: false,
                clues: [],
                message: 'Google API Key não configurada. Configure GOOGLE_API_KEY nas variáveis de ambiente.'
            });
        }

        console.log('✅ Google API Key encontrada:', process.env.GOOGLE_API_KEY.substring(0, 10) + '...');

        // Inicializa Google AI com a SDK oficial (@google/generative-ai)
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

        // 🔥 ESTRATÉGIA: Tenta múltiplos modelos até encontrar um disponível
        const modelsToTry = [
            'gemini-2.0-flash-exp',      // Mais recente (experimental)
            'gemini-2.0-flash',          // Modelo 2.0 estável
            'gemini-1.5-flash-latest',   // Modelo 1.5 mais recente
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
            'gemini-1.5-pro',
            'gemini-1.0-pro-latest',
            'gemini-1.0-pro',
            'gemini-pro'
        ];

        let model = null;
        let modelName = null;

        console.log('🔍 Tentando encontrar modelo Google AI disponível...');

        for (const testModel of modelsToTry) {
            try {
                console.log(`📡 Testando modelo: ${testModel}`);
                const testInstance = genAI.getGenerativeModel({
                    model: testModel,
                    generationConfig: {
                        temperature: 0.9,
                        topK: 40,
                        topP: 0.95,
                    }
                });

                // Testa com um prompt simples
                const testResult = await testInstance.generateContent('Test');
                await testResult.response;

                // Se chegou aqui, modelo funciona!
                model = testInstance;
                modelName = testModel;
                console.log(`✅ Modelo "${modelName}" FUNCIONA e será usado!`);
                break;
            } catch (testError) {
                console.log(`❌ Modelo "${testModel}" não disponível: ${testError.message}`);
                continue;
            }
        }

        if (!model) {
            throw new Error('Nenhum modelo Google AI está disponível para esta API key. Verifique se a chave está correta e tem acesso aos modelos Gemini.');
        }

        // Adiciona timestamp para garantir dicas diferentes a cada clique
        const timestamp = Date.now();

        // 🔥 PROMPT BASE (sempre usado) - parâmetros técnicos invisíveis ao usuário
        const basePrompt = `Você é um especialista em criar dicas para jogos de adivinhação.

PRODUTO: "${productName}"

REGRAS OBRIGATÓRIAS:
- Gere EXATAMENTE 5 dicas
- Máximo 4 palavras por dica
- NÃO mencione o nome/modelo exato
- Progressão: fácil → difícil
- Dicas ESPECÍFICAS para "${productName}", não genéricas
- Evite: "produto popular", "uso diário", "marca conhecida"

ESTRUTURA:
1. Categoria (ex: "Eletrodoméstico grande")
2. Função principal (ex: "Refrigera alimentos")
3. Característica física (ex: "Porta dupla")
4. Detalhe técnico (ex: "Sistema frost free")
5. Específico (ex: "Consumo energético variável")
`;

        // 🔥 COMPLEMENTO: Prompt customizado do usuário como contexto adicional
        const complemento = customPrompt ? `

CONTEXTO ADICIONAL:
${customPrompt}

Use as informações acima como guia extra, mantendo sempre as regras obrigatórias.
` : '';

        const finalPrompt = basePrompt + complemento + `

Req #${timestamp} - Varie as dicas a cada vez.

RESPOSTA (JSON puro, sem texto):
["dica1", "dica2", "dica3", "dica4", "dica5"]

Gere agora:`;

        console.log('═══════════════════════════════════════════════');
        console.log('🤖 GOOGLE AI - GERANDO DICAS');
        console.log('Modelo:', modelName);
        console.log('Produto:', productName);
        console.log('Contexto adicional?', customPrompt ? 'SIM' : 'NÃO');
        console.log('Timestamp:', timestamp);
        console.log('═══════════════════════════════════════════════');

        let result, response, text;

        try {
            console.log('📡 Chamando Google AI...');
            result = await model.generateContent(finalPrompt);

            console.log('📥 Recebendo resposta...');
            response = await result.response;
            text = response.text();

            console.log('✅ Google AI respondeu com SUCESSO!');
            console.log('📨 Resposta (primeiros 300 chars):', text.substring(0, 300));
            console.log('📊 Tamanho total da resposta:', text.length, 'caracteres');
        } catch (aiError) {
            console.error('═══════════════════════════════════════════════');
            console.error('❌ ERRO NA CHAMADA DA GOOGLE AI');
            console.error('Tipo:', aiError.name);
            console.error('Mensagem:', aiError.message);
            console.error('Stack:', aiError.stack);
            console.error('═══════════════════════════════════════════════');
            throw aiError; // Re-lança para cair no catch externo
        }

        // Tenta extrair JSON da resposta
        let clues;
        try {
            // Remove possíveis marcações de código e espaços
            let cleanText = text.replace(/```json|```/g, '').trim();

            // Tenta encontrar array JSON na resposta
            const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                cleanText = arrayMatch[0];
            }

            clues = JSON.parse(cleanText);

            if (!Array.isArray(clues) || clues.length !== 5) {
                throw new Error(`Formato inválido - esperado array com 5 itens, recebido: ${clues?.length || 0}`);
            }

            console.log('✅ Dicas parseadas com sucesso:', clues);
        } catch (parseError) {
            console.error('❌ Erro ao parsear resposta da IA:', parseError);
            console.error('📄 Texto que falhou:', text);

            // Fallback com dicas mais específicas baseadas no nome do produto
            clues = [
                `Item tipo ${productName}`,
                `Usado para ${productName.toLowerCase()}`,
                `Características de ${productName}`,
                `Popular no mercado`,
                `Produto: ${productName}`
            ];

            console.log('⚠️ Usando dicas fallback:', clues);
        }

        console.log('✅ Dicas finais geradas para:', productName);

        res.status(200).json({
            success: true,
            clues: clues,
            message: 'Dicas geradas com sucesso pela IA'
        });

    } catch (error) {
        console.error('═══════════════════════════════════════════════');
        console.error('❌ ERRO FATAL em generateCluesWithAI');
        console.error('Tipo de erro:', error.name);
        console.error('Mensagem de erro:', error.message);
        console.error('Stack trace completo:', error.stack);
        console.error('Produto:', productName);
        console.error('═══════════════════════════════════════════════');

        // Se for erro de autenticação, retornar 401
        if (error.message && (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização'))) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        // 🔥 RETORNA ERRO ao invés de fallback genérico
        // Isso permite que o frontend mostre mensagem clara ao usuário
        console.error('⚠️ Retornando erro ao frontend - dicas NÃO geradas');

        res.status(500).json({
            success: false,
            clues: [],
            message: `Erro ao gerar dicas com IA: ${error.message || 'Erro desconhecido'}. Por favor, preencha as dicas manualmente ou tente novamente mais tarde.`,
            errorDetails: {
                type: error.name,
                message: error.message
            }
        });
    }
}

async function revealClue(req, res) {
    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);
        // Busca o jogo ativo
        const gameResult = await query(`
            SELECT g.*, p.clues
            FROM games g
            JOIN products p ON g.product_id = p.id
            WHERE g.status IN ('accepting', 'closed')
            ORDER BY g.created_at DESC
            LIMIT 1
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo ativo encontrado'
            });
        }

        const game = gameResult.rows[0];

        // Verifica se ainda há dicas para revelar
        if (game.revealed_clues_count >= 5) {
            return res.status(400).json({
                success: false,
                message: 'Todas as dicas já foram reveladas'
            });
        }

        // Incrementa o contador de dicas reveladas
        await query(`
            UPDATE games
            SET revealed_clues_count = revealed_clues_count + 1
            WHERE id = $1
        `, [game.id]);

        const newCount = game.revealed_clues_count + 1;
        console.log('✅ Dica revelada:', { gameId: game.id, newCount });

        // Log de auditoria
        const user = await getAuthenticatedUser(req, ['admin']);
        await logAuditAction({
            user_id: user.id,
            action: 'REVEAL_CLUE',
            table_name: 'games',
            record_id: game.id,
            old_values: { revealed_clues_count: game.revealed_clues_count },
            new_values: { revealed_clues_count: newCount },
            ip_address: getClientIP(req),
            user_agent: req.headers['user-agent'],
            request_method: req.method,
            request_url: req.originalUrl || req.url,
            additional_data: { clue_number: newCount, total_clues: 5 }
        });

        res.status(200).json({
            success: true,
            message: `Dica ${newCount} revelada com sucesso`,
            revealedCluesCount: newCount
        });
    } catch (error) {
        console.error('❌ Erro em revealClue:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao revelar dica'
        });
    }
}

async function endSubmissions(req, res) {
    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);

        // Busca o jogo que aceita palpites
        const gameResult = await query(`
            SELECT id FROM games
            WHERE status = 'accepting'
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo aceitando palpites encontrado'
            });
        }

        const gameId = gameResult.rows[0].id;

        // Atualiza o status para 'closed'
        await query(`
            UPDATE games
            SET status = 'closed'
            WHERE id = $1
        `, [gameId]);

        console.log('✅ Palpites encerrados:', { gameId });

        // Log de auditoria
        const user = await getAuthenticatedUser(req, ['admin']);
        await logAuditAction({
            user_id: user.id,
            action: 'END_SUBMISSIONS',
            table_name: 'games',
            record_id: gameId,
            old_values: { status: 'accepting' },
            new_values: { status: 'closed' },
            ip_address: getClientIP(req),
            user_agent: req.headers['user-agent'],
            request_method: req.method,
            request_url: req.originalUrl || req.url,
            additional_data: { action: 'closed_submissions' }
        });

        res.status(200).json({
            success: true,
            message: 'Palpites encerrados com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro em endSubmissions:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao encerrar palpites'
        });
    }
}

async function drawWinner(req, res) {
    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);
        // Busca o jogo fechado (closed)
        const gameResult = await query(`
            SELECT g.id, pr.name as product_name
            FROM games g
            JOIN products pr ON g.product_id = pr.id
            WHERE g.status = 'closed'
            ORDER BY g.created_at DESC
            LIMIT 1
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo fechado encontrado para sortear ganhador'
            });
        }

        const gameId = gameResult.rows[0].id;
        const productName = gameResult.rows[0].product_name;

        console.log('🎯 [SORTEIO] Produto correto:', productName);

        // Buscar TODOS os palpites para validação
        const allSubmissionsResult = await query(`
            SELECT s.id, s.user_name, s.guess, s.user_phone, s.public_participant_id,
                   pp.neighborhood
            FROM submissions s
            LEFT JOIN public_participants pp ON s.public_participant_id = pp.id
            WHERE s.game_id = $1
        `, [gameId]);

        console.log('🎯 [SORTEIO] Total de palpites enviados:', allSubmissionsResult.rows.length);
        console.log('🤖 [SORTEIO] Iniciando validação avançada (local + IA) para cada palpite...');

        // 🔥 LÓGICA DE VALIDAÇÃO AVANÇADA
        const correctSubmissions = [];
        for (const sub of allSubmissionsResult.rows) {
            // Usa a função de validação completa (local + IA se necessário)
            const validation = await validateGuessWithAI(sub.guess, productName);
            if (validation.isCorrect) {
                correctSubmissions.push(sub);
                console.log(`✅ Palpite ACEITO: "${sub.guess}" (Razão: ${validation.reason})`);
            } else {
                console.log(`❌ Palpite REJEITADO: "${sub.guess}" (Razão: ${validation.reason})`);
            }
        }

        console.log('🎯 [SORTEIO] Total de palpites corretos (após validação completa):', correctSubmissions.length);

        // Se ninguém acertou, retorna erro com opção de sortear entre todos
        if (correctSubmissions.length === 0) {
            const totalSubs = allSubmissionsResult.rows.length;
            console.log('⚠️ [SORTEIO] Ninguém acertou! Total de participantes:', totalSubs);

            return res.status(400).json({
                success: false,
                message: 'Nenhum palpite correto encontrado. Ninguém acertou o produto!',
                totalSubmissions: totalSubs,
                correctSubmissions: 0,
                canDrawFromAll: totalSubs > 0  // Flag para indicar que pode sortear entre todos
            });
        }

        // Sorteia um ganhador aleatório ENTRE OS QUE ACERTARAM
        const randomIndex = Math.floor(Math.random() * correctSubmissions.length);
        const winner = correctSubmissions[randomIndex];

        // Atualiza o jogo com o ganhador e finaliza
        await query(`
            UPDATE games
            SET status = 'finished', winner_submission_id = $1, ended_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [winner.id, gameId]);

        console.log('✅ Ganhador sorteado:', {
            gameId,
            winnerId: winner.id,
            winnerName: winner.user_name,
            winnerGuess: winner.guess,
            productName,
            totalCorrect: correctSubmissions.length
        });

        // Log de auditoria
        const user = await getAuthenticatedUser(req, ['admin']);
        await logAuditAction({
            user_id: user.id,
            action: 'DRAW_WINNER',
            table_name: 'games',
            record_id: gameId,
            new_values: { winner_id: winner.id, winner_name: winner.user_name, winner_guess: winner.guess },
            ip_address: getClientIP(req),
            user_agent: req.headers['user-agent'],
            request_method: req.method,
            request_url: req.originalUrl || req.url,
            additional_data: {
                product: productName,
                total_correct: correctSubmissions.length,
                winner_neighborhood: winner.neighborhood
            }
        });

        res.status(200).json({
            success: true,
            message: 'Ganhador sorteado com sucesso entre os que acertaram!',
            winner: {
                userName: winner.user_name,
                guess: winner.guess,
                neighborhood: winner.neighborhood || 'Não informado'
            }
        });
    } catch (error) {
        console.error('❌ Erro em drawWinner:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao sortear ganhador'
        });
    }
}

async function drawWinnerFromAll(req, res) {
    // NOVA FUNÇÃO: Sorteia entre TODOS participantes (quando ninguém acertou)
    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);
        console.log('🎲 [SORTEIO GERAL] Sorteando entre TODOS os participantes...');

        // Busca o jogo fechado (closed)
        const gameResult = await query(`
            SELECT g.id, pr.name as product_name
            FROM games g
            JOIN products pr ON g.product_id = pr.id
            WHERE g.status = 'closed'
            ORDER BY g.created_at DESC
            LIMIT 1
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo fechado encontrado para sortear ganhador'
            });
        }

        const gameId = gameResult.rows[0].id;
        const productName = gameResult.rows[0].product_name;

        // Buscar TODOS os palpites
        const allSubmissionsResult = await query(`
            SELECT s.id, s.user_name, s.guess, s.user_phone, s.public_participant_id,
                   pp.neighborhood
            FROM submissions s
            LEFT JOIN public_participants pp ON s.public_participant_id = pp.id
            WHERE s.game_id = $1
        `, [gameId]);

        console.log('🎲 [SORTEIO GERAL] Total de participantes:', allSubmissionsResult.rows.length);

        if (allSubmissionsResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum participante encontrado para sortear!'
            });
        }

        // Sorteia um ganhador aleatório ENTRE TODOS
        const allSubmissions = allSubmissionsResult.rows;
        const randomIndex = Math.floor(Math.random() * allSubmissions.length);
        const winner = allSubmissions[randomIndex];

        // Atualiza o jogo com o ganhador e finaliza
        await query(`
            UPDATE games
            SET status = 'finished', winner_submission_id = $1, ended_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [winner.id, gameId]);

        console.log('✅ [SORTEIO GERAL] Ganhador sorteado:', {
            gameId,
            winnerId: winner.id,
            winnerName: winner.user_name,
            winnerGuess: winner.guess,
            productName,
            totalParticipants: allSubmissions.length
        });

        // Log de auditoria
        const user = await getAuthenticatedUser(req, ['admin']);
        await logAuditAction({
            user_id: user.id,
            action: 'DRAW_WINNER_ALL',
            table_name: 'games',
            record_id: gameId,
            new_values: { winner_id: winner.id, winner_name: winner.user_name, winner_guess: winner.guess },
            ip_address: getClientIP(req),
            user_agent: req.headers['user-agent'],
            request_method: req.method,
            request_url: req.originalUrl || req.url,
            additional_data: {
                product: productName,
                total_participants: allSubmissions.length,
                was_random_draw: true,
                winner_neighborhood: winner.neighborhood
            }
        });

        res.status(200).json({
            success: true,
            message: `Ganhador sorteado entre TODOS os ${allSubmissions.length} participantes!`,
            winner: {
                userName: winner.user_name,
                guess: winner.guess,
                neighborhood: winner.neighborhood || 'Não informado'
            },
            wasRandomDraw: true
        });
    } catch (error) {
        console.error('❌ Erro em drawWinnerFromAll:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao sortear ganhador'
        });
    }
}

async function resetGame(req, res) {
    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);
        console.log('🔄 [RESET] Iniciando reset do jogo...');

        // Busca jogos ativos ou fechados
        const gameResult = await query(`
            SELECT id FROM games
            WHERE status IN ('accepting', 'closed', 'finished')
            ORDER BY created_at DESC
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo encontrado para resetar'
            });
        }

        // Remove todas as submissões dos jogos
        for (const game of gameResult.rows) {
            await query(`DELETE FROM submissions WHERE game_id = $1`, [game.id]);
        }

        // Remove os jogos
        await query(`
            DELETE FROM games
            WHERE status IN ('accepting', 'closed', 'finished')
        `);

        console.log('✅ [RESET] Jogos removidos:', { count: gameResult.rows.length });

        // 🔥 RESET: Define saldo de 1 palpite (base) para todos os participantes
        // extra_guesses = 0 significa que terão 1 palpite total (1 base + 0 extras)
        const updateResult = await query(`
            UPDATE public_participants
            SET extra_guesses = 0
            RETURNING id, name, extra_guesses
        `);

        console.log('✅ [RESET] Saldo resetado para 1 palpite:', {
            totalParticipants: updateResult.rows.length,
            participants: updateResult.rows.map(p => ({ id: p.id, name: p.name, totalGuesses: 1 + p.extra_guesses }))
        });

        // Log de auditoria
        const user = await getAuthenticatedUser(req, ['admin']);
        await logAuditAction({
            user_id: user.id,
            action: 'RESET_GAME',
            table_name: 'games',
            record_id: null,
            new_values: { games_deleted: gameResult.rows.length, participants_reset: updateResult.rows.length },
            ip_address: getClientIP(req),
            user_agent: req.headers['user-agent'],
            request_method: req.method,
            request_url: req.originalUrl || req.url,
            additional_data: {
                games_removed: gameResult.rows.length,
                participants_updated: updateResult.rows.length,
                reset_type: 'full_reset'
            }
        });

        res.status(200).json({
            success: true,
            message: `Jogo resetado! Todos os ${updateResult.rows.length} participante(s) agora têm 1 palpite disponível.`,
            participantsUpdated: updateResult.rows.length
        });
    } catch (error) {
        console.error('❌ Erro em resetGame:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao resetar jogo'
        });
    }
}

async function getSponsors(req, res) {
    try {
        console.log('🏢 [getSponsors] Iniciando busca de patrocinadores...');

        const result = await query(`
            SELECT id, name, logo_url, facebook_url, instagram_url, whatsapp, address, created_at
            FROM sponsors
            ORDER BY created_at DESC
        `);

        console.log('🏢 [getSponsors] Query executada, resultados:', result.rows.length);

        if (result.rows.length === 0) {
            console.log('⚠️ [getSponsors] NENHUM PATROCINADOR ENCONTRADO NO BANCO!');
            return res.status(200).json([]);
        }

        const sponsors = result.rows.map(sponsor => {
            // 🔒 PROTEÇÃO: Garante que created_at seja um Date válido
            let createdAtText = 'data desconhecida';
            try {
                if (sponsor.created_at) {
                    const date = new Date(sponsor.created_at);
                    if (!isNaN(date.getTime())) {
                        createdAtText = date.toLocaleDateString('pt-BR');
                    }
                }
            } catch (e) {
                console.warn('⚠️ [getSponsors] Erro ao formatar data do sponsor', sponsor.id, ':', e.message);
            }

            return {
                id: sponsor.id,
                name: sponsor.name,
                logo_url: sponsor.logo_url,
                facebook_url: sponsor.facebook_url,
                instagram_url: sponsor.instagram_url,
                whatsapp: sponsor.whatsapp,
                address: sponsor.address,
                description: `Patrocinador cadastrado em ${createdAtText}`
            };
        });

        console.log('🏢 [getSponsors] ✅ Retornando', sponsors.length, 'patrocinadores:', sponsors.map(s => s.name).join(', '));
        res.status(200).json(sponsors);
    } catch (error) {
        console.error('❌ [getSponsors] ERRO FATAL:', error);
        console.error('❌ [getSponsors] Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar patrocinadores',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

async function getProducts(req, res) {
    const sponsorId = req.query.sponsorId || (req.originalPath && req.originalPath.split('/')[2]); // Extrai sponsor ID da URL
    console.log('🔍 getProducts - originalPath:', req.originalPath, 'sponsorId:', sponsorId);

    try {
        let queryText = `
            SELECT id, sponsor_id, name, clues, created_at
            FROM products
        `;
        let queryParams = [];

        // Filtra por sponsor_id se fornecido
        if (sponsorId) {
            queryText += ` WHERE sponsor_id = $1`;
            queryParams.push(sponsorId);
        }

        queryText += ` ORDER BY created_at DESC`;

        const result = await query(queryText, queryParams);

        const products = result.rows.map(product => ({
            id: product.id,
            sponsor_id: product.sponsor_id,
            name: product.name,
            clues: product.clues || []
        }));

        res.status(200).json(products);
    } catch (error) {
        console.error('❌ Erro em getProducts:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar produtos'
        });
    }
}

// --- Funções CRUD para Patrocinadores ---

async function createSponsor(req, res) {
    const { name, logo_url, facebook_url, instagram_url, whatsapp, address } = req.body;

    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Nome do patrocinador é obrigatório'
            });
        }

        const result = await query(`
            INSERT INTO sponsors (name, logo_url, facebook_url, instagram_url, whatsapp, address)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, logo_url, facebook_url, instagram_url, whatsapp, address, created_at
        `, [name, logo_url || null, facebook_url || null, instagram_url || null, whatsapp || null, address || null]);

        const sponsor = result.rows[0];
        console.log('✅ Patrocinador criado:', sponsor);

        // Log de auditoria
        const user = await getAuthenticatedUser(req, ['admin']);
        await logAuditAction({
            user_id: user.id,
            action: 'CREATE_SPONSOR',
            table_name: 'sponsors',
            record_id: sponsor.id,
            new_values: { name, logo_url, facebook_url, instagram_url, whatsapp, address },
            ip_address: getClientIP(req),
            user_agent: req.headers['user-agent'],
            request_method: req.method,
            request_url: req.originalUrl || req.url,
            additional_data: { sponsor_name: sponsor.name }
        });

        res.status(201).json({
            success: true,
            message: 'Patrocinador criado com sucesso',
            sponsor: {
                id: sponsor.id,
                name: sponsor.name,
                logo_url: sponsor.logo_url,
                facebook_url: sponsor.facebook_url,
                instagram_url: sponsor.instagram_url,
                whatsapp: sponsor.whatsapp,
                address: sponsor.address,
                description: `Patrocinador cadastrado em ${sponsor.created_at.toLocaleDateString('pt-BR')}`
            }
        });
    } catch (error) {
        console.error('❌ Erro em createSponsor:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao criar patrocinador'
        });
    }
}

async function updateSponsor(req, res) {
    const { id } = req.params;
    const { name, logo_url, facebook_url, instagram_url, whatsapp, address } = req.body;

    try {
        console.log('🔍 [UPDATE SPONSOR] Iniciando atualização:', { id, name, logo_url, facebook_url, instagram_url, whatsapp, address });

        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);
        console.log('✅ [UPDATE SPONSOR] Autenticação OK');

        if (!name) {
            console.log('❌ [UPDATE SPONSOR] Nome vazio');
            return res.status(400).json({
                success: false,
                message: 'Nome do patrocinador é obrigatório'
            });
        }

        console.log('🔍 [UPDATE SPONSOR] Executando query SQL...');
        const result = await query(`
            UPDATE sponsors
            SET name = $1, logo_url = $2, facebook_url = $3, instagram_url = $4, whatsapp = $5, address = $6
            WHERE id = $7
            RETURNING id, name, logo_url, facebook_url, instagram_url, whatsapp, address, created_at
        `, [name, logo_url || null, facebook_url || null, instagram_url || null, whatsapp || null, address || null, id]);

        console.log('✅ [UPDATE SPONSOR] Query executada. Rows:', result.rows.length);

        if (result.rows.length === 0) {
            console.log('❌ [UPDATE SPONSOR] Patrocinador não encontrado. ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Patrocinador não encontrado'
            });
        }

        const sponsor = result.rows[0];
        console.log('✅ [UPDATE SPONSOR] Patrocinador atualizado:', sponsor);

        res.status(200).json({
            success: true,
            message: 'Patrocinador atualizado com sucesso',
            sponsor: {
                id: sponsor.id,
                name: sponsor.name,
                logo_url: sponsor.logo_url,
                facebook_url: sponsor.facebook_url,
                instagram_url: sponsor.instagram_url,
                whatsapp: sponsor.whatsapp,
                address: sponsor.address,
                description: `Patrocinador cadastrado em ${sponsor.created_at.toLocaleDateString('pt-BR')}`
            }
        });
    } catch (error) {
        console.error('❌ [UPDATE SPONSOR] Erro capturado:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail,
            hint: error.hint
        });

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        // Retornar mais detalhes do erro para debug
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar patrocinador',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            detail: process.env.NODE_ENV === 'development' ? error.detail : undefined
        });
    }
}

async function deleteSponsor(req, res) {
    const { id } = req.params;

    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);
        // Verifica se há produtos associados
        const productsResult = await query(`
            SELECT COUNT(*) as count FROM products WHERE sponsor_id = $1
        `, [id]);

        if (parseInt(productsResult.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir patrocinador com produtos associados'
            });
        }

        const result = await query(`
            DELETE FROM sponsors WHERE id = $1 RETURNING name
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patrocinador não encontrado'
            });
        }

        console.log('✅ Patrocinador excluído:', result.rows[0]);

        res.status(200).json({
            success: true,
            message: 'Patrocinador excluído com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro em deleteSponsor:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao excluir patrocinador'
        });
    }
}

// --- Funções CRUD para Produtos ---

async function createProduct(req, res) {
    const { sponsorId, name, clues } = req.body;

    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);

        if (!sponsorId || !name || !clues || clues.length !== 5) {
            return res.status(400).json({
                success: false,
                message: 'Sponsor ID, nome e exatamente 5 dicas são obrigatórios'
            });
        }

        // Valida se todas as dicas estão preenchidas
        const validClues = clues.filter(clue => clue && clue.trim().length > 0);
        if (validClues.length !== 5) {
            return res.status(400).json({
                success: false,
                message: 'Todas as 5 dicas devem estar preenchidas'
            });
        }

        const result = await query(`
            INSERT INTO products (sponsor_id, name, clues)
            VALUES ($1, $2, $3)
            RETURNING id, sponsor_id, name, clues, created_at
        `, [sponsorId, name, clues]);

        const product = result.rows[0];
        console.log('✅ Produto criado:', product);

        // Log de auditoria
        const user = await getAuthenticatedUser(req, ['admin']);
        await logAuditAction({
            user_id: user.id,
            action: 'CREATE_PRODUCT',
            table_name: 'products',
            record_id: product.id,
            new_values: { sponsorId, name, clues },
            ip_address: getClientIP(req),
            user_agent: req.headers['user-agent'],
            request_method: req.method,
            request_url: req.originalUrl || req.url,
            additional_data: { product_name: product.name, clues_count: clues.length }
        });

        res.status(201).json({
            success: true,
            message: 'Produto criado com sucesso',
            product: {
                id: product.id,
                sponsor_id: product.sponsor_id,
                name: product.name,
                clues: product.clues
            }
        });
    } catch (error) {
        console.error('❌ Erro em createProduct:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao criar produto'
        });
    }
}

async function updateProduct(req, res) {
    const { id } = req.params;
    const { name, clues } = req.body;

    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);

        if (!name || !clues || clues.length !== 5) {
            return res.status(400).json({
                success: false,
                message: 'Nome e exatamente 5 dicas são obrigatórios'
            });
        }

        // Valida se todas as dicas estão preenchidas
        const validClues = clues.filter(clue => clue && clue.trim().length > 0);
        if (validClues.length !== 5) {
            return res.status(400).json({
                success: false,
                message: 'Todas as 5 dicas devem estar preenchidas'
            });
        }

        const result = await query(`
            UPDATE products
            SET name = $1, clues = $2
            WHERE id = $3
            RETURNING id, sponsor_id, name, clues, created_at
        `, [name, clues, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        const product = result.rows[0];
        console.log('✅ Produto atualizado:', product);

        res.status(200).json({
            success: true,
            message: 'Produto atualizado com sucesso',
            product: {
                id: product.id,
                sponsor_id: product.sponsor_id,
                name: product.name,
                clues: product.clues
            }
        });
    } catch (error) {
        console.error('❌ Erro em updateProduct:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar produto'
        });
    }
}

async function deleteProduct(req, res) {
    const { id } = req.params;

    try {
        // ✅ MOVED INSIDE try-catch
        await getAuthenticatedUser(req, ['admin']);

        const result = await query(`
            DELETE FROM products WHERE id = $1 RETURNING name
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        console.log('✅ Produto excluído:', result.rows[0]);

        res.status(200).json({
            success: true,
            message: 'Produto excluído com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro em deleteProduct:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao excluir produto'
        });
    }
}

// --- Funções para Participantes Públicos e Sistema de Referência ---

async function registerPublicParticipant(req, res) {
    // ROTA PÚBLICA - não requer autenticação
    const { name, phone, neighborhood, city, referralCode, latitude, longitude } = req.body;

    try {
        // Validações básicas
        if (!name || !phone || !neighborhood || !city) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos são obrigatórios'
            });
        }

        // 🔧 FIX: Limpar telefone - manter apenas dígitos
        const cleanPhone = phone.replace(/\D/g, ''); // Remove tudo que não for número

        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            return res.status(400).json({
                success: false,
                message: 'Telefone deve ter 10 ou 11 dígitos'
            });
        }

        // Verifica se já existe participante com este telefone (usando telefone limpo)
        const existingParticipant = await query(`
            SELECT id, own_referral_code, extra_guesses FROM public_participants WHERE phone = $1
        `, [cleanPhone]);

        // Se já existe, fazer UPDATE ao invés de rejeitar
        if (existingParticipant.rows.length > 0) {
            const existing = existingParticipant.rows[0];

            // Atualiza dados do participante (usando cleanPhone)
            await query(`
                UPDATE public_participants
                SET name = $1, neighborhood = $2, city = $3, latitude = $4, longitude = $5
                WHERE phone = $6
            `, [name, neighborhood, city, latitude, longitude, cleanPhone]);

            console.log('✅ Dados do participante atualizados:', { id: existing.id, phone: cleanPhone });

            // Gera link de compartilhamento
            const shareUrl = `${req.headers.origin || 'https://nexogeo.vercel.app'}/caixa-misteriosa-pub?user=${cleanPhone}-1`;

            return res.status(200).json({
                success: true,
                participantId: existing.id,
                shareUrl: shareUrl,
                participant: {
                    id: existing.id,
                    name,
                    phone: cleanPhone,
                    neighborhood,
                    city,
                    referralCode: existing.own_referral_code,
                    extraGuesses: existing.extra_guesses,
                    shareUrl: shareUrl
                },
                referralBonus: false,
                message: 'Dados atualizados com sucesso! Seja bem-vindo novamente.'
            });
        }

        // Gera código próprio para compartilhamento (8 caracteres únicos)
        let ownCode;
        let codeExists = true;
        while (codeExists) {
            ownCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            const codeCheck = await query(`
                SELECT id FROM public_participants WHERE own_referral_code = $1
            `, [ownCode]);
            codeExists = codeCheck.rows.length > 0;
        }

        // Processa referência se fornecida
        let referredById = null;
        if (referralCode) {
            const referrerResult = await query(`
                SELECT id FROM public_participants
                WHERE own_referral_code = $1
            `, [referralCode]);

            if (referrerResult.rows.length > 0) {
                referredById = referrerResult.rows[0].id;
            }
        }

        // Insere novo participante
        console.log('💾 [REGISTER] Inserindo novo participante:', {
            name,
            phone: cleanPhone,
            neighborhood,
            city,
            referralCode: referralCode || 'NULL',
            referredById: referredById || 'NULL',
            ownCode
        });

        const newParticipant = await query(`
            INSERT INTO public_participants (
                name, phone, neighborhood, city,
                referral_code, referred_by_id, own_referral_code,
                latitude, longitude
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, own_referral_code
        `, [name, cleanPhone, neighborhood, city, referralCode, referredById, ownCode, latitude, longitude]);

        const participantId = newParticipant.rows[0].id;

        console.log('✅ [REGISTER] Participante inserido:', {
            participantId,
            ownCode: newParticipant.rows[0].own_referral_code
        });

        // 🔥 VERIFICAÇÃO IMEDIATA: Buscar o registro que acabamos de inserir
        const verifyInsert = await query(`
            SELECT id, name, referral_code, referred_by_id, own_referral_code
            FROM public_participants
            WHERE id = $1
        `, [participantId]);

        console.log('🔥 [VERIFY] Registro recém-inserido:', verifyInsert.rows[0]);

        // Se foi referenciado, concede +1 palpite ao referenciador
        if (referredById) {
            console.log('🔍 Processando referral:', {
                newParticipant: name,
                newParticipantId: participantId,
                referrerId: referredById,
                referralCode: referralCode
            });

            // Buscar dados do referenciador ANTES
            const beforeUpdate = await query(`
                SELECT name, extra_guesses FROM public_participants WHERE id = $1
            `, [referredById]);

            await query(`
                UPDATE public_participants
                SET extra_guesses = extra_guesses + 1
                WHERE id = $1
            `, [referredById]);

            // Buscar dados do referenciador DEPOIS
            const afterUpdate = await query(`
                SELECT name, extra_guesses FROM public_participants WHERE id = $1
            `, [referredById]);

            console.log('🎁 Recompensa concedida!', {
                referrer: beforeUpdate.rows[0]?.name,
                referrerId: referredById,
                before: beforeUpdate.rows[0]?.extra_guesses || 0,
                after: afterUpdate.rows[0]?.extra_guesses || 0,
                difference: (afterUpdate.rows[0]?.extra_guesses || 0) - (beforeUpdate.rows[0]?.extra_guesses || 0)
            });

            // Registra a recompensa
            await query(`
                INSERT INTO referral_rewards (referrer_id, referred_id, reward_granted)
                VALUES ($1, $2, TRUE)
            `, [referredById, participantId]);
        }

        console.log('✅ Novo participante público registrado:', { participantId, name, referralCode, ownCode });

        // Gera link de compartilhamento personalizado (usando cleanPhone já declarado)
        const shareUrl = `${req.headers.origin || 'https://nexogeo.vercel.app'}/caixa-misteriosa-pub?user=${cleanPhone}-1`;

        res.status(201).json({
            success: true,
            participantId: participantId,
            shareUrl: shareUrl, // Link para compartilhar
            participant: {
                id: participantId,
                name,
                phone,
                neighborhood,
                city,
                referralCode: ownCode,
                extraGuesses: 0,
                shareUrl: shareUrl
            },
            referralBonus: referredById ? true : false,
            message: 'Cadastro realizado com sucesso! Compartilhe o link abaixo para ganhar palpites extras.'
        });
    } catch (error) {
        console.error('❌ Erro ao registrar participante público:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar participante',
            error: error.message
        });
    }
}

async function getParticipantByPhone(req, res) {
    // ROTA PÚBLICA - busca participante por telefone para login automático
    const { phone } = req.params;

    console.log('🔍 [getParticipantByPhone] Buscando por telefone:', phone);

    try {
        // Buscar por telefone exato OU por telefone sem formatação (remove tudo que não é dígito)
        const participantResult = await query(`
            SELECT id, name, phone, neighborhood, city, extra_guesses, own_referral_code
            FROM public_participants
            WHERE phone = $1
               OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2
            ORDER BY created_at DESC
            LIMIT 1
        `, [phone, phone]);

        console.log('📊 [getParticipantByPhone] Resultado:', {
            phoneBuscado: phone,
            encontrados: participantResult.rows.length,
            participante: participantResult.rows[0] ? {
                name: participantResult.rows[0].name,
                phone: participantResult.rows[0].phone,
                own_referral_code: participantResult.rows[0].own_referral_code
            } : null
        });

        if (participantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Participante não encontrado'
            });
        }

        const participant = participantResult.rows[0];

        res.status(200).json({
            success: true,
            participant: {
                id: participant.id,
                name: participant.name,
                phone: participant.phone,
                neighborhood: participant.neighborhood,
                city: participant.city,
                extra_guesses: participant.extra_guesses,
                own_referral_code: participant.own_referral_code
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar participante por telefone:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar participante'
        });
    }
}

async function getParticipantInfo(req, res) {
    // ROTA PÚBLICA - não requer autenticação
    const { participantId } = req.params;

    try {
        const participantResult = await query(`
            SELECT
                p.*,
                COALESCE(
                    (SELECT COUNT(*) FROM referral_rewards WHERE referrer_id = p.id),
                    0
                ) as referrals_made,
                COALESCE(
                    (SELECT COUNT(*) FROM submissions s
                     JOIN games g ON s.game_id = g.id
                     WHERE s.public_participant_id = p.id AND g.status IN ('accepting', 'closed')),
                    0
                ) as current_game_submissions
            FROM public_participants p
            WHERE p.id = $1
        `, [participantId]);

        if (participantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Participante não encontrado'
            });
        }

        const participant = participantResult.rows[0];

        // Busca palpites do jogo atual se houver
        const currentGameResult = await query(`
            SELECT id FROM games
            WHERE status IN ('accepting', 'closed')
            ORDER BY created_at DESC
            LIMIT 1
        `);

        let submissions = [];
        if (currentGameResult.rows.length > 0) {
            const gameId = currentGameResult.rows[0].id;
            const submissionsResult = await query(`
                SELECT guess, submission_number, created_at
                FROM submissions
                WHERE public_participant_id = $1 AND game_id = $2
                ORDER BY submission_number ASC
            `, [participantId, gameId]);

            submissions = submissionsResult.rows;
        }

        res.status(200).json({
            success: true,
            id: participant.id,
            name: participant.name,
            phone: participant.phone,
            neighborhood: participant.neighborhood,
            city: participant.city,
            own_referral_code: participant.own_referral_code,
            extra_guesses: participant.extra_guesses,
            totalGuesses: 1 + participant.extra_guesses,
            usedGuesses: participant.current_game_submissions,
            remainingGuesses: (1 + participant.extra_guesses) - participant.current_game_submissions,
            referralsMade: participant.referrals_made,
            submissions: submissions,
            shareUrl: `${req.headers.origin || 'https://nexogeo.vercel.app'}/dashboard/caixa-misteriosa?ref=${participant.own_referral_code}`,
            participant: {
                id: participant.id,
                name: participant.name,
                phone: participant.phone,
                neighborhood: participant.neighborhood,
                city: participant.city,
                referralCode: participant.own_referral_code,
                extraGuesses: participant.extra_guesses,
                totalGuesses: 1 + participant.extra_guesses,
                usedGuesses: participant.current_game_submissions,
                remainingGuesses: (1 + participant.extra_guesses) - participant.current_game_submissions,
                referralsMade: participant.referrals_made,
                submissions: submissions,
                shareUrl: `${req.headers.origin || 'https://nexogeo.vercel.app'}/dashboard/caixa-misteriosa?ref=${participant.own_referral_code}`
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar informações do participante:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar informações'
        });
    }
}

async function checkReferralCode(req, res) {
    // ROTA PÚBLICA - não requer autenticação
    const { code } = req.params;

    try {
        const referrerResult = await query(`
            SELECT id, name FROM public_participants
            WHERE own_referral_code = $1
        `, [code]);

        if (referrerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Código de referência inválido'
            });
        }

        const referrer = referrerResult.rows[0];

        res.status(200).json({
            success: true,
            referrer: {
                name: referrer.name,
                message: `Você foi convidado por ${referrer.name}! Ao se cadastrar, ${referrer.name} ganhará +1 palpite.`
            }
        });
    } catch (error) {
        console.error('❌ Erro ao verificar código de referência:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar código'
        });
    }
}

// Busca pessoas que se cadastraram usando o código de referência do participante
// 🔥 DEBUG: Função para listar todos participantes e seus códigos
async function debugListParticipants(req, res) {
    try {
        const result = await query(`
            SELECT
                id,
                name,
                phone,
                referral_code,
                referred_by_id,
                own_referral_code,
                extra_guesses,
                created_at
            FROM public_participants
            ORDER BY created_at DESC
            LIMIT 20
        `);

        console.log('🔥 [DEBUG] Listando últimos 20 participantes:', result.rows);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            participants: result.rows.map(p => ({
                id: p.id,
                name: p.name,
                phone: p.phone,
                referralCode: p.referral_code || 'NULL',
                referredById: p.referred_by_id || 'NULL',
                ownReferralCode: p.own_referral_code,
                extraGuesses: p.extra_guesses,
                createdAt: p.created_at
            }))
        });
    } catch (error) {
        console.error('❌ [DEBUG] Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// 🔥 RESET: Função para limpar tabela public_participants
async function resetParticipants(req, res) {
    try {
        console.log('⚠️ [RESET] LIMPANDO TABELA public_participants...');

        // Primeiro, limpar tabela de recompensas (foreign key)
        await query(`TRUNCATE TABLE referral_rewards CASCADE`);
        console.log('✅ [RESET] Tabela referral_rewards limpa');

        // Limpar tabela de participantes
        await query(`TRUNCATE TABLE public_participants RESTART IDENTITY CASCADE`);
        console.log('✅ [RESET] Tabela public_participants limpa e IDs resetados');

        res.status(200).json({
            success: true,
            message: 'Tabela public_participants limpa com sucesso. IDs resetados para 1.'
        });
    } catch (error) {
        console.error('❌ [RESET] Erro ao limpar tabela:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function getReferrals(req, res) {
    const { participantId } = req.params;

    try {
        console.log('🔍 [getReferrals] Buscando referrals para participantId:', participantId);

        // Buscar participante e seu telefone
        const participantResult = await query(`
            SELECT own_referral_code, name, phone FROM public_participants WHERE id = $1
        `, [participantId]);

        if (participantResult.rows.length === 0) {
            console.log('❌ [getReferrals] Participante não encontrado:', participantId);
            return res.status(404).json({
                success: false,
                message: 'Participante não encontrado'
            });
        }

        const participantPhone = participantResult.rows[0].phone;
        const participantName = participantResult.rows[0].name;

        console.log('🔍 [getReferrals] Dados do participante:', {
            participantId,
            participantName,
            participantPhone
        });

        // 🔥 FIX: Buscar TODOS os códigos de referência deste TELEFONE
        // (caso o participante tenha múltiplos registros)
        const allCodesResult = await query(`
            SELECT DISTINCT own_referral_code
            FROM public_participants
            WHERE phone = $1 OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2
        `, [participantPhone, participantPhone.replace(/\D/g, '')]);

        const allCodes = allCodesResult.rows.map(r => r.own_referral_code).filter(c => c);

        console.log('🔍 [getReferrals] Todos códigos deste telefone:', {
            participantName,
            participantPhone,
            allCodes,
            totalCodigosEncontrados: allCodes.length
        });

        // Se não há códigos, retornar vazio
        if (allCodes.length === 0) {
            console.log('⚠️ [getReferrals] Nenhum código próprio encontrado para este telefone');
            return res.status(200).json({
                success: true,
                referrals: []
            });
        }

        // Buscar o jogo ativo (accepting, closed ou finished)
        const activeGameResult = await query(`
            SELECT id FROM games
            WHERE status IN ('accepting', 'closed', 'finished')
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (activeGameResult.rows.length === 0) {
            console.log('⚠️ [getReferrals] Nenhum jogo ativo encontrado');
            return res.status(200).json({
                success: true,
                referrals: []
            });
        }

        const activeGameId = activeGameResult.rows[0].id;

        // Buscar apenas participantes que usaram o código E têm palpite no jogo ativo
        console.log('🔎 [getReferrals] Executando query:', {
            sql: 'SELECT DISTINCT participants com palpites no jogo ativo',
            params: { allCodes, activeGameId }
        });

        const referralsResult = await query(`
            SELECT DISTINCT
                p.id,
                p.name,
                p.phone,
                p.created_at,
                p.referral_code
            FROM public_participants p
            INNER JOIN submissions s ON s.participant_id = p.id
            WHERE p.referral_code = ANY($1)
            AND s.game_id = $2
            ORDER BY p.created_at DESC
        `, [allCodes, activeGameId]);

        console.log('📊 [getReferrals] Resultado:', {
            participantName,
            allCodes,
            encontrados: referralsResult.rows.length,
            referrals: referralsResult.rows
        });

        res.status(200).json({
            success: true,
            referrals: referralsResult.rows.map(r => ({
                id: r.id,
                name: r.name,
                phone: r.phone,
                registeredAt: r.created_at,
                // 🔥 Status correto: "cadastrado" se tem NOME E TELEFONE
                isRegistered: !!(r.name && r.phone)
            }))
        });
    } catch (error) {
        console.error('❌ Erro ao buscar referrals:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar referências'
        });
    }
}

async function getSubmissionsByParticipant(req, res) {
    // ROTA PÚBLICA - busca todas as submissions de um participante (todos os jogos)
    const { participantId } = req.params;

    try {
        console.log('🔍 [getSubmissionsByParticipant] participantId:', participantId);

        // Primeiro buscar o telefone do participante
        const participantResult = await query(`
            SELECT phone FROM public_participants WHERE id = $1
        `, [participantId]);

        if (participantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Participante não encontrado'
            });
        }

        const participantPhone = participantResult.rows[0].phone;

        // Buscar submissions usando public_participant_id OU user_phone
        const submissionsResult = await query(`
            SELECT
                s.id,
                s.game_id,
                s.guess,
                s.submission_number,
                s.created_at
            FROM submissions s
            WHERE s.public_participant_id = $1 OR s.user_phone = $2
            ORDER BY s.created_at DESC
        `, [participantId, participantPhone]);

        console.log('📊 [getSubmissionsByParticipant] Total encontrado:', submissionsResult.rows.length);

        res.status(200).json({
            success: true,
            submissions: submissionsResult.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar submissions do participante:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar palpites'
        });
    }
}

async function getSubmissions(req, res) {
    // ROTA PÚBLICA - não requer autenticação
    const { gameId, participantId } = req.query;

    try {
        console.log('🔍 [getSubmissions] Parâmetros recebidos:', { gameId, participantId, query: req.query });

        if (!gameId || !participantId) {
            return res.status(400).json({
                success: false,
                message: 'gameId e participantId são obrigatórios'
            });
        }

        // Primeiro busca o telefone do participante para compatibilidade com registros antigos
        const participantResult = await query(`
            SELECT phone FROM public_participants WHERE id = $1
        `, [participantId]);

        if (participantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Participante não encontrado'
            });
        }

        const participantPhone = participantResult.rows[0].phone;

        // Busca todas as submissões do participante para o jogo específico
        // Usa public_participant_id (registros novos) OU user_phone (registros antigos)
        const submissionsResult = await query(`
            SELECT
                s.id,
                s.guess,
                s.submission_number,
                s.created_at,
                g.status as game_status,
                pr.name as product_name,
                CASE
                    WHEN LOWER(TRIM(s.guess)) = LOWER(TRIM(pr.name)) THEN TRUE
                    ELSE FALSE
                END as is_correct
            FROM submissions s
            JOIN games g ON s.game_id = g.id
            JOIN products pr ON g.product_id = pr.id
            LEFT JOIN public_participants p ON s.public_participant_id = p.id
            WHERE s.game_id = $1 AND (s.public_participant_id = $2 OR s.user_phone = $3)
            ORDER BY s.submission_number ASC
        `, [gameId, participantId, participantPhone]);

        console.log('🔍 [getSubmissions] Resultado da query:', {
            rowCount: submissionsResult.rows.length,
            rows: submissionsResult.rows
        });

        res.status(200).json({
            success: true,
            submissions: submissionsResult.rows.map(sub => ({
                id: sub.id,
                guess: sub.guess,
                submissionNumber: sub.submission_number,
                created_at: sub.created_at,
                is_correct: sub.is_correct
            }))
        });
    } catch (error) {
        console.error('❌ Erro ao buscar submissões:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar submissões'
        });
    }
}

async function getWinners(req, res) {
    // ROTA PÚBLICA - não requer autenticação
    try {
        // Busca o jogo mais recente finalizado ou fechado
        const gameResult = await query(`
            SELECT g.*, p.name as product_name
            FROM games g
            JOIN products p ON g.product_id = p.id
            WHERE g.status IN ('closed', 'finished')
            ORDER BY g.created_at DESC
            LIMIT 1
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo finalizado encontrado'
            });
        }

        const game = gameResult.rows[0];

        // Busca possíveis ganhadores (palpites que acertaram o produto)
        const winnersResult = await query(`
            SELECT
                s.guess,
                s.created_at,
                s.submission_number,
                COALESCE(p.name, s.user_name) as participant_name,
                CASE
                    WHEN LOWER(TRIM(s.guess)) = LOWER(TRIM($2)) THEN TRUE
                    ELSE FALSE
                END as is_winner
            FROM submissions s
            LEFT JOIN public_participants p ON s.public_participant_id = p.id
            WHERE s.game_id = $1
            ORDER BY s.created_at ASC
        `, [game.id, game.product_name]);

        const winners = winnersResult.rows.filter(row => row.is_winner);

        res.status(200).json({
            success: true,
            game: {
                productName: game.product_name,
                status: game.status,
                endedAt: game.ended_at
            },
            winners: winners.map(winner => ({
                participantName: winner.participant_name,
                guess: winner.guess,
                submittedAt: winner.created_at,
                submissionNumber: winner.submission_number
            })),
            totalSubmissions: winnersResult.rows.length
        });
    } catch (error) {
        console.error('❌ Erro ao buscar ganhadores:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar ganhadores'
        });
    }
}

async function cleanOffensiveSubmissions(req, res) {
    // ROTA ADMINISTRATIVA - remove palpites ofensivos do banco
    try {
        console.log('🧹 [cleanOffensiveSubmissions] Iniciando limpeza de palpites ofensivos');

        // Busca todos os palpites do jogo ativo
        const gameResult = await query(`
            SELECT id FROM games
            WHERE status IN ('accepting', 'closed', 'setup')
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo ativo encontrado'
            });
        }

        const gameId = gameResult.rows[0].id;

        // Busca todas as submissions do jogo
        const submissionsResult = await query(`
            SELECT id, guess FROM submissions WHERE game_id = $1
        `, [gameId]);

        const submissions = submissionsResult.rows;
        const offensiveIds = [];

        console.log(`📊 Total de palpites a verificar: ${submissions.length}`);

        // Verifica cada palpite usando a função de moderação simples
        for (const submission of submissions) {
            const moderation = simpleModeration(submission.guess);
            if (!moderation.approved) {
                offensiveIds.push(submission.id);
                console.log(`🚫 Palpite ofensivo encontrado: ID ${submission.id} - "${submission.guess}"`);
            }
        }

        if (offensiveIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Nenhum palpite ofensivo encontrado',
                removed: 0
            });
        }

        // Remove palpites ofensivos
        const deleteResult = await query(`
            DELETE FROM submissions
            WHERE id = ANY($1)
            RETURNING id, guess
        `, [offensiveIds]);

        console.log(`✅ Palpites removidos: ${deleteResult.rows.length}`);

        res.status(200).json({
            success: true,
            message: `${deleteResult.rows.length} palpites ofensivos removidos`,
            removed: deleteResult.rows.length,
            submissions: deleteResult.rows.map(r => ({ id: r.id, guess: r.guess }))
        });

    } catch (error) {
        console.error('❌ Erro ao limpar palpites ofensivos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao limpar palpites ofensivos'
        });
    }
}

async function editSubmission(req, res) {
    // ROTA ADMINISTRATIVA - edita manualmente o texto de um palpite
    try {
        await getAuthenticatedUser(req, ['admin']);

        console.log('🔍 [EDIT SUBMISSION] req.body recebido:', JSON.stringify(req.body, null, 2));

        const { submissionId, newGuess } = req.body;

        console.log('🔍 [EDIT SUBMISSION] Valores extraídos:', {
            submissionId,
            newGuess,
            newGuessType: typeof newGuess,
            newGuessTrim: newGuess?.trim(),
            validations: {
                hasSubmissionId: !!submissionId,
                hasNewGuess: !!newGuess,
                hasNewGuessTrim: !!newGuess?.trim()
            }
        });

        if (!submissionId || !newGuess || !newGuess.trim()) {
            console.log('❌ [EDIT SUBMISSION] Validação falhou');
            return res.status(400).json({
                success: false,
                message: 'submissionId e newGuess são obrigatórios'
            });
        }

        console.log(`✏️ [EDIT SUBMISSION] Editando palpite ID ${submissionId} para: "${newGuess}"`);

        // Atualiza o palpite no banco
        const result = await query(`
            UPDATE submissions
            SET guess = $1
            WHERE id = $2
            RETURNING id, guess, user_name
        `, [newGuess.trim(), submissionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Palpite não encontrado'
            });
        }

        console.log(`✅ [EDIT SUBMISSION] Palpite atualizado:`, result.rows[0]);

        res.status(200).json({
            success: true,
            message: 'Palpite editado com sucesso',
            submission: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Erro ao editar palpite:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao editar palpite'
        });
    }
}

async function deleteSubmission(req, res) {
    // ROTA ADMINISTRATIVA - exclui um palpite específico
    try {
        await getAuthenticatedUser(req, ['admin']);

        const { submissionId } = req.body;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                message: 'submissionId é obrigatório'
            });
        }

        console.log(`🗑️ [DELETE SUBMISSION] Excluindo palpite ID ${submissionId}`);

        // Deleta o palpite do banco
        const result = await query(`
            DELETE FROM submissions
            WHERE id = $1
            RETURNING id, guess, user_name
        `, [submissionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Palpite não encontrado'
            });
        }

        console.log(`✅ [DELETE SUBMISSION] Palpite excluído:`, result.rows[0]);

        res.status(200).json({
            success: true,
            message: 'Palpite excluído com sucesso',
            submission: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Erro ao excluir palpite:', error);

        // Se for erro de autenticação, retornar 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('autorização')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao excluir palpite'
        });
    }
}

async function correctSpellingSubmissions(req, res) {
    // ROTA ADMINISTRATIVA - corrige erros ortográficos em palpites existentes usando IA
    try {
        console.log('✏️ [correctSpellingSubmissions] Iniciando correção ortográfica');

        // Verifica se tem API key
        if (!process.env.GOOGLE_API_KEY) {
            return res.status(400).json({
                success: false,
                message: 'GOOGLE_API_KEY não configurada. Correção ortográfica requer IA.'
            });
        }

        // Busca todos os palpites do jogo ativo
        const gameResult = await query(`
            SELECT id FROM games
            WHERE status IN ('accepting', 'closed', 'setup')
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (gameResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum jogo ativo encontrado'
            });
        }

        const gameId = gameResult.rows[0].id;

        // Busca todas as submissions do jogo
        const submissionsResult = await query(`
            SELECT id, guess FROM submissions WHERE game_id = $1
        `, [gameId]);

        const submissions = submissionsResult.rows;
        const corrections = [];

        console.log(`📊 Total de palpites a verificar: ${submissions.length}`);

        // Verifica cada palpite usando a moderação com IA
        for (const submission of submissions) {
            try {
                const moderation = await moderateGuess(submission.guess);

                // Se houve correção ortográfica
                if (moderation.correctedGuess !== submission.guess && moderation.approved) {
                    console.log(`✏️ Correção: "${submission.guess}" → "${moderation.correctedGuess}"`);

                    // Atualiza no banco
                    await query(`
                        UPDATE submissions
                        SET guess = $1
                        WHERE id = $2
                    `, [moderation.correctedGuess, submission.id]);

                    corrections.push({
                        id: submission.id,
                        original: submission.guess,
                        corrected: moderation.correctedGuess
                    });
                }
            } catch (error) {
                console.error(`❌ Erro ao corrigir palpite ID ${submission.id}:`, error);
            }
        }

        if (corrections.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Nenhuma correção ortográfica necessária',
                corrected: 0
            });
        }

        console.log(`✅ Palpites corrigidos: ${corrections.length}`);

        res.status(200).json({
            success: true,
            message: `${corrections.length} palpites corrigidos`,
            corrected: corrections.length,
            corrections: corrections
        });

    } catch (error) {
        console.error('❌ Erro ao corrigir ortografia:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao corrigir palpites'
        });
    }
}

// --- Estatísticas para Dashboard ---

async function getParticipationStats(req, res) {
    // Retorna estatísticas de participação POR JOGO (últimos 5 jogos)
    try {
        const result = await query(`
            SELECT
                s.game_id,
                COUNT(*) as total_submissions,
                g.created_at,
                pr.name as product_name
            FROM submissions s
            JOIN games g ON s.game_id = g.id
            JOIN products pr ON g.product_id = pr.id
            GROUP BY s.game_id, g.created_at, pr.name
            ORDER BY s.game_id DESC
            LIMIT 5
        `);

        console.log('📊 Estatísticas de participação por jogo (últimos 5):', result.rows);

        res.status(200).json({
            success: true,
            data: result.rows.map(row => ({
                game_id: row.game_id,
                product_name: row.product_name,
                total_submissions: parseInt(row.total_submissions),
                created_at: row.created_at
            }))
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de participação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas'
        });
    }
}

async function getNewRegistrationsStats(req, res) {
    // Retorna novos cadastros por dia (últimos 7 dias)
    try {
        const result = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as new_registrations
            FROM public_participants
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 7
        `);

        console.log('📈 Novos cadastros por dia (últimos 7 dias):', result.rows);

        res.status(200).json({
            success: true,
            data: result.rows.map(row => ({
                date: row.date,
                new_registrations: parseInt(row.new_registrations)
            }))
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de novos cadastros:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas'
        });
    }
}

async function getGameParticipantsStats(req, res) {
    // Retorna estatísticas dos participantes do jogo (Caixa Misteriosa)
    // Usado para integração com mapas e dashboard
    try {
        const result = await query(`
            SELECT
                COUNT(DISTINCT pp.id) as total_participants,
                COUNT(DISTINCT pp.city) as total_cities,
                COUNT(DISTINCT pp.neighborhood) as total_neighborhoods,
                COUNT(s.id) as total_submissions,
                SUM(CASE WHEN s.is_correct THEN 1 ELSE 0 END) as correct_guesses,
                COUNT(DISTINCT CASE WHEN pp.referral_code IS NOT NULL THEN pp.id END) as participants_with_referrals,
                AVG(pp.extra_guesses) as avg_extra_guesses
            FROM public_participants pp
            LEFT JOIN submissions s ON pp.id = s.public_participant_id
            WHERE pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
        `);

        console.log('📊 Estatísticas gerais de participantes do jogo:', result.rows[0]);

        const stats = result.rows[0];

        res.status(200).json({
            success: true,
            data: {
                total_participants: parseInt(stats.total_participants) || 0,
                total_cities: parseInt(stats.total_cities) || 0,
                total_neighborhoods: parseInt(stats.total_neighborhoods) || 0,
                total_submissions: parseInt(stats.total_submissions) || 0,
                correct_guesses: parseInt(stats.correct_guesses) || 0,
                participants_with_referrals: parseInt(stats.participants_with_referrals) || 0,
                avg_extra_guesses: parseFloat(stats.avg_extra_guesses) || 0,
                accuracy_rate: stats.total_submissions > 0
                    ? ((parseInt(stats.correct_guesses) / parseInt(stats.total_submissions)) * 100).toFixed(2)
                    : 0
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de participantes do jogo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas de participantes do jogo'
        });
    }
}

// --- Handler Principal ---

module.exports = async (req, res) => {
    // 🔥 [DEBUG] Log de entrada para todas as requisições
    console.log(`--- NEW REQUEST --- Method: ${req.method}, URL: ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('--- REQUEST BODY ---', JSON.stringify(req.body, null, 2));
    }

    const { endpoint, id } = req.query;
    // Usar req.originalPath se disponível (passado por api/index.js), senão extrair manualmente
    const path = req.originalPath ||
                 (req.originalUrl ? req.originalUrl.replace('/api/caixa-misteriosa', '') : req.url.replace('/api/caixa-misteriosa', ''));

    console.log('🕹️ [Caixa Misteriosa Handler] originalPath:', req.originalPath, 'originalUrl:', req.originalUrl, 'url:', req.url);
    console.log('🕹️ [Caixa Misteriosa Handler] Rota extraída:', path, 'Endpoint:', endpoint, 'ID:', id);

    if (path.startsWith('/last-finished')) {
        return await getLastFinishedGame(req, res);
    }

    // Rotas de Jogo (públicas)
    if (path.startsWith('/game/live')) {
        return await getLiveGame(req, res);
    }
    // FIX: Rota específica de submit deve vir antes da rota genérica /game/:id
    if (path.startsWith('/game/submit')) {
        console.log('--- ROUTED TO submitGuess ---');
        return await submitGuess(req, res);
    }
    if (path.startsWith('/game/start')) {
        console.log('--- ROUTED TO startGame ---');
        return await startGame(req, res);
    }
    if (path.startsWith('/game/correct-spelling')) {
        console.log('--- ROUTED TO correctSpellingSubmissions ---');
        return await correctSpellingSubmissions(req, res);
    }
    // ✅ FIX: Rotas de controle do jogo devem vir ANTES de /game/:id
    if (path.startsWith('/game/reveal-clue')) {
        console.log('--- ROUTED TO revealClue ---');
        return await revealClue(req, res);
    }
    if (path.startsWith('/game/end-submissions')) {
        console.log('--- ROUTED TO endSubmissions ---');
        return await endSubmissions(req, res);
    }
    if (path.startsWith('/game/draw-winner')) {
        console.log('--- ROUTED TO drawWinner ---');
        return await drawWinner(req, res);
    }
    if (path.startsWith('/game/reset')) {
        console.log('--- ROUTED TO resetGame ---');
        return await resetGame(req, res);
    }
    if (path.startsWith('/game/clean-offensive')) {
        console.log('--- ROUTED TO cleanOffensiveSubmissions ---');
        return await cleanOffensiveSubmissions(req, res);
    }
    if (path.startsWith('/game/')) {
        console.log('--- ROUTED TO getGameById ---');
        const gameId = path.split('/')[2];
        return await getGameById(req, res, gameId);
    }
    if (path.startsWith('/submit')) {
        return await submitGuess(req, res);
    }
    if (path.startsWith('/register')) {
        return await registerParticipant(req, res);
    }
    // Nova rota para buscar participante por ID
    if (path.startsWith('/participants/') && path.split('/')[2]) {
        const participantId = path.split('/')[2];
        return await getParticipantById(req, res, participantId);
    }
    // Nova rota para buscar palpites de um participante em um jogo específico
    // ✅ FIX: Rotas específicas de submissions devem vir ANTES da rota genérica
    if (path.startsWith('/submissions/edit') && req.method === 'POST') {
        console.log('🎯 Rota detectada: POST /submissions/edit');
        return await editSubmission(req, res);
    }

    if (path.startsWith('/submissions/delete') && req.method === 'POST') {
        console.log('🎯 Rota detectada: POST /submissions/delete');
        return await deleteSubmission(req, res);
    }

    const submissionsByParticipantMatch = path.match(/^\/submissions\/by-participant\/(\d+)/);
    if (submissionsByParticipantMatch) {
        const participantId = submissionsByParticipantMatch[1];
        console.log('🎯 Rota detectada: /submissions/by-participant/:id', { participantId });
        req.params = { ...req.params, participantId };
        return await getSubmissionsByParticipant(req, res);
    }

    if (path.startsWith('/submissions')) {
        console.log('🎯 Rota detectada: /submissions com query params');
        return await getSubmissionsByParticipantAndGame(req, res);
    }
    // Nova rota para buscar referências de um participante
    if (path.startsWith('/participants/') && path.endsWith('/referrals')) {
        const participantId = path.split('/')[2];
        return await getReferralsByParticipant(req, res, participantId);
    }
    if (path.startsWith('/validate-guess')) {
        return await validateGuessEndpoint(req, res);
    }

    // Rotas de Admin (protegidas)
    // A rota /start foi movida para /game/start para consistência
    if (path.startsWith('/clues/generate')) {
        return await generateCluesWithAI(req, res);
    }
    if (path.startsWith('/clues/reveal')) {
        return await revealClue(req, res);
    }
    if (path.startsWith('/submissions/end')) {
        return await endSubmissions(req, res);
    }
    if (path.startsWith('/winner/draw')) {
        return await drawWinner(req, res);
    }
    if (path.startsWith('/winner/draw-from-all')) {
        return await drawWinnerFromAll(req, res);
    }
    if (path.startsWith('/reset')) {
        return await resetGame(req, res);
    }

    // Rotas de CRUD (protegidas)
    if (path.startsWith('/sponsors')) {
        // Rota aninhada para produtos de um patrocinador
        if (path.includes('/products') && req.method === 'GET') {
            return await getProducts(req, res);
        }
        // Rotas CRUD para patrocinadores
        if (req.method === 'GET') return await getSponsors(req, res);
        if (req.method === 'POST') return await createSponsor(req, res);
        if (req.method === 'PUT' && path.split('/')[2]) {
            console.log('🔍 [ROUTER] PUT /sponsors/:id detectado');
            console.log('🔍 [ROUTER] Authorization header presente?', !!req.headers.authorization);
            console.log('🔍 [ROUTER] Headers keys:', Object.keys(req.headers));
            // ✅ FIX: Não recriar req, apenas adicionar params
            req.params = { id: path.split('/')[2] };
            return await updateSponsor(req, res);
        }
        if (req.method === 'DELETE' && path.split('/')[2]) {
            // ✅ FIX: Não recriar req, apenas adicionar params
            req.params = { id: path.split('/')[2] };
            return await deleteSponsor(req, res);
        }
    }
    if (path.startsWith('/products')) {
        // ✅ FIX: Rota específica /products/generate-clues deve vir ANTES das rotas CRUD
        if (path.startsWith('/products/generate-clues')) {
            console.log('--- ROUTED TO generateCluesWithAI ---');
            return await generateCluesWithAI(req, res);
        }
        // Rotas CRUD genéricas
        if (req.method === 'POST') return await createProduct(req, res);
        if (req.method === 'PUT' && path.split('/')[2]) {
            // ✅ FIX: Não recriar req, apenas adicionar params
            req.params = { id: path.split('/')[2] };
            return await updateProduct(req, res);
        }
        if (req.method === 'DELETE' && path.split('/')[2]) {
            // ✅ FIX: Não recriar req, apenas adicionar params
            req.params = { id: path.split('/')[2] };
            return await deleteProduct(req, res);
        }
    }

    // Rotas de Estatísticas (para Dashboard)
    if (path.startsWith('/stats/participation')) {
        return await getParticipationStats(req, res);
    }
    if (path.startsWith('/stats/new-registrations')) {
        return await getNewRegistrationsStats(req, res);
    }
    if (path.startsWith('/stats/game-participants')) {
        console.log('📊 Rota detectada: /stats/game-participants');
        return await getGameParticipantsStats(req, res);
    }

    // Fallback
    res.status(404).json({ success: false, message: 'Endpoint não encontrado no Caixa Misteriosa' });
};
