import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

/**
 * Validação simples por normalização
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

    const removePlural = (word) => {
        if (word.endsWith('s') && word.length > 3) {
            return word.slice(0, -1);
        }
        return word;
    };

    const normalizedGuess = normalize(guess);
    const normalizedAnswer = normalize(correctAnswer);

    if (normalizedGuess === normalizedAnswer) {
        return true;
    }

    const answerWords = normalizedAnswer.split(' ').map(removePlural);
    const guessWords = normalizedGuess.split(' ').map(removePlural);

    return answerWords.every(word => guessWords.includes(word));
}

/**
 * Validação com IA (backend)
 */
async function validateGuessWithAI(guess, correctAnswer) {
    try {
        const localResult = simpleValidateGuess(guess, correctAnswer);

        if (localResult) {
            return true;
        }

        const response = await fetch('/api/caixa-misteriosa/validate-guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guess, correctAnswer })
        });

        if (response.ok) {
            const data = await response.json();
            return data.isCorrect;
        }

        return localResult;
    } catch (error) {
        console.error('Erro ao validar:', error);
        return simpleValidateGuess(guess, correctAnswer);
    }
}

// Página de Sorteio - Mostra participantes corretos e permite fazer sorteio
const WinnerDrawView = ({ liveGame, actions, loading }) => {
    const { currentThemeData } = useTheme();
    const [correctParticipants, setCorrectParticipants] = useState([]);
    const [stats, setStats] = useState({
        totalParticipants: 0,
        totalSubmissions: 0,
        correctGuesses: 0,
        uniqueParticipants: 0
    });
    const [winner, setWinner] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [showWinner, setShowWinner] = useState(false);

    const { giveaway, submissions, status, winner: existingWinner } = liveGame || {};

    // Estilos com tema dinâmico
    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem'
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
        countdownSection: {
            background: currentThemeData.gradient,
            padding: '3rem',
            borderRadius: '1rem',
            border: `2px solid ${currentThemeData.primary}`,
            marginBottom: '2rem',
            textAlign: 'center',
            boxShadow: `0 10px 30px ${currentThemeData.primary}4D`
        },
        countdownTitle: {
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'white',
            marginBottom: '2rem'
        },
        countdownDisplay: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem'
        },
        countdownNumber: {
            fontSize: '5rem',
            fontWeight: '700',
            color: 'white',
            animation: 'pulse 1s ease-in-out infinite',
            marginBottom: '0.5rem'
        },
        countdownLabel: {
            fontSize: '1.2rem',
            color: 'white',
            opacity: 0.9,
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
        },
        confettiAnimation: {
            fontSize: '3rem',
            animation: 'bounce 2s ease-in-out infinite'
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
        card: {
            background: currentThemeData.surface,
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: `1px solid ${currentThemeData.border}`,
            marginBottom: '2rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        },
        h3: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: currentThemeData.primary,
            marginBottom: '1rem'
        },
        winnerCard: {
            background: currentThemeData.gradient,
            padding: '2rem',
            borderRadius: '1rem',
            border: `3px solid ${currentThemeData.primary}`,
            marginBottom: '2rem',
            textAlign: 'center',
            boxShadow: `0 10px 30px ${currentThemeData.primary}4D`,
            animation: 'fadeInUp 1s ease-out'
        },
        winnerInfo: {
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '2rem',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(10px)'
        },
        winnerName: {
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
        },
        winnerDetail: {
            fontSize: '1.1rem',
            color: 'white',
            opacity: 0.95,
            marginTop: '0.75rem'
        },
        participantsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        },
        participantItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: currentThemeData.secondary,
            padding: '1rem',
            borderRadius: '0.5rem',
            transition: 'all 0.2s',
            border: `1px solid ${currentThemeData.border}`
        },
        participantRank: {
            background: currentThemeData.primary,
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        },
        participantInfo: {
            flex: 1
        },
        participantName: {
            fontSize: '1.1rem',
            fontWeight: '600',
            color: currentThemeData.primary,
            marginBottom: '0.25rem'
        },
        participantMeta: {
            fontSize: '0.9rem',
            color: currentThemeData.textSecondary
        },
        participantTime: {
            fontSize: '0.85rem',
            color: currentThemeData.textSecondary,
            fontWeight: '600'
        },
        emptyState: {
            textAlign: 'center',
            color: currentThemeData.textSecondary,
            padding: '3rem 1rem'
        },
        drawButton: {
            width: '100%',
            background: currentThemeData.gradient,
            color: 'white',
            border: 'none',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            transition: 'all 0.3s',
            boxShadow: `0 10px 20px ${currentThemeData.primary}4D`,
            marginBottom: '1rem'
        },
        newGameButton: {
            width: '100%',
            background: currentThemeData.primary,
            color: 'white',
            border: 'none',
            padding: '1rem',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: `0 2px 8px ${currentThemeData.primary}33`
        },
        finishedMessage: {
            width: '100%',
            background: currentThemeData.gradient,
            padding: '1.5rem',
            borderRadius: '0.75rem',
            textAlign: 'center',
            border: `2px solid ${currentThemeData.primary}`,
            marginTop: '1rem',
            boxShadow: `0 4px 12px ${currentThemeData.primary}33`
        }
    };

    // Verifica se já existe ganhador no jogo ao carregar
    useEffect(() => {
        if (existingWinner && !winner) {
            console.log('🏆 [DRAW VIEW] Ganhador existente encontrado:', existingWinner);
            setWinner(existingWinner);
            setShowWinner(true); // Mostra imediatamente se já existe
        }
    }, [existingWinner]);

    // Busca participantes que acertaram
    useEffect(() => {
        if (liveGame?.id && submissions && giveaway?.product?.name) {
            fetchCorrectParticipants();
        }
    }, [liveGame?.id, submissions?.length, giveaway?.product?.name]);

    const fetchCorrectParticipants = async () => {
        try {
            console.log('🎯 [DRAW VIEW] Buscando participantes que acertaram...');

            const uniqueParticipantsSet = new Set();
            const correctList = [];

            // Valida todos os palpites em paralelo
            const validationPromises = submissions.map(async (sub) => {
                uniqueParticipantsSet.add(sub.user_phone || sub.user_name);

                if (sub.guess && giveaway.product.name) {
                    const isMatch = await validateGuessWithAI(sub.guess, giveaway.product.name);

                    if (isMatch) {
                        return {
                            id: sub.id,
                            name: sub.userName || sub.user_name,
                            neighborhood: sub.userNeighborhood || sub.user_neighborhood,
                            guess: sub.guess,
                            createdAt: sub.created_at
                        };
                    }
                }
                return null;
            });

            const results = await Promise.all(validationPromises);
            const filteredCorrect = results.filter(r => r !== null);

            setCorrectParticipants(filteredCorrect);

            setStats({
                totalParticipants: 0, // Pode ser implementado se tiver endpoint
                totalSubmissions: submissions.length,
                correctGuesses: filteredCorrect.length,
                uniqueParticipants: uniqueParticipantsSet.size
            });

            console.log('🎯 [DRAW VIEW] Participantes corretos:', filteredCorrect.length);
        } catch (error) {
            console.error('Erro ao buscar participantes:', error);
        }
    };

    // Inicia countdown após sorteio
    const startCountdown = () => {
        setCountdown(10);
        setShowWinner(false);

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    setShowWinner(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleDrawWinner = async () => {
        if (correctParticipants.length === 0) {
            const confirmar = window.confirm(
                '⚠️ Ninguém acertou o produto!\n\n' +
                `Total de participantes: ${stats.totalSubmissions}\n\n` +
                'Deseja sortear entre TODOS os participantes mesmo assim?'
            );

            if (!confirmar) return;

            // Sortear entre todos
            try {
                setIsDrawing(true);
                const res = await fetch('/api/caixa-misteriosa/game/draw-winner-from-all', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                const data = await res.json();

                if (data.success) {
                    setWinner(data.winner);
                    startCountdown(); // Inicia animação de countdown
                    await actions.refreshLiveGame();
                } else {
                    alert(`❌ ${data.message}`);
                }
            } catch (error) {
                alert(`❌ Erro ao sortear: ${error.message}`);
            } finally {
                setIsDrawing(false);
            }
            return;
        }

        // Sortear entre os que acertaram
        try {
            setIsDrawing(true);
            const res = await fetch('/api/caixa-misteriosa/game/draw-winner', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            const data = await res.json();

            if (data.success) {
                setWinner(data.winner);
                startCountdown(); // Inicia animação de countdown
                await actions.refreshLiveGame();
            } else {
                alert(`❌ ${data.message}`);
            }
        } catch (error) {
            alert(`❌ Erro ao sortear: ${error.message}`);
        } finally {
            setIsDrawing(false);
        }
    };

    if (!giveaway || !giveaway.product) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h3 style={styles.h3}>Dados Incompletos</h3>
                    <p style={{color: currentThemeData.warning}}>Os dados do jogo estão incompletos.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>
                {`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                @keyframes fadeInUp {
                    0% {
                        opacity: 0;
                        transform: translateY(50px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-20px); }
                    60% { transform: translateY(-10px); }
                }
                `}
            </style>
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

            {/* Informações do Jogo */}
            <div style={styles.card}>
                <h3 style={styles.h3}>🎯 Sorteio: {giveaway.product.name}</h3>
                <p style={{color: currentThemeData.textSecondary, marginBottom: '1rem'}}>
                    <strong>Patrocinador:</strong> {giveaway.sponsor?.name || 'N/A'}
                </p>
                <p style={{color: currentThemeData.textSecondary}}>
                    <strong>Status:</strong>{' '}
                    <span style={{
                        color: status === 'closed' ? currentThemeData.warning :
                               status === 'finished' ? currentThemeData.primary : currentThemeData.textSecondary
                    }}>
                        {status === 'closed' ? '🟡 Aguardando Sorteio' :
                         status === 'finished' ? '🏁 Finalizado' : status}
                    </span>
                </p>
            </div>

            {/* Countdown antes de revelar ganhador */}
            {winner && !showWinner && (
                <div style={styles.countdownSection}>
                    <h3 style={styles.countdownTitle}>⏰ Revelando ganhador em:</h3>
                    <div style={styles.countdownDisplay}>
                        <div style={styles.countdownNumber}>{countdown}</div>
                        <div style={styles.countdownLabel}>segundos</div>
                    </div>
                    <div style={styles.confettiAnimation}>🎉</div>
                </div>
            )}

            {/* Ganhador em Destaque (após countdown) */}
            {winner && showWinner && (
                <div style={styles.winnerCard}>
                    <h2 style={{...styles.h3, fontSize: '2rem', marginBottom: '1.5rem'}}>
                        🏆 GANHADOR DO SORTEIO
                    </h2>
                    <div style={styles.winnerInfo}>
                        <div style={styles.winnerName}>{winner.userName || winner.user_name}</div>
                        <div style={styles.winnerDetail}>
                            <strong>Bairro:</strong> {winner.userNeighborhood || winner.user_neighborhood}
                        </div>
                        <div style={styles.winnerDetail}>
                            <strong>Palpite:</strong> "{winner.guess}"
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de Participantes que Acertaram */}
            <div style={styles.card}>
                <h3 style={styles.h3}>
                    ✅ Participantes que Acertaram ({correctParticipants.length})
                </h3>

                {correctParticipants.length > 0 ? (
                    <div style={styles.participantsList}>
                        {correctParticipants.map((participant, index) => (
                            <div key={participant.id} style={styles.participantItem}>
                                <div style={styles.participantRank}>#{index + 1}</div>
                                <div style={styles.participantInfo}>
                                    <div style={styles.participantName}>{participant.name}</div>
                                    <div style={styles.participantMeta}>
                                        {participant.neighborhood} - {participant.guess}
                                    </div>
                                </div>
                                {participant.createdAt && (
                                    <div style={styles.participantTime}>
                                        {new Date(participant.createdAt).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <p style={{fontSize: '3rem', margin: '0 0 1rem 0'}}>😔</p>
                        <p style={{fontSize: '1.1rem', margin: '0 0 0.5rem 0'}}>
                            Nenhum participante acertou o produto
                        </p>
                        <p style={{fontSize: '0.9rem', color: '#6B7280'}}>
                            Você pode sortear entre todos os participantes
                        </p>
                    </div>
                )}
            </div>

            {/* Botão de Sorteio */}
            {status === 'closed' && !winner && (
                <button
                    onClick={handleDrawWinner}
                    disabled={isDrawing || loading}
                    style={{
                        ...styles.drawButton,
                        opacity: (isDrawing || loading) ? 0.5 : 1,
                        cursor: (isDrawing || loading) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isDrawing ? '🎲 Sorteando...' : `🎲 Fazer o Sorteio Agora (${stats.correctGuesses} ${stats.correctGuesses === 1 ? 'candidato' : 'candidatos'})`}
                </button>
            )}

            {/* Mensagem após finalizar - SEM botão para não fechar a página */}
            {status === 'finished' && winner && showWinner && (
                <div style={styles.finishedMessage}>
                    <p style={{fontSize: '1.2rem', color: 'white', margin: 0}}>
                        ✅ Sorteio finalizado! Use o botão "🎮 Controles" no topo para voltar aos controles.
                    </p>
                </div>
            )}
            </div>
        </>
    );
};


export default WinnerDrawView;
