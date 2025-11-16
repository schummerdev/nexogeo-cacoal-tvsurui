// 🔍 ENDPOINT TEMPORÁRIO DE DEBUG - SISTEMA DE REFERRALS
// Acesse: https://nexogeo-rolim-record.vercel.app/api/debug-referrals

const { query } = require('../lib/db');

module.exports = async (req, res) => {
    try {
        // ⚠️ ATENÇÃO: Endpoint de debug - REMOVER em produção!
        console.log('🔍 [DEBUG REFERRALS] Iniciando diagnóstico...');

        const results = {};

        // ========================================
        // 1. VERIFICAR JOGO ATIVO
        // ========================================
        const gameResult = await query(`
            SELECT
                id as game_id,
                status,
                created_at,
                NOW() - created_at as tempo_desde_criacao
            FROM games
            WHERE status IN ('accepting', 'closed')
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        `);
        results.jogo_ativo = gameResult.rows[0] || null;
        const currentGameId = gameResult.rows[0]?.game_id;

        // ========================================
        // 2. VERIFICAR DADOS DO MARIO (ID: 7)
        // ========================================
        const marioResult = await query(`
            SELECT
                id,
                name,
                phone,
                neighborhood,
                city,
                own_referral_code as meu_codigo,
                referral_code as codigo_usado_ao_cadastrar,
                referred_by_id as id_de_quem_me_indicou,
                extra_guesses as palpites_extras,
                used_guesses as palpites_usados,
                created_at as data_cadastro
            FROM public_participants
            WHERE id = 7
        `);
        results.mario = marioResult.rows[0] || null;

        // ========================================
        // 3. VERIFICAR SUBMISSIONS DO MARIO
        // ========================================
        const marioSubmissionsResult = await query(`
            SELECT
                s.id as submission_id,
                s.game_id,
                s.public_participant_id,
                s.guess_text as palpite,
                s.is_correct as acertou,
                s.created_at as data_palpite,
                g.status as status_do_jogo
            FROM submissions s
            LEFT JOIN games g ON s.game_id = g.id
            WHERE s.public_participant_id = 7
              AND s.deleted_at IS NULL
            ORDER BY s.created_at DESC
        `);
        results.mario_submissions = marioSubmissionsResult.rows;

        // ========================================
        // 4. VERIFICAR QUEM INDICOU O MARIO
        // ========================================
        if (results.mario?.id_de_quem_me_indicou) {
            const referrerResult = await query(`
                SELECT
                    id,
                    name as quem_indicou,
                    own_referral_code as codigo_dele,
                    extra_guesses as palpites_extras_ganhos
                FROM public_participants
                WHERE id = $1
            `, [results.mario.id_de_quem_me_indicou]);
            results.quem_indicou_mario = referrerResult.rows[0] || null;
        } else {
            results.quem_indicou_mario = null;
        }

        // ========================================
        // 5. LISTAR TODOS OS REFERRALS DE QUEM INDICOU
        // ========================================
        if (results.mario?.id_de_quem_me_indicou && currentGameId) {
            const referralsResult = await query(`
                SELECT
                    pp.id,
                    pp.name,
                    pp.phone,
                    pp.created_at as data_cadastro,
                    EXISTS(
                        SELECT 1 FROM submissions s
                        WHERE s.public_participant_id = pp.id
                          AND s.game_id = $2
                          AND s.deleted_at IS NULL
                    ) as jogou_no_jogo_atual,
                    EXISTS(
                        SELECT 1 FROM submissions s
                        WHERE s.public_participant_id = pp.id
                          AND s.deleted_at IS NULL
                    ) as ja_jogou_alguma_vez,
                    (SELECT COUNT(*) FROM submissions s WHERE s.public_participant_id = pp.id) as total_palpites
                FROM public_participants pp
                WHERE pp.referred_by_id = $1
                ORDER BY pp.created_at DESC
            `, [results.mario.id_de_quem_me_indicou, currentGameId]);
            results.lista_referrals_completa = referralsResult.rows;
        } else {
            results.lista_referrals_completa = [];
        }

        // ========================================
        // 6. TESTAR QUERY ATUAL DO SISTEMA
        // ========================================
        if (results.mario?.id_de_quem_me_indicou && currentGameId) {
            const systemQueryResult = await query(`
                SELECT
                    pp.id,
                    pp.name,
                    pp.phone,
                    pp.created_at::text as registeredAt,
                    EXISTS(
                        SELECT 1 FROM submissions s
                        WHERE s.public_participant_id = pp.id
                          AND s.game_id = $2
                          AND s.deleted_at IS NULL
                    ) as hasPlayed
                FROM public_participants pp
                WHERE pp.referred_by_id = $1
                  AND (
                      EXISTS(
                          SELECT 1 FROM submissions s
                          WHERE s.public_participant_id = pp.id
                            AND s.game_id = $2
                            AND s.deleted_at IS NULL
                      )
                      OR
                      NOT EXISTS(
                          SELECT 1 FROM submissions s
                          WHERE s.public_participant_id = pp.id
                            AND s.deleted_at IS NULL
                      )
                  )
                ORDER BY pp.created_at DESC
            `, [results.mario.id_de_quem_me_indicou, currentGameId]);
            results.query_do_sistema = systemQueryResult.rows;
        } else {
            results.query_do_sistema = [];
        }

        // ========================================
        // 7. QUERY SIMPLIFICADA (TODOS REFERRALS)
        // ========================================
        const allReferralsResult = await query(`
            SELECT
                pp.id,
                pp.name,
                pp.phone,
                pp.referred_by_id,
                pp.created_at,
                (SELECT COUNT(*) FROM submissions WHERE public_participant_id = pp.id) as total_palpites,
                (SELECT MAX(game_id) FROM submissions WHERE public_participant_id = pp.id) as ultimo_jogo_id
            FROM public_participants pp
            WHERE pp.referred_by_id IS NOT NULL
            ORDER BY pp.created_at DESC
        `);
        results.todos_referrals_sem_filtro = allReferralsResult.rows;

        // ========================================
        // 8. RESUMO GERAL DO SISTEMA
        // ========================================
        const totalParticipants = await query('SELECT COUNT(*) as total FROM public_participants');
        const totalWithReferral = await query('SELECT COUNT(*) as total FROM public_participants WHERE referred_by_id IS NOT NULL');
        const totalSubmissions = await query('SELECT COUNT(*) as total FROM submissions WHERE deleted_at IS NULL');
        const activeGames = await query('SELECT COUNT(*) as total FROM games WHERE status IN (\'accepting\', \'closed\') AND deleted_at IS NULL');

        results.resumo_geral = {
            total_participantes: parseInt(totalParticipants.rows[0].total),
            participantes_com_referencia: parseInt(totalWithReferral.rows[0].total),
            total_palpites: parseInt(totalSubmissions.rows[0].total),
            jogos_ativos: parseInt(activeGames.rows[0].total)
        };

        // ========================================
        // 🎯 DIAGNÓSTICO AUTOMÁTICO
        // ========================================
        const diagnostico = {
            mario_existe: !!results.mario,
            mario_tem_referred_by_id: !!results.mario?.id_de_quem_me_indicou,
            mario_jogou_alguma_vez: results.mario_submissions.length > 0,
            mario_jogou_no_jogo_atual: results.mario_submissions.some(s => s.game_id === currentGameId),
            mario_aparece_na_query_sem_filtro: results.todos_referrals_sem_filtro.some(p => p.id === 7),
            mario_aparece_na_query_do_sistema: results.query_do_sistema.some(p => p.id === 7),
        };

        // Determinar o problema
        if (!diagnostico.mario_existe) {
            diagnostico.problema = '❌ Mario (ID: 7) não existe no banco';
            diagnostico.solucao = 'Verificar se o ID está correto';
        } else if (!diagnostico.mario_tem_referred_by_id) {
            diagnostico.problema = '❌ Mario não tem referred_by_id (não foi indicado por ninguém)';
            diagnostico.solucao = 'Verificar processo de cadastro com link de referência';
        } else if (!diagnostico.mario_aparece_na_query_sem_filtro) {
            diagnostico.problema = '❌ Mario não aparece mesmo sem filtros';
            diagnostico.solucao = 'Problema nos dados - verificar integridade';
        } else if (diagnostico.mario_jogou_alguma_vez && !diagnostico.mario_jogou_no_jogo_atual) {
            diagnostico.problema = '⚠️ Mario jogou em jogo ANTERIOR (query está correta, ele não deve aparecer)';
            diagnostico.solucao = 'Comportamento esperado - Mario já participou de outro jogo';
        } else if (!diagnostico.mario_aparece_na_query_do_sistema) {
            diagnostico.problema = '❌ Mario deveria aparecer mas a query está filtrando errado';
            diagnostico.solucao = 'Ajustar lógica da query getReferralsByParticipant';
        } else {
            diagnostico.problema = '✅ Mario aparece na query do sistema!';
            diagnostico.solucao = 'Verificar frontend ou logs da API';
        }

        results.diagnostico = diagnostico;

        // ========================================
        // 📊 RETORNAR RESULTADOS
        // ========================================
        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        });

    } catch (error) {
        console.error('❌ Erro no debug:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};
