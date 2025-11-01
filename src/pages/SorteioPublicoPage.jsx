import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { maskName } from '../utils/privacyUtils';
import './SorteioPublicoPage.css';

// Componente para fallback de mídia sem error spam
const MediaWithFallback = ({ src, fallbacks = [], alt, className, style, ...props }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(-1);
  const [hasErrored, setHasErrored] = useState(false);

  const handleError = () => {
    if (fallbackIndex < fallbacks.length - 1) {
      const nextIndex = fallbackIndex + 1;
      setFallbackIndex(nextIndex);
      setCurrentSrc(fallbacks[nextIndex]);
      console.log(`🔄 Tentando fallback ${nextIndex + 1}:`, fallbacks[nextIndex]);
    } else {
      setHasErrored(true);
      console.log('❌ Todos os fallbacks falharam, ocultando mídia');
    }
  };

  if (hasErrored) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          color: '#666',
          fontSize: '14px',
          padding: '20px'
        }}
      >
        📷 Mídia não disponível
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      style={style}
      onLoad={() => console.log(`✅ Mídia carregada: ${currentSrc}`)}
      onError={handleError}
      {...props}
    />
  );
};

const SorteioPublicoPage = () => {
  const [searchParams] = useSearchParams();
  const promocaoIdFromUrl = searchParams.get('promocao');

  // Garantir que o ID da URL seja usado corretamente
  const initialPromocaoId = promocaoIdFromUrl ? promocaoIdFromUrl.toString() : null;
  const [promocaoId, setPromocaoId] = useState(initialPromocaoId);

  console.log('🚀 [INIT] SorteioPublicoPage - URL param:', promocaoIdFromUrl, 'State inicial:', initialPromocaoId);
  console.log('🔗 [URL] Parâmetros completos da URL:', Object.fromEntries(searchParams));

  // Memoizar videoUrl para evitar re-renders desnecessários
  const videoUrl = useMemo(() => {
    const videoUrlParam = searchParams.get('video');
    const defaultLocalMedia = '/videos/sorteio.webp';
    return videoUrlParam || defaultLocalMedia;
  }, [searchParams]);
  
  const [countdown, setCountdown] = useState(10);
  const [showWinners, setShowWinners] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [promocao, setPromocao] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [emissora, setEmissora] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Definir startCountdown antes dos useEffects para evitar Temporal Dead Zone
  const startCountdown = useCallback(() => {
    if (showWinners) return; // Não iniciar se já está mostrando ganhadores

    console.log('⏰ Iniciando countdown de 10 segundos...');
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          console.log('🎉 Countdown finalizado, mostrando ganhadores!');
          setShowWinners(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWinners]);

  // Buscar promoção ativa como padrão se não especificada na URL
  useEffect(() => {
    const fetchActivePromotion = async () => {
      console.log('🔍 [USEEFFECT1] promocaoIdFromUrl:', promocaoIdFromUrl, 'promocaoId atual:', promocaoId);
      if (!promocaoIdFromUrl) {
        try {
          console.log('🔍 Buscando promoção ativa padrão...');
          const response = await fetch('/api/?route=promocoes&status=ativa');
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              const activePromo = data.data[0];
              console.log('✅ Promoção ativa encontrada:', activePromo.id);
              console.log('🔄 [SETSTATE] Definindo promocaoId para:', activePromo.id.toString());
              setPromocaoId(activePromo.id.toString());
            } else {
              console.log('⚠️ Nenhuma promoção ativa, usando ID 10 (última criada)');
              setPromocaoId('10'); // ID da última promoção criada
            }
          }
        } catch (error) {
          console.error('❌ Erro ao buscar promoção ativa:', error);
          setPromocaoId('10'); // Fallback para a última promoção criada
        }
      }
    };

    fetchActivePromotion();
  }, [promocaoIdFromUrl]);

  useEffect(() => {
    const fetchWinners = async () => {
      console.log('🔍 [USEEFFECT2] promocaoId atual:', promocaoId, 'tipo:', typeof promocaoId);
      if (!promocaoId) {
        console.log('⏳ Aguardando definição do promocaoId...');
        return;
      }

      // Permitir primeira execução mesmo com loading=true inicial
      if (loading && winners.length > 0) {
        console.log('⏳ Já carregou dados, ignorando nova execução...');
        return;
      }

      setLoading(true);
      try {
        console.log(`🔍 [ATUAL] Buscando promoção com ID: ${promocaoId} (tipo: ${typeof promocaoId})`);
        const response = await fetch(`/api/?route=sorteio&action=ganhadores&id=${promocaoId}`);
        if (!response.ok) {
          throw new Error('Erro ao buscar ganhadores');
        }
        const data = await response.json();
        console.log('📊 Dados de ganhadores recebidos:', data);
        console.log('📊 data.data:', data.data);
        console.log('📊 data.data length:', data.data?.length);
        console.log('📊 data.total:', data.total);
        const winnersToSet = data.ganhadores || data.data || [];
        console.log('📊 Winners a serem setados:', winnersToSet);
        console.log('📊 Winners length:', winnersToSet.length);
        setWinners(winnersToSet);
        
        // Buscar informações da promoção específica
        console.log('Buscando promoção com ID:', promocaoId);
        const promoResponse = await fetch(`/api/?route=promocoes&id=${promocaoId}`);
        if (promoResponse.ok) {
          const promoData = await promoResponse.json();
          console.log('Dados da promoção recebidos:', promoData);
          if (promoData.success && promoData.data) {
            setPromocao(promoData.data);
            console.log('Promoção definida:', promoData.data);
          } else {
            console.warn('Nenhuma promoção encontrada para ID:', promocaoId);
            setPromocao({ nome: 'Promoção não encontrada', descricao: '' });
          }
        } else {
          console.error('Erro na resposta da API de promoções:', promoResponse.status);
        }

        // Buscar configurações da emissora
        try {
          const emissoraResponse = await fetch('/api/configuracoes');
          if (emissoraResponse.ok) {
            const emissoraData = await emissoraResponse.json();
            console.log('Dados da emissora recebidos:', emissoraData);
            setEmissora(emissoraData.data);
          }
        } catch (emissoraErr) {
          console.error('Erro ao carregar dados da emissora:', emissoraErr);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar dados do sorteio');
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, [promocaoId]);

  useEffect(() => {
    if (!loading && winners.length > 0 && !showWinners) {
      // Se há URL do vídeo, mostrar vídeo E iniciar countdown simultaneamente
      if (videoUrl) {
        setShowVideo(true);
      }

      // Iniciar countdown imediatamente (com ou sem vídeo)
      startCountdown();
    }
  }, [loading, winners.length, videoUrl, showWinners]);

  // Efeito para lidar com mudanças de áudio
  useEffect(() => {
    console.log(`🎵 Estado do áudio alterado para: ${audioEnabled ? 'ATIVADO' : 'DESATIVADO'}`);
    
    // Para vídeos HTML5, podemos controlar o mute diretamente
    const videoElements = document.querySelectorAll('.custom-video-player');
    videoElements.forEach(video => {
      if (video.tagName === 'VIDEO') {
        video.muted = !audioEnabled;
        if (audioEnabled && video.paused) {
          video.play().catch(e => console.log('Play após ativar áudio falhou:', e));
        }
      }
    });
  }, [audioEnabled]);

  // Efeito para forçar reprodução automática (otimizado)
  useEffect(() => {
    if (!showVideo) return;

    const forceAutoplay = () => {
      console.log('🎬 Configurando reprodução de vídeo...');
      const videoElements = document.querySelectorAll('.custom-video-player');
      videoElements.forEach(video => {
        if (video.tagName === 'VIDEO' && video.paused) {
          console.log('📹 Tentando reproduzir vídeo...');
          video.muted = !audioEnabled;
          video.play().then(() => {
            console.log('✅ Reprodução iniciada');
            setVideoPlaying(true);
          }).catch((error) => {
            console.log('❌ Reprodução falhou:', error.name);
          });
        }
      });
    };

    // Executar apenas uma vez após um pequeno delay
    const timer = setTimeout(forceAutoplay, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [showVideo, audioEnabled]);

  const processVideoUrl = (url) => {
    if (!url) return null;
    
    // Detectar caminho Windows (C:\... ou \\...)
    if (url.match(/^[A-Za-z]:\\/) || url.startsWith('\\\\')) {
      console.log('🎬 Caminho Windows detectado:', url);
      // Converter para file:// protocol
      const fileUrl = `file:///${url.replace(/\\/g, '/')}`;
      console.log('🔄 Convertido para:', fileUrl);
      return fileUrl;
    }
    
    // Se já é file:// ou http/https, retornar como está
    return url;
  };

  if (loading || (!promocao && !error)) {
    return (
      <div className="sorteio-publico-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando sorteio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sorteio-publico-page">
        <div className="error-container">
          <h2>❌ Erro</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (winners.length === 0) {
    return (
      <div className="sorteio-publico-page">
        <div className="no-winners-container">
          <h2>🎲 Aguardando Sorteio</h2>
          <p>Ainda não há ganhadores para esta promoção.</p>
          {promocao && (
            <div className="promocao-info">
              <h3>{promocao.nome}</h3>
              <p>{promocao.descricao}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sorteio-publico-page">
      {/* Logo da Emissora */}
      {emissora && emissora.logo_url && (
        <div className="emissora-logo-section">
          <img 
            src={emissora.logo_url} 
            alt={emissora.nome || 'Logo da Emissora'}
            className="emissora-logo"
            onError={(e) => {
              console.error('Erro ao carregar logo da emissora:', emissora.logo_url);
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="header-section">
        <h1>🎉 Resultado do Sorteio 🎉</h1>
        {promocao && (
          <div className="promocao-header">
            <h2>{promocao.nome}</h2>
            {promocao.descricao && <p>{promocao.descricao}</p>}
          </div>
        )}
      </div>

      {/* Video e Countdown Section - Layout lado a lado */}
      {!showWinners && (
        <div className="video-countdown-container">
          {/* Media Section - Player Universal */}
          {videoUrl && showVideo && (
            <div className="video-section-inline">
              <h3>🎬 Animação do Sorteio</h3>
              <div className="video-container-custom">
                
                {/* Verificar se é YouTube */}
                {(videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) ? (
                  <iframe
                    key="youtube-player"
                    src={(() => {
                      console.log('YouTube URL detectada:', videoUrl);
                      let embedUrl = videoUrl;
                      if (videoUrl.includes('watch?v=')) {
                        embedUrl = videoUrl.replace('watch?v=', 'embed/');
                      } else if (videoUrl.includes('youtu.be/')) {
                        embedUrl = videoUrl.replace('youtu.be/', 'youtube.com/embed/');
                      }
                      const finalUrl = embedUrl + `?autoplay=1&mute=${audioEnabled ? '0' : '1'}&loop=1&controls=1&modestbranding=1&rel=0&showinfo=0&enablejsapi=1&start=0&origin=${window.location.origin}`;
                      console.log('URL do iframe:', finalUrl);
                      return finalUrl;
                    })()}
                    className="custom-video-player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
                    allowFullScreen
                    title="Vídeo do Sorteio"
                    onLoad={() => console.log('Iframe YouTube carregado')}
                    onError={() => console.error('Erro no iframe YouTube')}
                  ></iframe>
                ) : videoUrl.includes('.webp') ? (
                  /* Imagem animada WebP com fallback controlado */
                  <MediaWithFallback
                    src={videoUrl}
                    fallbacks={['/videos/sorteio.mp4']}
                    alt="Animação do Sorteio"
                    className="custom-video-player sorteio-animation"
                    width="100%"
                    style={{
                      maxHeight: '280px',
                      objectFit: 'contain',
                      backgroundColor: 'transparent',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  /* Player HTML5 para vídeos */
                  <video 
                    key="local-player"
                    autoPlay
                    muted 
                    loop 
                    playsInline
                    className="custom-video-player"
                    width="100%"
                    height="280"
                    style={{ backgroundColor: '#000' }}
                    onCanPlay={(e) => {
                      e.target.play().catch(console.log);
                    }}
                  >
                    <source src={processVideoUrl(videoUrl)} type="video/mp4" />
                    <source src={processVideoUrl(videoUrl)?.replace('.mp4', '.webm')} type="video/webm" />
                    <source src={processVideoUrl(videoUrl)?.replace('.mp4', '.mov')} type="video/quicktime" />
                    <p style={{color: '#fff', textAlign: 'center', padding: '20px'}}>
                      Mídia não disponível
                    </p>
                  </video>
                )}
              </div>
            </div>
          )}

          {/* Countdown Section */}
          <div className="countdown-section-inline">
            <h3>⏰ Revelando ganhadores em:</h3>
            <div className="countdown-display">
              <div className="countdown-number">{countdown}</div>
              <div className="countdown-label">segundos</div>
            </div>
            <p>{videoUrl ? 'Assistindo à animação e aguardando...' : 'Aguarde para ver os ganhadores...'}</p>
          </div>
        </div>
      )}

      {/* Winners Section */}
      {showWinners && (
        <div className="winners-section">
          <div className="confetti-animation">🎊🎉✨🎊🎉✨🎊</div>
          
          <h2 className="winners-title">
            🏆 {winners.length === 1 ? 'Ganhador' : 'Ganhadores'} 🏆
          </h2>
          
          <div className={`winners-grid ${winners.length === 1 ? 'single-winner' : winners.length === 2 ? 'two-winners' : 'multiple-winners'}`}>
            {winners.map((winner, index) => (
              <div key={winner.ganhador_id || index} className="winner-card">
                
                <div className="winner-avatar">
                  <span className="winner-number">
                    {index + 1}
                  </span>
                </div>
                
                <div className="winner-info">
                  <div className="winner-name-section">
                    <h3 className="winner-name">{winner.participante_nome || winner.nome || 'Nome não informado'}</h3>
                  </div>
                  <div className="winner-contact-section">
                    <div className="winner-contact-line">
                      <span className="winner-phone">
                        📱 ****{(winner.participante_telefone || winner.telefone)?.slice(-4) || '****'}
                      </span>
                      <span className="winner-location">
                        📍 {(winner.participante_cidade || winner.cidade) && (winner.participante_bairro || winner.bairro)
                          ? `${winner.participante_bairro || winner.bairro}, ${winner.participante_cidade || winner.cidade}`
                          : (winner.participante_cidade || winner.cidade) || (winner.premio || `${index + 1}º Lugar`)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="winner-celebration">
                  <div className="celebration-emoji">🎉</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="congratulations-message">
            <h3>🎊 Parabéns aos ganhadores! 🎊</h3>
            <p>
              {winners.length === 1 
                ? 'Nosso ganhador será contactado em breve!' 
                : `Nossos ${winners.length} ganhadores serão contactados em breve!`
              }
            </p>
          </div>
        </div>
      )}

      <div className="footer-section">
        <p>Sorteio realizado de forma transparente e justa</p>
        
        {/* Informações NexoGeo */}
        <div className="nexogeo-info">
          <div className="nexogeo-logo-container">
            <img
              src="https://nexogeo-demo.vercel.app/imagens/logo0.png"
              alt="NexoGeo"
              className="nexogeo-logo"
            />
            <span className="nexogeo-text">
              <strong>NexoGeo</strong>
            </span>
          </div>
          <p className="nexogeo-description">
            Sistema completo de gestão de promoções e sorteios
          </p>
          <a
            href="https://nexogeo.vercel.app/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="nexogeo-link"
          >
            📦 Conheça nossos pacotes
          </a>
        </div>
        
        <small>© {new Date().getFullYear()} - Sistema de Sorteios NexoGeo</small>
      </div>
    </div>
  );
};

export default SorteioPublicoPage;