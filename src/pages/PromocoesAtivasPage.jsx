
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from '../components/LoadingComponents';

// Ícones
const GiftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"></polyline>
    <rect x="2" y="7" width="20" height="5"></rect>
    <line x1="12" y1="22" x2="12" y2="7"></line>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

// Ícone do Instagram
const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

// Ícone do Facebook
const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// Ícone do YouTube
const YoutubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

// Ícone de Checklist/Regras
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const PromocoesAtivasPage = () => {
  const [promocoes, setPromocoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emissora, setEmissora] = useState({ instagram: '', facebook: '', youtube: '', nome: '' });
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchPromocoesAtivas();
    fetchConfiguracoes();
  }, []);

  const fetchPromocoesAtivas = async () => {
    try {
      setLoading(true);
      // Busca pública de promoções
      const response = await fetch('/api/?route=promocoes&public=true');
      const data = await response.json();

      if (data.success) {
        setPromocoes(data.data || []);
      } else {
        throw new Error(data.message || 'Erro ao carregar promoções');
      }
    } catch (error) {
      console.error('Erro:', error);
      showToast('Não foi possível carregar as promoções.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfiguracoes = async () => {
    try {
      const response = await fetch('/api/configuracoes?type=emissora');
      const data = await response.json();
      if (data.success && data.data) {
        setEmissora({
          instagram: data.data.instagram || '',
          facebook: data.data.facebook || '',
          youtube: data.data.youtube || '',
          nome: data.data.nome || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  // Função para garantir que a URL é válida
  const ensureValidUrl = (url) => {
    if (!url) return null;
    // Se já começa com http, retorna como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Se começa com @, é um handle - adiciona https://
    if (url.startsWith('@')) {
      return null; // Retorna null para tratar separadamente
    }
    // Senão, adiciona https://
    return `https://${url}`;
  };

  // Função para abrir Instagram
  const handleInstagramFollow = () => {
    let url = emissora.instagram;
    if (!url) return;

    // Se é apenas um @handle, converte para URL
    if (url.startsWith('@')) {
      url = `https://www.instagram.com/${url.substring(1)}`;
    } else if (!url.startsWith('http')) {
      url = `https://www.instagram.com/${url}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Função para abrir Facebook
  const handleFacebookFollow = () => {
    let url = emissora.facebook;
    if (!url) return;

    // Se não começa com http, adiciona URL base do Facebook
    if (!url.startsWith('http')) {
      url = `https://www.facebook.com/${url}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Função para abrir YouTube
  const handleYoutubeFollow = () => {
    let url = emissora.youtube;
    if (!url) return;

    // Se é um @handle ou channel name, converte para URL
    if (url.startsWith('@')) {
      url = `https://www.youtube.com/${url}`;
    } else if (!url.startsWith('http')) {
      url = `https://www.youtube.com/@${url}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleParticipar = (promoId) => {
    // Abrir diretamente o link de participação com UTM parameters
    window.location.href = `/participar?promoId=${promoId}&utm_source=whatsapp&utm_medium=messaging`;
  };

  const hasRedes = emissora.instagram || emissora.facebook || emissora.youtube;


  if (loading) {
    return (
      <div className="public-page-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Carregando promoções..." />
      </div>
    );
  }

  return (
    <div className="promocoes-publicas-page">
      <header className="page-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-area">
              <GiftIcon />
              <h1>Promoções Ativas</h1>
            </div>
            <p className="header-subtitle">Participe das nossas promoções e concorra a prêmios incríveis!</p>
          </div>
        </div>
      </header>

      {/* Seção Como Participar */}
      <section className="como-participar-section">
        <div className="container">
          <div className="como-participar-card">
            <h2 className="como-participar-title">
              <CheckCircleIcon /> Como Participar
            </h2>

            <div className="regras-grid">
              {/* Regra 1 - Seguir nas Redes Sociais */}
              {hasRedes && (
                <div className="regra-item">
                  <div className="regra-numero">1</div>
                  <div className="regra-content">
                    <h3>Siga nossas redes sociais</h3>
                    <p>Acompanhe {emissora.nome || 'nossas páginas'} para não perder nenhuma novidade!</p>
                    <div className="social-buttons">
                      {emissora.instagram && (
                        <button
                          className="btn-social btn-instagram"
                          onClick={handleInstagramFollow}
                          type="button"
                        >
                          <InstagramIcon />
                          <span>Seguir no Instagram</span>
                        </button>
                      )}
                      {emissora.facebook && (
                        <button
                          className="btn-social btn-facebook"
                          onClick={handleFacebookFollow}
                          type="button"
                        >
                          <FacebookIcon />
                          <span>Seguir no Facebook</span>
                        </button>
                      )}
                      {emissora.youtube && (
                        <button
                          className="btn-social btn-youtube"
                          onClick={handleYoutubeFollow}
                          type="button"
                        >
                          <YoutubeIcon />
                          <span>Inscreva-se no YouTube</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Regra 2 - Cadastrar-se */}
              <div className="regra-item">
                <div className="regra-numero">{hasRedes ? '2' : '1'}</div>
                <div className="regra-content">
                  <h3>Cadastre-se na promoção</h3>
                  <p>Clique no botão "Participar Agora" da promoção desejada e preencha seus dados para concorrer!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container page-content">
        {promocoes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">😔</div>
            <h2>Nenhuma promoção ativa no momento</h2>
            <p>Fique ligado! Em breve teremos novidades para você.</p>
          </div>
        ) : (
          <div className="promocoes-grid">
            {promocoes.map((promo) => (
              <div key={promo.id} className="promo-card">
                <div
                  className="promo-image-container clickable"
                  onClick={() => handleParticipar(promo.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleParticipar(promo.id)}
                >
                  {promo.imagem_url ? (
                    <img src={promo.imagem_url} alt={promo.nome} className="promo-image" />
                  ) : (
                    <div className="promo-placeholder">
                      <GiftIcon />
                    </div>
                  )}
                  <div className="promo-status-badge">Ativa</div>
                </div>

                <div className="promo-content">
                  <h3 className="promo-title">{promo.nome}</h3>
                  <p className="promo-description">
                    {promo.descricao.length > 100
                      ? `${promo.descricao.substring(0, 100)}...`
                      : promo.descricao}
                  </p>

                  <div className="promo-dates">
                    <div className="date-item">
                      <CalendarIcon />
                      <span>Termina em: {new Date(promo.data_fim).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <button
                    className="btn-participar"
                    onClick={() => handleParticipar(promo.id)}
                  >
                    Participar Agora <ArrowRightIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Rodapé NexoGeo */}
      <footer className="nexogeo-footer">
        <div className="nexogeo-info">
          <div className="nexogeo-logo-container">
            <img
              src="/imagens/logo0.png"
              alt="NexoGeo"
              className="nexogeo-logo-footer"
            />
          </div>
          <p className="nexogeo-description">
            Sistema completo de gestão de promoções e sorteios
          </p>
          <a
            href="/demo"
            className="nexogeo-link"
          >
            📦 Conheça a NexoGeo
          </a>
        </div>
      </footer>

      <style>{`
        .promocoes-publicas-page {
          min-height: 100vh;
          background-color: var(--color-background);
          color: var(--color-text-primary);
          font-family: 'Inter', sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Header */
        .page-header {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          color: white;
          padding: 60px 0;
          text-align: center;
          border-bottom-left-radius: 30px;
          border-bottom-right-radius: 30px;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
          margin-bottom: 40px;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logo-area svg {
          width: 40px;
          height: 40px;
        }

        .page-header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -1px;
        }

        .header-subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          max-width: 600px;
          line-height: 1.6;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: var(--color-surface);
          border-radius: 20px;
          box-shadow: var(--shadow-md);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        /* Grid */
        .promocoes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 30px;
          padding-bottom: 60px;
        }

        /* Card */
        .promo-card {
          background: var(--color-surface);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
        }

        .promo-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2);
        }

        .promo-image-container {
          height: 200px;
          background: linear-gradient(45deg, #f3f4f6, #e5e7eb);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .promo-image-container.clickable {
          cursor: pointer;
        }

        .promo-image-container.clickable:hover .promo-image {
          transform: scale(1.08);
        }

        .promo-image-container.clickable:focus {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        .promo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .promo-card:hover .promo-image {
          transform: scale(1.05);
        }

        .promo-placeholder {
          color: #9ca3af;
        }
        
        .promo-placeholder svg {
          width: 64px;
          height: 64px;
        }

        .promo-status-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(16, 185, 129, 0.9);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          backdrop-filter: blur(4px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .promo-content {
          padding: 25px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .promo-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--color-text-primary);
        }

        .promo-description {
          font-size: 0.95rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: 20px;
          flex-grow: 1;
        }

        .promo-dates {
          margin-bottom: 20px;
          padding-top: 15px;
          border-top: 1px solid var(--color-border);
        }

        .date-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .btn-participar {
          width: 100%;
          padding: 14px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .btn-participar:hover {
          background: var(--color-primary-dark);
          transform: scale(1.02);
        }

        /* Footer */
        .page-footer {
          text-align: center;
          padding: 40px;
          color: var(--color-text-secondary);
          border-top: 1px solid var(--color-border);
          font-size: 0.9rem;
        }

        /* Seção Como Participar */
        .como-participar-section {
          margin-bottom: 40px;
        }

        .como-participar-card {
          background: var(--color-surface);
          border-radius: 20px;
          padding: 30px;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
        }

        .como-participar-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid var(--color-primary);
        }

        .como-participar-title svg {
          color: var(--color-primary);
        }

        .regras-grid {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .regra-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .regra-numero {
          flex-shrink: 0;
          width: 45px;
          height: 45px;
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
        }

        .regra-content h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: 8px;
        }

        .regra-content p {
          font-size: 0.95rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin-bottom: 15px;
        }

        .social-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-social {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .btn-social svg {
          width: 20px;
          height: 20px;
        }

        .btn-instagram {
          background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
        }

        .btn-instagram:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(225, 48, 108, 0.4);
        }

        .btn-facebook {
          background: linear-gradient(135deg, #1877F2 0%, #0a5dc2 100%);
        }

        .btn-facebook:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(24, 119, 242, 0.4);
        }

        .btn-youtube {
          background: linear-gradient(135deg, #FF0000 0%, #cc0000 100%);
        }

        .btn-youtube:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(255, 0, 0, 0.4);
        }

        /* Rodapé NexoGeo */
        .nexogeo-footer {
          margin-top: 40px;
          padding: 40px 20px;
          text-align: center;
          border-top: 1px solid var(--color-border);
        }

        .nexogeo-info {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          max-width: 350px;
          margin: 0 auto;
        }

        .nexogeo-logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .nexogeo-logo-footer {
          width: 120px;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
        }

        .nexogeo-description {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0 0 1rem 0;
          line-height: 1.4;
        }

        .nexogeo-link {
          display: inline-block;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        }

        .nexogeo-link:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          color: white;
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 40px 0;
            border-radius: 0;
          }

          .header-subtitle {
            font-size: 1rem;
            padding: 0 20px;
          }

          .como-participar-card {
            padding: 20px;
          }

          .regra-item {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .regra-content {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .social-buttons {
            justify-content: center;
          }

          .btn-social {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default PromocoesAtivasPage;
