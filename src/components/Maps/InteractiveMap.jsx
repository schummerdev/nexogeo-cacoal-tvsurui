// InteractiveMap.jsx - Mapa interativo com Leaflet
import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// CSS do Leaflet (será carregado via index.html)
import 'leaflet/dist/leaflet.css';

// Corrigir ícones do Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Função helper para extrair apenas o primeiro nome
const getFirstName = (fullName) => {
  if (!fullName) return 'Participante';
  return fullName.trim().split(' ')[0];
};

// Componente wrapper para marcador roxo que cria ícone de forma segura
const PurpleMarker = ({ position, children }) => {
  const purpleIcon = useMemo(() => {
    try {
      const purpleIconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="25" height="41">
          <path fill="#9333ea" stroke="#581c87" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
          <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
        </svg>
      `);

      return new L.Icon({
        iconUrl: purpleIconUrl,
        iconRetinaUrl: purpleIconUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: markerShadow,
        shadowSize: [41, 41],
        shadowAnchor: [12, 41]
      });
    } catch (error) {
      console.error('Erro ao criar ícone roxo:', error);
      return undefined; // Fallback para ícone padrão
    }
  }, []);

  return (
    <Marker position={position} icon={purpleIcon}>
      {children}
    </Marker>
  );
};

// Componente para heatmap (simulado com círculos)
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Remove layer anterior se existir
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // Criar nova layer de heat
    const heatLayer = L.layerGroup();
    
    points.forEach((point) => {
      if (point.lat && point.lng && point.intensity) {
        const circle = L.circle([point.lat, point.lng], {
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: Math.min(point.intensity / 100, 0.8),
          radius: point.intensity * 100, // Ajustar raio baseado na intensidade
          weight: 1
        });
        
        heatLayer.addLayer(circle);
      }
    });

    // Adicionar layer ao mapa
    map.addLayer(heatLayer);
    layerRef.current = heatLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [points, map]);

  return null;
};

// Componente para atualizar o centro do mapa quando filtros mudam
const MapCenterUpdater = ({ center, zoom, participants }) => {
  const map = useMap();

  useEffect(() => {
    // Forçar o redimensionamento do mapa para janelas externas
    const isExternal = window.location.pathname.includes('/external/');

    const resizeTimeout = setTimeout(() => {
      try {
        map.invalidateSize(true);
        console.log('🗺️ Mapa redimensionado', isExternal ? '(janela externa)' : '');

        // Sinalizar que o mapa carregou com sucesso
        setTimeout(() => {
          const fallback = document.getElementById('map-fallback');
          if (fallback) {
            fallback.style.display = 'none';
            console.log('✅ Fallback ocultado - mapa carregado');
          }
        }, isExternal ? 2000 : 1000);

        // Para janelas externas, fazer uma segunda tentativa
        if (isExternal) {
          setTimeout(() => {
            map.invalidateSize(true);
            console.log('🗺️ Segunda tentativa de redimensionamento');
          }, 1000);
        }
      } catch (error) {
        console.warn('Erro ao redimensionar mapa:', error);
      }
    }, isExternal ? 500 : 300);

    if (participants && participants.length > 0) {
      const validParticipants = participants.filter(p => p.lat && p.lng);

      if (validParticipants.length === 1) {
        // Se há apenas um participante, centraliza nele
        map.setView([validParticipants[0].lat, validParticipants[0].lng], zoom > 14 ? zoom : 14);
      } else if (validParticipants.length > 1) {
        // Se há múltiplos participantes, ajusta o bounds para mostrar todos
        const bounds = L.latLngBounds(validParticipants.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [20, 20] });
      } else if (center && center.length === 2) {
        // Se não há participantes válidos, usa o centro padrão
        map.setView(center, zoom);
      }
    }

    return () => {
      clearTimeout(resizeTimeout);
    };
  }, [map, center, zoom, participants]);

  return null;
};

// Mapa principal
export const InteractiveMap = ({ 
  participants = [], 
  center = [-23.5505, -46.6333], 
  zoom = 10, 
  height = '400px',
  showHeatmap = false,
  title = "Mapa de Participações",
  showFilters = false,
  onFilterChange = null,
  promotions = [],
  selectedPromotion = 'all',
  onCityFilterChange = null,
  selectedCity = 'all'
}) => {
  // Dados de exemplo se não houver participantes
  const defaultParticipants = [
    { 
      id: 1, 
      lat: -23.5505, 
      lng: -46.6333, 
      name: 'João Silva', 
      city: 'São Paulo', 
      district: 'Centro',
      intensity: 80,
      promocao_id: 99,
      promocao_nome: 'Promoção Verão 2024'
    },
    { 
      id: 2, 
      lat: -23.5320, 
      lng: -46.6580, 
      name: 'Maria Santos', 
      city: 'São Paulo', 
      district: 'Vila Madalena',
      intensity: 60,
      promocao_id: 2,
      promocao_nome: 'Black Friday 2024'
    },
    { 
      id: 3, 
      lat: -23.5629, 
      lng: -46.6544, 
      name: 'Pedro Oliveira', 
      city: 'São Paulo', 
      district: 'Liberdade',
      intensity: 90,
      promocao_id: 99,
      promocao_nome: 'Promoção Verão 2024'
    },
    { 
      id: 4, 
      lat: -23.5475, 
      lng: -46.6361, 
      name: 'Ana Costa', 
      city: 'São Paulo', 
      district: 'República',
      intensity: 70,
      promocao_id: 3,
      promocao_nome: 'Natal Premiado'
    },
    { 
      id: 5, 
      lat: -23.5558, 
      lng: -46.6396, 
      name: 'Carlos Mendes', 
      city: 'São Paulo', 
      district: 'Bela Vista',
      intensity: 85,
      promocao_id: 2,
      promocao_nome: 'Black Friday 2024'
    }
  ];

  // Promoções de exemplo se não houver
  const defaultPromotions = [
    { id: 99, nome: 'Promoção Verão 2024', status: 'ativa' },
    { id: 2, nome: 'Black Friday 2024', status: 'ativa' },
    { id: 3, nome: 'Natal Premiado', status: 'ativa' },
    { id: 4, nome: 'Ano Novo 2025', status: 'inativa' }
  ];

  const mapPromotions = promotions.length > 0 ? promotions : defaultPromotions;
  
  // Primeiro, filtrar por promoção para obter cidades disponíveis
  let participantsForCities = participants.length > 0 ? participants : defaultParticipants;
  
  if (selectedPromotion !== 'all') {
    participantsForCities = participantsForCities.filter(p => 
      p.promocao_id === parseInt(selectedPromotion)
    );
  }

  // Obter lista de cidades baseada na promoção selecionada
  const availableCities = [...new Set([
    ...participantsForCities.map(p => p.city || p.cidade).filter(Boolean)
  ])].sort();

  // Calcular região dinâmica baseada nos participantes filtrados
  const calculateRegion = (participants) => {
    if (participants.length === 0) return 'Sem dados';
    
    const cities = [...new Set(participants.map(p => p.city || p.cidade).filter(Boolean))];
    
    if (cities.length === 1) {
      return cities[0];
    } else if (cities.length <= 3) {
      return cities.join(', ');
    } else {
      return `${cities[0]} e mais ${cities.length - 1} cidades`;
    }
  };

  // Agora filtrar por promoção e cidade
  let filteredParticipants = participants.length > 0 ? participants : defaultParticipants;
  
  if (selectedPromotion !== 'all') {
    filteredParticipants = filteredParticipants.filter(p => 
      p.promocao_id === parseInt(selectedPromotion)
    );
  }

  if (selectedCity !== 'all') {
    filteredParticipants = filteredParticipants.filter(p => 
      p.city === selectedCity || p.cidade === selectedCity
    );
  }

  // Calcular centro do mapa baseado nos participantes filtrados
  const calculateMapCenter = (participants) => {
    if (participants.length === 0) return center;
    
    const validParticipants = participants.filter(p => p.lat && p.lng);
    if (validParticipants.length === 0) return center;
    
    const avgLat = validParticipants.reduce((sum, p) => sum + p.lat, 0) / validParticipants.length;
    const avgLng = validParticipants.reduce((sum, p) => sum + p.lng, 0) / validParticipants.length;
    
    return [avgLat, avgLng];
  };

  const mapCenter = calculateMapCenter(filteredParticipants);
  const dynamicZoom = filteredParticipants.length > 0 ? (zoom - 2 > 8 ? zoom - 2 : 8) : zoom;
  const currentRegion = calculateRegion(filteredParticipants);

  const heatmapPoints = filteredParticipants.map(p => ({
    lat: p.lat,
    lng: p.lng,
    intensity: p.intensity || 50
  }));

  return (
    <div className="card-modern" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          color: 'var(--color-text)',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🗺️ {title}
        </h3>
        
        {/* Filtros */}
        {showFilters && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {/* Filtro de Promoções */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap'
              }}>
                🎯 Promoção:
              </label>
              <select
                value={selectedPromotion}
                onChange={(e) => onFilterChange && onFilterChange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  minWidth: '180px',
                  transition: 'var(--transition-normal)'
                }}
              >
                <option value="all">📊 Todas</option>
                {mapPromotions.map(promo => (
                  <option key={promo.id} value={promo.id}>
                    {promo.status === 'ativa' ? '🟢' : '🔴'} {promo.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Cidades */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap'
              }}>
                🏙️ Cidade:
              </label>
              <select
                value={selectedCity}
                onChange={(e) => onCityFilterChange && onCityFilterChange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  minWidth: '150px',
                  transition: 'var(--transition-normal)'
                }}
              >
                <option value="all">🌍 Todas</option>
                {availableCities.map(cidade => (
                  <option key={cidade} value={cidade}>
                    📍 {cidade}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Botão Limpar Filtros */}
            {(selectedPromotion !== 'all' || selectedCity !== 'all') && (
              <button
                onClick={() => {
                  onFilterChange && onFilterChange('all');
                  onCityFilterChange && onCityFilterChange('all');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--color-warning)',
                  color: 'white',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-normal)',
                  fontWeight: '500'
                }}
                title="Limpar todos os filtros"
              >
                🗑️ Limpar Filtros
              </button>
            )}
          </div>
        )}
      </div>
      
      <div style={{ 
        height, 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        position: 'relative'
      }}>
        <MapContainer
          center={mapCenter}
          zoom={dynamicZoom}
          style={{
            height: '100%',
            width: '100%',
            minHeight: '400px',
            position: 'relative',
            zIndex: 1
          }}
          scrollWheelZoom={true}
          key={`${mapCenter[0]}-${mapCenter[1]}-${selectedPromotion}-${selectedCity}`}
          whenReady={(mapInstance) => {
            console.log('🗺️ MapContainer pronto');

            // Forçar redimensionamento imediato
            setTimeout(() => {
              mapInstance.target.invalidateSize(true);
              console.log('🔄 Redimensionamento forçado após ready');
            }, 100);

            // Listener para detectar quando tiles carregarem
            mapInstance.target.on('load', () => {
              console.log('🗺️ Tiles carregados com sucesso');
              setTimeout(() => {
                const fallback = document.getElementById('map-fallback');
                if (fallback) {
                  fallback.style.display = 'none';
                  console.log('✅ Fallback ocultado após carregamento de tiles');
                }
              }, 500);
            });

            // Timeout para ocultar fallback mesmo se tiles não carregarem
            setTimeout(() => {
              const fallback = document.getElementById('map-fallback');
              if (fallback && fallback.style.display !== 'none') {
                console.log('⚠️ Forçando ocultação do fallback após timeout');
                fallback.style.opacity = '0.7';
                fallback.innerHTML = `
                  <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 32px; margin-bottom: 16px;">🗺️</div>
                    <h4>Mapa Inicializando...</h4>
                    <p>22 participantes em Cacoal, Cacoal</p>
                    <button onclick="window.location.reload()" style="padding: 8px 16px; margin: 4px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer;">🔄 Recarregar</button>
                    <button onclick="window.open('https://maps.google.com/maps?q=Cacoal,+RO,+Brasil', '_blank')" style="padding: 8px 16px; margin: 4px; border: none; border-radius: 6px; background: #10b981; color: white; cursor: pointer;">🌐 Google Maps</button>
                  </div>
                `;
              }
            }, 3000);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Componente para atualizar centro dinamicamente */}
          <MapCenterUpdater center={mapCenter} zoom={dynamicZoom} participants={filteredParticipants} />
          
          {/* Heatmap Layer */}
          {showHeatmap && <HeatmapLayer points={heatmapPoints} />}
          
          {/* Marcadores individuais */}
          {!showHeatmap && filteredParticipants.map((participant) => {
            const isCaixaMisteriosa = participant.participant_type === 'public';
            const firstName = getFirstName(participant.name);
            const MarkerComponent = isCaixaMisteriosa ? PurpleMarker : Marker;

            return (
              <MarkerComponent
                key={participant.id}
                position={[participant.lat, participant.lng]}
              >
                <Popup>
                  <div style={{
                    padding: '12px',
                    minWidth: '200px',
                    maxWidth: '280px'
                  }}>
                    {/* Badge tipo participante */}
                    {isCaixaMisteriosa && (
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        marginBottom: '10px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 8px rgba(147, 51, 234, 0.3)'
                      }}>
                        📦 Caixa Misteriosa
                      </div>
                    )}

                    {/* Nome do participante */}
                    <h4 style={{
                      margin: isCaixaMisteriosa ? '0 0 10px 0' : '0 0 8px 0',
                      color: isCaixaMisteriosa ? '#6b21a8' : '#1e40af',
                      fontSize: '1.15rem',
                      fontWeight: '700',
                      lineHeight: '1.3',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}>
                      {firstName}
                    </h4>

                    {/* Localização */}
                    <p style={{
                      margin: '0 0 8px 0',
                      color: '#374151',
                      fontSize: '0.9rem',
                      lineHeight: '1.4',
                      fontWeight: '500'
                    }}>
                      📍 {participant.district}, {participant.city}
                    </p>

                    {/* Informações específicas da Caixa Misteriosa */}
                    {isCaixaMisteriosa && (
                      <div style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(147, 51, 234, 0.2)',
                        fontSize: '0.8rem',
                        color: '#4b5563'
                      }}>
                        {participant.total_submissions > 0 && (
                          <div style={{ marginBottom: '4px' }}>
                            🎯 <strong>{participant.total_submissions}</strong> palpite{participant.total_submissions > 1 ? 's' : ''}
                          </div>
                        )}
                        {participant.extra_guesses > 0 && (
                          <div>
                            ⭐ <strong>{participant.extra_guesses}</strong> extra{participant.extra_guesses > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Engajamento para participantes regulares */}
                    {!isCaixaMisteriosa && participant.intensity && (
                      <p style={{
                        margin: '8px 0 0 0',
                        color: 'var(--color-primary)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--color-border)'
                      }}>
                        Engajamento: {participant.intensity}%
                      </p>
                    )}
                  </div>
                </Popup>
              </MarkerComponent>
            );
          })}
        </MapContainer>
      </div>
      
      {/* Controles do mapa */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)'
        }}>
          <span>📍 {filteredParticipants.length} participantes</span>
          <span>•</span>
          <span>🎯 Região: {currentRegion}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px',
              fontSize: '0.75rem'
            }}
            onClick={() => window.open('https://maps.google.com', '_blank')}
          >
            🌐 Ver no Google Maps
          </button>
        </div>
      </div>
    </div>
  );
};

// Mapa compacto para dashboard
export const DashboardMap = ({ participants = [] }) => {
  return (
    <InteractiveMap
      participants={participants}
      height="300px"
      showHeatmap={false}
      title=""
      zoom={11}
    />
  );
};

// Mapa com heatmap para análises
export const HeatmapView = ({ participants = [] }) => {
  return (
    <InteractiveMap
      participants={participants}
      height="500px"
      showHeatmap={true}
      title="Mapa de Calor - Engajamento por Região"
      zoom={10}
    />
  );
};

export default InteractiveMap;