import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/DashboardLayout/Header';
import ConfirmModal from '../components/DashboardLayout/ConfirmModal';
import EditParticipanteModal from '../components/EditParticipanteModal';
import './DashboardPages.css';
import { fetchParticipantes, fetchParticipantesUnificados, deleteParticipante, updateParticipante } from '../services/participanteService';
import { fetchPromocoes } from '../services/promocaoService';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { auditHelpers } from '../services/auditService';
import ExcelJS from 'exceljs';

const ParticipantesPage = () => {
  const { showToast } = useToast();
  const { 
    canViewParticipants, 
    canExportData, 
    canDeletePromotion,
    userRole 
  } = useAuth();
  
  const [participantes, setParticipantes] = useState([]);
  const [promocoes, setPromocoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterPromocao, setFilterPromocao] = useState('todas');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [participanteToDelete, setParticipanteToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [participanteToEdit, setParticipanteToEdit] = useState(null);
  const [includeCaixaMisteriosa, setIncludeCaixaMisteriosa] = useState(true); // Toggle para incluir participantes públicos
  const [participantStats, setParticipantStats] = useState({ total: 0, regular: 0, public: 0 }); // Estatísticas por tipo
  const [currentPage, setCurrentPage] = useState(1); // Página atual da paginação
  const ITEMS_PER_PAGE = 50; // Limite de 50 registros por página

  // Buscar participantes e promoções ao carregar o componente
  useEffect(() => {
    let isMounted = true; // Flag para evitar setState após unmount

    const loadData = async () => {
      try {
        setLoading(true);

        // Buscar participantes com base no toggle da Caixa Misteriosa
        const [participantesResult, promocoesData] = await Promise.all([
          includeCaixaMisteriosa
            ? fetchParticipantesUnificados(true)
            : fetchParticipantes().then(data => ({ data, stats: { total: data.length, regular: data.length, public: 0 } })),
          fetchPromocoes()
        ]);

        if (!isMounted) return; // Cancelar se componente foi desmontado

        const participantesData = participantesResult.data || [];

        // Ajustar os nomes dos campos para corresponder ao frontend
        const formattedParticipantes = participantesData.map(participante => ({
          id: participante.id,
          nome: participante.name || participante.nome,
          telefone: participante.phone || participante.telefone,
          bairro: participante.neighborhood || participante.bairro,
          cidade: participante.city || participante.cidade,
          email: participante.email,
          latitude: participante.latitude,
          longitude: participante.longitude,
          promocao_id: participante.promocao_id,
          promocao: participante.promocao_nome || participante.promocao || 'Caixa Misteriosa',
          dataParticipacao: participante.created_at || participante.participou_em || participante.data_participacao,
          participant_type: participante.participant_type || 'regular',
          referral_code: participante.referral_code || null,
          extra_guesses: participante.extra_guesses || 0,
          total_submissions: participante.total_submissions || 0,
          correct_guesses: participante.correct_guesses || 0
        }));

        setParticipantes(formattedParticipantes);
        setParticipantStats(participantesResult.stats || { total: formattedParticipantes.length, regular: formattedParticipantes.length, public: 0 });
        setPromocoes(promocoesData);

        console.log('✅ Participantes carregados:', {
          total: formattedParticipantes.length,
          stats: participantesResult.stats
        });
      } catch (err) {
        if (!isMounted) return; // Cancelar se componente foi desmontado
        setError('Falha ao carregar dados');
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Cleanup function para evitar setState em componente desmontado
    return () => {
      isMounted = false;
    };
  }, [includeCaixaMisteriosa]); // Recarregar quando toggle mudar

  // Função para filtrar participantes
  const filteredParticipantes = useMemo(() => {
    return participantes.filter(participante => {
      // Filtro por texto (nome, telefone, bairro, cidade)
      const matchesSearch =
        !searchText ||
        participante.nome.toLowerCase().includes(searchText.toLowerCase()) ||
        participante.telefone.toLowerCase().includes(searchText.toLowerCase()) ||
        participante.bairro.toLowerCase().includes(searchText.toLowerCase()) ||
        participante.cidade.toLowerCase().includes(searchText.toLowerCase());

      // Filtro por promoção
      const matchesPromocao =
        filterPromocao === 'todas' ||
        participante.promocao === filterPromocao;

      return matchesSearch && matchesPromocao;
    });
  }, [participantes, searchText, filterPromocao]);

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
  }, [searchText, filterPromocao, includeCaixaMisteriosa]);

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

  const handleDeleteParticipante = (participanteId) => {
    const participante = participantes.find(p => p.id === participanteId);
    setParticipanteToDelete({ id: participanteId, nome: participante?.nome || 'este participante' });
    setShowConfirmModal(true);
  };

  const confirmDeleteParticipante = async () => {
    if (!participanteToDelete) return;
    
    try {
      await deleteParticipante(participanteToDelete.id);
      // Atualizar a lista local após exclusão bem-sucedida
      setParticipantes(prev => prev.filter(p => p.id !== participanteToDelete.id));
      showToast('Participante excluído com sucesso!', 'success');
    } catch (err) {
      showToast('Falha ao excluir participante: ' + err.message, 'error');
      console.error(err);
    } finally {
      setShowConfirmModal(false);
      setParticipanteToDelete(null);
    }
  };

  const handleEditParticipante = (participante) => {
    setParticipanteToEdit(participante);
    setShowEditModal(true);
  };

  const handleSaveParticipante = async (updatedData) => {
    try {
      await updateParticipante(updatedData.id, updatedData);
      
      // Atualizar a lista local
      setParticipantes(prev => prev.map(p => 
        p.id === updatedData.id 
          ? { ...p, ...updatedData }
          : p
      ));
      
      setShowEditModal(false);
      setParticipanteToEdit(null);
      showToast('Participante atualizado com sucesso!', 'success');
    } catch (error) {
      showToast('Falha ao atualizar participante: ' + error.message, 'error');
      throw error; // Para o modal saber que houve erro
    }
  };

  const handleExportData = async () => {
    try {
      console.log('Iniciando exportação de dados');
      console.log('Número de participantes filtrados:', filteredParticipantes.length);
      console.log('Primeiros 3 participantes:', filteredParticipantes.slice(0, 3));
      
      // Preparar os dados para exportação
      const exportData = filteredParticipantes.map(participante => ({
        'Nome': participante.nome,
        'Telefone': participante.telefone,
        'Bairro': participante.bairro,
        'Cidade': participante.cidade,
        'Promoção': participante.promocao,
        'Data de Participação': participante.dataParticipacao && !isNaN(new Date(participante.dataParticipacao)) 
          ? new Date(participante.dataParticipacao).toLocaleDateString('pt-BR')
          : 'Data inválida'
      }));
      
      console.log('Dados preparados para exportação:', exportData.slice(0, 3));

      // Criar workbook com ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Participantes');
      
      // Definir colunas com larguras
      worksheet.columns = [
        { header: 'Nome', key: 'Nome', width: 20 },
        { header: 'Telefone', key: 'Telefone', width: 15 },
        { header: 'Bairro', key: 'Bairro', width: 15 },
        { header: 'Cidade', key: 'Cidade', width: 15 },
        { header: 'Promoção', key: 'Promoção', width: 20 },
        { header: 'Data de Participação', key: 'Data de Participação', width: 15 }
      ];
      
      // Adicionar dados
      worksheet.addRows(exportData);
      
      // Estilizar cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      console.log('Workbook criado, iniciando exportação para arquivo');
      
      // Exportar como arquivo Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'participantes_export.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Arquivo exportado com sucesso');

      // Log de auditoria para exportação de dados
      try {
        auditHelpers.exportData('excel', { count: filteredParticipantes.length });
        console.log('🔐 Exportação de dados auditada');
      } catch (auditError) {
        console.warn('⚠️ Erro no log de auditoria (exportação):', auditError);
      }

      showToast('Dados exportados com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      showToast('Falha ao exportar dados: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <>
        <Header 
          title="Gerenciar Participantes" 
          subtitle="Visualize e gerencie os participantes das promoções"
        />
        <div className="participantes-content">
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
          title="Gerenciar Participantes" 
          subtitle="Visualize e gerencie os participantes das promoções"
        />
        <div className="participantes-content">
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
        title="Gerenciar Participantes" 
        subtitle="Visualize e gerencie os participantes das promoções"
      />
      
      <div className="participantes-content">
        {/* Estatísticas */}
        <div className="grid grid-3" style={{ gap: '16px', marginBottom: '24px' }}>
          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {participantStats.total}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Total de Participantes
            </p>
          </div>

          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {participantStats.regular}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Participantes Regulares
            </p>
          </div>

          <div className="card-modern" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 4px 0'
            }}>
              {participantStats.public}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Caixa Misteriosa
            </p>
          </div>
        </div>

        {/* Barra de Ações */}
        <div className="actions-bar">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Buscar participantes..." 
              className="search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="filter-box">
            <select 
              className="filter-select"
              value={filterPromocao}
              onChange={(e) => setFilterPromocao(e.target.value)}
            >
              <option value="todas">Todas as promoções</option>
              {[...new Set(promocoes.map(p => p.nome))].map(promocao => (
                <option key={promocao} value={promocao}>{promocao}</option>
              ))}
            </select>
          </div>
          
          {canExportData() && (
            <button className="btn-primary" onClick={handleExportData}>
              <span className="btn-icon">📥</span>
              Exportar Dados
            </button>
          )}

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
          title="Incluir participantes da Caixa Misteriosa"
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

        {/* Tabela de Participantes */}
        <div className="table-container">
          <table className="participantes-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Bairro</th>
                <th>Cidade</th>
                <th>Promoção</th>
                <th>Tipo</th>
                <th>Data de Participação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedParticipantes.length > 0 ? (
                paginatedParticipantes.map(participante => (
                  <tr key={participante.id}>
                    <td>{participante.nome}</td>
                    <td>{participante.telefone}</td>
                    <td>{participante.bairro}</td>
                    <td>{participante.cidade}</td>
                    <td>{participante.promocao}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: participante.participant_type === 'public'
                          ? 'rgba(139, 92, 246, 0.1)'
                          : 'rgba(59, 130, 246, 0.1)',
                        color: participante.participant_type === 'public'
                          ? '#8b5cf6'
                          : '#3b82f6',
                        border: `1px solid ${participante.participant_type === 'public' ? '#8b5cf6' : '#3b82f6'}`
                      }}>
                        {participante.participant_type === 'public' ? '📦 Caixa Misteriosa' : '🎯 Regular'}
                      </span>
                    </td>
                    <td>{
                      participante.dataParticipacao && !isNaN(new Date(participante.dataParticipacao))
                        ? new Date(participante.dataParticipacao).toLocaleDateString('pt-BR')
                        : 'Data inválida'
                    }</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon-small"
                          onClick={() => handleEditParticipante(participante)}
                          title="Editar"
                          style={{ marginRight: '8px' }}
                        >
                          <span className="icon">✏️</span>
                        </button>
                        {canDeletePromotion() && (
                          <button 
                            className="btn-icon-small"
                            onClick={() => handleDeleteParticipante(participante.id)}
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
                      <p>Nenhum participante encontrado</p>
                      <p className="empty-subtitle">
                        {searchText || filterPromocao !== 'todas' 
                          ? 'Tente ajustar seus filtros de busca.' 
                          : 'Os participantes aparecerão aqui quando se inscreverem nas promoções.'}
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
      </div>

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDeleteParticipante}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o participante "${participanteToDelete?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {/* Modal de Edição */}
      <EditParticipanteModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setParticipanteToEdit(null);
        }}
        participante={participanteToEdit}
        promocoes={promocoes}
        onSave={handleSaveParticipante}
      />
    </>
  );
};

export default ParticipantesPage;