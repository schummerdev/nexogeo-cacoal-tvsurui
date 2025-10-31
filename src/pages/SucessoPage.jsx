// src/pages/SucessoPage.jsx

import React, { useState, useEffect } from 'react';
import './SucessoPage.css';

const SucessoPage = () => {
  const [emissora, setEmissora] = useState({});
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [utmSource, setUtmSource] = useState('');

  useEffect(() => {
    const carregarDadosEmissora = async () => {
      try {
        const response = await fetch('/api/configuracoes?type=emissora');
        const result = await response.json();
        if (result.success) {
          setEmissora(result.data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados da emissora:', error);
      } finally {
        setLoading(false);
      }
    };

    // Detectar se é dispositivo móvel
    const detectMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };

    // Verificar parâmetros UTM na URL
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source') || '';
    setUtmSource(source.toLowerCase());
    
    console.log(`🔍 UTM Source detectado: "${source}"`);
    if (source.toLowerCase() === 'whatsapp') {
      console.log('📱 Fonte WhatsApp detectada - Modal do WhatsApp será desabilitado');
    }

    setIsMobile(detectMobile());
    carregarDadosEmissora();
  }, []);

  // Countdown timer para mostrar prompt do WhatsApp (apenas se não for fonte WhatsApp)
  useEffect(() => {
    // Não mostrar prompt se a fonte for WhatsApp
    if (utmSource === 'whatsapp') {
      console.log('🚫 Modal do WhatsApp bloqueado para fonte WhatsApp');
      return;
    }
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowWhatsAppPrompt(true);
    }
  }, [countdown, utmSource]);

  const getSocialLinks = () => {
    const links = [];
    
    if (emissora.instagram) {
      links.push({
        platform: 'Instagram',
        icon: '📷',
        url: emissora.instagram.startsWith('http') ? emissora.instagram : `https://instagram.com/${emissora.instagram.replace('@', '')}`
      });
    }
    
    if (emissora.facebook) {
      links.push({
        platform: 'Facebook',
        icon: '📘',
        url: emissora.facebook.startsWith('http') ? emissora.facebook : `https://facebook.com/${emissora.facebook}`
      });
    }
    
    if (emissora.youtube) {
      links.push({
        platform: 'YouTube',
        icon: '📺',
        url: emissora.youtube.startsWith('http') ? emissora.youtube : `https://youtube.com/${emissora.youtube}`
      });
    }

    if (emissora.twitter) {
      links.push({
        platform: 'Twitter',
        icon: '🐦',
        url: emissora.twitter.startsWith('http') ? emissora.twitter : `https://twitter.com/${emissora.twitter.replace('@', '')}`
      });
    }

    if (emissora.linkedin) {
      links.push({
        platform: 'LinkedIn',
        icon: '💼',
        url: emissora.linkedin.startsWith('http') ? emissora.linkedin : `https://linkedin.com/company/${emissora.linkedin}`
      });
    }

    return links;
  };

  const handleWhatsAppRedirect = () => {
    const whatsappNumber = emissora.whatsapp || emissora.telefone || '5511999999999';
    const message = `Olá! Acabei de participar do sorteio da ${emissora.nome || 'emissora'} e gostaria de receber novidades e informações sobre novos sorteios pelo WhatsApp! 🎁`;
    
    if (isMobile) {
      // Para dispositivos móveis, abrir o app do WhatsApp
      window.location.href = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
    } else {
      // Para desktop, abrir WhatsApp Web
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const dismissWhatsAppPrompt = () => {
    setShowWhatsAppPrompt(false);
  };

  return (
    <div className="container-sucesso">
      <div className="card-sucesso">
        <div className="icone-sucesso">✓</div>
        <h1>Participação Confirmada!</h1>
        <p>Boa sorte! Agora é só ficar ligado na nossa programação para saber o resultado do sorteio.</p>
        
        <div className="redes-sociais">
          <p>Siga-nos nas redes sociais:</p>
          {loading ? (
            <div className="social-loading">Carregando...</div>
          ) : (
            <div className="social-links">
              {getSocialLinks().map((link, index) => (
                <a 
                  key={index}
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="social-link"
                >
                  <span>{link.icon} {link.platform}</span>
                </a>
              ))}
              {getSocialLinks().length === 0 && (
                <div className="social-fallback">
                  <a href="#" className="social-link">
                    <span>📷 Instagram</span>
                  </a>
                  <a href="#" className="social-link">
                    <span>📘 Facebook</span>
                  </a>
                  <a href="#" className="social-link">
                    <span>📺 YouTube</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {!showWhatsAppPrompt && countdown > 0 && utmSource !== 'whatsapp' && (
          <div className="countdown-info">
            <p>💬 Em {countdown} segundos, te ofereceremos uma forma de receber novidades pelo WhatsApp!</p>
          </div>
        )}
        
        {utmSource === 'whatsapp' && (
          <div className="whatsapp-source-info">
            <p>📱 Obrigado por vir pelo WhatsApp! Continue acompanhando nossas novidades por lá.</p>
          </div>
        )}
      </div>

      {/* Modal do WhatsApp */}
      {showWhatsAppPrompt && (
        <div className="whatsapp-modal-overlay" onClick={dismissWhatsAppPrompt}>
          <div className="whatsapp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="whatsapp-modal-header">
              <h3>💬 Receba Novidades pelo WhatsApp!</h3>
            </div>
            <div className="whatsapp-modal-body">
              <p>
                Gostaria de receber informações sobre novos sorteios e promoções da{' '}
                <strong>{emissora.nome || 'nossa emissora'}</strong> diretamente no seu WhatsApp?
              </p>
              
              {isMobile ? (
                <div className="mobile-whatsapp-info">
                  <p>📱 <strong>Você está no celular!</strong> Clique no botão abaixo para abrir o WhatsApp automaticamente.</p>
                </div>
              ) : (
                <div className="desktop-whatsapp-info">
                  <p>💻 O WhatsApp Web será aberto em uma nova aba.</p>
                </div>
              )}
              
              <div className="whatsapp-modal-actions">
                <button 
                  className="whatsapp-btn-accept"
                  onClick={handleWhatsAppRedirect}
                >
                  {isMobile ? '📱 Abrir WhatsApp' : '💬 Enviar Mensagem'}
                </button>
                <button 
                  className="whatsapp-btn-decline"
                  onClick={dismissWhatsAppPrompt}
                >
                  Agora não
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SucessoPage;