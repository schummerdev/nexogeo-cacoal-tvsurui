import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './EnqueteBroadcastPage.css';

const EnqueteBroadcastPage = () => {
    const [searchParams] = useSearchParams();
    const enqueteId = searchParams.get('id');

    const [dados, setDados] = useState(null);
    const [emissora, setEmissora] = useState(null);
    const [error, setError] = useState(null);

    // --- LÓGICA DE BALÕES / ENGAJAMENTO ---
    const [activeBalloons, setActiveBalloons] = useState([]);
    const balloonsPoolRef = React.useRef([]);
    const newBalloonsQueueRef = React.useRef([]);
    const lastSeenIdRef = React.useRef(null);
    const poolIndexRef = React.useRef(0);

    // Controle de Backoff e Tabs inativas
    const pollingIntervalRef = React.useRef(3000);
    const unchangedCountRef = React.useRef(0);

    // Busca dados da emissora (uma única vez)
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

    // Efeito de short-polling para TV (Busca de 3 em 3 segundos, com backoff escalonado)
    useEffect(() => {
        let timerId;

        const fetchResultados = async () => {
            // Se a aba estiver inativa, adiar requisição em 10s (poupa servidor de guias esquecidas)
            if (document.hidden) {
                timerId = setTimeout(fetchResultados, 10000);
                return;
            }

            try {
                const url = enqueteId
                    ? `/api/?route=enquetes&endpoint=resultados&id=${enqueteId}`
                    : '/api/?route=enquetes&endpoint=resultados';

                const res = await fetch(url);

                if (res.ok) {
                    const json = await res.json();
                    if (json.data && json.data.enquete) {
                        setDados(json.data);
                        setError(null);

                        let hasNewVotes = false;

                        // Processa os recentes para a lógica de bolhas
                        if (json.data.recentes && json.data.recentes.length > 0) {
                            const fetchedRecents = json.data.recentes;

                            // Na primeira carga, só preenche o pool e define o último ID conhecido
                            if (!lastSeenIdRef.current) {
                                lastSeenIdRef.current = fetchedRecents[0].id;
                                balloonsPoolRef.current = fetchedRecents;
                                hasNewVotes = true; // Força primeira renderização a manter ritmo rápido
                            } else {
                                // Vê quem é mais novo que o lastSeenId
                                const novos = fetchedRecents.filter(v => parseInt(v.id) > parseInt(lastSeenIdRef.current));

                                if (novos.length > 0) {
                                    hasNewVotes = true;
                                    // Adiciona na fila de inéditos (do mais antigo pro mais novo pra mostrar na ordem correta)
                                    newBalloonsQueueRef.current = [...newBalloonsQueueRef.current, ...novos.reverse()];
                                    lastSeenIdRef.current = novos[novos.length - 1].id;
                                }
                                balloonsPoolRef.current = fetchedRecents;
                            }
                        }

                        // Lógica de Escalabilidade e Backoff (Reduz gargalo Vercel / Neon)
                        if (hasNewVotes) {
                            unchangedCountRef.current = 0;
                            pollingIntervalRef.current = 3000; // Reseta para 3 segundos se estiver ativo
                        } else {
                            unchangedCountRef.current += 1;
                            // Se ficou sem votos por 10 chamadas (30s), sobe o intervalo pra 6s. Depois de 20 (90s), sobe pra 10s.
                            if (unchangedCountRef.current > 20) {
                                pollingIntervalRef.current = 10000;
                            } else if (unchangedCountRef.current > 10) {
                                pollingIntervalRef.current = 6000;
                            }
                        }
                    } else {
                        setError('Nenhuma enquete encontrada.');
                    }
                } else {
                    if (res.status === 404) {
                        setError('Enquete não encontrada ou inativa.');
                    }
                }
            } catch (err) {
                console.error('Erro de conexão com o painel da TV:', err);
                // Se der erro de rede, backoff imediato (ajuda a recuperar o banco se estiver sobrecarregado)
                pollingIntervalRef.current = 10000;
            }

            // Agenda a próxima busca com base no polling interval atualizado
            timerId = setTimeout(fetchResultados, pollingIntervalRef.current);
        };

        // Inicia o ciclo
        timerId = setTimeout(fetchResultados, 500); // 500ms só para não bloquear o render principal inicial

        return () => clearTimeout(timerId);
    }, [enqueteId]);

    // Loop de Spawn dos Balões
    useEffect(() => {
        const spawnInterval = setInterval(() => {
            // Pausa a geração de balões se a aba não estiver visível (Poupando processamento CSS da GPU)
            if (document.hidden) return;

            let voterToSpawn = null;

            // Prioriza a fila de novos votos
            if (newBalloonsQueueRef.current.length > 0) {
                voterToSpawn = newBalloonsQueueRef.current.shift();
            }
            // Se não tem novo, pega do pool para o efeito de loop
            else if (balloonsPoolRef.current.length > 0) {
                const pool = balloonsPoolRef.current;
                if (poolIndexRef.current >= pool.length) {
                    poolIndexRef.current = 0;
                }
                voterToSpawn = pool[poolIndexRef.current];
                poolIndexRef.current += 1;
            }

            if (voterToSpawn) {
                spawnBalloon(voterToSpawn);
            }
        }, 1500); // Intervalo entre bolhas (1.5 segundos)

        return () => clearInterval(spawnInterval);
    }, []);

    const spawnBalloon = (voter) => {
        // Para evitar gargalo de renderização, limita a quantidade de balões simultâneos
        setActiveBalloons(prev => {
            // Se já tiver mais de 20 balões flutuando, aborta a criação do novo (proteção de FPS)
            if (prev.length > 20) return prev;

            // Gerar uma posição X randômica entre 5% e 95%
            const randomX = Math.floor(Math.random() * 90) + 5;
            const renderId = Date.now() + '-' + Math.random();

            const newBalloon = {
                renderId,
                nome: voter.nome,
                bairro: voter.bairro,
                cor: voter.cor,
                left: randomX
            };

            // Remove o balão depois que a animação termina (ex: 6 segundos)
            setTimeout(() => {
                setActiveBalloons((currentBalloons) => currentBalloons.filter(b => b.renderId !== renderId));
            }, 6000);

            return [...prev, newBalloon];
        });
    };

    if (error) {
        return (
            <div className="broadcast-page error-fallback">
                <h1 style={{ color: 'white', textShadow: '2px 2px 4px black' }}>[NEXOGEO] TV BROADCAST: {error}</h1>
            </div>
        );
    }

    if (!dados) {
        return <div className="broadcast-page"></div>; // Fundo transparente puro até carregar
    }

    const { enquete, resultados, total_votos } = dados;

    return (
        <div className={`broadcast-page ${enquete.cor_tema}`}>
            <div className="broadcast-container">
                {emissora && (
                    <div className="broadcast-emissora-header">
                        {emissora.logo_url && <img src={emissora.logo_url} alt={emissora.nome} className="emissora-logo-tv" />}
                        <span className="emissora-nome-tv">{emissora.nome}</span>
                    </div>
                )}
                <div className="broadcast-header">
                    <h1 className="broadcast-pergunta">{enquete.pergunta}</h1>
                    {enquete.status === 'ativa' && (
                        <div className="broadcast-qrcode-box">
                            <span className="qr-text">DÊ SEU VOTO AGORA! <br />Aponte a câmera</span>
                            <div className="qr-placeholder icon-scale">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '/votar?promocao=' + enquete.id)}`} alt="QR Votar" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="broadcast-resultados mt-4">
                    {resultados.map((opcao) => (
                        <div key={opcao.id} className="bar-wrapper slide-in-right">
                            <div className="bar-label-top">
                                <span className="opcao-nome">{opcao.texto_opcao}</span>
                                {enquete.mostrar_votos !== false && (
                                    <span className="opcao-percent">{opcao.percentual}%</span>
                                )}
                            </div>
                            <div className="bar-background">
                                <div
                                    className="bar-fill"
                                    style={{
                                        width: `${opcao.percentual}%`,
                                        backgroundColor: opcao.cor_grafico
                                    }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="broadcast-footer">
                    {enquete.mostrar_votos !== false ? (
                        <span>Total de votos: <strong>{total_votos}</strong></span>
                    ) : (
                        <span>Votação em andamento</span>
                    )}
                    <span className="marca-dg">Participação interativa • NexoGeo</span>
                </div>
            </div>

            {/* Container das Bolhas / Balões */}
            <div className="balloons-layer">
                {activeBalloons.map(b => (
                    <div
                        key={b.renderId}
                        className="balloon-item"
                        style={{
                            left: `${b.left}%`,
                            backgroundColor: b.cor || '#4F46E5'
                        }}
                    >
                        <span>{b.nome} {b.bairro ? `(${b.bairro})` : ''}</span>
                        <div className="balloon-tail" style={{ borderTopColor: b.cor || '#4F46E5' }}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EnqueteBroadcastPage;
