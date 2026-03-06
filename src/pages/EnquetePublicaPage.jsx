import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './EnquetePublicaPage.css';
import { filtrarBairrosAutocomplete } from '../utils/bairrosUtils';

const EnquetePublicaPage = () => {
    const [searchParams] = useSearchParams();
    const enqueteUrlId = searchParams.get('promocao') || searchParams.get('id');

    // Estado da Enquete
    const [enquete, setEnquete] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estado de Interação
    const [step, setStep] = useState(1); // 1 = Telefone, 2 = Cadastro, 3 = Votar
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [votoComputado, setVotoComputado] = useState(false);

    // Dados do Participante
    const [telefone, setTelefone] = useState('');
    const [participanteId, setParticipanteId] = useState(null);

    // Estado da Emissora (Para Rodapé e Títulos)
    const [emissora, setEmissora] = useState(null);

    // Form de Novo Cadastro
    const [nome, setNome] = useState('');
    const [bairro, setBairro] = useState('');
    const [cidade, setCidade] = useState('Cacoal');
    const [localizacao, setLocalizacao] = useState(null);
    const [sugestoesBairro, setSugestoesBairro] = useState([]);

    useEffect(() => {
        const fetchEmissora = async () => {
            try {
                const res = await fetch('/api/configuracoes?type=emissora');
                if (res.ok) {
                    const data = await res.json();
                    if (data.data) {
                        setEmissora(data.data);
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar dados da emissora:', err);
            }
        };
        fetchEmissora();
    }, []);

    useEffect(() => {
        const fetchEnqueteAtiva = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/?route=enquetes&endpoint=ativa');
                if (res.ok) {
                    const data = await res.json();
                    if (data.data) {
                        setEnquete(data.data);
                    } else {
                        setError('Nenhuma enquete ativa no momento.');
                    }
                } else {
                    setError('Erro ao buscar enquete.');
                }
            } catch (err) {
                console.error(err);
                setError('Erro de conexão ao buscar enquete.');
            } finally {
                setLoading(false);
            }
        };
        fetchEnqueteAtiva();
    }, [enqueteUrlId]);

    // Limpeza de telefone (Apenas números)
    const handleTelefoneChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        // Adiciona máscara básica (##) #####-####
        if (val.length > 2) val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
        if (val.length > 10) val = `${val.substring(0, 10)}-${val.substring(10, 14)}`;
        setTelefone(val);
    };

    // ─── PASSO 1: VERIFICAR TELEFONE ────────────────────────────────────────────────
    const verificarTelefone = async (e) => {
        e.preventDefault();
        const telefoneNumeros = telefone.replace(/\D/g, '');

        if (telefoneNumeros.length < 10) {
            alert('Por favor, digite um número de WhatsApp válido.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/?route=participantes&endpoint=verificar&telefone=${telefoneNumeros}&promocao_id=${enquete.id}`);
            const data = await res.json();

            if (data.ja_na_promocao) {
                // Participação já existente na Enquete (Participantes TV)
                // Usar ID retornado no backend
                const pId = data.data.id;
                setParticipanteId(pId);
                setNome(data.data.nome || '');
                setBairro(data.data.bairro || '');

                try {
                    // Verificar se já votou para decidir se vai pra Urna ou Sucesso
                    const vRes = await fetch(`/api/?route=enquetes&endpoint=verificar_voto&enquete_id=${enquete.id}&participante_id=${pId}`);
                    const vData = await vRes.json();
                    if (vData.ja_votou) {
                        console.log('🚫 [ENQUETE] Usuário já votou nesta enquete.');
                        setVotoComputado(true);
                        setStep(4); // Força ir para tela de agradecimento
                        return;
                    }
                } catch (vErr) { console.error(vErr); }

                // Se não votou ainda, vai pra Step 3 (votação) SEM alerta chato.
                setStep(3);
                return;
            }

            if (data.exists && data.data) {
                // Participante existe no sistema (ex: em outra promoção ou Caixa Misteriosa)
                // mas não NESTA enquete ainda.
                const pData = data.data;

                // Só tenta auto-registrar se houver um nome disponível
                if (pData.nome) {
                    console.log('🔄 [ENQUETE] Participante encontrado no sistema. Iniciando auto-registro...', pData);

                    const autoRegBody = {
                        nome: pData.nome,
                        telefone: telefoneNumeros,
                        bairro: pData.bairro || 'Não Informado',
                        cidade: pData.cidade || 'Cacoal',
                        latitude: localizacao?.latitude || null,
                        longitude: localizacao?.longitude || null,
                        origem_source: 'tv_enquete_auto',
                        origem_medium: 'celular',
                        promocao_id: enquete.id
                    };

                    const regRes = await fetch('/api/participantes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(autoRegBody)
                    });

                    const regData = await regRes.json();
                    console.log('📥 [ENQUETE] Resposta do auto-registro:', regData);

                    if ((regRes.ok && regData.data) || regRes.status === 409) {
                        const finalId = regData.data?.id || pData.id;
                        console.log('✅ [ENQUETE] Auto-registro concluído ou duplicado. Indo para Step 3 com ID:', finalId);
                        setParticipanteId(finalId);
                        setNome(pData.nome || '');
                        setBairro(pData.bairro || '');
                        setStep(3);
                    } else {
                        console.warn('⚠️ [ENQUETE] Auto-registro falhou. Indo para Step 2 (Manual).');
                        setStep(2);
                    }
                } else {
                    console.log('ℹ️ [ENQUETE] Participante existe mas dados incompletos. Indo para Step 2.');
                    obterLocalizacao();
                    setStep(2);
                }
            } else {
                // Participante NOVO - vai para passo 2
                obterLocalizacao();
                setStep(2);
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao verificar o número. Tente de novo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── PASSO 2: CADASTRAR NOVO PARTICIPANTE ───────────────────────────────────────
    const obterLocalizacao = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocalizacao({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (err) => {
                    console.warn("Geolocalização não obtida/negada:", err);
                }
            );
        }
    };

    const registrarParticipante = async (e) => {
        e.preventDefault();

        if (!nome || !bairro || !cidade) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                nome,
                telefone: telefone.replace(/\D/g, ''),
                bairro,
                cidade,
                latitude: localizacao?.latitude || null,
                longitude: localizacao?.longitude || null,
                origem_source: 'tv_enquete',
                origem_medium: 'celular',
                promocao_id: enquete.id // Importante para o dashboard
            };

            const res = await fetch('/api/participantes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success && data.data) {
                setParticipanteId(data.data.id);
                setNome(data.data.nome || '');
                setBairro(data.data.bairro || '');
                setStep(3); // Concluiu cadastro, vai pra urna
            } else {
                alert(data.message || 'Erro ao realizar cadastro.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão ao salvar cadastro.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── PASSO 3: VOTAR ─────────────────────────────────────────────────────────────
    const handleVotar = async (opcaoId) => {
        if (!participanteId) {
            alert('Sessão expirada ou usuário inválido. Recarregue a página.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/?route=enquetes&endpoint=votar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enquete_id: enquete.id,
                    opcao_id: opcaoId,
                    participante_id: participanteId
                })
            });

            const data = await res.json();

            if (res.ok) {
                setVotoComputado(true);
                setStep(4); // Vai para tela de agradecimento
            } else if (res.status === 409) {
                setVotoComputado(true);
                setStep(4); // Força ir para tela de agradecimento se já votou
                alert('Você só pode votar 1 vez por enquete. Seu primeiro voto já foi validado! 😉 Acompanhe o resultado na TV!');
            } else if (res.status === 403) {
                setError('Esta enquete já foi encerrada. Fique de olho na TV para a próxima!');
            } else if (res.status === 429) {
                alert('Muitos acessos em sequência! Aguarde e tente novamente.');
            } else {
                alert(data.message || 'Erro ao registrar voto. Tente de novo.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão. Verifique sua internet.');
        } finally {
            if (!votoComputado && !error) {
                setIsSubmitting(false);
            }
        }
    };

    const handleWhatsAppRedirect = () => {
        const whatsappNumber = emissora?.whatsapp || emissora?.telefone || '556934412234';
        const message = `Olá! Acabei de participar da enquete "${enquete.pergunta}" na ${emissora?.nome || 'TV'} e gostaria de acompanhar as novidades!`;

        // Detectar se é mobile
        const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());

        if (isMobile) {
            window.location.href = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
        } else {
            window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
        }
    };

    // ─── RENDERERS GERAIS ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="enquete-publica-container loading">
                <div className="spinner"></div>
                <p>Carregando enquete...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="enquete-publica-container error">
                <h2>⚠️ Ops!</h2>
                <p>{error}</p>
                <p className="mt-4 text-sm opacity-70">Fique de olho na TV para participar das próximas enquetes.</p>
            </div>
        );
    }

    if (votoComputado) {
        return (
            <div className="enquete-publica-container success">
                <div className="enquete-card success-screen">
                    {/* Header da Emissora */}
                    {emissora && (
                        <div className="enquete-emissora-header">
                            {emissora.logo_url && <img src={emissora.logo_url} alt={emissora.nome} className="emissora-logo-public" />}
                            <span className="emissora-nome-public">{emissora.nome}</span>
                        </div>
                    )}

                    <div className="success-blob">✅</div>
                    <h2 className="pergunta" style={{ background: 'var(--color-success)', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Voto Registrado!
                    </h2>

                    <div className="user-details-success">
                        <p><strong>Nome:</strong> {nome}</p>
                        <p><strong>Bairro:</strong> {bairro}</p>
                    </div>

                    <p style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '24px' }}>
                        Obrigado pela sua participação.
                    </p>

                    <button
                        className="btn-whatsapp-success"
                        onClick={handleWhatsAppRedirect}
                    >
                        <span>💬</span> Falar com a {emissora?.nome || 'TV'} no WhatsApp
                    </button>

                    <div className="blur-bg" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border)', marginTop: '24px' }}>
                        <p>Sua opinião é muito importante. <strong>Obrigado por votar!</strong></p>
                        <p className="mt-2" style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>
                            ⚠️ É permitido apenas 1 voto por número de celular. Se já votou, acompanhe o resultado na TV!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`enquete-publica-container theme-${enquete.cor_tema}`}>
            <div className="enquete-card">
                {/* Header da Emissora */}
                {emissora && (
                    <div className="enquete-emissora-header">
                        {emissora.logo_url && <img src={emissora.logo_url} alt={emissora.nome} className="emissora-logo-public" />}
                        <span className="emissora-nome-public">{emissora.nome}</span>
                    </div>
                )}

                {/* Header com Pergunta em Destaque */}
                <div className="enquete-header-premium">
                    <h1 className="enquete-pergunta-destaque">{enquete.pergunta}</h1>
                    <div className="enquete-pergunta-spacer"></div>
                </div>

                {/* FLUXO 1: PEDE O TELEFONE */}
                {step === 1 && (
                    <form className="form-card-premium" onSubmit={verificarTelefone}>
                        <p className="auth-helper" style={{ textAlign: 'center', opacity: 0.8 }}>
                            Para votar, informe o seu número do celular (WhatsApp):
                        </p>
                        <input
                            type="tel"
                            className="input-premium"
                            placeholder="(69) 99999-9999"
                            value={telefone}
                            onChange={handleTelefoneChange}
                            maxLength="15"
                            required
                            disabled={isSubmitting}
                        />
                        <button
                            type="submit"
                            className="btn-submit-premium"
                            disabled={isSubmitting || telefone.length < 14}
                        >
                            {isSubmitting ? 'Buscando...' : 'Avançar'}
                            <span style={{ fontSize: '1.4rem' }}>→</span>
                        </button>
                        <p className="disclaimer-text" style={{ fontSize: '0.85rem', textAlign: 'center', opacity: 0.9, color: 'var(--color-warning)' }}>
                            ⚠️ É permitido apenas 1 voto por número de celular. Se já votou, acompanhe o resultado na TV!
                        </p>
                    </form>
                )}

                {/* FLUXO 2: PEDE O CADASTRO (CASO NOVO) */}
                {step === 2 && (
                    <form className="form-card-premium" onSubmit={registrarParticipante}>
                        <p className="auth-helper" style={{ textAlign: 'center', opacity: 0.8 }}>
                            Seja bem-vindo! Como é seu primeiro acesso, preencha seus dados:
                        </p>

                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Nome Completo"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            required
                            disabled={isSubmitting}
                        />
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Seu Bairro"
                                value={bairro}
                                onChange={(e) => {
                                    setBairro(e.target.value);
                                    setSugestoesBairro(filtrarBairrosAutocomplete(e.target.value));
                                }}
                                onBlur={() => setTimeout(() => setSugestoesBairro([]), 200)}
                                required
                                disabled={isSubmitting}
                            />
                            {sugestoesBairro.length > 0 && (
                                <div className="autocomplete-suggestions">
                                    {sugestoesBairro.map((s, idx) => (
                                        <div
                                            key={idx}
                                            className="suggestion-item"
                                            onClick={() => {
                                                setBairro(s);
                                                setSugestoesBairro([]);
                                            }}
                                        >
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Sua Cidade"
                            value={cidade}
                            onChange={(e) => setCidade(e.target.value)}
                            required
                            disabled={isSubmitting}
                        />

                        <button
                            type="submit"
                            className="btn-submit-premium"
                            style={{ background: 'var(--gradient-neon)', color: '#0f172a' }}
                            disabled={isSubmitting || !nome || !bairro || !cidade}
                        >
                            {isSubmitting ? 'Salvando...' : 'Avançar'} ✨
                        </button>
                        <button
                            type="button"
                            className="underline-hover"
                            style={{ border: 'none', background: 'transparent', alignSelf: 'center', fontWeight: 'bold' }}
                            onClick={() => setStep(1)}
                            disabled={isSubmitting}
                        >
                            Voltar
                        </button>
                    </form>
                )}

                {/* FLUXO 3: TELA DE VOTAÇÃO NORMAL */}
                {step === 3 && (
                    <div className="opcoes-lista">
                        <p className="auth-helper" style={{ textAlign: 'center', marginBottom: '20px', fontWeight: '600' }}>
                            Escolha uma opção e veja o resultado na TV:
                        </p>
                        {enquete.opcoes && enquete.opcoes.map((opcao, index) => (
                            <button
                                key={opcao.id}
                                className={`btn-opcao-premium ${isSubmitting ? 'disabled' : ''}`}
                                style={{
                                    '--opcao-cor': opcao.cor_grafico,
                                    animationDelay: `${index * 0.1}s`,
                                    opacity: isSubmitting ? 0.6 : 1
                                }}
                                onClick={() => !isSubmitting && handleVotar(opcao.id)}
                                disabled={isSubmitting}
                            >
                                <span>{opcao.texto_opcao}</span>
                                <div className="opcao-indicador">{index + 1}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="enquete-footer">
                <p><strong>NexoGeo</strong> • Tecnologia de Engajamento {emissora?.nome || 'TV Suruí'}</p>
            </div>
        </div>
    );
};

export default EnquetePublicaPage;
