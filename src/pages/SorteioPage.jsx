import React, { useState, useEffect } from 'react';
import Header from '../components/DashboardLayout/Header';
import { LoadingSpinner } from '../components/LoadingComponents';
import Toast from '../components/Toast/Toast';
import { maskName, maskPhone } from '../utils/privacyUtils';
import {
  buscarParticipantesDisponiveis,
  realizarSorteio,
  buscarGanhadores,
  obterEstatisticas,
  cancelarSorteio,
  buscarPromocoesEncerradas,
  cancelarGanhador
} from '../services/sorteioService';
import { fetchPromocoes } from '../services/promocaoService';
import { logAcesso, logSorteio, logCancelamentoSorteio } from '../services/logService';
import { useAuth } from '../contexts/AuthContext';
import './DashboardPages.css';

const SorteioPage = () => {
  const { canPerformDraw, canCancelWinner } = useAuth();
  
  const [selectedPromotion, setSelectedPromotion] = useState('');
  const [participants, setParticipants] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [ganhadores, setGanhadores] = useState([]);
  const [winner, setWinner] = useState(null);
  const [statistics, setStatistics] = useState(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [videoUrl, setVideoUrl] = useState('');
  
  // Estados para promoções encerradas
  const [promocoesEncerradas, setPromocoesEncerradas] = useState([]);
  const [loadingEncerradas, setLoadingEncerradas] = useState(false);
  
  const [filters, setFilters] = useState({
    cidade: '',
    bairro: '',
    periodo: 'todos'
  });

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
    // Registrar acesso à página de sorteio
    logAcesso('Página de Sorteio');
  }, []);
  
  const carregarDados = async () => {
    try {
      setLoading(true);
      setLoadingEncerradas(true);
      const [promocoesData, estatisticasData, promocoesEncerradasData] = await Promise.all([
        fetchPromocoes(),
        obterEstatisticas(),
        buscarPromocoesEncerradas()
      ]);
      
      setPromotions(promocoesData || []);
      setStatistics(estatisticasData.data || {});
      
      // Sempre carregar e mostrar promoções encerradas
      if (promocoesEncerradasData.success) {
        setPromocoesEncerradas(promocoesEncerradasData.data || []);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados do sorteio', 'error');
    } finally {
      setLoading(false);
      setLoadingEncerradas(false);
    }
  };
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };
  
  // Função para cancelar um ganhador específico (apenas admins)
  const handleCancelarGanhador = async (ganhadorId, promocaoNome) => {
    if (!window.confirm(`Tem certeza que deseja cancelar este ganhador da promoção "${promocaoNome}"?`)) {
      return;
    }
    
    try {
      const motivo = prompt('Motivo do cancelamento (opcional):', 'Cancelado pelo administrador');
      
      const result = await cancelarGanhador(ganhadorId, motivo);
      
      if (result.success) {
        showToast(`Ganhador ${result.data.participante_nome} cancelado com sucesso`, 'success');
        
        // Registrar log do cancelamento
        logCancelamentoSorteio(promocaoNome, ganhadorId);
        
        // Recarregar dados para atualizar a lista
        carregarDados();
      }
      
    } catch (error) {
      console.error('Erro ao cancelar ganhador:', error);
      showToast(error.message || 'Erro ao cancelar ganhador', 'error');
    }
  };
  
  const handlePromotionChange = async (e) => {
    const promotionId = e.target.value;
    setSelectedPromotion(promotionId);
    setWinner(null);
    
    if (promotionId) {
      await carregarParticipantes(promotionId);
      await carregarGanhadores(promotionId);
    } else {
      setParticipants([]);
      setGanhadores([]);
    }
  };
  
  const carregarParticipantes = async (promocaoId) => {
    try {
      setLoadingParticipants(true);
      const data = await buscarParticipantesDisponiveis(promocaoId);
      setParticipants(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar participantes:', error);
      showToast('Erro ao carregar participantes disponíveis', 'error');
    } finally {
      setLoadingParticipants(false);
    }
  };
  
  const carregarGanhadores = async (promocaoId) => {
    try {
      const data = await buscarGanhadores(promocaoId);
      setGanhadores(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar ganhadores:', error);
    }
  };

  const handleDraw = async () => {
    if (!selectedPromotion) {
      showToast('Selecione uma promoção primeiro', 'error');
      return;
    }
    
    if (participants.length === 0) {
      showToast('Não há participantes disponíveis para sortear nesta promoção', 'error');
      return;
    }

    setIsDrawing(true);
    setWinner(null);
    
    // Tocar música de sorteio
    const audioElement = document.getElementById('sorteio-audio');
    if (audioElement) {
      audioElement.currentTime = 0; // Reiniciar do início
      audioElement.play().catch(e => console.log('Erro ao tocar áudio:', e));
    }
    
    try {
      // Simular animação de sorteio
      setTimeout(async () => {
        try {
          const data = await realizarSorteio(selectedPromotion);
          // data.data é um array de ganhadores, pegar o primeiro
          const primeiroGanhador = Array.isArray(data.data) ? data.data[0] : data.data;
          
          // Registrar log do sorteio realizado
          logSorteio(selectedPromotion, primeiroGanhador);
          
          // Sorteio realizado - tocar som de aplausos
          const audioAplausos = document.getElementById('sorteio-audio');
          if (audioAplausos) {
            audioAplausos.pause();
            audioAplausos.currentTime = 0;
            audioAplausos.loop = false; // Não repetir os aplausos
            audioAplausos.play().catch(e => console.log('Erro ao tocar aplausos:', e));
          }
          
          // Recarregar listas
          await Promise.all([
            carregarParticipantes(selectedPromotion),
            carregarGanhadores(selectedPromotion),
            obterEstatisticas().then(stats => setStatistics(stats.data))
          ]);
          
          // Automaticamente abrir página pública do sorteio após realizar sorteio
          setTimeout(() => {
            handleOpenPublicView();
          }, 1000);
          
        } catch (error) {
          console.error('Erro no sorteio:', error);
          showToast('Erro ao realizar sorteio', 'error');
        } finally {
          setIsDrawing(false);
          // Parar música do sorteio
          const audioElement = document.getElementById('sorteio-audio');
          if (audioElement) {
            audioElement.pause();
          }
        }
      }, 11000);
    } catch (error) {
      setIsDrawing(false);
      // Parar música do sorteio em caso de erro
      const audioElement = document.getElementById('sorteio-audio');
      if (audioElement) {
        audioElement.pause();
      }
      console.error('Erro ao iniciar sorteio:', error);
      showToast('Erro ao iniciar sorteio', 'error');
    }
  };

  const handleCancelDrawing = async (ganhadorId) => {
    if (window.confirm('Tem certeza que deseja cancelar este sorteio?')) {
      try {
        await cancelarSorteio(ganhadorId, selectedPromotion);
        
        // Registrar log do cancelamento do sorteio
        logCancelamentoSorteio(selectedPromotion, ganhadorId);
        
        showToast('Sorteio cancelado com sucesso', 'success');
        
        // Recarregar listas
        await Promise.all([
          carregarParticipantes(selectedPromotion),
          carregarGanhadores(selectedPromotion),
          obterEstatisticas().then(stats => setStatistics(stats.data))
        ]);
        
        if (winner && winner.ganhador_id === ganhadorId) {
          setWinner(null);
        }
        
      } catch (error) {
        console.error('Erro ao cancelar sorteio:', error);
        showToast('Erro ao cancelar sorteio', 'error');
      }
    }
  };
  
  const handleNotifyWinner = () => {
    if (winner) {
      showToast(`Funcionalidade de notificação será implementada em breve`, 'info');
    }
  };

  const handleGenerateCertificate = () => {
    if (winner) {
      showToast(`Funcionalidade de comprovante será implementada em breve`, 'info');
    }
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['video/mp4', 'video/webm', 'video/mov'];
    if (!validTypes.includes(file.type)) {
      showToast('Formato de vídeo não suportado. Use MP4, WEBM ou MOV', 'error');
      return;
    }

    // Validar tamanho (máximo 100MB)
    if (file.size > 100 * 1024 * 1024) {
      showToast('Arquivo muito grande. Máximo 100MB', 'error');
      return;
    }

    showToast('Funcionalidade de upload será implementada em breve. Por enquanto, coloque o vídeo em /public/videos/', 'info');
    
    // Sugerir path local
    const fileName = file.name.replace(/\s+/g, '-').toLowerCase();
    setVideoUrl(`/videos/${fileName}`);
  };

  const handleOpenPublicView = () => {
    if (!selectedPromotion) {
      showToast('Selecione uma promoção primeiro', 'error');
      return;
    }
    
    // Construir URL da página pública do sorteio
    let publicUrl = `/sorteio-publico?promocao=${selectedPromotion}`;
    if (videoUrl.trim()) {
      publicUrl += `&video=${encodeURIComponent(videoUrl.trim())}`;
    }
    
    // Abrir em nova aba
    window.open(publicUrl, '_blank');
    showToast('Página pública do sorteio aberta em nova aba', 'success');
  };
  
  const filteredParticipants = participants.filter(participant => {
    if (filters.cidade && !participant.cidade?.toLowerCase().includes(filters.cidade.toLowerCase())) return false;
    if (filters.bairro && !participant.bairro?.toLowerCase().includes(filters.bairro.toLowerCase())) return false;
    return true;
  });
  
  if (loading) {
    return (
      <>
        <Header 
          title="Módulo de Sorteio" 
          subtitle="Realize sorteios de forma justa e transparente"
        />
        <div className="loading-container">
          <LoadingSpinner text="Carregando dados do sorteio..." />
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Módulo de Sorteio" 
        subtitle="Realize sorteios de forma justa e transparente"
      />
      
      {/* Elemento de áudio para música de sorteio */}
      <audio id="sorteio-audio" preload="auto" loop>
        <source src="/audio/sorteio-aplausos.mp3" type="audio/mpeg" />
        <source src="/audio/sorteio-aplausos.wav" type="audio/wav" />
        Seu navegador não suporta o elemento de áudio.
      </audio>
      
      <div className="sorteio-content">
        <div className="card">
          <h3 className="card-title">Configurações do Sorteio</h3>
          
          <div className="form-group">
            <label htmlFor="promocaoSorteio">Selecione a Promoção</label>
            <select
              id="promocaoSorteio"
              value={selectedPromotion}
              onChange={handlePromotionChange}
              disabled={isDrawing}
            >
              <option value="">Selecione uma promoção</option>
              {promotions
                .filter(promo => promo.status === 'ativa')
                .map(promo => (
                <option key={promo.id} value={promo.id}>
                  {promo.nome} ✅
                </option>
              ))}
            </select>
          </div>


          <div className="form-group">
            <label htmlFor="videoUrl">Vídeo do Sorteio (opcional)</label>
            <div className="video-input-container">
              <input
                type="url"
                id="videoUrl"
                placeholder="/videos/meu-video.mp4 ou URL externa"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={isDrawing}
              />
              <div className="video-actions">
                <input
                  type="file"
                  id="videoFile"
                  accept="video/mp4,video/webm,video/mov"
                  style={{ display: 'none' }}
                  onChange={handleVideoUpload}
                  disabled={isDrawing}
                />
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={() => document.getElementById('videoFile').click()}
                  disabled={isDrawing}
                >
                  📁 Enviar Vídeo
                </button>
                {videoUrl && (
                  <>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => window.open(videoUrl, '_blank')}
                      disabled={isDrawing}
                      title="Testar vídeo em nova aba"
                    >
                      🎥 Testar Vídeo
                    </button>
                    <button
                      type="button" 
                      className="btn-secondary btn-small"
                      onClick={() => {
                        if (selectedPromotion) {
                          const testUrl = `/sorteio-publico?promocao=${selectedPromotion}&video=${encodeURIComponent(videoUrl)}`;
                          window.open(testUrl, '_blank');
                        } else {
                          showToast('Selecione uma promoção primeiro para testar', 'error');
                        }
                      }}
                      disabled={isDrawing || !selectedPromotion}
                      title="Testar na página pública do sorteio"
                    >
                      🚀 Preview Sorteio
                    </button>
                  </>
                )}
              </div>
            </div>
            <small className="form-help">
              🎬 Use arquivos locais para melhor performance (MP4, WEBM, MOV, WebP animado)
              <br />
              📺 Mídia será exibida por 10 segundos antes dos ganhadores
              <br />
              💡 Dica: Coloque arquivos em /public/videos/ e use /videos/nome.mp4 ou /videos/nome.webp
              <br />
              🎯 Padrão: Se não especificar URL, usará automaticamente /videos/sorteio.webp
            </small>
          </div>
          
          {selectedPromotion && (
            <div className="sorteio-stats">
              <div className="stat-item">
                <span className="stat-label">Participantes Disponíveis:</span>
                <span className="stat-value">{filteredParticipants.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Já Sorteados:</span>
                <span className="stat-value">{ganhadores.length}</span>
              </div>
            </div>
          )}
          
          <div className="form-group align-right">
            <div className="button-group">
              {canPerformDraw() && (
                <button 
                  onClick={handleDraw} 
                  disabled={!selectedPromotion || isDrawing}
                  className="btn-primary"
                >
                  <span className="btn-icon">🎲</span>
                  {isDrawing ? 'Sorteando...' : 'Realizar Sorteio'}
                </button>
              )}
              
              <button 
                onClick={handleOpenPublicView} 
                disabled={!selectedPromotion}
                className="btn-secondary"
              >
                <span className="btn-icon">🎯</span>
                Abrir Sorteio Público
              </button>
            </div>
          </div>
        </div>
        
        {statistics && (
          <div className="card">
            <h3 className="card-title">📊 Estatísticas Gerais</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{statistics.totalGanhadores || 0}</div>
                <div className="stat-label">Total de Ganhadores</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{statistics.promocoesComGanhadores || 0}</div>
                <div className="stat-label">Promoções com Sorteios</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{statistics.participantesDisponiveis || 0}</div>
                <div className="stat-label">Participantes Disponíveis</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{statistics.participantesTotal || 0}</div>
                <div className="stat-label">Total de Participantes</div>
              </div>
            </div>
          </div>
        )}
        
        {selectedPromotion && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">👥 Participantes Disponíveis ({filteredParticipants.length})</h3>
              <button 
                className="btn-secondary btn-small"
                onClick={() => setShowFilters(!showFilters)}
              >
                🔍 {showFilters ? 'Ocultar' : 'Filtros'}
              </button>
            </div>
            
            {showFilters && (
              <div className="filters-section">
                <div className="filters-grid">
                  <div className="form-group">
                    <label>Filtrar por Cidade</label>
                    <input
                      type="text"
                      placeholder="Digite o nome da cidade"
                      value={filters.cidade}
                      onChange={(e) => setFilters(prev => ({...prev, cidade: e.target.value}))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Filtrar por Bairro</label>
                    <input
                      type="text"
                      placeholder="Digite o nome do bairro"
                      value={filters.bairro}
                      onChange={(e) => setFilters(prev => ({...prev, bairro: e.target.value}))}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {loadingParticipants ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <LoadingSpinner size="lg" />
                <p style={{ marginTop: '15px', color: 'var(--color-text-secondary)' }}>Carregando participantes...</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="participantes-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th>Cidade</th>
                      <th>Bairro</th>
                      <th>Data de Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.length > 0 ? (
                      filteredParticipants.map(participant => (
                        <tr key={participant.id}>
                          <td>{maskName(participant.nome)}</td>
                          <td>{maskPhone(participant.telefone)}</td>
                          <td>{participant.cidade || 'Não informado'}</td>
                          <td>{participant.bairro || 'Não informado'}</td>
                          <td>{participant.participou_em ? new Date(participant.participou_em).toLocaleDateString('pt-BR') : 'Não informado'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-message">
                          {participants.length === 0 
                            ? "Nenhum participante disponível para sorteio" 
                            : "Nenhum participante encontrado com os filtros aplicados"
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {ganhadores.length > 0 && (
          <div className="card">
            <h3 className="card-title">🏆 Ganhadores Anteriores ({ganhadores.length})</h3>
            <div className="table-container">
              <table className="participantes-table">
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Cidade</th>
                    <th>Data do Sorteio</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ganhadores.map(ganhador => (
                    <tr key={ganhador.ganhador_id}>
                      <td>
                        <span className={`position-badge position-${ganhador.posicao || 1}`}>
                          {ganhador.posicao === 1 ? '🥇 1º' : 
                           ganhador.posicao === 2 ? '🥈 2º' : 
                           ganhador.posicao === 3 ? '🥉 3º' : 
                           `${ganhador.posicao || 1}º`}
                        </span>
                      </td>
                      <td><strong>{ganhador.nome}</strong></td>
                      <td>{maskPhone(ganhador.telefone)}</td>
                      <td>{ganhador.cidade || 'Não informado'}</td>
                      <td>{new Date(ganhador.sorteado_em).toLocaleString('pt-BR')}</td>
                      <td>
                        {(ganhador.id && typeof ganhador.id === 'string' && ganhador.id.startsWith('winner_mock_')) ? (
                          <button
                            className="btn-secondary btn-small"
                            disabled
                            title="Dados de exemplo - Execute um sorteio real para poder cancelar"
                          >
                            🚫 Mock
                          </button>
                        ) : canCancelWinner() ? (
                          <button
                            className="btn-danger"
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              minWidth: 'auto'
                            }}
                            onClick={() => handleCancelDrawing(ganhador.id || ganhador.ganhador_id)}
                            title="Cancelar sorteio"
                          >
                            🗑️
                          </button>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Seção de Promoções Encerradas */}
        {promocoesEncerradas.length > 0 && (
          <div className="card" style={{ marginTop: '30px' }}>
            <div style={{ 
              marginBottom: '20px' 
            }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                🏆 Últimas Promoções Encerradas ({promocoesEncerradas.length})
              </h3>
            </div>

            <div className="promocoes-encerradas-list">
              {promocoesEncerradas.map((promocao, index) => (
                <div key={promocao.id} className="promocao-encerrada-item" style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  backgroundColor: 'var(--color-surface)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div className="promocao-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <h4 style={{ 
                        margin: '0 0 8px 0',
                        color: 'var(--color-text)',
                        fontSize: '1.2rem',
                        fontWeight: '600'
                      }}>
                        #{index + 1} {promocao.nome}
                      </h4>
                      <div style={{
                        display: 'flex',
                        gap: '15px',
                        fontSize: '0.9rem',
                        color: 'var(--color-text-secondary)'
                      }}>
                        <span>📅 Término: {new Date(promocao.data_fim).toLocaleDateString('pt-BR')}</span>
                        <span>🎯 Status: {promocao.status}</span>
                        <span>🏆 Ganhadores: {promocao.total_ganhadores}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Ganhadores */}
                  <div className="ganhadores-list">
                    <h5 style={{ 
                      margin: '0 0 12px 0',
                      color: 'var(--color-primary)',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}>
                      🎉 Ganhadores:
                    </h5>
                    
                    <div className="ganhadores-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '12px'
                    }}>
                      {promocao.ganhadores.map((ganhador) => (
                        <div key={ganhador.ganhador_id} style={{
                          padding: '12px',
                          backgroundColor: 'rgba(40, 167, 69, 0.1)',
                          border: '1px solid rgba(40, 167, 69, 0.3)',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          position: 'relative'
                        }}>
                          <div style={{ fontWeight: '600', color: 'var(--color-text)' }}>
                            👤 {ganhador.participante_nome}
                          </div>
                          {ganhador.telefone && (
                            <div style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                              📱 {maskPhone(ganhador.telefone)}
                            </div>
                          )}
                          {ganhador.cidade && (
                            <div style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                              📍 {ganhador.cidade}
                            </div>
                          )}
                          <div style={{
                            color: 'var(--color-text-secondary)',
                            marginTop: '4px',
                            fontSize: '0.8rem'
                          }}>
                            🗓️ {new Date(ganhador.sorteado_em).toLocaleString('pt-BR')}
                          </div>

                          {/* Botão Cancelar Ganhador - Movido para última linha */}
                          {canCancelWinner() && (
                            <div style={{
                              marginTop: '8px',
                              textAlign: 'right',
                              borderTop: '1px solid rgba(40, 167, 69, 0.2)',
                              paddingTop: '6px'
                            }}>
                              <button
                                onClick={() => handleCancelarGanhador(ganhador.ganhador_id, promocao.nome)}
                                style={{
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  padding: '3px 6px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  opacity: 0.8,
                                  transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '1'}
                                onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                                title={`Cancelar ganhador ${ganhador.nome_ganhador}`}
                              >
                                🗑️ Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: 'rgba(23, 162, 184, 0.1)',
              border: '1px solid rgba(23, 162, 184, 0.3)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
              textAlign: 'center'
            }}>
              ℹ️ Mostrando as últimas 5 promoções encerradas com ganhadores cadastrados
            </div>
          </div>
        )}
        
      </div>
      
      {toast.show && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: '' })}
        />
      )}
    </>
  );
};

export default SorteioPage;