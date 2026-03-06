const { getSecureHeaders, extractClientIp, checkRateLimit } = require('../_lib/security');
const databasePool = require('../_lib/database');
const { getAuthenticatedUser } = require('./authHelper');

// Cache em memória (Warm Cache) para reduzir queries no endpoint de resultados do broadcast
let cachedResultados = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 2000; // 2 segundos de cache na Vercel Edge/Serverless

// Helper: parsear body com limite de tamanho (100KB)
function parseBody(req, maxBytes = 102400) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', chunk => {
            size += chunk.length;
            if (size > maxBytes) {
                req.destroy();
                reject(new Error('Payload excede o limite permitido'));
                return;
            }
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new Error('JSON inválido'));
            }
        });
        req.on('error', reject);
    });
}

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

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const endpoint = url.searchParams.get('endpoint') || 'default';

    // Rate limiting preventivo (100 req/min global por IP)
    const clientId = extractClientIp(req);
    const globalRateLimit = checkRateLimit(clientId, 100, 60000);

    if (!globalRateLimit.allowed) {
        return res.status(429).json({
            message: 'Muitas requisições. Tente novamente mais tarde.',
            retryAfter: Math.ceil((globalRateLimit.resetTime - Date.now()) / 1000)
        });
    }

    try {
        // ============================================================
        // GET: Buscar enquete ativa (Para o público)
        // ============================================================
        if (req.method === 'GET' && endpoint === 'ativa') {
            const enqueteAtiva = await databasePool.query(`
                SELECT id, titulo, pergunta, cor_tema, mostrar_votos
                FROM enquetes
                WHERE status = 'ativa' AND deleted_at IS NULL
                ORDER BY created_at DESC LIMIT 1
            `);

            if (enqueteAtiva.rows.length === 0) {
                return res.status(200).json({ success: true, data: null, message: 'Nenhuma enquete ativa no momento.' });
            }

            const enquete = enqueteAtiva.rows[0];

            const opcoes = await databasePool.query(`
                SELECT id, texto_opcao, cor_grafico
                FROM enquete_opcoes
                WHERE enquete_id = $1
                ORDER BY id ASC
            `, [enquete.id]);

            return res.status(200).json({
                success: true,
                data: {
                    ...enquete,
                    opcoes: opcoes.rows
                }
            });
        }

        // ============================================================
        // GET: Resultados em Tempo Real (Para o Broadcast / Admin)
        // ============================================================
        if (req.method === 'GET' && endpoint === 'resultados') {
            const enqueteId = url.searchParams.get('id');
            const now = Date.now();

            // Retornar Cache se estiver válido e se for a enquete padrão (sem id forçado)
            if (!enqueteId && cachedResultados && (now - cacheTimestamp < CACHE_TTL_MS)) {
                res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=2');
                return res.status(200).json(cachedResultados);
            }

            let enqueteQuery = '';
            let queryParams = [];

            if (enqueteId) {
                enqueteQuery = `WHERE id = $1 AND deleted_at IS NULL`;
                queryParams = [enqueteId];
            } else {
                enqueteQuery = `WHERE status = 'ativa' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`;
            }

            const enquete = await databasePool.query(`SELECT * FROM enquetes ${enqueteQuery}`, queryParams);

            if (enquete.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Enquete não encontrada' });
            }

            const currentEnquete = enquete.rows[0];

            // Busca as opções e junta com a contagem de votos agregada
            const resultados = await databasePool.query(`
                SELECT
                    o.id,
                    o.texto_opcao,
                    o.cor_grafico,
                    COUNT(v.id) as votos
                FROM enquete_opcoes o
                LEFT JOIN enquete_votos v ON o.id = v.opcao_id
                WHERE o.enquete_id = $1
                GROUP BY o.id, o.texto_opcao, o.cor_grafico
                ORDER BY votos DESC, o.id ASC
            `, [currentEnquete.id]);

            const totalVotos = resultados.rows.reduce((sum, row) => sum + parseInt(row.votos || 0), 0);

            const preDefinedColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
            const dadosFormatados = resultados.rows.map((row, idx) => ({
                ...row,
                cor_grafico: row.cor_grafico || preDefinedColors[idx % preDefinedColors.length],
                votos: parseInt(row.votos || 0),
                percentual: totalVotos > 0 ? ((parseInt(row.votos || 0) / totalVotos) * 100).toFixed(1) : 0
            }));

            // Busca os últimos 25 votos (nomes e cores) para os balões na TV
            const recentesQuery = await databasePool.query(`
                SELECT
                    v.id as voto_id,
                    p.nome as participante_nome,
                    p.bairro as participante_bairro,
                    o.cor_grafico as cor
                FROM enquete_votos v
                JOIN participantes p ON v.participante_id = p.id
                JOIN enquete_opcoes o ON v.opcao_id = o.id
                WHERE v.enquete_id = $1
                ORDER BY v.created_at DESC
                LIMIT 25
            `, [currentEnquete.id]);

            const responseData = {
                success: true,
                data: {
                    enquete: currentEnquete,
                    total_votos: totalVotos,
                    resultados: dadosFormatados,
                    recentes: recentesQuery.rows.map(r => ({
                        id: r.voto_id,
                        nome: r.participante_nome ? r.participante_nome.split(' ')[0] : 'Alguém',
                        bairro: r.participante_bairro,
                        cor: r.cor
                    }))
                }
            };

            // Atualiza o cache e adiciona Headers de CDN (Vercel Edge Network)
            if (!enqueteId) {
                cachedResultados = responseData;
                cacheTimestamp = now;
            }

            res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=2');
            return res.status(200).json(responseData);
        }

        // = [V4 ADDED] ===============================================
        // GET: Verificar se participante já votou (UX / Prevenção)
        // ============================================================
        if (req.method === 'GET' && endpoint === 'verificar_voto') {
            const enqueteId = url.searchParams.get('enquete_id');
            const participanteId = url.searchParams.get('participante_id');

            if (!enqueteId || !participanteId) {
                return res.status(400).json({ success: false, message: 'Faltam parâmetros.' });
            }

            const check = await databasePool.query(
                `SELECT id FROM enquete_votos WHERE enquete_id = $1 AND participante_id = $2`,
                [enqueteId, participanteId]
            );

            return res.status(200).json({
                success: true,
                ja_votou: check.rows.length > 0
            });
        }

        // ============================================================
        // POST: Votar na Enquete (Público - sem autenticação admin)
        // ============================================================
        if (req.method === 'POST' && endpoint === 'votar') {
            const voteRateLimit = checkRateLimit(`vote_${clientId}`, 20, 60000);

            if (!voteRateLimit.allowed) {
                return res.status(429).json({ message: 'Calma lá! Você está votando rápido demais.' });
            }

            const { enquete_id, opcao_id, participante_id } = await parseBody(req);

            if (!enquete_id || !opcao_id || !participante_id) {
                return res.status(400).json({ message: 'Enquete ID, Opção ID e Participante ID são obrigatórios' });
            }

            // Validar que o participante existe
            const participanteCheck = await databasePool.query(
                `SELECT id FROM participantes WHERE id = $1 AND deleted_at IS NULL`,
                [participante_id]
            );
            if (participanteCheck.rows.length === 0) {
                return res.status(400).json({ message: 'Participante não encontrado.' });
            }

            // Verificar se a enquete está ativa
            const statusCheck = await databasePool.query(`SELECT status FROM enquetes WHERE id = $1`, [enquete_id]);
            if (statusCheck.rows.length === 0 || statusCheck.rows[0].status !== 'ativa') {
                return res.status(403).json({ message: 'Esta enquete não está mais aceitando votos.' });
            }

            // Inserir voto (Restrição UNQ no banco previne 2 votos do mesmo participante na mesma enquete)
            try {
                await databasePool.query(`
                    INSERT INTO enquete_votos (enquete_id, opcao_id, participante_id, ip_address, user_agent)
                    VALUES ($1, $2, $3, $4, $5)
                `, [enquete_id, opcao_id, participante_id, clientId, req.headers['user-agent']]);

                // Atualizar timestamp de participação do participante
                await databasePool.query(`
                    UPDATE participantes
                    SET participou_em = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [participante_id]);

                return res.status(201).json({ success: true, message: 'Voto computado com sucesso!' });
            } catch (insertError) {
                if (insertError.code === '23505') {
                    return res.status(409).json({ success: false, message: 'Você já votou nesta enquete. Obrigado pela participação!' });
                }
                throw insertError;
            }
        }

        // ============================================================
        // ADMIN ROUTES: CRUD Enquetes (Requer Autenticação JWT)
        // ============================================================

        // Lista todas as enquetes
        if (req.method === 'GET' && endpoint === 'listar') {
            await getAuthenticatedUser(req, ['admin', 'moderator', 'editor', 'viewer']);

            const enquetes = await databasePool.query(`
                SELECT e.*,
                       (SELECT COUNT(*) FROM enquete_votos v WHERE v.enquete_id = e.id) as total_votos
                FROM enquetes e
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
            `);
            return res.status(200).json({ success: true, data: enquetes.rows });
        }

        // Criar nova enquete e suas opções (com transação)
        if (req.method === 'POST' && endpoint === 'criar') {
            await getAuthenticatedUser(req, ['admin', 'moderator', 'editor']);

            const { titulo, pergunta, cor_tema, mostrar_votos, opcoes } = await parseBody(req);

            if (!titulo || !pergunta || !opcoes || !Array.isArray(opcoes) || opcoes.length < 2) {
                return res.status(400).json({ message: 'Título, pergunta e no mínimo 2 opções são obrigatórios.' });
            }

            if (opcoes.length > 6) {
                return res.status(400).json({ message: 'Máximo de 6 opções permitido.' });
            }

            // Transação para garantir consistência
            const client = await databasePool.getClient();
            try {
                await client.query('BEGIN');

                const result = await client.query(`
                    INSERT INTO enquetes (titulo, pergunta, status, cor_tema, mostrar_votos, data_inicio)
                    VALUES ($1, $2, 'inativa', $3, $4, CURRENT_TIMESTAMP)
                    RETURNING id
                `, [titulo, pergunta, cor_tema || 'nexogeo', mostrar_votos !== false]);

                const novaEnqueteId = result.rows[0].id;

                for (const opcao of opcoes) {
                    await client.query(`
                        INSERT INTO enquete_opcoes (enquete_id, texto_opcao, cor_grafico)
                        VALUES ($1, $2, $3)
                    `, [novaEnqueteId, opcao.texto, opcao.cor || '#4F46E5']);
                }

                await client.query('COMMIT');
                return res.status(201).json({ success: true, message: 'Enquete criada com sucesso', id: novaEnqueteId });
            } catch (error) {
                await client.query('ROLLBACK');
                console.error('Erro ao criar enquete:', error);
                return res.status(500).json({ message: 'Erro ao salvar enquete.' });
            } finally {
                client.release();
            }
        }

        // Atualizar status (Ativar / Encerrar / Reativar)
        if (req.method === 'PATCH' && endpoint === 'status') {
            await getAuthenticatedUser(req, ['admin', 'moderator', 'editor']);

            const { id, status } = await parseBody(req);

            if (!id || !status) {
                return res.status(400).json({ message: 'ID e status são obrigatórios.' });
            }

            const statusValidos = ['ativa', 'inativa', 'encerrada'];
            if (!statusValidos.includes(status)) {
                return res.status(400).json({ message: `Status inválido. Valores aceitos: ${statusValidos.join(', ')}` });
            }

            // Verificar se a enquete existe
            const enqueteCheck = await databasePool.query(
                `SELECT id, status FROM enquetes WHERE id = $1 AND deleted_at IS NULL`, [id]
            );
            if (enqueteCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Enquete não encontrada.' });
            }

            if (status === 'ativa') {
                // Inativa todas as outras antes de ativar esta
                await databasePool.query(`UPDATE enquetes SET status = 'inativa' WHERE status = 'ativa'`);
            }

            let updateQuery = `UPDATE enquetes SET status = $1`;
            if (status === 'encerrada') {
                updateQuery += `, data_fim = CURRENT_TIMESTAMP`;
            }
            updateQuery += ` WHERE id = $2 RETURNING *`;

            const updated = await databasePool.query(updateQuery, [status, id]);

            return res.status(200).json({ success: true, data: updated.rows[0] });
        }

        // Excluir enquete (Soft delete)
        if (req.method === 'DELETE') {
            await getAuthenticatedUser(req, ['admin', 'moderator']);

            const id = url.searchParams.get('id');
            if (!id) return res.status(400).json({ message: 'ID obrigatório.' });

            await databasePool.query(`UPDATE enquetes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
            return res.status(200).json({ success: true, message: 'Enquete removida.' });
        }

        // EDITAR ENQUETE (Detalhes e Opções)
        if (req.method === 'PATCH' && endpoint === 'editar') {
            await getAuthenticatedUser(req, ['admin', 'moderator', 'editor']);
            const body = await parseBody(req);
            const { id, titulo, pergunta, cor_tema, mostrar_votos, opcoes } = body;

            if (!id) return res.status(400).json({ message: 'ID obrigatório para edição.' });

            const client = await databasePool.getClient();
            try {
                await client.query('BEGIN');

                // 1. Atualizar dados básicos da enquete
                const enqueteUpdate = await client.query(`
                    UPDATE enquetes 
                    SET titulo = $1,
                        pergunta = $2,
                        cor_tema = $3,
                        mostrar_votos = $4,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $5 AND deleted_at IS NULL
                    RETURNING id
                `, [titulo, pergunta, cor_tema, mostrar_votos, id]);

                if (enqueteUpdate.rowCount === 0) {
                    throw new Error('Enquete não encontrada ou já excluída.');
                }

                // 2. Sincronizar opções se o array foi enviado
                if (opcoes && Array.isArray(opcoes)) {
                    const idsEnviados = opcoes.map(o => parseInt(o.id)).filter(id => !isNaN(id));

                    // A. Remover opções que não estão no novo array
                    if (idsEnviados.length > 0) {
                        await client.query(`
                            DELETE FROM enquete_opcoes 
                            WHERE enquete_id = $1 AND id != ALL($2::int[])
                        `, [id, idsEnviados]);
                    } else if (opcoes.length > 0) {
                        // Se enviou opções mas nenhuma tem ID, deleta todas as antigas desta enquete
                        await client.query('DELETE FROM enquete_opcoes WHERE enquete_id = $1', [id]);
                    }

                    // B. Atualizar ou Inserir as opções enviadas
                    for (const o of opcoes) {
                        const optionId = parseInt(o.id);
                        const texto = o.texto || o.texto_opcao;
                        const cor = o.cor || o.cor_grafico || '#4F46E5';

                        if (!isNaN(optionId) && optionId > 0) {
                            // Atualiza existente
                            await client.query(`
                                UPDATE enquete_opcoes 
                                SET texto_opcao = $1, cor_grafico = $2
                                WHERE id = $3 AND enquete_id = $4
                            `, [texto, cor, optionId, id]);
                        } else if (texto) {
                            // Insere nova
                            await client.query(`
                                INSERT INTO enquete_opcoes (enquete_id, texto_opcao, cor_grafico)
                                VALUES ($1, $2, $3)
                            `, [id, texto, cor]);
                        }
                    }
                }

                await client.query('COMMIT');
                return res.status(200).json({ success: true, message: 'Alterações salvas com sucesso.' });
            } catch (error) {
                if (client) await client.query('ROLLBACK');
                console.error('[ERRO AO EDITAR ENQUETE]', error);
                return res.status(500).json({ success: false, message: error.message || 'Erro ao salvar alterações da enquete.' });
            } finally {
                if (client) client.release();
            }
        }

        // TOGGLE MOSTRAR VOTOS (Atalho rápido)
        if (req.method === 'PATCH' && endpoint === 'toggle_votos') {
            await getAuthenticatedUser(req, ['admin', 'moderator', 'editor']);
            const body = await parseBody(req);
            const { id } = body;

            if (!id) return res.status(400).json({ message: 'ID obrigatório.' });

            await databasePool.query(`
                UPDATE enquetes 
                SET mostrar_votos = NOT mostrar_votos,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
            `, [id]);

            return res.status(200).json({ success: true, message: 'Visibilidade de votos alterada.' });
        }

        // Default 404
        res.status(404).json({ message: 'Endpoint não implementado ou método inválido' });

    } catch (error) {
        // Erros de autenticação retornam 401
        if (error.message.includes('Token') || error.message.includes('autenticação') || error.message.includes('Acesso não autorizado')) {
            return res.status(401).json({ success: false, message: error.message });
        }
        console.error('Erro na API de Enquetes:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};
