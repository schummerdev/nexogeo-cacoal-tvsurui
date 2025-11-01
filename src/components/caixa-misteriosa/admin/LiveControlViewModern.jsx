import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

/**
 * Validação inteligente de palpite
 * ORDEM DE VALIDAÇÃO:
 * 1️⃣ Validação local (rápida, sem custo de API)
 * 2️⃣ Se rejeitar, chama backend com IA (para casos de variação)
 */
async function validateGuessWithAI(guess, correctAnswer) {
    try {
        // 1️⃣ PRIMEIRA TENTATIVA: Validação local (rápida)
        const localResult = simpleValidateGuess(guess, correctAnswer);

        if (localResult) {
            console.log('✅ [VALIDAÇÃO LOCAL] Palpite correto!', { guess, correctAnswer });
            return true;
        }

        console.log('❌ [VALIDAÇÃO LOCAL] Rejeitado, tentando com IA...', { guess, correctAnswer });

        // 2️⃣ SEGUNDA TENTATIVA: Validação com IA (backend)
        const response = await fetch('/api/caixa-misteriosa/validate-guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guess, correctAnswer })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('🤖 [VALIDAÇÃO IA] Resultado:', data);
            return data.isCorrect;
        }

        // Se API falhou, mantém resultado local
        console.warn('⚠️ API de validação falhou, mantendo resultado local');
        return localResult;

    } catch (error) {
        console.error('❌ Erro ao validar:', error);
        return simpleValidateGuess(guess, correctAnswer);
    }
}

/**
 * Validação simples por normalização (fallback)
 */
function simpleValidateGuess(guess, correctAnswer) {
    const normalize = (text) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9\s]/g, '') // Remove pontuação
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim();
    };

    // Remove sufixos de plural para comparação (s, es)
    const removePlural = (word) => {
        // Remove 's' final (ex: roupas → roupa)
        if (word.endsWith('s') && word.length > 3) {
            return word.slice(0, -1);
        }
        return word;
    };

    const normalizedGuess = normalize(guess);
    const normalizedAnswer = normalize(correctAnswer);

    // Comparação exata
    if (normalizedGuess === normalizedAnswer) {
        return true;
    }

    // Palavras muito comuns que devem ser ignoradas (artigos, preposições)
    const stopWords = ['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'para', 'com'];

    // Filtra palavras principais (remove stop words)
    const answerWords = normalizedAnswer.split(' ')
        .filter(word => !stopWords.includes(word) && word.length > 2)
        .map(removePlural);

    const guessWords = normalizedGuess.split(' ')
        .filter(word => !stopWords.includes(word) && word.length > 2)
        .map(removePlural);

    // Se TODAS as palavras do palpite estão na resposta, aceita como correto
    // Isso permite "maquina lavar" = "maquina de lavar roupa"
    // Lógica: Se o usuário acertou as palavras principais, deve ser considerado correto
    const guessInAnswer = guessWords.length > 0 && guessWords.every(word => answerWords.includes(word));

    const isMatch = guessInAnswer;

    console.log('🔍 [VALIDAÇÃO LOCAL DEBUG]:', {
        guess: normalizedGuess,
        answer: normalizedAnswer,
        guessWords,
        answerWords,
        allGuessWordsInAnswer: guessInAnswer,
        isMatch
    });

    return isMatch;
}

