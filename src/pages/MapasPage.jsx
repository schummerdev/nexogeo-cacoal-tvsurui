// MapasPage.jsx - Página dedicada aos mapas
import React, { useState, useEffect } from 'react';
import Header from '../components/DashboardLayout/Header';
import { InteractiveMap } from '../components/Maps/InteractiveMap';
import { fetchParticipantes, fetchParticipantesUnificados, fetchGameParticipantsStats } from '../services/participanteService';
import { fetchPromocoes } from '../services/promocaoService';
import { LoadingSpinner } from '../components/LoadingComponents';

// Funções auxiliares para mapeamento de origem
const getOrigemColor = (source) => {
  const colors = {
    facebook: '#1877F2',
    instagram: '#E4405F', 
    youtube: '#FF0000',
    whatsapp: '#25D366',
    website: '#6366F1',
    tv: '#8B5CF6',
    direto: '#6B7280'
  };
  return colors[source] || colors.direto;
};

const getOrigemLabel = (source, medium) => {
  const labels = {
    facebook: '📘 Facebook',
    instagram: '📸 Instagram',
    youtube: '📺 YouTube', 
    whatsapp: '💬 WhatsApp',
    website: '🌐 Website',
    tv: '📺 TV',
    direto: '🔗 Direto'
  };
  const base = labels[source] || labels.direto;
  return medium && medium !== 'link' ? `${base} (${medium})` : base;
};

