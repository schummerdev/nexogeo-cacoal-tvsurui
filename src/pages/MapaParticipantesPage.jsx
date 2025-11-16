import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/DashboardLayout/Header';
import './DashboardPages.css';
import { useToast } from '../contexts/ToastContext';
import { maskName, maskPhone } from '../utils/privacyUtils';

const MapaParticipantesPage = () => {
  const { showToast } = useToast();
  const [participantes, setParticipantes] = useState([]);
  const [promocoes, setPromocoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    promocaoId: '',
    origemSource: '',
    origemMedium: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Buscar participantes ao carregar o componente
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Carregar participantes e promoções em paralelo
        const [participantesRes, promocoesRes] = await Promise.all([
          fetch('/api/?route=participantes&endpoint=list&include_public=true'),
          fetch('/api/?route=promocoes')
        ]);

        if (!participantesRes.ok) {
          throw new Error('Falha ao carregar participantes');
        }

        const participantesData = await participantesRes.json();
        const rawParticipantes = participantesData.data || [];

        // Mapear campos da API (EN) para o formato esperado pelo componente (PT-BR)
        const formattedParticipantes = rawParticipantes.map(p => ({
          ...p,
          // Mapeamento de campos EN -> PT-BR
          nome: p.name || p.nome,
          telefone: p.phone || p.telefone,
          bairro: p.neighborhood || p.bairro,
          cidade: p.city || p.cidade,
          data_participacao: p.created_at || p.participou_em || p.data_participacao,
          // Manter campos originais também
          origem_source: p.origem_source || 'direto',
          origem_medium: p.origem_medium || 'link',
          latitude: p.latitude,
          longitude: p.longitude,
          promocao_id: p.promocao_id
        }));

        console.log('✅ MapaParticipantesPage: Dados carregados:', {
          total: formattedParticipantes.length,
          primeiro: formattedParticipantes[0]
        });

        setParticipantes(formattedParticipantes);
        
        // Carregar promoções se a API responder
        if (promocoesRes.ok) {
          const promocoesData = await promocoesRes.json();
          setPromocoes(promocoesData.data || []);
        }
        
      } catch (err) {
        setError('Falha ao carregar dados');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filtrar participantes com useMemo para performance
  const filteredParticipantes = useMemo(() => {
    return participantes.filter(p => {
      if (filtros.promocaoId && p.promocao_id != filtros.promocaoId) return false;
      if (filtros.origemSource && !p.origem_source?.includes(filtros.origemSource)) return false;
      if (filtros.origemMedium && !p.origem_medium?.includes(filtros.origemMedium)) return false;
      return true;
    });
  }, [participantes, filtros]);

  // Calcular participantes da página atual
  const paginatedParticipantes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredParticipantes.slice(startIndex, endIndex);
  }, [filteredParticipantes, currentPage, ITEMS_PER_PAGE]);

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredParticipantes.length / ITEMS_PER_PAGE);

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filtros]);

  // Funções de navegação de página
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Estatísticas por origem
  const estatisticasOrigem = useMemo(() => {
    const stats = {};

    filteredParticipantes.forEach(p => {
      const key = `${p.origem_source || 'direto'} - ${p.origem_medium || 'link'}`;
      if (!stats[key]) {
        stats[key] = { count: 0, participants: [] };
      }
      stats[key].count++;
      stats[key].participants.push(p);
    });

    return Object.entries(stats)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [filteredParticipantes]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <>
        <Header 
          title="Mapa de Participantes" 
          subtitle="Visualize a origem dos participantes por link"
        />
        <div className="dashboard-content">
          <div className="loading-message">
            <p>Carregando participantes...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header 
          title="Mapa de Participantes" 
          subtitle="Visualize a origem dos participantes por link"
        />
        <div className="dashboard-content">
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Tentar novamente</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Mapa de Participantes"
        subtitle="Visualize a origem dos participantes por link"
      />
      
      <div className="dashboard-content">
        {/* Filtros */}
        <div className="card">
          <h3 className="card-title">Filtros</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="promocaoId">Promoção</label>
              <select
                id="promocaoId"
                name="promocaoId"
                value={filtros.promocaoId}
                onChange={handleFilterChange}
              >
                <option value="">Todas as promoções</option>
                {/* Adicionar opções dinâmicas baseadas nos participantes */}
                {Array.from(new Set(participantes.map(p => p.promocao_id))).map(id => {
                  const promocao = promocoes.find(p => p.id == id);
                  return (
                    <option key={id} value={id}>
                      {promocao ? promocao.nome : `Promoção #${id}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="origemSource">Origem</label>
              <select
                id="origemSource"
                name="origemSource"
                value={filtros.origemSource}
                onChange={handleFilterChange}
              >
                <option value="">Todas as origens</option>
                {Array.from(new Set(participantes.map(p => p.origem_source || 'direto'))).map(origem => (
                  <option key={origem} value={origem}>{origem}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="origemMedium">Mídia</label>
              <select
                id="origemMedium"
                name="origemMedium"
                value={filtros.origemMedium}
                onChange={handleFilterChange}
              >
                <option value="">Todas as mídias</option>
                {Array.from(new Set(participantes.map(p => p.origem_medium || 'link'))).map(medium => (
                  <option key={medium} value={medium}>{medium}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Estatísticas por Origem */}
        <div className="card">
          <h3 className="card-title">Top 10 - Origens dos Links</h3>
          <div className="stats-container">
            {estatisticasOrigem.map(([origem, stats], index) => (
              <div key={origem} className="stat-item">
                <div className="stat-rank">#{index + 1}</div>
                <div className="stat-info">
                  <div className="stat-label">{origem}</div>
                  <div className="stat-value">{stats.count} participantes</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabela de Participantes */}
        <div className="card">
          <h3 className="card-title">
            Participantes ({filteredParticipantes.length})
          </h3>

          {filteredParticipantes.length > 0 ? (
            <div className="table-container">
              <table className="participantes-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Cidade</th>
                    <th>Bairro</th>
                    <th>Promoção</th>
                    <th>Origem</th>
                    <th>Mídia</th>
                    <th>Data</th>
                    <th>Localização</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedParticipantes.map(participante => (
                    <tr key={participante.id}>
                      <td>{maskName(participante.nome)}</td>
                      <td>{maskPhone(participante.telefone)}</td>
                      <td>{participante.cidade || '-'}</td>
                      <td>{participante.bairro || '-'}</td>
                      <td>
                        {participante.promocao_nome || (() => {
                          const promocao = promocoes.find(p => p.id == participante.promocao_id);
                          return promocao ? promocao.nome : `#${participante.promocao_id}`;
                        })()}
                      </td>
                      <td>
                        <span className="origem-badge">
                          {participante.origem_source || 'direto'}
                        </span>
                      </td>
                      <td>{participante.origem_medium || 'link'}</td>
                      <td>
                        {(() => {
                          const date = participante.data_participacao || participante.participou_em;
                          if (!date) return 'Data não disponível';

                          try {
                            const formattedDate = new Date(date);
                            if (isNaN(formattedDate.getTime())) {
                              return 'Data inválida';
                            }
                            return formattedDate.toLocaleDateString('pt-BR');
                          } catch (error) {
                            return 'Erro na data';
                          }
                        })()}
                      </td>
                      <td>
                        {participante.latitude && participante.longitude ? (
                          <span className="location-info" title={`${participante.latitude}, ${participante.longitude}`}>
                            📍 Sim
                          </span>
                        ) : (
                          <span className="location-info">📍 Não</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhum participante encontrado com os filtros aplicados.</p>
            </div>
          )}

          {/* Paginação */}
          {filteredParticipantes.length > 0 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={goToPreviousPage}
              >
                ← Anterior
              </button>
              <span className="pagination-info">
                Página {currentPage} de {totalPages || 1} ({filteredParticipantes.length} {filteredParticipantes.length === 1 ? 'registro' : 'registros'})
              </span>
              <button
                className="pagination-btn"
                disabled={currentPage >= totalPages}
                onClick={goToNextPage}
              >
                Próxima →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MapaParticipantesPage;