import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/DashboardLayout/Header';
import ConfirmModal from '../components/DashboardLayout/ConfirmModal';
import './DashboardPages.css';
import { fetchPromocoes, createPromocao, updatePromocao, deletePromocao } from '../services/promocaoService';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const PromocoesPage = () => {
  const { showToast } = useToast();
  const { 
    user, 
    canCreatePromotion, 
    canEditPromotion, 
    canDeletePromotion,
    userRole 
  } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoData, setPromoData] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativa',
    numero_ganhadores: 3
  });
  
  const [promocoes, setPromocoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('todas');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1); // Página atual da paginação
  const ITEMS_PER_PAGE = 50; // Limite de 50 registros por página

  // Buscar promoções ao carregar o componente
  useEffect(() => {
    const loadPromocoes = async () => {
      try {
        setLoading(true);
        const data = await fetchPromocoes();
        // Usar o número de participantes retornado pelo backend
        const formattedData = data.map(promo => ({
          ...promo,
          participantes: promo.participantes || 0
        }));
        setPromocoes(formattedData);
      } catch (err) {
        setError('Falha ao carregar promoções');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPromocoes();
  }, []);

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingPromo(promo);
      // Formatar datas para formato yyyy-MM-dd
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      setPromoData({
        nome: promo.nome || '',
        descricao: promo.descricao || '',
        data_inicio: formatDateForInput(promo.data_inicio),
        data_fim: formatDateForInput(promo.data_fim),
        status: promo.status || 'ativa',
        numero_ganhadores: promo.numero_ganhadores || 3
      });
    } else {
      setEditingPromo(null);
      setPromoData({
        nome: '',
        descricao: '',
        data_inicio: '',
        data_fim: '',
        status: 'ativa',
        numero_ganhadores: 3
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromo(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPromoData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPromo) {
        // Atualizar promoção existente
        const updatedPromo = await updatePromocao(editingPromo.id, promoData);
        setPromocoes(prev => prev.map(p => 
          p.id === editingPromo.id 
            ? { ...p, ...promoData }
            : p
        ));
      } else {
        // Criar nova promoção
        const newPromo = await createPromocao(promoData);
        // Adicionar a nova promoção à lista
        const promoWithParticipants = {
          ...newPromo.data,
          participantes: 0
        };
        setPromocoes(prev => [...prev, promoWithParticipants]);
      }
      handleCloseModal();
      showToast('Promoção salva com sucesso!', 'success');
    } catch (err) {
      showToast('Falha ao salvar promoção: ' + err.message, 'error');
      console.error(err);
    }
  };

  const handleDeletePromo = async (promoId) => {
    const promo = promocoes.find(p => p.id === promoId);
    setPromoToDelete({ id: promoId, nome: promo?.nome || 'esta promoção' });
    setShowConfirmModal(true);
  };

  const confirmDeletePromo = async () => {
    if (!promoToDelete) return;
    
    try {
      await deletePromocao(promoToDelete.id);
      setPromocoes(prev => prev.filter(p => p.id !== promoToDelete.id));
      showToast('Promoção excluída com sucesso!', 'success');
    } catch (err) {
      showToast('Falha ao excluir promoção: ' + err.message, 'error');
      console.error(err);
    } finally {
      setShowConfirmModal(false);
      setPromoToDelete(null);
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    showToast('Link copiado para a área de transferência!', 'success');
  };

  const handleGenerateQRCode = (promo) => {
    const origin = window.location.origin;
    const link = `${origin}/participar?id=${promo.id}&utm_source=tv&utm_medium=broadcast`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
    window.open(qrUrl, '_blank');
    showToast('QR Code TV gerado e aberto em nova aba!', 'success');
  };

  const handleShortenLink = async (promo) => {
    try {
      const origin = window.location.origin;
      const originalLink = `${origin}/participar?id=${promo.id}`;

      showToast('Encurtando link...', 'info');

      const response = await fetch('/api/?route=encurtar-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: originalLink })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await navigator.clipboard.writeText(data.shortUrl);
        showToast(`Link encurtado copiado: ${data.shortUrl}`, 'success');
      } else {
        throw new Error(data.error || 'Falha ao encurtar link');
      }
    } catch (error) {
      showToast('Erro ao encurtar link: ' + error.message, 'error');
    }
  };

  const handleSocialNetworkLink = (promo, network) => {
    const origin = window.location.origin;
    const socialNetworks = {
      facebook: { utmSource: 'facebook', utmMedium: 'social', name: 'Facebook' },
      instagram: { utmSource: 'instagram', utmMedium: 'social', name: 'Instagram' },
      youtube: { utmSource: 'youtube', utmMedium: 'video', name: 'YouTube' },
      whatsapp: { utmSource: 'whatsapp', utmMedium: 'messaging', name: 'WhatsApp' },
      website: { utmSource: 'website', utmMedium: 'referral', name: 'Website' },
      tv: { utmSource: 'tv', utmMedium: 'broadcast', name: 'TV' }
    };

    const config = socialNetworks[network];
    if (!config) return;

    const link = `${origin}/participar?id=${promo.id}&utm_source=${config.utmSource}&utm_medium=${config.utmMedium}`;
    navigator.clipboard.writeText(link);
    showToast(`Link ${config.name} copiado!`, 'success');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ativa': return 'status-badge status-ativa';
      case 'inativa': return 'status-badge status-inativa';
      case 'encerrada': return 'status-badge status-encerrada';
      default: return 'status-badge';
    }
  };

  // Função para filtrar promoções
  const filteredPromocoes = useMemo(() => {
    return promocoes.filter(promo => {
      // Filtro por texto (nome ou descrição)
      const matchesSearch =
        !searchText ||
        promo.nome.toLowerCase().includes(searchText.toLowerCase()) ||
        promo.descricao.toLowerCase().includes(searchText.toLowerCase());

      // Filtro por status
      const matchesStatus =
        filterStatus === 'todas' ||
        promo.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [promocoes, searchText, filterStatus]);

  // Calcular promoções da página atual
  const paginatedPromocoes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPromocoes.slice(startIndex, endIndex);
  }, [filteredPromocoes, currentPage, ITEMS_PER_PAGE]);

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredPromocoes.length / ITEMS_PER_PAGE);

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterStatus]);

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

  if (loading) {
    return (
      <>
        <Header 
          title="Gerenciar Promoções" 
          subtitle="Crie, edite e gerencie suas campanhas de promoção"
        />
        <div className="promocoes-content">
          <div className="loading-message">
            <p>Carregando promoções...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header 
          title="Gerenciar Promoções" 
          subtitle="Crie, edite e gerencie suas campanhas de promoção"
        />
        <div className="promocoes-content">
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
        title="Gerenciar Promoções" 
        subtitle="Crie, edite e gerencie suas campanhas de promoção"
      />
      
      <div className="promocoes-content">
        {/* Barra de Ações */}
        <div className="actions-bar">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Buscar promoções..." 
              className="search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="filter-box">
            <select 
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todas">Todos os status</option>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
              <option value="encerrada">Encerrada</option>
            </select>
          </div>
          
          {canCreatePromotion() && (
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              <span className="btn-icon">➕</span>
              Nova Promoção
            </button>
          )}
        </div>

        {/* Tabela de Promoções */}
        <div className="table-container">
          <table className="promocoes-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Data Início</th>
                <th>Data Fim</th>
                <th>Status</th>
                <th>Participantes</th>
                <th>Ganhadores</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPromocoes.length > 0 ? (
                paginatedPromocoes.map(promo => (
                  <tr key={promo.id}>
                    <td>{promo.nome}</td>
                    <td>{promo.descricao}</td>
                    <td>{new Date(promo.data_inicio).toLocaleDateString('pt-BR')}</td>
                    <td>{new Date(promo.data_fim).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <span className={getStatusBadgeClass(promo.status)}>
                        {(promo.status || 'inativo').charAt(0).toUpperCase() + (promo.status || 'inativo').slice(1)}
                      </span>
                    </td>
                    <td>{promo.participantes}</td>
                    <td>{promo.numero_ganhadores || 3}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon-small btn-social-facebook"
                          onClick={() => handleSocialNetworkLink(promo, 'facebook')}
                          title="Copiar Link Facebook"
                        >
                          <span className="icon">F</span>
                        </button>
                        <button
                          className="btn-icon-small btn-social-instagram"
                          onClick={() => handleSocialNetworkLink(promo, 'instagram')}
                          title="Copiar Link Instagram"
                        >
                          <span className="icon">📷</span>
                        </button>
                        <button
                          className="btn-icon-small btn-social-youtube"
                          onClick={() => handleSocialNetworkLink(promo, 'youtube')}
                          title="Copiar Link YouTube"
                        >
                          <span className="icon">▶</span>
                        </button>
                        <button
                          className="btn-icon-small btn-social-whatsapp"
                          onClick={() => handleSocialNetworkLink(promo, 'whatsapp')}
                          title="Copiar Link WhatsApp"
                        >
                          <span className="icon">📲</span>
                        </button>
                        <button
                          className="btn-icon-small btn-social-website"
                          onClick={() => handleSocialNetworkLink(promo, 'website')}
                          title="Copiar Link Website"
                        >
                          <span className="icon">🌐</span>
                        </button>
                        <button
                          className="btn-icon-small btn-qrcode-tv"
                          onClick={() => handleGenerateQRCode(promo)}
                          title="Gerar QR Code para TV"
                        >
                          <span className="icon">🔳</span>
                        </button>
                        <button
                          className="btn-icon-small"
                          onClick={() => handleShortenLink(promo)}
                          title="Encurtar Link"
                        >
                          <span className="icon">🔗</span>
                        </button>
                        {canEditPromotion() && (
                          <button
                            className="btn-icon-small"
                            onClick={() => handleOpenModal(promo)}
                            title="Editar"
                          >
                            <span className="icon">✏️</span>
                          </button>
                        )}
                        {canDeletePromotion() && (
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeletePromo(promo.id)}
                            title="Excluir"
                          >
                            <span className="icon">🗑️</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="empty-state">
                  <td colSpan="8">
                    <div className="empty-message">
                      <span className="empty-icon">📭</span>
                      <p>Nenhuma promoção encontrada</p>
                      <p className="empty-subtitle">
                        {searchText || filterStatus !== 'todas' 
                          ? 'Tente ajustar seus filtros de busca.' 
                          : 'Crie sua primeira promoção para começar!'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={goToPreviousPage}
          >
            ← Anterior
          </button>
          <span className="pagination-info">
            Página {currentPage} de {totalPages || 1} ({filteredPromocoes.length} {filteredPromocoes.length === 1 ? 'registro' : 'registros'})
          </span>
          <button
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={goToNextPage}
          >
            Próxima →
          </button>
        </div>
      </div>

      {/* Modal para criação/edição de promoções */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPromo ? 'Editar Promoção' : 'Nova Promoção'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="nome">Nome da Promoção</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={promoData.nome}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  name="descricao"
                  value={promoData.descricao}
                  onChange={handleInputChange}
                  rows="3"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="data_inicio">Data de Início</label>
                  <input
                    type="date"
                    id="data_inicio"
                    name="data_inicio"
                    value={promoData.data_inicio}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="data_fim">Data de Fim</label>
                  <input
                    type="date"
                    id="data_fim"
                    name="data_fim"
                    value={promoData.data_fim}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={promoData.status}
                    onChange={handleInputChange}
                  >
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                    <option value="encerrada">Encerrada</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="numero_ganhadores">Número de Ganhadores</label>
                  <select
                    id="numero_ganhadores"
                    name="numero_ganhadores"
                    value={promoData.numero_ganhadores}
                    onChange={handleInputChange}
                  >
                    <option value={1}>1 Ganhador</option>
                    <option value={2}>2 Ganhadores</option>
                    <option value={3}>3 Ganhadores</option>
                  </select>
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingPromo ? 'Atualizar' : 'Criar'} Promoção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDeletePromo}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir a promoção "${promoToDelete?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </>
  );
};

export default PromocoesPage; 