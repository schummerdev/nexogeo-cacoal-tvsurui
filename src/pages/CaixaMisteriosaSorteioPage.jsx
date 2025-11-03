import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCaixaMisteriosa } from '../hooks/useCaixaMisteriosa';
import { fetchGameParticipantsStats } from '../services/participanteService';

/**
 * Validação simples por normalização
 * MESMA LÓGICA DO PAINEL DE CONTROLE (LiveControlViewModern.jsx)
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
    const guessInAnswer = guessWords.length > 0 && guessWords.every(word => answerWords.includes(word));

    return guessInAnswer;
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

// Página de Sorteio - Standalone
const CaixaMisteriosaSorteioPage = () => {
    const { liveGame, lastFinishedGame, loading, actions } = useCaixaMisteriosa();
    const navigate = useNavigate();

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

    // Usa liveGame se disponível, senão usa lastFinishedGame
    const gameData = liveGame || lastFinishedGame;
    const { giveaway, submissions, status, winner: existingWinner } = gameData || {};

    console.log('🎲 [SORTEIO PAGE] liveGame:', liveGame?.status, 'lastFinishedGame:', lastFinishedGame?.status, 'usando:', gameData?.status);

    // Busca estatísticas totais de participantes cadastrados
    useEffect(() => {
        const loadParticipantStats = async () => {
            try {
                const statsData = await fetchGameParticipantsStats();
                console.log('📊 [SORTEIO] Estatísticas de participantes recebidas:', statsData);

                setStats(prev => ({
                    ...prev,
                    totalParticipants: statsData.total_participants || 0
                }));
            } catch (error) {
                console.error('❌ [SORTEIO] Erro ao buscar estatísticas:', error);
            }
        };

        loadParticipantStats();
    }, []);

    // Verifica se já existe ganhador no jogo ao carregar
    useEffect(() => {
        if (existingWinner && !winner) {
            console.log('🏆 [DRAW PAGE] Ganhador existente encontrado:', existingWinner);
            setWinner(existingWinner);
            setShowWinner(true);
        }
    }, [existingWinner, winner]);

    // Busca participantes que acertaram
    useEffect(() => {
        if (gameData?.id && submissions && giveaway?.product?.name) {
            fetchCorrectParticipants();
        }
    }, [gameData?.id, submissions?.length, giveaway?.product?.name]);

    const fetchCorrectParticipants = async () => {
        try {
            console.log('🎯 [DRAW PAGE] Buscando participantes que acertaram...');

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

            // Atualiza stats mantendo totalParticipants (carregado pelo useEffect separado)
            setStats(prev => ({
                ...prev,
                totalSubmissions: submissions.length,
                correctGuesses: filteredCorrect.length,
                uniqueParticipants: uniqueParticipantsSet.size
            }));

            console.log('🎯 [DRAW PAGE] Participantes corretos:', filteredCorrect.length);
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
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
                });

                const data = await res.json();

                if (data.success) {
                    setWinner(data.winner);
                    startCountdown();
                    // NÃO faz refresh aqui - senão perde os dados pois jogo fica 'finished'
                    // await actions.refreshLiveGame();
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
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
            });

            const data = await res.json();

            if (data.success) {
                setWinner(data.winner);
                startCountdown();
                // NÃO faz refresh aqui - senão perde os dados pois jogo fica 'finished'
                // await actions.refreshLiveGame();
            } else {
                alert(`❌ ${data.message}`);
            }
        } catch (error) {
            alert(`❌ Erro ao sortear: ${error.message}`);
        } finally {
            setIsDrawing(false);
        }
    };

    if (!gameData || !giveaway || !giveaway.product) {
        return (
            <div style={styles.fullPage}>
                <div style={styles.header}>
                    <button
                        onClick={() => navigate('/dashboard/caixa-misteriosa')}
                        style={styles.backButton}
                    >
                        ← Voltar ao Painel
                    </button>
                    <h1 style={styles.pageTitle}>🎲 Página de Sorteio</h1>
                </div>
                <div style={styles.container}>
                    <div style={styles.card}>
                        <h3 style={styles.h3}>Nenhum Jogo Disponível</h3>
                        <p style={{color: '#FBBF24', marginBottom: '1rem'}}>
                            {!gameData ? 'Nenhum jogo ativo ou finalizado encontrado.' : 'Os dados do jogo estão incompletos.'}
                        </p>
                        <p style={{color: '#9CA3AF', fontSize: '0.9rem'}}>
                            Volte ao painel e inicie um novo jogo ou aguarde um jogo ser encerrado para sorteio.
                        </p>
                    </div>
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
            <div style={styles.fullPage}>
                {/* Header fixo */}
                <div style={styles.header}>
                    <button
                        onClick={() => navigate('/dashboard/caixa-misteriosa')}
                        style={styles.backButton}
                    >
                        ← Voltar ao Painel
                    </button>
                    <h1 style={styles.pageTitle}>🎲 Sorteio: {giveaway.product.name}</h1>
                </div>

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
                        <p style={{color: '#9CA3AF', marginBottom: '1rem'}}>
                            <strong>Patrocinador:</strong> {giveaway.sponsor?.name || 'N/A'}
                        </p>
                        <p style={{color: '#9CA3AF'}}>
                            <strong>Status:</strong>{' '}
                            <span style={{
                                color: status === 'closed' ? '#F59E0B' :
                                       status === 'finished' ? '#10B981' : '#9CA3AF'
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
                                <div style={styles.winnerName}>{winner.userName || winner.user_name || winner.name}</div>
                                <div style={styles.winnerDetail}>
                                    <strong>Bairro:</strong> {winner.userNeighborhood || winner.user_neighborhood || winner.neighborhood || 'Não informado'}
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
                                            <div style={styles.participantSingleLine}>
                                                <strong style={styles.participantName}>{participant.name}</strong>
                                                <span style={styles.participantDivider}> - </span>
                                                <span style={styles.participantDetail}>{participant.neighborhood || 'Centro'}</span>
                                                <span style={styles.participantDivider}> - </span>
                                                <span style={styles.participantDetail}>{participant.guess}</span>
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

                    {/* Mensagem após finalizar */}
                    {status === 'finished' && winner && showWinner && (
                        <div style={styles.finishedMessage}>
                            <p style={{fontSize: '1.2rem', color: '#10B981', margin: 0}}>
                                ✅ Sorteio finalizado! Clique em "← Voltar ao Painel" para retornar aos controles.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// Estilos
const styles = {
    fullPage: {
        minHeight: '100vh',
        background: '#111827',
        color: 'white'
    },
    header: {
        background: '#1F2937',
        padding: '1.5rem 2rem',
        borderBottom: '2px solid #374151',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
    },
    pageTitle: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#10B981',
        margin: 0
    },
    backButton: {
        background: '#4B5563',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
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
        background: '#1F2937',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        textAlign: 'center'
    },
    statValue: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#10B981',
        marginBottom: '0.5rem'
    },
    statLabel: {
        fontSize: '0.9rem',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    card: {
        background: '#1F2937',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid #374151',
        marginBottom: '2rem'
    },
    h3: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#D1D5DB',
        marginBottom: '1rem'
    },
    countdownSection: {
        background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
        padding: '3rem',
        borderRadius: '1rem',
        border: '2px solid #F59E0B',
        marginBottom: '2rem',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)'
    },
    countdownTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#F59E0B',
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
        background: 'linear-gradient(45deg, #FFD700, #FFED4E)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'pulse 1s ease-in-out infinite',
        marginBottom: '0.5rem'
    },
    countdownLabel: {
        fontSize: '1.2rem',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
    },
    confettiAnimation: {
        fontSize: '3rem',
        animation: 'bounce 2s ease-in-out infinite'
    },
    winnerCard: {
        background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
        padding: '2rem',
        borderRadius: '1rem',
        border: '3px solid #10B981',
        marginBottom: '2rem',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
        animation: 'fadeInUp 1s ease-out'
    },
    winnerInfo: {
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '2rem',
        borderRadius: '0.75rem'
    },
    winnerName: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#FDE047',
        marginBottom: '1rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    winnerDetail: {
        fontSize: '1.1rem',
        color: '#D1FAE5',
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
        background: '#374151',
        padding: '1rem',
        borderRadius: '0.5rem',
        transition: 'all 0.2s'
    },
    participantRank: {
        background: '#10B981',
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
    participantSingleLine: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.25rem'
    },
    participantName: {
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#10B981'
    },
    participantDivider: {
        color: '#6B7280',
        fontSize: '0.95rem'
    },
    participantDetail: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#D1D5DB'
    },
    participantMeta: {
        fontSize: '0.9rem',
        color: '#9CA3AF'
    },
    participantTime: {
        fontSize: '0.85rem',
        color: '#6B7280',
        fontWeight: '600'
    },
    emptyState: {
        textAlign: 'center',
        color: '#9CA3AF',
        padding: '3rem 1rem'
    },
    drawButton: {
        width: '100%',
        background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        color: 'white',
        border: 'none',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        fontSize: '1.25rem',
        fontWeight: 'bold',
        transition: 'all 0.3s',
        boxShadow: '0 10px 20px rgba(139, 92, 246, 0.3)',
        marginBottom: '1rem'
    },
    finishedMessage: {
        width: '100%',
        background: '#065F46',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        textAlign: 'center',
        border: '2px solid #10B981',
        marginTop: '1rem'
    }
};

export default CaixaMisteriosaSorteioPage;
