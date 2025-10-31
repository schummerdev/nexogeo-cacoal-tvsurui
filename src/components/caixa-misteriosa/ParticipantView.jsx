import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// Visão do Participante durante o jogo - Sistema Público Aprimorado
const ParticipantView = ({ liveGame, actions, loading }) => {
    const { currentThemeData } = useTheme();
    const [formData, setFormData] = useState({
        userName: '',
        userPhone: '',
        userNeighborhood: '',
        userCity: '',
        guess: '',
        referralCode: ''
    });

    const [participant, setParticipant] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [availableGuesses, setAvailableGuesses] = useState(1);
    const [isRegistering, setIsRegistering] = useState(false);
    const [referralMessage, setReferralMessage] = useState('');
    const [ownReferralCode, setOwnReferralCode] = useState('');
    const [isWinner, setIsWinner] = useState(false);

    // Verifica se há código de referência na URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
            setFormData(prev => ({ ...prev, referralCode: refCode }));
            setReferralMessage('Você foi convidado por um amigo! Ganhe um palpite extra ao se cadastrar.');
        }
    }, []);

    // Verifica se o participante já está registrado via localStorage
    useEffect(() => {
        const storedParticipant = localStorage.getItem('caixa_misteriosa_participant');
        if (storedParticipant) {
            const participantData = JSON.parse(storedParticipant);
            setParticipant(participantData);
            loadParticipantData(participantData.id);
        }
    }, [liveGame?.id]);

    // Carrega dados do participante (palpites e informações)
    const loadParticipantData = async (participantId) => {
        if (!participantId || !liveGame?.id) return;

        try {
            // Buscar informações do participante
            const participantResponse = await fetch(`/api/caixa-misteriosa/participants/${participantId}`);
            if (participantResponse.ok) {
                const participantInfo = await participantResponse.json();
                setAvailableGuesses(1 + participantInfo.extra_guesses);
                setOwnReferralCode(participantInfo.own_referral_code);
            }

            // Buscar palpites do participante para este jogo
            const submissionsResponse = await fetch(`/api/caixa-misteriosa/submissions?gameId=${liveGame.id}&participantId=${participantId}`);
            if (submissionsResponse.ok) {
                const submissionsData = await submissionsResponse.json();
                setSubmissions(submissionsData.submissions || []);

                // Verificar se ganhou
                const winnerSubmission = submissionsData.submissions?.find(s => s.is_correct);
                if (winnerSubmission) {
                    setIsWinner(true);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do participante:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (loading || isRegistering) return;

        setIsRegistering(true);

        try {
            const registerData = {
                name: formData.userName,
                phone: formData.userPhone,
                neighborhood: formData.userNeighborhood,
                city: formData.userCity,
                referralCode: formData.referralCode || null
            };

            const response = await fetch('/api/caixa-misteriosa/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
            });

            if (response.ok) {
                const result = await response.json();
                const newParticipant = {
                    id: result.participantId,
                    name: formData.userName,
                    phone: formData.userPhone,
                    neighborhood: formData.userNeighborhood,
                    city: formData.userCity
                };

                setParticipant(newParticipant);
                localStorage.setItem('caixa_misteriosa_participant', JSON.stringify(newParticipant));

                if (result.referralBonus) {
                    setReferralMessage('🎉 Parabéns! Você ganhou um palpite extra por usar um código de referência!');
                }

                await loadParticipantData(result.participantId);
            } else {
                const error = await response.json();
                alert(`Erro no cadastro: ${error.message}`);
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            alert('Erro ao realizar o cadastro. Tente novamente.');
        } finally {
            setIsRegistering(false);
        }
    };

    const handleSubmitGuess = async (e) => {
        e.preventDefault();
        if (!liveGame || !participant || loading) return;

        const usedGuesses = submissions.length;
        if (usedGuesses >= availableGuesses) {
            alert('Você já usou todos os seus palpites!');
            return;
        }

        try {
            const submissionData = {
                gameId: liveGame.id,
                publicParticipantId: participant.id,
                guess: formData.guess
            };

            const result = await actions.submitGuess(submissionData);
            if (result && result.success) {
                // Recarregar palpites
                await loadParticipantData(participant.id);
                // Limpar campo de palpite
                setFormData(prev => ({ ...prev, guess: '' }));

                if (result.isCorrect) {
                    setIsWinner(true);
                    alert('🎉 PARABÉNS! Você acertou o produto!');
                }
            }
        } catch (error) {
            console.error('Erro ao enviar palpite:', error);
            alert('Erro ao enviar palpite. Tente novamente.');
        }
    };

    const revealedClues = liveGame.giveaway.product.clues.slice(0, liveGame.revealedCluesCount);
    const usedGuesses = submissions.length;
    const remainingGuesses = availableGuesses - usedGuesses;

    // Função para compartilhar código de referência
    const shareReferralCode = async () => {
        if (!ownReferralCode) return;

        const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${ownReferralCode}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Caixa Misteriosa - Participe comigo!',
                    text: 'Venha participar da Caixa Misteriosa e ganhe um palpite extra!',
                    url: shareUrl
                });
            } catch (error) {
                console.log('Erro ao compartilhar:', error);
                copyToClipboard(shareUrl);
            }
        } else {
            copyToClipboard(shareUrl);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copiado para a área de transferência!');
        }).catch(() => {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Link copiado para a área de transferência!');
        });
    };

    // Estilos com tema dinâmico
    const styles = {
        main: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '2rem', minHeight: '100vh',
            background: currentThemeData.gradient,
            color: currentThemeData.text
        },
        card: {
            width: '100%', maxWidth: '600px', background: currentThemeData.surface,
            padding: '2rem', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            border: `1px solid ${currentThemeData.border}`
        },
        winnerCard: {
            width: '100%', maxWidth: '600px',
            background: currentThemeData.gradient,
            padding: '2rem', borderRadius: '1rem', boxShadow: `0 15px 35px ${currentThemeData.primary}66`,
            color: 'white', textAlign: 'center', border: `3px solid ${currentThemeData.primary}`
        },
        input: {
            width: '100%', background: currentThemeData.surface, border: `1px solid ${currentThemeData.border}`,
            borderRadius: '0.5rem', padding: '0.75rem', color: currentThemeData.text,
            marginTop: '0.25rem'
        },
        button: {
            width: '100%', background: currentThemeData.gradient,
            border: 'none', borderRadius: '0.5rem', padding: '1rem', color: 'white',
            fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem',
            boxShadow: `0 4px 12px ${currentThemeData.primary}4D`
        },
        shareButton: {
            background: currentThemeData.primary, border: 'none', borderRadius: '0.5rem',
            padding: '0.75rem 1.5rem', color: 'white', fontWeight: 'bold',
            cursor: 'pointer', marginTop: '1rem', boxShadow: `0 4px 12px ${currentThemeData.primary}4D`
        },
        submissionItem: {
            background: currentThemeData.secondary, padding: '1rem', borderRadius: '0.5rem',
            marginBottom: '0.75rem', border: `1px solid ${currentThemeData.border}`,
            color: currentThemeData.text
        },
        correctSubmission: {
            background: currentThemeData.gradient,
            border: `2px solid ${currentThemeData.primary}`, color: 'white'
        }
    };

    // Se o participante é ganhador, mostrar destaque especial
    if (isWinner && liveGame?.status === 'finished') {
        return (
            <main style={styles.main}>
                <div style={styles.winnerCard}>
                    <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>🎉</h1>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
                        PARABÉNS!
                    </h2>
                    <p style={{ fontSize: '1.5rem', fontWeight: '600', margin: '0 0 1rem 0' }}>
                        Você acertou o produto:
                    </p>
                    <h3 style={{ fontSize: '2rem', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 2rem 0' }}>
                        {liveGame.giveaway?.product?.name || 'Produto Revelado'}
                    </h3>
                    <p style={{ fontSize: '1.2rem' }}>
                        Aguarde o contato da nossa equipe! 📞
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main style={styles.main}>
            <div style={styles.card}>
                <p style={{ textAlign: 'center', color: currentThemeData.textSecondary }}>Um oferecimento de:</p>
                <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', color: currentThemeData.primary }}>
                    {liveGame.giveaway.sponsor.name}
                </h2>

                {/* Mensagem de referência */}
                {referralMessage && (
                    <div style={{ background: currentThemeData.primary, color: 'white', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', textAlign: 'center', boxShadow: `0 4px 12px ${currentThemeData.primary}33` }}>
                        {referralMessage}
                    </div>
                )}

                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', color: currentThemeData.primary }}>Dicas Reveladas:</h3>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {Array.isArray(revealedClues) && revealedClues.length > 0 ?
                            revealedClues.map((clue, index) => (
                                <li key={index} style={{ background: currentThemeData.secondary, padding: '1rem', borderRadius: '0.5rem', border: `1px solid ${currentThemeData.border}`, color: currentThemeData.text }}>
                                    <strong>Dica {index + 1}:</strong> {clue}
                                </li>
                            )) : (
                                <li style={{ background: currentThemeData.secondary, padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', color: currentThemeData.textSecondary, border: `1px solid ${currentThemeData.border}` }}>
                                    Nenhuma dica revelada ainda.
                                </li>
                            )
                        }
                    </ul>
                </div>

                {/* Status do jogo */}
                <div style={{ marginTop: '2rem' }}>
                    {liveGame.status === 'closed' && (
                        <div style={{ textAlign: 'center', color: currentThemeData.warning, fontSize: '1.2rem', fontWeight: 'bold' }}>
                            Inscrições Encerradas!
                        </div>
                    )}
                </div>

                {/* Área de participação */}
                <div style={{ marginTop: '2rem' }}>
                    {/* Se não está registrado, mostrar formulário de cadastro */}
                    {!participant && liveGame.status === 'accepting' && (
                        <form onSubmit={handleRegister}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', marginBottom: '1rem' }}>
                                Cadastre-se para Participar!
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input
                                    style={styles.input}
                                    type="text"
                                    name="userName"
                                    placeholder="Nome"
                                    value={formData.userName}
                                    onChange={handleInputChange}
                                    required
                                />
                                <input
                                    style={styles.input}
                                    type="tel"
                                    name="userPhone"
                                    placeholder="Telefone"
                                    value={formData.userPhone}
                                    onChange={handleInputChange}
                                    required
                                />
                                <input
                                    style={styles.input}
                                    type="text"
                                    name="userNeighborhood"
                                    placeholder="Bairro"
                                    value={formData.userNeighborhood}
                                    onChange={handleInputChange}
                                    required
                                />
                                <input
                                    style={styles.input}
                                    type="text"
                                    name="userCity"
                                    placeholder="Cidade"
                                    value={formData.userCity}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            {formData.referralCode && (
                                <input
                                    style={{ ...styles.input, marginTop: '1rem' }}
                                    type="text"
                                    name="referralCode"
                                    placeholder="Código de Referência"
                                    value={formData.referralCode}
                                    onChange={handleInputChange}
                                    readOnly
                                />
                            )}
                            <button
                                type="submit"
                                style={styles.button}
                                disabled={isRegistering}
                            >
                                {isRegistering ? 'Cadastrando...' : 'Cadastrar e Participar'}
                            </button>
                        </form>
                    )}

                    {/* Se está registrado, mostrar área de palpites */}
                    {participant && (
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', marginBottom: '1rem' }}>
                                Olá, {participant.name}!
                            </h3>

                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <span style={{ color: currentThemeData.primary, fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    Palpites disponíveis: {remainingGuesses}
                                </span>
                            </div>

                            {/* Botão de compartilhar */}
                            {ownReferralCode && (
                                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                    <button
                                        style={styles.shareButton}
                                        onClick={shareReferralCode}
                                    >
                                        📢 Compartilhar e Ganhar Palpite Extra
                                    </button>
                                </div>
                            )}

                            {/* Mostrar palpites anteriores */}
                            {submissions.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>
                                        Seus Palpites:
                                    </h4>
                                    {submissions.map((submission, index) => (
                                        <div
                                            key={submission.id}
                                            style={{
                                                ...styles.submissionItem,
                                                ...(submission.is_correct ? styles.correctSubmission : {})
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold' }}>
                                                    {participant.name}: {submission.guess}
                                                    {submission.is_correct && " ✅ CORRETO!"}
                                                </span>
                                                <small style={{ opacity: 0.7 }}>
                                                    {new Date(submission.created_at).toLocaleString('pt-BR')}
                                                </small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Formulário de novo palpite */}
                            {remainingGuesses > 0 && liveGame.status === 'accepting' && (
                                <form onSubmit={handleSubmitGuess}>
                                    <input
                                        style={{ ...styles.input, marginTop: '1rem' }}
                                        type="text"
                                        name="guess"
                                        placeholder="Qual é o produto?"
                                        value={formData.guess}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        style={styles.button}
                                        disabled={loading}
                                    >
                                        {loading ? 'Enviando...' : `Enviar Palpite (${remainingGuesses} restante${remainingGuesses !== 1 ? 's' : ''})`}
                                    </button>
                                </form>
                            )}

                            {/* Mensagem quando não há mais palpites */}
                            {remainingGuesses === 0 && (
                                <div style={{ textAlign: 'center', color: currentThemeData.warning, fontSize: '1.1rem', marginTop: '1rem', fontWeight: '600' }}>
                                    Você usou todos os seus palpites!
                                    <br />
                                    Compartilhe com amigos para ganhar mais palpites.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default ParticipantView;
