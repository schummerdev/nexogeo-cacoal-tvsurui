import React, { useEffect } from 'react';
import './DemoPage.css';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSelector from '../components/ThemeSelector/ThemeSelector';
import BannerCarousel from '../components/BannerCarousel/BannerCarousel';

const DemoPage = () => {
  const { currentThemeData } = useTheme();

  // Configuração dos banners (até 4 banners com opção de link)
  const banners = [
    {
      image: '/imagens/banner1.png',
      alt: 'Banner 1 - NexoGeo',
      link: '/' // Link para a página inicial
    },
    {
      image: '/imagens/banner2.png',
      alt: 'Banner 2 - Promoções',
      link: '' // Sem link
    },
    {
      image: '/imagens/banner3.png',
      alt: 'Banner 3 - Sorteios',
      link: 'https://wa.me/5569984729807?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20o%20NexoGeo.'
    },
    {
      image: '/imagens/banner4.png',
      alt: 'Banner 4 - Engajamento',
      link: '' // Sem link
    }
  ];

  // Aplica o gradiente do tema no body da página
  useEffect(() => {
    document.body.style.background = currentThemeData.gradient;

    // Cleanup: restaura o fundo original quando o componente é desmontado
    return () => {
      document.body.style.background = '';
    };
  }, [currentThemeData.gradient]);

  // Estilo dinâmico para cards
  const cardStyle = {
    background: currentThemeData.surface,
    color: currentThemeData.text,
    borderColor: currentThemeData.border
  };

  return (
    <div className="demo-poster-container">
      <div className="demo-bg-pattern"></div>

      {/* Theme Selector */}
      <div className="demo-theme-selector">
        <ThemeSelector mode="inline" />
      </div>

      <div className="demo-content">
        {/* Header Section */}
        <header className="demo-header">
          <div className="demo-header-content">
            <img src="/imagens/logo0.png" alt="NexoGeo Logo" className="demo-logo" />
            <p className="demo-subtitle">Sistema de Gestão de Promoções e Engajamento de Telespectadores para Emissoras Locais</p>
          </div>
        </header>

        {/* Banner Carousel */}
        <BannerCarousel banners={banners} />

        {/* Introduction Section */}
        <section className="demo-section">
          <h2 className="demo-section-title">
            <span className="material-icons">rocket_launch</span>
            O que é o NexoGeo?
          </h2>
          <div className="demo-intro-card" style={cardStyle}>
            <p className="demo-intro-text">
              NexoGeo é uma plataforma completa e moderna para gestão de promoções, sorteios e engajamento de telespectadores. Desenvolvido com tecnologias de ponta, o sistema oferece uma solução robusta para empresas que desejam criar campanhas promocionais eficazes, gerenciar participantes e analisar resultados em tempo real.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="demo-section">
          <h2 className="demo-section-title">
            <span className="material-icons">stars</span>
            Principais Funcionalidades
          </h2>
          <div className="demo-features-grid">
            <div className="demo-feature-card" style={cardStyle}>
              <h3 className="demo-feature-title">
                <span className="material-icons">campaign</span>
                Gestão de Promoções
              </h3>
              <ul className="demo-feature-list">
                <li>Criação e gerenciamento de múltiplas promoções simultâneas</li>
                <li>Configuração flexível de períodos e regulamentos</li>
                <li>Status automático das promoções</li>
                <li>Controle de promoções ativas com dashboard visual</li>
              </ul>
            </div>

            <div className="demo-feature-card" style={cardStyle}>
              <h3 className="demo-feature-title">
                <span className="material-icons">person_add</span>
                Sistema de Cadastro
              </h3>
              <ul className="demo-feature-list">
                <li>Formulário público otimizado para captura de leads</li>
                <li>Geolocalização automática com integração de mapas</li>
                <li>Sistema de referência para crescimento viral</li>
              </ul>
            </div>

            <div className="demo-feature-card" style={cardStyle}>
              <h3 className="demo-feature-title">
                <span className="material-icons">casino</span>
                Sorteios Inteligentes
              </h3>
              <ul className="demo-feature-list">
                <li>Sorteio automatizado com algoritmo justo e transparente</li>
                <li>Histórico completo de ganhadores</li>
                <li>Página pública de resultados para divulgação</li>
              </ul>
            </div>

            <div className="demo-feature-card" style={cardStyle}>
              <h3 className="demo-feature-title">
                <span className="material-icons">card_giftcard</span>
                Caixa Misteriosa
              </h3>
              <ul className="demo-feature-list">
                <li>Painel administrativo completo para controle em tempo real</li>
                <li>Sistema de dicas progressivas com IA (Google Gemini)</li>
                <li>Validação inteligente de palpites</li>
                <li>Sistema de referência para participação viral</li>
              </ul>
            </div>

            <div className="demo-feature-card" style={cardStyle}>
              <h3 className="demo-feature-title">
                <span className="material-icons">analytics</span>
                Analytics e Dashboard
              </h3>
              <ul className="demo-feature-list">
                <li>Dashboard administrativo com métricas em tempo real</li>
                <li>Gráficos interativos com Chart.js</li>
                <li>Estatísticas detalhadas de performance</li>
              </ul>
            </div>

            <div className="demo-feature-card" style={cardStyle}>
              <h3 className="demo-feature-title">
                <span className="material-icons">map</span>
                Mapas Interativos
              </h3>
              <ul className="demo-feature-list">
                <li>Visualização geográfica de participantes</li>
                <li>Markers interativos com informações detalhadas</li>
                <li>Filtros dinâmicos por promoção, cidade e bairro</li>
                <li>Análise territorial de performance</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="demo-section">
          <h2 className="demo-section-title">
            <span className="material-icons">trending_up</span>
            Benefícios do Sistema
          </h2>
          <div className="demo-benefits-container">
            <div className="demo-benefit-card" style={cardStyle}>
              <h3 className="demo-benefit-title">
                <span className="material-icons">business</span>
                Para o Negócio
              </h3>
              <ul className="demo-benefit-list">
                <li>Automatização completa de processos promocionais</li>
                <li>Redução de custos operacionais</li>
                <li>Aumento de engajamento com gamificação</li>
                <li>Crescimento viral através de sistema de referências</li>
                <li>Decisões baseadas em dados com analytics em tempo real</li>
              </ul>
            </div>

            <div className="demo-benefit-card" style={cardStyle}>
              <h3 className="demo-benefit-title">
                <span className="material-icons">campaign</span>
                Para Marketing
              </h3>
              <ul className="demo-benefit-list">
                <li>Campanhas rastreáveis com links UTM e QR codes</li>
                <li>Segmentação geográfica com mapas de calor</li>
                <li>Análise de ROI por canal de aquisição</li>
                <li>Múltiplas campanhas simultâneas sem complexidade</li>
              </ul>
            </div>

            <div className="demo-benefit-card" style={cardStyle}>
              <h3 className="demo-benefit-title">
                <span className="material-icons">people</span>
                Para os Participantes
              </h3>
              <ul className="demo-benefit-list">
                <li>Interface moderna e responsiva</li>
                <li>Cadastro rápido e intuitivo em poucos cliques</li>
                <li>Gamificação divertida com Caixa Misteriosa</li>
                <li>Compartilhamento fácil via WhatsApp</li>
                <li>Transparência nos sorteios e resultados</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Differentiators Section */}
        <section className="demo-section">
          <h2 className="demo-section-title">
            <span className="material-icons">auto_awesome</span>
            Diferenciais Competitivos
          </h2>
          <div className="demo-differentiators" style={{ background: 'transparent' }}>
            <div className="demo-diff-grid">
              <div className="demo-diff-item" style={cardStyle}>
                <span className="material-icons">extension</span>
                <span className="demo-diff-text">Gamificação Avançada - Sistema Caixa Misteriosa único no mercado</span>
              </div>
              <div className="demo-diff-item" style={cardStyle}>
                <span className="material-icons">smart_toy</span>
                <span className="demo-diff-text">IA Integrada - Geração automática de conteúdo com Google Gemini</span>
              </div>
              <div className="demo-diff-item" style={cardStyle}>
                <span className="material-icons">share</span>
                <span className="demo-diff-text">Sistema de Referência - Crescimento viral embutido</span>
              </div>
              <div className="demo-diff-item" style={cardStyle}>
                <span className="material-icons">speed</span>
                <span className="demo-diff-text">Analytics em Tempo Real - Decisões baseadas em dados atualizados</span>
              </div>
              <div className="demo-diff-item" style={cardStyle}>
                <span className="material-icons">location_on</span>
                <span className="demo-diff-text">Geolocalização Avançada - Mapas de calor e análise territorial</span>
              </div>
              <div className="demo-diff-item" style={cardStyle}>
                <span className="material-icons">verified</span>
                <span className="demo-diff-text">Auditoria Completa - Compliance e rastreabilidade total</span>
              </div>
              <div className="demo-diff-item" style={cardStyle}>
                <span className="material-icons">cloud</span>
                <span className="demo-diff-text">Arquitetura Serverless - Escalabilidade automática sem custos fixos</span>
              </div>
              <div className="demo-diff-item" style={cardStyle}>
                <span className="material-icons">smartphone</span>
                <span className="demo-diff-text">Mobile-First - Otimizado para dispositivos móveis</span>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="demo-section">
          <h2 className="demo-section-title">
            <span className="material-icons">cases</span>
            Casos de Uso
          </h2>
          <div className="demo-use-cases">
            <div className="demo-use-case-card" style={cardStyle}>
              <h3 className="demo-use-case-title">Varejo e E-commerce</h3>
              <ul className="demo-use-case-list">
                <li>Promoções sazonais (Black Friday, Natal, Dia das Mães)</li>
                <li>Sorteios de produtos para engajamento</li>
                <li>Análise de origem dos leads por canal</li>
              </ul>
            </div>

            <div className="demo-use-case-card" style={cardStyle}>
              <h3 className="demo-use-case-title">Eventos e Entretenimento</h3>
              <ul className="demo-use-case-list">
                <li>Sorteios de ingressos e experiências VIP</li>
                <li>Gamificação com Caixa Misteriosa ao vivo</li>
                <li>QR Codes para check-in e participação</li>
              </ul>
            </div>

            <div className="demo-use-case-card" style={cardStyle}>
              <h3 className="demo-use-case-title">Patrocinadores e Marcas</h3>
              <ul className="demo-use-case-list">
                <li>Ativações de marca com jogos interativos</li>
                <li>Distribuição de prêmios e brindes</li>
                <li>Engajamento em redes sociais</li>
                <li>Tracking de performance de campanhas</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Metrics Section */}
        <section className="demo-section">
          <h2 className="demo-section-title">
            <span className="material-icons">bar_chart</span>
            Métricas de Sucesso
          </h2>
          <div className="demo-metrics-container">
            <div className="demo-metric-card" style={cardStyle}>
              <div className="demo-metric-value">15-25%</div>
              <div className="demo-metric-label">Taxa de conversão de visitantes</div>
            </div>
            <div className="demo-metric-card" style={cardStyle}>
              <div className="demo-metric-value">30-40%</div>
              <div className="demo-metric-label">Taxa de compartilhamento</div>
            </div>
            <div className="demo-metric-card" style={cardStyle}>
              <div className="demo-metric-value">5-10</div>
              <div className="demo-metric-label">Palpites por participante</div>
            </div>
            <div className="demo-metric-card" style={cardStyle}>
              <div className="demo-metric-value">200%</div>
              <div className="demo-metric-label">Aumento em cadastros via referência</div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="demo-cta-section" style={{ background: `linear-gradient(135deg, ${currentThemeData.primary}, ${currentThemeData.success})` }}>
          <h2 className="demo-cta-title">Solicite uma Demonstração</h2>
          <p className="demo-cta-text">Veja como o NexoGeo pode transformar suas promoções em experiências memoráveis</p>
          <button
            className="demo-cta-button"
            onClick={() => window.open('https://wa.me/5569984729807?text=Olá!%20Gostaria%20de%20agendar%20uma%20demonstração%20do%20NexoGeo.', '_blank')}
          >
            Agendar Demo Agora
          </button>
        </section>

        {/* Contact Section */}
        <section className="demo-section">
          <div className="demo-contact-card" style={cardStyle}>
            <h3 className="demo-contact-title">Entre em Contato</h3>
            <p>Estamos prontos para ajudar sua empresa a criar campanhas promocionais de sucesso</p>
            <div className="demo-contact-info">
              <div className="demo-contact-item">
                <span className="material-icons">email</span>
                <span>schummerdev@gmail.com</span>
              </div>
              <div className="demo-contact-item">
                <span className="material-icons">phone</span>
                <span>(69) 98472-9807</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="demo-footer">
          <p>© 2025 NexoGeo - Transformando promoções em experiências memoráveis</p>
        </footer>
      </div>
    </div>
  );
};

export default DemoPage;