// Painel Admin Moderno - Baseado no design da página pública
const LiveControlViewModern = ({ liveGame, actions, loading, onEditSponsor, onEditProduct }) => {
    const { currentThemeData } = useTheme();
    const [participants, setParticipants] = useState([]);
    const [stats, setStats] = useState({
        totalParticipants: 0,
        totalSubmissions: 0,
        correctGuesses: 0,
        uniqueParticipants: 0
    });
    const [correctGuessIds, setCorrectGuessIds] = useState(new Set());

    const { giveaway, revealedCluesCount, status, submissions } = liveGame || {};

    // Estilos usando tema dinâmico
    const styles = {
        container: {
            maxWidth: '1400px',
            margin: '0 auto'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
        },
        statCard: {
            background: currentThemeData.surface,
            padding: '1.5rem',
            borderRadius: '0.75rem',
            textAlign: 'center',
            border: `1px solid ${currentThemeData.border}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        },
        statValue: {
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: currentThemeData.primary,
            marginBottom: '0.5rem'
        },
        statLabel: {
            fontSize: '0.9rem',
            color: currentThemeData.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1.8fr',
            gap: '2rem',
            '@media (max-width: 1024px)': {
                gridTemplateColumns: '1fr'
            }
        },
        column: {
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
        },
        card: {
            background: currentThemeData.surface,
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: `1px solid ${currentThemeData.border}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        },
        cardGreen: {
            background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '2px solid #10b981',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
            color: 'white'
        },
        h3: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: currentThemeData.text,
            marginBottom: '1rem'
        },
        infoBox: {
            background: currentThemeData.secondary,
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            lineHeight: '1.8',
            border: `1px solid ${currentThemeData.border}`,
            color: currentThemeData.text
        },
        publicLinkBox: {
            background: currentThemeData.gradient,
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            boxShadow: `0 2px 8px ${currentThemeData.primary}33`
        },
        linkInput: {
            flex: 1,
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.25rem',
            padding: '0.5rem',
            color: 'white',
            fontSize: '0.85rem'
        },
        winnerBox: {
            background: currentThemeData.gradient,
            padding: '1rem',
            borderRadius: '0.5rem',
            boxShadow: `0 2px 8px ${currentThemeData.primary}33`
        },
        status: (status) => ({
            fontWeight: 'bold',
            color: status === 'accepting' ? currentThemeData.success :
                   status === 'closed' ? currentThemeData.warning :
                   status === 'finished' ? currentThemeData.primary : currentThemeData.textSecondary
        }),
        buttonGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '1rem'
        },
        button: {
            primary: {
                background: currentThemeData.gradient,
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: `0 2px 8px ${currentThemeData.primary}4D`
            },
            warning: {
                background: currentThemeData.warning,
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                boxShadow: `0 2px 8px ${currentThemeData.warning}4D`
            },
            success: {
                background: currentThemeData.success,
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                fontWeight: '600',
                boxShadow: `0 2px 4px ${currentThemeData.success}33`
            },
            danger: {
                background: currentThemeData.danger,
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                boxShadow: `0 2px 4px ${currentThemeData.danger}33`
            },
            refresh: {
                background: currentThemeData.primary,
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                fontWeight: '600',
                boxShadow: `0 2px 4px ${currentThemeData.primary}33`
            }
        },
        cluesList: {
            listStyle: 'none',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        clue: (isRevealed) => ({
            padding: '0.75rem',
            borderRadius: '0.5rem',
            background: isRevealed ? currentThemeData.secondary : currentThemeData.background,
            color: isRevealed ? currentThemeData.text : currentThemeData.textSecondary,
            border: isRevealed ? `2px solid ${currentThemeData.primary}` : `1px solid ${currentThemeData.border}`,
            transition: 'all 0.3s'
        }),
        feedContainer: {
            height: '500px',
            overflowY: 'auto',
            background: currentThemeData.gradient,
            padding: '1rem',
            borderRadius: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            border: `1px solid ${currentThemeData.border}`
        },
        submissionItem: {
            background: currentThemeData.surface,
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            transition: 'all 0.2s',
            border: `1px solid ${currentThemeData.border}`,
            color: currentThemeData.text
        },
        emptyState: {
            textAlign: 'center',
            color: currentThemeData.textSecondary,
            padding: '3rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
        }
    };

    // Auto-refresh a cada 60 segundos
    const intervalRef = useRef(null);

    useEffect(() => {
        // Inicia auto-refresh
        intervalRef.current = setInterval(() => {
            console.log('🔄 Auto-refresh: Atualizando dados do jogo...');
            actions.refreshLiveGame();
        }, 60000); // 60 segundos

        // Cleanup ao desmontar componente
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                console.log('🔄 Auto-refresh desativado');
            }
        };
    }, [actions]);

    // Buscar participantes e estatísticas
    useEffect(() => {
        if (liveGame?.id) {
            fetchParticipantsAndStats();
        }
    }, [liveGame?.id, submissions?.length]);

    const fetchParticipantsAndStats = async () => {
        try {
            console.log('📊 [STATS] Iniciando busca de participantes e estatísticas...');

            // Buscar todos participantes públicos - REMOVIDO PARA CORRIGIR ERRO 404
            // const participantsRes = await fetch('/api/caixa-misteriosa/debug/participants');
            // console.log('📊 [STATS] Status da resposta:', participantsRes.status);
            // const participantsData = await participantsRes.json();
            // console.log('📊 [STATS] Dados recebidos:', participantsData);
            // const participantsList = participantsData.participants || [];
            // setParticipants(participantsList);

            const participantsList = []; // Define como array vazio por enquanto

            // Calcular estatísticas
            const uniqueParticipantsSet = new Set();
            let correctCount = 0;

            console.log('📊 [STATS] Submissions:', submissions?.length || 0);
            console.log('📊 [STATS] Produto correto:', giveaway?.product?.name);
            console.log('📊 [STATS] Submissions completas:', submissions);
            console.log('📊 [STATS] Condição para loop:', {
                hasSubmissions: !!submissions,
                hasProductName: !!giveaway?.product?.name,
                willEnterLoop: !!(submissions && giveaway?.product?.name)
            });

            if (submissions && giveaway?.product?.name) {
                console.log('✅ [STATS] Entrando no loop de validação com IA...');

                // Valida todos os palpites em paralelo usando IA
                const validationPromises = submissions.map(async (sub, index) => {
                    console.log(`📊 [STATS] Processando submission ${index + 1}:`, sub);
                    uniqueParticipantsSet.add(sub.user_phone || sub.user_name);

                    if (sub.guess && giveaway.product.name) {
                        const isMatch = await validateGuessWithAI(sub.guess, giveaway.product.name);

                        console.log('🔍 [STATS] Comparando:', {
                            userName: sub.userName || sub.user_name,
                            guess: sub.guess,
                            correctAnswer: giveaway.product.name,
                            isMatch
                        });

                        if (isMatch) {
                            console.log('✅ [STATS] Palpite correto encontrado:', sub.user_name || sub.userName, '-', sub.guess);
                            return { isCorrect: true, id: sub.id };
                        }
                    }
                    return { isCorrect: false, id: sub.id };
                });

                // Aguarda todas as validações
                const validationResults = await Promise.all(validationPromises);
                correctCount = validationResults.filter(r => r.isCorrect).length;

                // Armazena IDs dos palpites corretos para marcação visual
                const correctIds = new Set(validationResults.filter(r => r.isCorrect).map(r => r.id));
                setCorrectGuessIds(correctIds);
            }

            const newStats = {
                totalParticipants: participantsList.length,
                totalSubmissions: submissions?.length || 0,
                correctGuesses: correctCount,
                uniqueParticipants: uniqueParticipantsSet.size
            };

            console.log('📊 [STATS] Estatísticas calculadas:', newStats);
            setStats(newStats);
        } catch (error) {
            console.error('❌ Erro ao buscar participantes:', error);
        }
    };

    // Verificação de segurança para garantir que giveaway existe
    if (!giveaway || !giveaway.product || !giveaway.product.name) {
        console.log('🔍 LiveControlViewModern - liveGame:', liveGame, 'giveaway:', giveaway);
        return (
            <div style={styles.card}>
                <h3 style={styles.h3}>Dados Incompletos</h3>
                <p style={{color: currentThemeData.warning, marginBottom: '1rem'}}>Os dados do jogo estão incompletos. Por favor, recarregue ou reset o jogo.</p>
                <button
                    style={styles.button.primary}
                    onClick={() => {
                        localStorage.removeItem('caixaMisteriosa_liveGame');
                        window.location.reload();
                    }}
                >
                    Recarregar Dados
                </button>
                <button
                    style={{...styles.button.danger, marginTop: '1rem'}}
                    onClick={() => {
                        if (window.confirm('⚠️ ATENÇÃO - RESETAR JOGO\n\nIsso irá DELETAR PERMANENTEMENTE do banco de dados:\n❌ O jogo atual\n❌ Todos os palpites\n❌ Dados do ganhador\n\n⚠️ ESTA AÇÃO NÃO PODE SER DESFEITA!\n\nTem certeza?')) {
                            if (window.confirm('🔴 ÚLTIMA CONFIRMAÇÃO\n\nConfirma RESETAR e DELETAR tudo?')) {
                                actions.resetGame();
                            }
                        }
                    }}
                    disabled={loading}
                >
                    Resetar Jogo
                </button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header com Estatísticas */}
            <div style={styles.statsGrid}>
                <div style={{...styles.statCard, borderLeft: '4px solid #10B981'}}>
                    <div style={styles.statValue}>{stats.totalParticipants}</div>
                    <div style={styles.statLabel}>👥 Total Cadastrados</div>
                </div>
                <div style={{...styles.statCard, borderLeft: '4px solid #3B82F6'}}>
                    <div style={styles.statValue}>{stats.uniqueParticipants}</div>
                    <div style={styles.statLabel}>🎮 Participantes Ativos</div>
                </div>
                <div style={{...styles.statCard, borderLeft: '4px solid #A78BFA'}}>
                    <div style={styles.statValue}>{stats.totalSubmissions}</div>
                    <div style={styles.statLabel}>📝 Total de Palpites</div>
                </div>
                <div style={{...styles.statCard, borderLeft: '4px solid #F59E0B'}}>
                    <div style={styles.statValue}>{stats.correctGuesses}</div>
                    <div style={styles.statLabel}>✅ Palpites Corretos</div>
                </div>
            </div>

            {/* Grid Principal */}
            <div style={styles.grid}>
                {/* Coluna de Controles */}
                <div style={styles.column}>
                    <div style={styles.card}>
                        <h3 style={styles.h3}>🎮 Controles do Jogo</h3>

                        <div style={styles.infoBox}>
                            <p><strong>Sorteio atual:</strong> {giveaway?.product?.name || 'Produto não informado'}</p>
                            <p>
                                <strong>Status:</strong>{' '}
                                <span style={styles.status(status)}>
                                    {status === 'accepting' ? '🟢 Aceitando Palpites' :
                                     status === 'closed' ? '🟡 Encerrado' :
                                     status === 'finished' ? '🏁 Finalizado' :
                                     status || 'Desconhecido'}
                                </span>
                            </p>

                            <div style={{marginTop: '1rem', padding: '0.75rem', background: currentThemeData.secondary, borderRadius: '0.5rem', border: `1px solid ${currentThemeData.primary}30`}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                    <p style={{margin: 0, color: currentThemeData.text}}>
                                        <strong>Patrocinador:</strong> {giveaway?.sponsor?.name || 'N/A'}
                                    </p>
                                    <button
                                        onClick={() => onEditSponsor(giveaway.sponsor)}
                                        style={{
                                            background: currentThemeData.primary,
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '0.25rem',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            boxShadow: '0 2px 4px rgba(26, 115, 232, 0.2)'
                                        }}
                                    >
                                        ✏️ Editar
                                    </button>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <p style={{margin: 0, color: currentThemeData.text}}>
                                        <strong>Produto atual:</strong> {giveaway?.product?.name || 'N/A'}
                                    </p>
                                    <button
                                        onClick={() => onEditProduct(giveaway.product)}
                                        style={{
                                            background: currentThemeData.primary,
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '0.25rem',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            boxShadow: '0 2px 4px rgba(26, 115, 232, 0.2)'
                                        }}
                                    >
                                        ✏️ Editar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Link Público */}
                        <div style={styles.publicLinkBox}>
                            <h4 style={{color: 'white', margin: '0 0 0.5rem 0', fontSize: '1rem'}}>🔗 Link Público</h4>
                            <p style={{color: 'white', fontSize: '0.85rem', margin: '0 0 0.75rem 0', opacity: 0.95}}>
                                Compartilhe com os participantes:
                            </p>
                            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                <input
                                    type="text"
                                    value={`${window.location.origin}/caixa-misteriosa-pub/${liveGame.id}`}
                                    readOnly
                                    style={styles.linkInput}
                                />
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/caixa-misteriosa-pub/${liveGame.id}`;
                                        navigator.clipboard.writeText(url).then(() => {
                                            alert('Link copiado para a área de transferência!');
                                        });
                                    }}
                                    style={styles.button.success}
                                >
                                    📋 Copiar
                                </button>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div style={styles.buttonGroup}>
                            {status === 'accepting' && (
                                <button
                                    style={styles.button.warning}
                                    onClick={() => {
                                        if (window.confirm('⚠️ Tem certeza que deseja encerrar os palpites?\n\nApós encerrar, nenhum participante poderá enviar mais palpites.')) {
                                            actions.endSubmissions();
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    ⏸️ Encerrar Palpites
                                </button>
                            )}

                            {status === 'closed' && (
                                <button
                                    style={styles.button.success}
                                    onClick={() => {
                                        console.log('🎲 [SORTEAR] Botão clicado! Abrindo página de sorteio em nova aba...');
                                        // Abre página de sorteio em nova aba
                                        window.open('/dashboard/caixa-misteriosa/sorteio', '_blank', 'noopener,noreferrer');
                                    }}
                                    disabled={loading}
                                >
                                    🎲 Sortear Ganhador ({stats.correctGuesses} {stats.correctGuesses === 1 ? 'acertou' : 'acertaram'})
                                </button>
                            )}

                            {status === 'finished' && liveGame.winner && (
                                <div style={styles.winnerBox}>
                                    <h4 style={{color: 'white', margin: '0 0 0.5rem 0'}}>🏆 Jogo Finalizado!</h4>
                                    <p style={{color: 'white', margin: '0 0 1rem 0', opacity: 0.95}}>
                                        <strong>Vencedor:</strong> {liveGame.winner.userName}<br/>
                                        <strong>Palpite:</strong> {liveGame.winner.guess}
                                    </p>
                                    <button
                                        style={styles.button.primary}
                                        onClick={() => {
                                            if (window.confirm('🎮 Iniciar um novo jogo?\n\nIsso irá:\n✅ Limpar a tela do navegador\n✅ Voltar para configuração\n📊 Os dados deste jogo ficarão salvos no banco de dados')) {
                                                // Limpa o cache do navegador
                                                localStorage.removeItem('caixaMisteriosa_liveGame');
                                                // Recarrega para voltar ao SetupView
                                                // (API não retornará mais jogos 'finished', então voltará ao setup)
                                                window.location.reload();
                                            }
                                        }}
                                        disabled={loading}
                                    >
                                        🔄 Iniciar Novo Jogo
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dicas */}
                    <div style={styles.cardGreen}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem'}}>
                            <h3 style={{...styles.h3, margin: 0, color: 'white'}}>💡 Dicas Reveladas</h3>
                            <button
                                style={{...styles.button.success, padding: '0.5rem 1rem', fontSize: '0.875rem'}}
                                onClick={actions.revealClue}
                                disabled={loading || (revealedCluesCount || 0) >= 5 || status !== 'accepting'}
                            >
                                {(revealedCluesCount || 0) >= 5 ? '✅ Todas reveladas' : `🔓 Revelar Dica (${(revealedCluesCount || 0) + 1}/5)`}
                            </button>
                        </div>
                        <ul style={{...styles.cluesList, color: 'white'}}>
                            {(giveaway?.product?.clues || []).map((clue, i) => (
                                <li key={i} style={{...styles.clue(i < (revealedCluesCount || 0)), color: 'white'}}>
                                    <strong style={{color: 'white'}}>Dica {i + 1}:</strong> {clue}
                                    {i < (revealedCluesCount || 0) && <span style={{marginLeft: '0.5rem'}}>✅</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Coluna de Palpites */}
                <div style={styles.column}>
                    <div style={styles.card}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                            <h3 style={{...styles.h3, margin: 0}}>
                                📝 Palpites Recebidos ({(submissions || []).length})
                            </h3>
                            <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Corrigir erros ortográficos nos palpites?\n\nIsso irá atualizar automaticamente os palpites com a grafia correta usando IA.')) {
                                            try {
                                                const res = await fetch('/api/caixa-misteriosa/game/correct-spelling', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' }
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    if (data.corrected > 0) {
                                                        const corrections = data.corrections.map(c =>
                                                            `"${c.original}" → "${c.corrected}"`
                                                        ).join('\n');
                                                        alert(`✅ ${data.message}\n\nCorreções:\n${corrections}`);
                                                    } else {
                                                        alert(`✅ ${data.message}`);
                                                    }
                                                    actions.refreshLiveGame();
                                                } else {
                                                    alert(`❌ ${data.message}`);
                                                }
                                            } catch (error) {
                                                alert(`❌ Erro ao corrigir ortografia: ${error.message}`);
                                            }
                                        }
                                    }}
                                    style={{...styles.button.primary, fontSize: '0.85rem', padding: '0.4rem 0.8rem'}}
                                    disabled={loading}
                                >
                                    ✏️ Corrigir Ortografia
                                </button>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Limpar palpites ofensivos do banco de dados?\n\nIsso irá remover permanentemente palpites com palavrões e conteúdo inapropriado.')) {
                                            try {
                                                const res = await fetch('/api/caixa-misteriosa/game/clean-offensive', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' }
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    alert(`✅ ${data.message}\n\nPalpites removidos: ${data.removed}`);
                                                    actions.refreshLiveGame();
                                                } else {
                                                    alert(`❌ ${data.message}`);
                                                }
                                            } catch (error) {
                                                alert(`❌ Erro ao limpar palpites: ${error.message}`);
                                            }
                                        }
                                    }}
                                    style={{...styles.button.danger, fontSize: '0.85rem', padding: '0.4rem 0.8rem'}}
                                    disabled={loading}
                                >
                                    🧹 Limpar Ofensivos
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('🔄 Atualizando dados do jogo...');
                                        actions.refreshLiveGame();
                                    }}
                                    style={styles.button.refresh}
                                    disabled={loading}
                                >
                                    {loading ? '⏳' : '🔄'} Atualizar
                                </button>
                            </div>
                        </div>

                        <div style={styles.feedContainer}>
                            {(submissions || []).length > 0 ? (
                                (submissions || []).map((sub, index) => {
                                    const isCorrect = correctGuessIds.has(sub.id);

                                    return (
                                        <div key={index} style={{
                                            ...styles.submissionItem,
                                            borderLeft: isCorrect ? '4px solid #10B981' : `4px solid ${currentThemeData.secondary}`
                                        }}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                                                    {/* Formato: hora:minuto - nome - bairro - palpite */}
                                                    {sub.created_at && (
                                                        <span style={{color: '#6B7280', fontSize: '0.9rem', fontWeight: 'bold'}}>
                                                            {new Date(sub.created_at).toLocaleTimeString('pt-BR', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    )}
                                                    <span style={{color: '#6B7280'}}>-</span>
                                                    <strong style={{color: isCorrect ? '#10B981' : '#A78BFA', fontSize: '0.95rem'}}>
                                                        {(sub.userName || sub.user_name || '').split(' ')[0]}
                                                    </strong>
                                                    <span style={{color: '#6B7280'}}>-</span>
                                                    <span style={{color: '#9CA3AF', fontSize: '0.9rem'}}>
                                                        {sub.userNeighborhood || sub.user_neighborhood || 'Bairro não informado'}
                                                    </span>
                                                    <span style={{color: '#6B7280'}}>-</span>
                                                    <span style={{color: currentThemeData.text, fontSize: '0.95rem', fontWeight: '500'}}>
                                                        {sub.guess}
                                                    </span>
                                                    {isCorrect && <span style={{fontSize: '1.1rem'}}>✅</span>}
                                                </div>
                                                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                                    <button
                                                        onClick={async () => {
                                                            const novoTexto = prompt('Editar palpite:', sub.guess);

                                                            console.log('🔍 [EDIT] Dados coletados:', {
                                                                novoTexto,
                                                                novoTextoTrim: novoTexto?.trim(),
                                                                subId: sub.id,
                                                                subGuess: sub.guess,
                                                                isDifferent: novoTexto?.trim() !== sub.guess.trim()
                                                            });

                                                            if (novoTexto && novoTexto.trim() && novoTexto.trim() !== sub.guess.trim()) {
                                                                try {
                                                                    const payload = {
                                                                        submissionId: sub.id,
                                                                        newGuess: novoTexto.trim()
                                                                    };

                                                                    console.log('📤 [EDIT] Enviando payload:', payload);

                                                                    const res = await fetch('/api/caixa-misteriosa/submissions/edit', {
                                                                        method: 'POST',
                                                                        headers: {
                                                                            'Content-Type': 'application/json',
                                                                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                                                        },
                                                                        body: JSON.stringify(payload)
                                                                    });

                                                                    console.log('📥 [EDIT] Resposta status:', res.status);

                                                                    const data = await res.json();

                                                                    console.log('📥 [EDIT] Resposta data:', data);

                                                                    if (data.success) {
                                                                        alert(`✅ Palpite editado com sucesso!\n\nDe: "${sub.guess}"\nPara: "${novoTexto.trim()}"`);
                                                                        actions.refreshLiveGame();
                                                                    } else {
                                                                        alert(`❌ ${data.message}`);
                                                                    }
                                                                } catch (error) {
                                                                    console.error('❌ [EDIT] Erro:', error);
                                                                    alert(`❌ Erro ao editar: ${error.message}`);
                                                                }
                                                            } else if (novoTexto !== null) {
                                                                alert('❌ O palpite não pode estar vazio ou ser igual ao anterior');
                                                            }
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '1.2rem',
                                                            padding: '0.25rem',
                                                            opacity: 0.7,
                                                            transition: 'opacity 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.opacity = 1}
                                                        onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                                        title="Editar palpite"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`Excluir palpite de ${sub.userName || sub.user_name}?\n\n"${sub.guess}"`)) {
                                                                try {
                                                                    const res = await fetch('/api/caixa-misteriosa/submissions/delete', {
                                                                        method: 'POST',
                                                                        headers: {
                                                                            'Content-Type': 'application/json',
                                                                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                                                        },
                                                                        body: JSON.stringify({
                                                                            submissionId: sub.id
                                                                        })
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.success) {
                                                                        alert(`✅ Palpite excluído com sucesso!`);
                                                                        actions.refreshLiveGame();
                                                                    } else {
                                                                        alert(`❌ ${data.message}`);
                                                                    }
                                                                } catch (error) {
                                                                    alert(`❌ Erro ao excluir: ${error.message}`);
                                                                }
                                                            }
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '1.2rem',
                                                            padding: '0.25rem',
                                                            opacity: 0.7,
                                                            transition: 'opacity 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.opacity = 1}
                                                        onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                                        title="Excluir palpite"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={styles.emptyState}>
                                    <p style={{fontSize: '3rem', margin: '0 0 1rem 0'}}>📭</p>
                                    <p style={{fontSize: '1.1rem', margin: '0 0 0.5rem 0'}}>Aguardando o primeiro palpite...</p>
                                    <p style={{fontSize: '0.9rem', color: '#6B7280'}}>
                                        Os palpites aparecerão aqui em tempo real
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveControlViewModern;
