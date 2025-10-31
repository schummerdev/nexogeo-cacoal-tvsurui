import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSelector from '../components/ThemeSelector/ThemeSelector';

// Página pública da Caixa Misteriosa - sem necessidade de login
const CaixaMisteriosaPub = () => {
    const { gameId } = useParams();
    const { currentThemeData } = useTheme();
    const [liveGame, setLiveGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
    const [usedGuessesCount, setUsedGuessesCount] = useState(0);
    const [isRegistering, setIsRegistering] = useState(false);
    const [referralMessage, setReferralMessage] = useState('');
    const [ownReferralCode, setOwnReferralCode] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [showShareLink, setShowShareLink] = useState(false);
    const [isWinner, setIsWinner] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [referrals, setReferrals] = useState([]);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [geolocalizacao, setGeolocalizacao] = useState(null);

    // Carrega dados do jogo
    useEffect(() => {
        fetchLiveGame();
    }, [gameId]);

    // Atualiza feed de palpites a cada 60 segundos
    useEffect(() => {
        if (!liveGame) return;

        const interval = setInterval(() => {
            fetchLiveGame();
        }, 60000); // 60 segundos

        return () => clearInterval(interval);
    }, [liveGame]);

    // Verifica parâmetros da URL para referência
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        // Parâmetro ?user=telefone-compartilhamento
        // Este parâmetro indica que foi um link compartilhado
        // O novo usuário que se cadastrar vai dar +1 palpite para este telefone
        const userParam = urlParams.get('user');
        if (userParam) {
            const match = userParam.match(/^(\d+)-(\d+)$/);
            if (match) {
                const referrerPhone = match[1];
                console.log('🔗 Link de compartilhamento detectado:', { referrerPhone, shareNumber: match[2] });

                // IMPORTANTE: Limpar localStorage para forçar novo cadastro
                localStorage.removeItem('caixa_misteriosa_participant_pub');
                setParticipant(null);
                console.log('🗑️ localStorage limpo - forçando novo cadastro');

                // Buscar participante que compartilhou o link
                console.log('🔍 [REFERRAL] Buscando participante por telefone:', referrerPhone);
                fetch(`/api/caixa-misteriosa/participants/by-phone/${referrerPhone}`)
                    .then(res => res.json())
                    .then(data => {
                        console.log('📞 [REFERRAL] Resposta da API by-phone:', data);
                        if (data.success && data.participant) {
                            // Usa o código de referência do participante que compartilhou
                            setFormData(prev => ({ ...prev, referralCode: data.participant.own_referral_code }));
                            setReferralMessage(`🎉 Você foi convidado por ${data.participant.name}! Cadastre-se para participar.`);
                            console.log('✅ [REFERRAL] Código de referência DEFINIDO:', {
                                referrerName: data.participant.name,
                                referrerPhone: referrerPhone,
                                ownReferralCode: data.participant.own_referral_code
                            });
                        } else {
                            console.warn('⚠️ [REFERRAL] Participante não encontrado para telefone:', referrerPhone);
                        }
                    })
                    .catch(err => console.error('❌ [REFERRAL] Erro ao carregar referência:', err));
            }
        }

        // Código de referência direto (formato antigo)
        const refCode = urlParams.get('ref');
        if (refCode && !userParam) {
            setFormData(prev => ({ ...prev, referralCode: refCode }));
            setReferralMessage('Você foi convidado por um amigo! Ganhe um palpite extra ao se cadastrar.');
        }
    }, []);

    // Efeito para solicitar a geolocalização (executa apenas uma vez)
    useEffect(() => {
        const obterGeolocalizacao = () => {
            if ('geolocation' in navigator && !geolocalizacao) {
                console.log('🌍 Solicitando geolocalização...');
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude, accuracy } = position.coords;
                        setGeolocalizacao({ latitude, longitude, accuracy });
                        console.log('✅ Geolocalização obtida:', { latitude, longitude, accuracy });
                    },
                    (error) => {
                        console.warn('❌ Erro na geolocalização:', error.message);
                        // Apenas tentar novamente uma vez se for erro de timeout
                        if (error.code === error.TIMEOUT && !geolocalizacao) {
                            setTimeout(() => {
                                console.log('🔄 Tentando geolocalização novamente...');
                                obterGeolocalizacao();
                            }, 3000);
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000 // Cache por 1 minuto
                    }
                );
            } else if (!('geolocation' in navigator)) {
                console.warn('❌ Geolocalização não suportada pelo navegador');
            }
        };

        obterGeolocalizacao();
    }, []);

    // Verifica se o participante já está registrado via localStorage
    // MAS APENAS se não for um link de compartilhamento (?user=)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');

        // Se tem parâmetro ?user=, NÃO carregar do localStorage
        // (já foi limpo no useEffect acima)
        if (userParam) {
            console.log('⚠️ Link de compartilhamento - ignorando localStorage');
            return;
        }

        const storedParticipant = localStorage.getItem('caixa_misteriosa_participant_pub');
        if (storedParticipant) {
            const participantData = JSON.parse(storedParticipant);
            setParticipant(participantData);

            // Gerar link de compartilhamento personalizado
            if (participantData.phone) {
                const cleanPhone = participantData.phone.replace(/\D/g, '');
                const generatedShareUrl = `${window.location.origin}/caixa-misteriosa-pub?user=${cleanPhone}-1`;
                setShareUrl(generatedShareUrl);
            }

            loadParticipantData(participantData.id);
        }
    }, [liveGame?.id]);

    const fetchLiveGame = async () => {
        try {
            setLoading(true);
            // Se tem gameId na URL, buscar jogo específico; senão, buscar jogo ativo
            const endpoint = gameId
                ? `/api/caixa-misteriosa/game/${gameId}`
                : '/api/caixa-misteriosa/game/live';

            console.log('🎮 Buscando jogo:', { gameId, endpoint });

            const response = await fetch(endpoint);
            if (response.ok) {
                const gameData = await response.json();
                setLiveGame(gameData);

                // Atualizar feed de palpites recentes (últimos 5)
                if (gameData.submissions) {
                    setRecentSubmissions(gameData.submissions.slice(0, 5));
                }

                // Preencher automaticamente o campo cidade com a cidade da emissora
                if (gameData.defaultCity && !formData.userCity) {
                    setFormData(prev => ({ ...prev, userCity: gameData.defaultCity }));
                }

                console.log('✅ Dados do jogo carregados:', gameData);
            } else{
                const errorData = await response.json();
                setError(errorData.message || 'Erro ao carregar dados do jogo');
            }
        } catch (err) {
            console.error('❌ Erro ao buscar jogo:', err);
            setError('Erro de conexão. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    // Carrega dados do participante (palpites e informações)
    // Retorna objeto com dados atualizados: { totalGuesses, usedGuesses, remaining }
    const loadParticipantData = async (participantId) => {
        // 🔥 FIX: Guard Clause para previnir race condition
        if (!liveGame?.id) {
            console.warn('⚠️ [LOAD] Saindo de loadParticipantData pois liveGame.id não está pronto.');
            return { totalGuesses: 1, usedGuesses: 0, remaining: 1 };
        }

        console.log('🎬 [LOAD] loadParticipantData INICIADO', {
            participantId,
            liveGameId: liveGame?.id,
            temParticipantId: !!participantId,
            temLiveGameId: !!liveGame?.id
        });

        // 🔥 FIX: Remover verificação de liveGame?.id para permitir busca de referrals
        if (!participantId) {
            console.warn('⚠️ [LOAD] RETORNANDO CEDO - Missing participantId');
            return { totalGuesses: 0, usedGuesses: 0, remaining: 0 };
        }

        try {
            // Buscar informações do participante
            const participantResponse = await fetch(`/api/caixa-misteriosa/participants/${participantId}`);
            let totalGuesses = 1;

            if (participantResponse.ok) {
                const participantInfo = await participantResponse.json();
                totalGuesses = 1 + (participantInfo.extra_guesses || 0);
                setAvailableGuesses(totalGuesses);
                setOwnReferralCode(participantInfo.own_referral_code);

                console.log('👤 Participante:', { totalGuesses, extraGuesses: participantInfo.extra_guesses });
            }

            // Buscar palpites do participante para este jogo (apenas se liveGame.id existir)
            let usedGuesses = 0;
            let remaining = totalGuesses;

            if (liveGame?.id) {
                const submissionsUrl = `/api/caixa-misteriosa/submissions?gameId=${liveGame.id}&participantId=${participantId}`;
                console.log('🔍 Consultando palpites:', { url: submissionsUrl, gameId: liveGame.id, participantId });

                const submissionsResponse = await fetch(submissionsUrl);
                console.log('🔍 Status da resposta:', submissionsResponse.status, submissionsResponse.statusText);

                if (submissionsResponse.ok) {
                    const submissionsData = await submissionsResponse.json();
                    console.log('🔍 Resposta completa da API:', submissionsData);

                    const loadedSubmissions = submissionsData.submissions || [];
                    setSubmissions(loadedSubmissions);

                    usedGuesses = loadedSubmissions.length;
                    remaining = totalGuesses - usedGuesses;

                    // 🔥 Atualizar estado de palpites usados
                    setUsedGuessesCount(usedGuesses);

                    console.log('📊 Palpites carregados:', {
                        total: usedGuesses,
                        submissions: loadedSubmissions,
                        gameId: liveGame.id,
                        participantId,
                        totalGuesses,
                        remaining
                    });

                    // Verificar se ganhou
                    const winnerSubmission = loadedSubmissions.find(s => s.is_correct);
                    if (winnerSubmission) {
                        setIsWinner(true);
                    }

                    // Se não tem palpites disponíveis, mostrar mensagem
                    if (remaining === 0) {
                        setErrorMessage('Você já usou todos os seus palpites.');
                    }
                }
            } else {
                console.log('⚠️ [LOAD] liveGame.id não disponível - pulando busca de submissions');
                // 🔥 Quando não tem liveGame.id, buscar na tabela mesmo assim
                try {
                    const allSubmissionsUrl = `/api/caixa-misteriosa/submissions/by-participant/${participantId}`;
                    console.log('🔍 Buscando submissions sem gameId:', allSubmissionsUrl);
                    const allSubsResponse = await fetch(allSubmissionsUrl);
                    if (allSubsResponse.ok) {
                        const allSubsData = await allSubsResponse.json();
                        const totalSubmitted = allSubsData.submissions?.length || 0;
                        usedGuesses = totalSubmitted;
                        remaining = totalGuesses - usedGuesses;
                        setUsedGuessesCount(usedGuesses);
                        console.log('📊 Total de palpites já enviados (todos os jogos):', usedGuesses);
                    }
                } catch (err) {
                    console.error('❌ Erro ao buscar submissions totais:', err);
                }
            }

            // 🔥 SEMPRE buscar referrals, independente do status de submissions
            // VERSÃO: 2025-01-10 - Fix return precoce
            console.log('🚀🚀🚀 [LOAD] ENTRANDO no bloco de busca de referrals (FORA do if submissions)');
            console.log('🆕 [VERSION] Versão atualizada - 2025-01-10');
            try {
                const referralsUrl = `/api/caixa-misteriosa/participants/${participantId}/referrals`;
                console.log('🔍🔍🔍 [REFERRALS] Iniciando busca:', {
                    url: referralsUrl,
                    participantId,
                    timestamp: new Date().toISOString()
                });

                const referralsResponse = await fetch(referralsUrl);
                console.log('🔍🔍🔍 [REFERRALS] Status da resposta:', {
                    status: referralsResponse.status,
                    statusText: referralsResponse.statusText,
                    ok: referralsResponse.ok
                });

                if (referralsResponse.ok) {
                    const referralsData = await referralsResponse.json();
                    console.log('👥👥👥 [REFERRALS] Resposta COMPLETA do servidor:', JSON.stringify(referralsData, null, 2));
                    console.log('👥👥👥 [REFERRALS] Array de referrals:', referralsData.referrals);
                    console.log('👥👥👥 [REFERRALS] Tipo do array:', Array.isArray(referralsData.referrals));
                    console.log('👥👥👥 [REFERRALS] Length do array:', (referralsData.referrals || []).length);

                    console.log('🔥🔥🔥 [SET] ANTES de setReferrals, valor:', referralsData.referrals);
                    setReferrals(referralsData.referrals || []);
                    console.log('✅✅✅ [SET] DEPOIS de setReferrals chamado');

                    console.log('👥👥👥 [REFERRALS] Estado atualizado. Total:', (referralsData.referrals || []).length);
                    if ((referralsData.referrals || []).length > 0) {
                        console.log('👥👥👥 [REFERRALS] Primeiros dados:', referralsData.referrals[0]);
                    }
                } else {
                    const errorData = await referralsResponse.json();
                    console.error('❌❌❌ [REFERRALS] Erro HTTP:', errorData);
                }
            } catch (refError) {
                console.error('❌❌❌ [REFERRALS] Exceção ao buscar referências:', refError);
                console.error('❌❌❌ [REFERRALS] Stack:', refError.stack);
            }

            // Retornar dados atualizados APÓS buscar referrals
            return { totalGuesses, usedGuesses, remaining };
        } catch (error) {
            console.error('Erro ao carregar dados do participante:', error);
            setErrorMessage('Erro ao carregar seus dados. Tente recarregar a página.');
            return { totalGuesses: 1, usedGuesses: 0, remaining: 1 };
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Formatação especial para telefone
        if (name === 'userPhone') {
            // Remove todos os caracteres não numéricos
            const numericValue = value.replace(/\D/g, '');

            // Aplica máscara (xx) xxxxx-xxxx
            let formattedValue = numericValue;
            if (numericValue.length >= 2) {
                formattedValue = `(${numericValue.slice(0, 2)})`;
                if (numericValue.length >= 3) {
                    formattedValue += ` ${numericValue.slice(2, 7)}`;
                    if (numericValue.length >= 8) {
                        formattedValue += `-${numericValue.slice(7, 11)}`;
                    }
                }
            }

            // Limita a 15 caracteres no total (formato: (xx) xxxxx-xxxx)
            if (formattedValue.length <= 15) {
                setFormData(prev => ({ ...prev, [name]: formattedValue }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (loading || isRegistering) return;

        setIsRegistering(true);

        try {
            // Remove formatação do telefone antes de enviar
            const cleanPhone = formData.userPhone.replace(/\D/g, '');

            const registerData = {
                name: formData.userName,
                phone: formData.userPhone, // Keep original formatted phone
                neighborhood: formData.userNeighborhood,
                city: formData.userCity,
                referralCode: formData.referralCode || null,
                latitude: geolocalizacao?.latitude || null,
                longitude: geolocalizacao?.longitude || null
            };

            console.log('📝 [REGISTRO] Dados sendo enviados:', {
                ...registerData,
                phone: `${registerData.phone} (limpo: ${cleanPhone})`,
                temReferralCode: !!registerData.referralCode
            });

            const response = await fetch('/api/caixa-misteriosa/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ [REGISTRO] Resposta do servidor:', result);

                const newParticipant = {
                    id: result.participantId,
                    name: formData.userName,
                    phone: formData.userPhone,
                    neighborhood: formData.userNeighborhood,
                    city: formData.userCity
                };

                setParticipant(newParticipant);
                localStorage.setItem('caixa_misteriosa_participant_pub', JSON.stringify(newParticipant));

                // Exibir link de compartilhamento
                if (result.shareUrl) {
                    setShareUrl(result.shareUrl);
                }

                // 🔥 Mostrar banner de cadastro APENAS se for novo (não atualização)
                const isNewRegistration = !result.message?.includes('bem-vindo novamente');
                setShowShareLink(isNewRegistration);

                console.log('🎯 [REGISTRO] isNewRegistration:', isNewRegistration, 'message:', result.message);

                // Mensagem de cadastro (não mencionar bônus - bônus é para quem indicou)
                setReferralMessage('✅ ' + (result.message || 'Cadastro realizado com sucesso!'));

                console.log('🔄 [REGISTRO] Carregando dados do participante:', result.participantId);
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

        // Limpar mensagens anteriores
        setErrorMessage('');
        setSuccessMessage('');

        // Validação local - usar estado atual
        const currentUsedGuesses = submissions.length;
        console.log('🎯 Tentativa de envio:', {
            availableGuesses,
            usedGuesses: currentUsedGuesses,
            remaining: availableGuesses - currentUsedGuesses
        });

        if (currentUsedGuesses >= availableGuesses) {
            setErrorMessage(`Você já usou todos os seus palpites (${availableGuesses})`);
            return;
        }

        try {
            setLoading(true);
            const submissionData = {
                publicParticipantId: participant.id,
                gameId: liveGame.id, // 🔥 FIX: Adicionar gameId que estava faltando
                userName: participant.name,
                userPhone: participant.phone,
                userNeighborhood: participant.neighborhood,
                userCity: participant.city,
                guess: formData.guess
            };

            console.log('🔴 [SUBMIT] Payload que será enviado:', JSON.stringify(submissionData, null, 2));

            const response = await fetch('/api/caixa-misteriosa/game/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            const responseData = await response.json();

            // SEMPRE recarregar dados após tentativa (sucesso OU erro)
            // Isso garante que o contador seja atualizado corretamente
            const updatedData = await loadParticipantData(participant.id);
            const { remaining } = updatedData;

            if (response.ok) {
                // Guardar o palpite enviado antes de limpar
                const submittedGuess = formData.guess;

                // Limpar campo de palpite após enviar
                setFormData(prev => ({ ...prev, guess: '' }));

                // Mensagem personalizada com palpite em destaque (FIXA - não remove automaticamente)
                if (remaining > 0) {
                    setSuccessMessage(`parabens|${submittedGuess}|Você ainda tem ${remaining} palpite${remaining !== 1 ? 's' : ''} disponível${remaining !== 1 ? 'eis' : ''}.`);
                } else {
                    setSuccessMessage(`parabens|${submittedGuess}|Você usou todos os seus palpites.`);
                }
            } else {
                // Mostrar mensagem de erro com contador atualizado
                if (remaining > 0) {
                    setErrorMessage(`${responseData.message || 'Erro ao enviar palpite'}. Você tem ${remaining} palpite${remaining !== 1 ? 's' : ''} disponível${remaining !== 1 ? 'eis' : ''}.`);
                } else {
                    setErrorMessage(responseData.message || 'Você já usou todos os seus palpites.');
                }

                console.error('❌ Erro do servidor:', responseData);
            }
        } catch (error) {
            console.error('❌ Erro ao enviar palpite:', error);
            setErrorMessage('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Função para compartilhar código de referência
    const shareReferralCode = async () => {
        if (!ownReferralCode) return;

        const shareUrl = `${window.location.origin}/caixa-misteriosa-pub?ref=${ownReferralCode}`;

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

    const generateWhatsAppLink = () => {
        const text = `🎉 *ATENÇÃO, GALERA!* 🎉
Chegou o *GAME DA CAIXA MISTERIOSA* na *TV SURUÍ – CANAL 15.1*!

👉 É fácil participar:
1️⃣ Clique no link
2️⃣ Faça seu cadastro
3️⃣ Envie o seu palpite!

🔗 ${shareUrl}

A empresa patrocinadora vai sortear um *Prêmio Incrível* para quem descobrir qual é o *Produto ou Serviço* oferecido na cidade!

📌 Fique ligado nas dicas e aumente suas chances!

E aí, qual você prefere?
🎁 O *Prêmio da Caixa Misteriosa*
💵 ou *R$ 50,00 em dinheiro*?

🔥 Corre e participe agora mesmo!`;

        return `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

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

    // Estilos dinâmicos baseados no tema
    const styles = {
        main: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '2rem', minHeight: '100vh',
            background: currentThemeData.gradient,
            color: currentThemeData.text
        },
        card: {
            width: '100%', maxWidth: '600px', background: currentThemeData.surface,
            padding: '2rem', borderRadius: '1rem', boxShadow: `0 8px 32px ${currentThemeData.primary}33`,
            backdropFilter: 'blur(10px)', border: `1px solid ${currentThemeData.border}`
        },
        winnerCard: {
            width: '100%', maxWidth: '600px', background: currentThemeData.gradient,
            padding: '2rem', borderRadius: '1rem', boxShadow: `0 15px 35px ${currentThemeData.primary}66`,
            color: currentThemeData.text, textAlign: 'center', border: `3px solid ${currentThemeData.primary}`
        },
        input: {
            width: '100%', background: currentThemeData.surface, border: `1px solid ${currentThemeData.border}`,
            borderRadius: '0.5rem', padding: '0.75rem', color: currentThemeData.text, marginTop: '0.25rem',
            fontSize: '0.95rem', transition: 'all 0.2s ease'
        },
        button: {
            width: '100%', background: currentThemeData.gradient,
            border: 'none', borderRadius: '0.5rem', padding: '1rem', color: 'white',
            fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem',
            boxShadow: `0 2px 8px ${currentThemeData.primary}4D`, transition: 'all 0.2s ease'
        },
        shareButton: {
            background: currentThemeData.gradient,
            border: 'none', borderRadius: '0.5rem',
            padding: '0.75rem 1.5rem', color: 'white', fontWeight: 'bold',
            cursor: 'pointer', marginTop: '1rem', boxShadow: `0 2px 8px ${currentThemeData.primary}4D`
        },
        submissionItem: {
            background: currentThemeData.surface, padding: '1rem', borderRadius: '0.5rem',
            marginBottom: '0.75rem', border: `2px solid ${currentThemeData.secondary}`,
            color: currentThemeData.text
        },
        correctSubmission: {
            background: currentThemeData.gradient,
            border: `2px solid ${currentThemeData.success}`, color: 'white'
        }
    };

    if (loading) {
        return (
            <main style={styles.main}>
                <div style={styles.card}>
                    <h2 style={{ textAlign: 'center' }}>Carregando jogo...</h2>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main style={styles.main}>
                <div style={styles.card}>
                    <h2 style={{ textAlign: 'center', color: currentThemeData.danger }}>Erro</h2>
                    <p style={{ textAlign: 'center' }}>{error}</p>
                    <button
                        style={styles.button}
                        onClick={fetchLiveGame}
                    >
                        Tentar Novamente
                    </button>
                </div>
            </main>
        );
    }

    if (!liveGame) {
        return (
            <main style={styles.main}>
                <div style={styles.card}>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ color: currentThemeData.primary, fontSize: '2.5rem', margin: '0 0 1rem 0' }}>
                            🎁 Caixa Misteriosa
                        </h1>
                        <h2 style={{ color: currentThemeData.warning, marginBottom: '1rem' }}>Nenhum jogo ativo no momento</h2>
                        <p style={{ color: currentThemeData.textSecondary, marginBottom: '1.5rem', lineHeight: '1.6' }}>
                            Não há nenhum jogo da Caixa Misteriosa ativo no momento.<br/>
                            Os administradores precisam configurar e iniciar um novo jogo.
                        </p>
                        <div style={{ background: currentThemeData.surface, padding: '1.5rem', borderRadius: '0.75rem', textAlign: 'left', border: `1px solid ${currentThemeData.border}` }}>
                            <h3 style={{ color: currentThemeData.success, marginBottom: '1rem' }}>💡 Como funciona:</h3>
                            <ul style={{ color: currentThemeData.text, listStyle: 'none', padding: 0 }}>
                                <li style={{ marginBottom: '0.5rem' }}>• Cadastre-se para participar quando um jogo estiver ativo</li>
                                <li style={{ marginBottom: '0.5rem' }}>• Convide amigos usando seu código de referência</li>
                                <li style={{ marginBottom: '0.5rem' }}>• Ganhe palpites extras por cada amigo que se cadastrar</li>
                                <li style={{ marginBottom: '0.5rem' }}>• Envie seus palpites e concorra a prêmios incríveis</li>
                            </ul>
                        </div>
                        <button
                            style={{ ...styles.button, marginTop: '1.5rem' }}
                            onClick={fetchLiveGame}
                        >
                            🔄 Verificar Novamente
                        </button>
                    </div>
                </div>
            </main>
        );
    }

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

    const revealedClues = liveGame.giveaway?.product?.clues?.slice(0, liveGame.revealedCluesCount) || [];
    // 🔥 Usar usedGuessesCount do estado, não submissions.length
    const remainingGuesses = availableGuesses - usedGuessesCount;

    return (
        <main style={styles.main}>
            {/* Seletor de Tema */}
            <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                zIndex: 1000
            }}>
                <ThemeSelector mode="inline" />
            </div>

            <div style={styles.card}>
                {/* Indicador de usuário logado + botão logout */}
                {participant && (
                    <div style={{
                        background: currentThemeData.surface,
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: `1px solid ${currentThemeData.border}`
                    }}>
                        <div>
                            <span style={{ color: currentThemeData.textSecondary, fontSize: '0.85rem' }}>Você está logado como:</span>
                            <br />
                            <span style={{ color: currentThemeData.success, fontWeight: 'bold', fontSize: '1.1rem' }}>
                                {participant.name}
                            </span>
                            <span style={{ color: currentThemeData.textSecondary, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                                (ID: {participant.id})
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm('Deseja fazer logout? Você precisará se cadastrar novamente para acessar.')) {
                                    localStorage.removeItem('caixa_misteriosa_participant_pub');
                                    window.location.reload();
                                }
                            }}
                            style={{
                                background: currentThemeData.danger,
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            🚪 Logout
                        </button>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: currentThemeData.primary, fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: '900' }}>
                        🎁 Caixa Misteriosa
                    </h1>

                    <p style={{ color: currentThemeData.textSecondary, marginTop: '1rem' }}>Um oferecimento de:</p>

                    {/* Logo do patrocinador OU texto - dependendo se logo_url existe */}
                    {console.log('🖼️ [LOGO DEBUG] sponsorLogoUrl:', liveGame.giveaway?.sponsor?.logo_url, 'sponsorName:', liveGame.giveaway?.sponsor?.name)}
                    {liveGame.giveaway?.sponsor?.logo_url ? (
                        <div style={{ margin: '1rem 0' }}>
                            <img
                                src={liveGame.giveaway.sponsor.logo_url}
                                alt={liveGame.giveaway.sponsor.name}
                                style={{
                                    maxWidth: '250px',
                                    maxHeight: '120px',
                                    objectFit: 'contain',
                                    borderRadius: '0.5rem'
                                }}
                                onError={(e) => {
                                    // Se a imagem falhar ao carregar, mostra o texto como fallback
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `<h2 style="fontSize: 2rem; fontWeight: bold; color: #A78BFA; margin: 0.5rem 0;">${liveGame.giveaway.sponsor.name || 'Patrocinador'}</h2>`;
                                }}
                            />
                        </div>
                    ) : (
                        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: currentThemeData.primary, margin: '0.5rem 0' }}>
                            {liveGame.giveaway?.sponsor?.name || 'Patrocinador'}
                        </h2>
                    )}
                </div>

                {/* Mensagem de referência - APENAS quando NÃO está logado */}
                {referralMessage && !participant && (
                    <div style={{ background: currentThemeData.gradient, color: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', textAlign: 'center', fontWeight: '500', boxShadow: `0 2px 8px ${currentThemeData.primary}33` }}>
                        {referralMessage}
                    </div>
                )}

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', marginBottom: '1rem', color: currentThemeData.primary }}>
                        Dicas Reveladas:
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {revealedClues.length > 0 ?
                            revealedClues.map((clue, index) => (
                                <li key={index} style={{ background: currentThemeData.secondary, padding: '1rem', borderRadius: '0.5rem', border: `2px solid ${currentThemeData.primary}`, color: currentThemeData.text }}>
                                    <strong style={{ color: currentThemeData.primary }}>Dica {index + 1}:</strong> {clue}
                                </li>
                            )) : (
                                <li style={{ background: currentThemeData.surface, padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', color: currentThemeData.textSecondary, border: `1px solid ${currentThemeData.border}` }}>
                                    Nenhuma dica revelada ainda.
                                </li>
                            )
                        }
                    </ul>
                </div>

                {/* Status do jogo */}
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <span style={{
                        color: liveGame.status === 'accepting' ? currentThemeData.success : currentThemeData.textSecondary,
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                    }}>
                        Status: {liveGame.status === 'accepting' ? 'Aceitando Palpites' :
                                liveGame.status === 'closed' ? 'Palpites Encerrados' :
                                liveGame.status === 'finished' ? 'Jogo Finalizado' : liveGame.status}
                    </span>
                </div>

                {/* Quando jogo finalizado, mostrar palavra secreta e ganhador */}
                {liveGame.status === 'finished' && (
                    <div style={{
                        background: currentThemeData.gradient,
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        marginBottom: '2rem',
                        textAlign: 'center',
                        border: `3px solid ${currentThemeData.primary}`,
                        color: 'white',
                        boxShadow: `0 8px 20px ${currentThemeData.primary}4D`
                    }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
                            🎁 Palavra Secreta
                        </h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 1.5rem 0', letterSpacing: '0.1em' }}>
                            {liveGame.giveaway?.product?.name || 'Produto'}
                        </p>

                        {liveGame.winner && (
                            <>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
                                    🏆 Ganhador(a)
                                </h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                                    {liveGame.winner.userName}
                                    {liveGame.winner.userNeighborhood && ` - ${liveGame.winner.userNeighborhood}`}
                                    {liveGame.winner.userPhone && ` - ${liveGame.winner.userPhone.replace(/\D/g, '').replace(/^(\d+)(\d{4})$/, '****-$2')}`}
                                </p>
                            </>
                        )}
                    </div>
                )}

                {liveGame.status === 'closed' && (
                    <div style={{ textAlign: 'center', color: currentThemeData.warning, fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
                        Aguardando Sorteio do Ganhador!
                    </div>
                )}

                {/* Card genérico removido - link personalizado é exibido após login */}

                {/* Área de participação */}
                <div>
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

                            {/* Mensagem de cadastro realizado - APENAS na primeira vez (showShareLink) */}
                            {showShareLink && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #10B981, #059669)',
                                    color: 'white',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                    textAlign: 'center',
                                    fontWeight: '500',
                                    border: '2px solid #6EE7B7'
                                }}>
                                    ✅ Cadastro realizado com sucesso! Compartilhe o link abaixo para ganhar palpites extras.
                                </div>
                            )}

                            {/* Informação de palpites disponíveis - APENAS quando tem palpites */}
                            {remainingGuesses > 0 && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #10B981, #059669)',
                                    color: 'white',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                    textAlign: 'center',
                                    fontWeight: '500',
                                    border: '2px solid #6EE7B7'
                                }}>
                                    ✅ Você tem <strong>{remainingGuesses} palpite{remainingGuesses !== 1 ? 's' : ''}</strong> disponíve{remainingGuesses !== 1 ? 'is' : 'l'}
                                </div>
                            )}

                            {/* Mensagens de erro e sucesso */}
                            {errorMessage && errorMessage !== 'Você já usou todos os seus palpites.' && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                    color: 'white',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                    textAlign: 'center',
                                    fontWeight: '500',
                                    border: '2px solid #FCA5A5'
                                }}>
                                    ❌ {errorMessage}
                                </div>
                            )}

                            {successMessage && (() => {
                                // Verifica se é mensagem de palpite enviado (formato: parabens|PALPITE|mensagem)
                                if (successMessage.startsWith('parabens|')) {
                                    const parts = successMessage.split('|');
                                    const guess = parts[1];
                                    const message = parts[2];

                                    return (
                                        <div style={{
                                            background: 'linear-gradient(135deg, #10B981, #059669)',
                                            color: 'white',
                                            padding: '1.5rem',
                                            borderRadius: '0.75rem',
                                            marginBottom: '1rem',
                                            textAlign: 'center',
                                            border: '2px solid #6EE7B7'
                                        }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                                🎉 Parabéns! Seu palpite foi enviado!
                                            </div>
                                            <div style={{
                                                fontSize: '2rem',
                                                fontWeight: 'bold',
                                                letterSpacing: '0.1em',
                                                marginBottom: '1rem',
                                                textTransform: 'uppercase'
                                            }}>
                                                {guess}
                                            </div>
                                            <div style={{ fontSize: '0.95rem' }}>
                                                {message}
                                            </div>
                                        </div>
                                    );
                                }

                                // Mensagem normal
                                return (
                                    <div style={{
                                        background: 'linear-gradient(135deg, #10B981, #059669)',
                                        color: 'white',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        marginBottom: '1rem',
                                        textAlign: 'center',
                                        fontWeight: '500',
                                        border: '2px solid #6EE7B7'
                                    }}>
                                        {successMessage}
                                    </div>
                                );
                            })()}

                            {/* Seção de indicação antiga (código de referência) - REMOVIDA, substituída por link personalizado */}
                            {ownReferralCode && !shareUrl && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #10B981, #059669)',
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    marginBottom: '1.5rem',
                                    color: 'white'
                                }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', fontWeight: 'bold', textAlign: 'center' }}>
                                        🎁 Ganhe Palpites Extras!
                                    </h4>
                                    <p style={{ margin: '0 0 1rem 0', textAlign: 'center', fontSize: '0.95rem' }}>
                                        Convide amigos e ganhe +1 palpite para cada pessoa que se cadastrar usando seu código:
                                    </p>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        textAlign: 'center',
                                        marginBottom: '1rem'
                                    }}>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                                            {ownReferralCode}
                                        </span>
                                    </div>
                                    <button
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.9)',
                                            color: '#059669',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem 1.5rem',
                                            fontWeight: 'bold',
                                            fontSize: '1rem',
                                            cursor: 'pointer'
                                        }}
                                        onClick={shareReferralCode}
                                    >
                                        📱 Compartilhar Link de Convite
                                    </button>
                                </div>
                            )}

                            {/* Mostrar palpites anteriores */}
                            {submissions.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>
                                        Seus Palpites:
                                    </h4>
                                    {submissions.map((submission) => (
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
                                        {loading ? 'Enviando...' : 'Enviar Palpite'}
                                    </button>
                                </form>
                            )}

                            {/* Link de compartilhamento personalizado - Movido para APÓS o formulário */}
                            {shareUrl && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    marginTop: '1.5rem',
                                    marginBottom: '1.5rem',
                                    color: 'white',
                                    border: '2px solid #60A5FA'
                                }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }}>
                                        📱 Compartilhe e Ganhe Palpites!
                                    </h4>
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', textAlign: 'center' }}>
                                        Cada pessoa que se cadastrar com seu link ganha +1 palpite para você:
                                    </p>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <input
                                            type="text"
                                            value={shareUrl}
                                            readOnly
                                            style={{
                                                flex: 1,
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'white',
                                                fontSize: '0.85rem',
                                                fontFamily: 'monospace',
                                                outline: 'none'
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(shareUrl);
                                                alert('Link copiado!');
                                            }}
                                            style={{
                                                background: '#10B981',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.25rem',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            📋 Copiar
                                        </button>
                                    </div>
                                    <a
                                        href={generateWhatsAppLink()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            background: '#25D366',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem 1.5rem',
                                            fontWeight: 'bold',
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        📱 Compartilhar no WhatsApp
                                    </a>
                                    <p style={{ margin: 0, fontSize: '0.85rem', textAlign: 'center', opacity: 0.9 }}>
                                        💡 Cada pessoa que se cadastrar com seu link ganha +1 palpite para você!
                                    </p>
                                </div>
                            )}

                            {/* Mensagem removida - agora está no topo */}

                            {/* Histórico de compartilhamentos */}
                            {participant && (
                                <div style={{
                                    background: currentThemeData.surface,
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    marginTop: '2rem',
                                    border: `1px solid ${currentThemeData.border}`
                                }}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <h4 style={{ color: currentThemeData.success, margin: 0, fontSize: '1.2rem' }}>
                                            👥 Pessoas que se cadastraram com seu link ({referrals.length})
                                        </h4>
                                    </div>
                                    {referrals.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {referrals.map((ref, idx) => (
                                            <div key={idx} style={{
                                                background: currentThemeData.background,
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                border: `1px solid ${currentThemeData.border}`
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <div>
                                                        <span style={{ color: currentThemeData.success, fontWeight: 'bold' }}>{ref.name}</span>
                                                        <span style={{ color: currentThemeData.textSecondary, fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                                                            {ref.phone}
                                                        </span>
                                                    </div>
                                                    <div style={{ marginTop: '0.25rem' }}>
                                                        <span style={{ color: currentThemeData.textSecondary, fontSize: '0.8rem' }}>
                                                            {new Date(ref.registeredAt).toLocaleDateString('pt-BR')}
                                                        </span>
                                                        <span style={{
                                                            marginLeft: '0.5rem',
                                                            color: ref.isRegistered ? currentThemeData.success : currentThemeData.warning,
                                                            fontSize: '0.75rem',
                                                            fontWeight: '500'
                                                        }}>
                                                            {ref.isRegistered ? '(cadastrado)' : '(aguardando...)'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', color: currentThemeData.textSecondary, padding: '2rem' }}>
                                            <p style={{ marginBottom: '0.5rem' }}>Ninguém se cadastrou com seu link ainda.</p>
                                            <p style={{ fontSize: '0.9rem' }}>Compartilhe seu link para ganhar palpites extras!</p>
                                        </div>
                                    )}
                                    {referrals.length > 0 && (
                                        <p style={{ color: currentThemeData.success, fontSize: '0.9rem', marginTop: '1rem', textAlign: 'center' }}>
                                            ✅ Você ganhou +{referrals.length} palpite{referrals.length !== 1 ? 's' : ''} extra{referrals.length !== 1 ? 's' : ''}!
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Feed de últimos palpites (público) */}
                    {liveGame && recentSubmissions.length > 0 && (
                        <div style={{
                            background: currentThemeData.surface,
                            padding: '1.5rem',
                            borderRadius: '0.75rem',
                            marginTop: '2rem',
                            border: `1px solid ${currentThemeData.border}`
                        }}>
                            <h4 style={{ color: currentThemeData.primary, margin: '0 0 1rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🔥 Últimos Palpites
                                <span style={{
                                    background: currentThemeData.success,
                                    color: 'white',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                }}>ATUALIZAÇÃO AUTOMÁTICA</span>
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {recentSubmissions.map((sub, idx) => (
                                    <div key={idx} style={{
                                        background: currentThemeData.background,
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        borderLeft: `4px solid ${currentThemeData.primary}`,
                                        border: `1px solid ${currentThemeData.border}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ color: currentThemeData.text, fontWeight: '600', fontSize: '1rem' }}>
                                                {sub.userName || 'Anônimo'}
                                                {sub.userNeighborhood && (
                                                    <span style={{ color: currentThemeData.textSecondary, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                                                        - {sub.userNeighborhood}
                                                    </span>
                                                )}
                                            </span>
                                            <span style={{ color: currentThemeData.primary, fontSize: '1.05rem', fontWeight: '600' }}>
                                                &quot;{sub.guess}&quot;
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Rodapé NexoGeo */}
            <div style={{
                marginTop: '2rem',
                textAlign: 'center'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '1.5rem',
                    borderRadius: '15px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    maxWidth: '350px',
                    margin: '0 auto'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                    }}>
                        <img
                            src="/imagens/logo0.png"
                            alt="NexoGeo"
                            style={{
                                width: '120px',
                                height: 'auto',
                                objectFit: 'contain',
                                borderRadius: '8px'
                            }}
                        />
                    </div>
                    <p style={{
                        color: '#64748b',
                        fontSize: '0.875rem',
                        margin: '0 0 1rem 0',
                        lineHeight: '1.4'
                    }}>
                        Sistema completo de gestão de promoções e sorteios
                    </p>
                    <a
                        href="https://nexogeo.vercel.app/demo"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            textDecoration: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        📦 Conheça a NexoGeo
                    </a>
                </div>
            </div>

        </main>
    );
};

export default CaixaMisteriosaPub;