const MapasPage = () => {
  const [viewMode, setViewMode] = useState('markers'); // 'markers' ou 'neighborhoods'
  const [selectedPromotion, setSelectedPromotion] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedOrigem, setSelectedOrigem] = useState('all');
  const [participantes, setParticipantes] = useState([]);
  const [promocoes, setPromocoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeCaixaMisteriosa, setIncludeCaixaMisteriosa] = useState(true); // Novo estado
  const [gameStats, setGameStats] = useState(null); // Estatísticas do jogo
  const [neighborhoodSortOrder, setNeighborhoodSortOrder] = useState('desc'); // 'desc' = maior público, 'asc' = menor público

  // Detectar se está em modo janela externa
  const urlParams = new URLSearchParams(window.location.search);
  const isExternalWindow = urlParams.get('external') === 'true';

  // Forçar redimensionamento quando é janela externa
  useEffect(() => {
    if (isExternalWindow) {
      console.log('🖼️ Janela externa detectada');

      // Para janelas externas, permitir scroll vertical
      document.body.style.overflow = 'auto';
      document.body.style.margin = '0';
      document.body.style.padding = '0';

      return () => {
        document.body.style.overflow = '';
        document.body.style.margin = '';
        document.body.style.padding = '';
      };
    }
  }, [isExternalWindow]);

  // Aplicar parâmetros da URL se em modo externo
  useEffect(() => {
    if (isExternalWindow) {
      const view = urlParams.get('view');
      const promotion = urlParams.get('promotion');
      const city = urlParams.get('city');
      const origem = urlParams.get('origem');

      if (view && ['markers', 'neighborhoods'].includes(view)) {
        setViewMode(view);
      }
      if (promotion && promotion !== 'null') {
        setSelectedPromotion(promotion);
      }
      if (city && city !== 'null') {
        setSelectedCity(city);
      }
      if (origem && origem !== 'null') {
        setSelectedOrigem(origem);
      }
    }
  }, [isExternalWindow]);

  // Buscar dados da API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Buscar dados com base no toggle da Caixa Misteriosa
        const [participantesResult, promocoesData, statsData] = await Promise.all([
          includeCaixaMisteriosa
            ? fetchParticipantesUnificados(true)
            : fetchParticipantes().then(data => ({ data, stats: { total: data.length, regular: data.length, public: 0 } })),
          fetchPromocoes(),
          includeCaixaMisteriosa
            ? fetchGameParticipantsStats().catch(err => {
                console.warn('⚠️ Estatísticas do jogo não disponíveis:', err.message);
                return null; // Retornar null em caso de erro
              })
            : Promise.resolve(null)
        ]);

        const participantesData = participantesResult.data || [];

        // Mapear TODOS os participantes (com e sem coordenadas)
        const participantesMapeados = (participantesData || []).map(p => ({
          ...p,
          lat: p.latitude ? parseFloat(p.latitude) : null,
          lng: p.longitude ? parseFloat(p.longitude) : null,
          intensity: 75, // Intensidade padrão para visualização
          district: p.bairro || p.neighborhood || 'Sem bairro',
          city: p.cidade || p.city || 'Não informado',
          name: p.nome || p.name || 'Participante',
          phone: p.telefone || p.phone || '',
          // Dados de origem dos links
          origem_source: p.origem_source || 'direto',
          origem_medium: p.origem_medium || 'link',
          origem_color: getOrigemColor(p.origem_source || 'direto'),
          origem_label: getOrigemLabel(p.origem_source || 'direto', p.origem_medium),
          // Tipo de participante (novo campo)
          participant_type: p.participant_type || 'regular',
          // Dados específicos da Caixa Misteriosa
          referral_code: p.referral_code || null,
          extra_guesses: p.extra_guesses || 0,
          total_submissions: p.total_submissions || 0,
          correct_guesses: p.correct_guesses || 0
        }));

        setParticipantes(participantesMapeados);
        setPromocoes(promocoesData || []);
        setGameStats(statsData);

        console.log('✅ Dados carregados:', {
          total: participantesMapeados.length,
          comCoordenadas: participantesMapeados.filter(p => p.lat && p.lng).length,
          semCoordenadas: participantesMapeados.filter(p => !p.lat || !p.lng).length,
          stats: participantesResult.stats,
          gameStats: statsData
        });
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Em caso de erro, manter array vazio
        setParticipantes([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Atualização automática a cada 5 minutos (300000ms)
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Recarregando dados do mapa...');
      loadData();
    }, 300000); // 5 minutos

    // Limpar interval quando componente for desmontado
    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, [includeCaixaMisteriosa]); // Recarregar quando toggle mudar

  // Função para obter estatísticas por origem
  const getOrigemStats = () => {
    const stats = {};
    participantes.forEach(p => {
      const key = p.origem_source || 'direto';
      if (!stats[key]) {
        stats[key] = {
          count: 0,
          color: getOrigemColor(key),
          label: getOrigemLabel(key, p.origem_medium),
          regular: 0,
          public: 0
        };
      }
      stats[key].count++;

      // Contar por tipo de participante
      if (p.participant_type === 'public') {
        stats[key].public++;
      } else {
        stats[key].regular++;
      }
    });

    return Object.entries(stats)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5); // Top 5
  };

  // Função para filtrar participantes (TODOS - com e sem coordenadas)
  const getFilteredParticipantes = () => {
    return participantes.filter(p => {
      if (selectedPromotion !== 'all' && p.promocao_id != selectedPromotion) return false;
      if (selectedCity !== 'all' && p.cidade !== selectedCity) return false;
      if (selectedOrigem !== 'all' && (p.origem_source || 'direto') !== selectedOrigem) return false;
      return true;
    });
  };

  // Função para filtrar participantes APENAS COM COORDENADAS (para o mapa)
  const getFilteredParticipantesComCoords = () => {
    return getFilteredParticipantes().filter(p => p.lat && p.lng);
  };

  // Função para agrupar participantes por bairro
  const getParticipantesPorBairro = () => {
    const filtered = getFilteredParticipantes();
    const bairros = {};

    filtered.forEach(p => {
      const bairro = p.district || p.bairro || 'Sem bairro';
      if (!bairros[bairro]) {
        bairros[bairro] = {
          nome: bairro,
          participantes: [],
          count: 0,
          lat: p.lat,
          lng: p.lng,
          origens: {}
        };
      }

      bairros[bairro].participantes.push(p);
      bairros[bairro].count++;

      // Agrupar por origem
      const origem = p.origem_source || 'direto';
      if (!bairros[bairro].origens[origem]) {
        bairros[bairro].origens[origem] = 0;
      }
      bairros[bairro].origens[origem]++;
    });

    // Aplicar ordenação baseada no estado neighborhoodSortOrder
    return Object.values(bairros).sort((a, b) =>
      neighborhoodSortOrder === 'desc' ? b.count - a.count : a.count - b.count
    );
  };


  if (loading) {
    return (
      <>
        {!isExternalWindow && (
          <Header
            title="📍 Mapas Interativos"
            subtitle="Visualização geográfica dos participantes"
          />
        )}
        <div className={isExternalWindow ? "external-window-content" : "dashboard-content"} style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px'
        }}>
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  // Layout COMPLETO para janela externa (mesmas funcionalidades da página normal)
  if (isExternalWindow) {
    return (
      <div style={{
        padding: '16px',
        minHeight: '100vh',
        background: 'var(--color-background)',
        color: 'var(--color-text)',
        overflow: 'auto'
      }}>
        {/* Controles */}
        <div className="card-modern" style={{
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{
              margin: '0 0 8px 0',
              color: 'var(--color-text)',
              fontSize: '1.125rem'
            }}>
              Modo de Visualização
            </h3>
            <p style={{
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}>
              Escolha como visualizar os dados no mapa
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`btn transition-normal ${viewMode === 'markers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('markers')}
            >
              📍 Marcadores
            </button>
            <button
              className={`btn transition-normal ${viewMode === 'neighborhoods' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('neighborhoods')}
            >
              🏘️ Por Bairros
            </button>

            {/* Toggle Caixa Misteriosa */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: includeCaixaMisteriosa ? 'rgba(139, 92, 246, 0.1)' : 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => setIncludeCaixaMisteriosa(!includeCaixaMisteriosa)}
            title="Incluir participantes da Caixa Misteriosa no mapa"
            >
              <input
                type="checkbox"
                checked={includeCaixaMisteriosa}
                onChange={(e) => setIncludeCaixaMisteriosa(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--color-text)'
              }}>
                📦 Incluir Caixa Misteriosa
              </span>
            </div>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="card-modern" style={{
          padding: '20px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: 'var(--color-text)',
              fontSize: '0.875rem'
            }}>
              Filtrar por Origem
            </label>
            <select
              value={selectedOrigem}
              onChange={(e) => setSelectedOrigem(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-background)',
                color: 'var(--color-text)'
              }}
            >
              <option value="all">Todas as origens</option>
              {getOrigemStats().map(([origem, stats]) => (
                <option key={origem} value={origem}>
                  {stats.label} ({stats.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: 'var(--color-text)',
              fontSize: '0.875rem'
            }}>
              Filtrar por Promoção
            </label>
            <select
              value={selectedPromotion}
              onChange={(e) => setSelectedPromotion(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-background)',
                color: 'var(--color-text)'
              }}
            >
              <option value="all">Todas as promoções</option>
              {promocoes.map(promo => (
                <option key={promo.id} value={promo.id}>
                  {promo.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-4" style={{ gap: '16px', marginBottom: '32px' }}>
          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📍</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {getFilteredParticipantes().length}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Participantes Filtrados
            </p>
          </div>

          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {getOrigemStats().length}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Canais Ativos
            </p>
          </div>

          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏆</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {getOrigemStats()[0] ? getOrigemStats()[0][1].label.split(' ')[1] : 'N/A'}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Canal Principal
            </p>
          </div>

          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📈</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {getOrigemStats()[0] ? Math.round((getOrigemStats()[0][1].count / participantes.length) * 100) : 0}%
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Taxa do Principal
            </p>
          </div>
        </div>

        {/* Mapa Principal */}
        {viewMode === 'markers' ? (
          <InteractiveMap
            participants={getFilteredParticipantesComCoords()}
            height="600px"
            title={`Localização dos Participantes (${getFilteredParticipantesComCoords().length} com geolocalização)`}
            zoom={12}
            showFilters={false}
            promotions={promocoes}
            selectedPromotion={selectedPromotion}
            onFilterChange={setSelectedPromotion}
            selectedCity={selectedCity}
            onCityFilterChange={setSelectedCity}
          />
        ) : (
          /* Visualização por Bairros */
          <div className="card-modern" style={{ padding: '24px' }}>
            {/* Header com título e botões de ordenação */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: 'var(--color-text)',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏘️ Participantes por Bairro
              </h3>

              {/* Botões de ordenação */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn transition-normal ${neighborhoodSortOrder === 'desc' ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => setNeighborhoodSortOrder('desc')}
                  style={{
                    background: neighborhoodSortOrder === 'desc' ? '#10b981' : undefined,
                    color: neighborhoodSortOrder === 'desc' ? '#fff' : undefined,
                    borderColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Ordenar do maior para o menor público"
                >
                  ↓ Maior Público
                </button>
                <button
                  className={`btn transition-normal ${neighborhoodSortOrder === 'asc' ? 'btn-warning' : 'btn-outline'}`}
                  onClick={() => setNeighborhoodSortOrder('asc')}
                  style={{
                    background: neighborhoodSortOrder === 'asc' ? '#f59e0b' : undefined,
                    color: neighborhoodSortOrder === 'asc' ? '#fff' : undefined,
                    borderColor: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Ordenar do menor para o maior público"
                >
                  ↑ Menos Público
                </button>
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '24px' }}>
              {getParticipantesPorBairro().slice(0, 10).map((bairro, index) => (
                <div key={bairro.nome} className="card-modern" style={{
                  padding: '20px',
                  border: '2px solid var(--color-border)',
                  position: 'relative'
                }}>
                  {/* Ranking Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '16px',
                    background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--color-primary)',
                    color: index < 3 ? '#000' : '#fff',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    #{index + 1}
                  </div>

                  {/* Nome do Bairro */}
                  <h4 style={{
                    margin: '0 0 12px 0',
                    color: 'var(--color-text)',
                    fontSize: '1.125rem'
                  }}>
                    {bairro.nome}
                  </h4>

                  {/* Estatísticas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: 'var(--color-primary)'
                      }}>
                        {bairro.count}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Participantes
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: 'var(--color-success)'
                      }}>
                        {Object.keys(bairro.origens).length}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Canais
                      </div>
                    </div>
                  </div>

                  {/* Origens */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(bairro.origens)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 3)
                      .map(([origem, count]) => (
                        <div key={origem} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: getOrigemColor(origem)
                            }}/>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                              {getOrigemLabel(origem).split(' ')[1] || origem}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {count}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações Adicionais */}
        <div className="grid grid-2" style={{ gap: '24px', marginTop: '32px' }}>
          <div className="card-modern" style={{ padding: '24px' }}>
            <h4 style={{
              marginBottom: '16px',
              color: 'var(--color-text)',
              fontSize: '1.125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 Top 5 - Origens dos Links
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getOrigemStats().map(([origem, stats], index) => (
                <div key={origem} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < getOrigemStats().length - 1 ? '1px solid var(--color-border)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: stats.color
                      }}
                    />
                    <span style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text)'
                    }}>
                      {stats.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--color-primary)'
                  }}>
                    {stats.count} ({Math.round((stats.count / participantes.length) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-modern" style={{ padding: '24px' }}>
            <h4 style={{
              marginBottom: '16px',
              color: 'var(--color-text)',
              fontSize: '1.125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🎯 Insights de Marketing
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderLeft: '3px solid var(--color-success)',
                borderRadius: '8px'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text)',
                  margin: 0
                }}>
                  <strong>Canal mais eficaz:</strong> {getOrigemStats()[0] ? getOrigemStats()[0][1].label : 'N/A'} representa {getOrigemStats()[0] ? Math.round((getOrigemStats()[0][1].count / participantes.length) * 100) : 0}% das participações
                </p>
              </div>

              <div style={{
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderLeft: '3px solid var(--color-primary)',
                borderRadius: '8px'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text)',
                  margin: 0
                }}>
                  <strong>Diversificação:</strong> {getOrigemStats().length} canais diferentes sendo utilizados
                </p>
              </div>

              <div style={{
                padding: '12px',
                background: 'rgba(245, 158, 11, 0.1)',
                borderLeft: '3px solid var(--color-warning)',
                borderRadius: '8px'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text)',
                  margin: 0
                }}>
                  <strong>Recomendação:</strong> {getOrigemStats()[0] && getOrigemStats()[0][1].count / participantes.length > 0.5 ? 'Diversificar investimento em outros canais' : 'Manter estratégia atual de múltiplos canais'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="📍 Mapas Interativos" 
        subtitle="Visualização geográfica dos participantes"
      />
      
      <div className="dashboard-content" style={{ padding: '24px' }}>
        {/* Controles */}
        <div className="card-modern" style={{ 
          padding: '20px', 
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ 
              margin: '0 0 8px 0',
              color: 'var(--color-text)',
              fontSize: '1.125rem'
            }}>
              Modo de Visualização
            </h3>
            <p style={{ 
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}>
              Escolha como visualizar os dados no mapa
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`btn transition-normal ${viewMode === 'markers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('markers')}
            >
              📍 Marcadores
            </button>
            <button
              className={`btn transition-normal ${viewMode === 'neighborhoods' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('neighborhoods')}
            >
              🏘️ Por Bairros
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                const url = `/external/mapas?external=true&view=${viewMode}&promotion=${selectedPromotion}&city=${selectedCity}&origem=${selectedOrigem}`;
                window.open(url, 'MapasNexoGeo', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes');
              }}
              title="Abrir mapa em janela separada"
            >
              🪟 Nova Janela
            </button>

            {/* Toggle Caixa Misteriosa */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: includeCaixaMisteriosa ? 'rgba(139, 92, 246, 0.1)' : 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => setIncludeCaixaMisteriosa(!includeCaixaMisteriosa)}
            title="Incluir participantes da Caixa Misteriosa no mapa"
            >
              <input
                type="checkbox"
                checked={includeCaixaMisteriosa}
                onChange={(e) => setIncludeCaixaMisteriosa(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--color-text)'
              }}>
                📦 Incluir Caixa Misteriosa
              </span>
            </div>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="card-modern" style={{ 
          padding: '20px', 
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{ 
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: 'var(--color-text)',
              fontSize: '0.875rem'
            }}>
              Filtrar por Origem
            </label>
            <select
              value={selectedOrigem}
              onChange={(e) => setSelectedOrigem(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-background)',
                color: 'var(--color-text)'
              }}
            >
              <option value="all">Todas as origens</option>
              {getOrigemStats().map(([origem, stats]) => (
                <option key={origem} value={origem}>
                  {stats.label} ({stats.count})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ 
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: 'var(--color-text)',
              fontSize: '0.875rem'
            }}>
              Filtrar por Promoção
            </label>
            <select
              value={selectedPromotion}
              onChange={(e) => setSelectedPromotion(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-background)',
                color: 'var(--color-text)'
              }}
            >
              <option value="all">Todas as promoções</option>
              {promocoes.map(promo => (
                <option key={promo.id} value={promo.id}>
                  {promo.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-4" style={{ gap: '16px', marginBottom: '32px' }}>
          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📍</div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {getFilteredParticipantes().length}
            </h3>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Participantes Filtrados
            </p>
          </div>

          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {getOrigemStats().length}
            </h3>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Canais Ativos
            </p>
          </div>

          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏆</div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {getOrigemStats()[0] ? getOrigemStats()[0][1].label.split(' ')[1] : 'N/A'}
            </h3>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Canal Principal
            </p>
          </div>

          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📈</div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {getOrigemStats()[0] ? Math.round((getOrigemStats()[0][1].count / participantes.length) * 100) : 0}%
            </h3>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Taxa do Principal
            </p>
          </div>
        </div>

        {/* Mapa Principal */}
        {viewMode === 'markers' ? (
          <InteractiveMap
            participants={getFilteredParticipantesComCoords()}
            height="600px"
            title={`Localização dos Participantes (${getFilteredParticipantesComCoords().length} com geolocalização)`}
            zoom={12}
            showFilters={false}
            promotions={promocoes}
            selectedPromotion={selectedPromotion}
            onFilterChange={setSelectedPromotion}
            selectedCity={selectedCity}
            onCityFilterChange={setSelectedCity}
          />
        ) : (
          /* Visualização por Bairros */
          <div className="card-modern" style={{ padding: '24px' }}>
            {/* Header com título e botões de ordenação */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: 'var(--color-text)',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏘️ Participantes por Bairro
              </h3>

              {/* Botões de ordenação */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn transition-normal ${neighborhoodSortOrder === 'desc' ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => setNeighborhoodSortOrder('desc')}
                  style={{
                    background: neighborhoodSortOrder === 'desc' ? '#10b981' : undefined,
                    color: neighborhoodSortOrder === 'desc' ? '#fff' : undefined,
                    borderColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Ordenar do maior para o menor público"
                >
                  ↓ Maior Público
                </button>
                <button
                  className={`btn transition-normal ${neighborhoodSortOrder === 'asc' ? 'btn-warning' : 'btn-outline'}`}
                  onClick={() => setNeighborhoodSortOrder('asc')}
                  style={{
                    background: neighborhoodSortOrder === 'asc' ? '#f59e0b' : undefined,
                    color: neighborhoodSortOrder === 'asc' ? '#fff' : undefined,
                    borderColor: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Ordenar do menor para o maior público"
                >
                  ↑ Menos Público
                </button>
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '24px' }}>
              {getParticipantesPorBairro().slice(0, 10).map((bairro, index) => (
                <div key={bairro.nome} className="card-modern" style={{ 
                  padding: '20px',
                  border: '2px solid var(--color-border)',
                  position: 'relative'
                }}>
                  {/* Ranking Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '16px',
                    background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--color-primary)',
                    color: index < 3 ? '#000' : '#fff',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    #{index + 1}
                  </div>
                  
                  {/* Nome do Bairro */}
                  <h4 style={{ 
                    margin: '0 0 12px 0',
                    color: 'var(--color-text)',
                    fontSize: '1.125rem'
                  }}>
                    {bairro.nome}
                  </h4>
                  
                  {/* Estatísticas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold',
                        color: 'var(--color-primary)'
                      }}>
                        {bairro.count}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Participantes
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold',
                        color: 'var(--color-success)'
                      }}>
                        {Object.keys(bairro.origens).length}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Canais
                      </div>
                    </div>
                  </div>
                  
                  {/* Origens */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(bairro.origens)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 3)
                      .map(([origem, count]) => (
                        <div key={origem} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: getOrigemColor(origem)
                            }}/>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                              {getOrigemLabel(origem).split(' ')[1] || origem}
                            </span>
                          </div>
                          <span style={{ 
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {count}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações Adicionais */}
        <div className="grid grid-2" style={{ gap: '24px', marginTop: '32px' }}>
          <div className="card-modern" style={{ padding: '24px' }}>
            <h4 style={{ 
              marginBottom: '16px',
              color: 'var(--color-text)',
              fontSize: '1.125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 Top 5 - Origens dos Links
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getOrigemStats().map(([origem, stats], index) => (
                <div key={origem} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < getOrigemStats().length - 1 ? '1px solid var(--color-border)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: stats.color
                      }}
                    />
                    <span style={{ 
                      fontSize: '0.875rem',
                      color: 'var(--color-text)'
                    }}>
                      {stats.label}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--color-primary)'
                  }}>
                    {stats.count} ({Math.round((stats.count / participantes.length) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-modern" style={{ padding: '24px' }}>
            <h4 style={{ 
              marginBottom: '16px',
              color: 'var(--color-text)',
              fontSize: '1.125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🎯 Insights de Marketing
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderLeft: '3px solid var(--color-success)',
                borderRadius: '8px'
              }}>
                <p style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--color-text)',
                  margin: 0
                }}>
                  <strong>Canal mais eficaz:</strong> {getOrigemStats()[0] ? getOrigemStats()[0][1].label : 'N/A'} representa {getOrigemStats()[0] ? Math.round((getOrigemStats()[0][1].count / participantes.length) * 100) : 0}% das participações
                </p>
              </div>
              
              <div style={{
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderLeft: '3px solid var(--color-primary)',
                borderRadius: '8px'
              }}>
                <p style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--color-text)',
                  margin: 0
                }}>
                  <strong>Diversificação:</strong> {getOrigemStats().length} canais diferentes sendo utilizados
                </p>
              </div>
              
              <div style={{
                padding: '12px',
                background: 'rgba(245, 158, 11, 0.1)',
                borderLeft: '3px solid var(--color-warning)',
                borderRadius: '8px'
              }}>
                <p style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--color-text)',
                  margin: 0
                }}>
                  <strong>Recomendação:</strong> {getOrigemStats()[0] && getOrigemStats()[0][1].count / participantes.length > 0.5 ? 'Diversificar investimento em outros canais' : 'Manter estratégia atual de múltiplos canais'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapasPage;