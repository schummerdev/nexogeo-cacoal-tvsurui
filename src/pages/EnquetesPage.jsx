import React, { useState, useEffect } from 'react';
import Header from '../components/DashboardLayout/Header';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import './EnquetesPage.css';

const EnquetesPage = () => {
    const [enquetes, setEnquetes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();
    const { user } = useAuth();
    const isReadOnly = user?.role === 'viewer';

    // State para edit/create
    const [showNovoModal, setShowNovoModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [novaEnquete, setNovaEnquete] = useState({
        titulo: '',
        pergunta: '',
        cor_tema: 'nexogeo',
        mostrar_votos: true,
        opcoes: [
            { texto: '', cor: '#4F46E5' },
            { texto: '', cor: '#10B981' }
        ]
    });

    // Filtros e Paginação
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState('todas');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const carregarEnquetes = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/?route=enquetes&endpoint=listar');
            if (res.ok) {
                const data = await res.json();
                setEnquetes(data.data || []);
            } else {
                showToast('Erro ao carregar enquetes', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Erro de conexão ao carregar enquetes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarEnquetes();
    }, []);

    const handleCreateEnquete = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;

        // Validar opções vazias
        const opcoesValidas = novaEnquete.opcoes.filter(o => o.texto.trim() !== '');
        if (opcoesValidas.length < 2) {
            showToast('A enquete precisa de no mínimo 2 opções válidas.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...novaEnquete,
                opcoes: opcoesValidas,
                id: editingId // Se for edição, manda o ID
            };

            const endpointUrl = editingId
                ? '/api/?route=enquetes&endpoint=editar'
                : '/api/?route=enquetes&endpoint=criar';

            const res = await fetch(endpointUrl, {
                method: editingId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast(editingId ? 'Enquete atualizada!' : 'Enquete criada com sucesso!', 'success');
                setShowNovoModal(false);
                setEditingId(null);
                // Resetar form
                setNovaEnquete({
                    titulo: '',
                    pergunta: '',
                    cor_tema: 'nexogeo',
                    mostrar_votos: true,
                    opcoes: [
                        { texto: '', cor: '#4F46E5' },
                        { texto: '', cor: '#10B981' }
                    ]
                });
                carregarEnquetes();
            } else {
                const errData = await res.json();
                showToast(errData.message || 'Erro ao criar enquete', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Erro de conexão', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const alterarStatus = async (id, novoStatus) => {
        if (isReadOnly) return;
        try {
            const confirmMsg = novoStatus === 'ativa'
                ? 'Tem certeza que deseja ativar esta enquete? Outras enquetes ativas serão pausadas.'
                : 'Tem certeza que deseja encerrar esta enquete? Ela não receberá mais votos.';

            if (!window.confirm(confirmMsg)) return;

            const res = await fetch('/api/?route=enquetes&endpoint=status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: novoStatus })
            });

            if (res.ok) {
                showToast(`Enquete ${novoStatus === 'ativa' ? 'ativada' : 'encerrada'} com sucesso!`, 'success');
                carregarEnquetes();
            } else {
                showToast('Erro ao atualizar status.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Erro de conexão', 'error');
        }
    };

    const toggleVotos = async (id) => {
        if (isReadOnly) return;
        try {
            const res = await fetch('/api/?route=enquetes&endpoint=toggle_votos', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                showToast('Visibilidade alterada!', 'success');
                carregarEnquetes();
            } else {
                showToast('Erro ao alternar visibilidade', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Erro de conexão', 'error');
        }
    };

    const abrirEditar = async (eq) => {
        setEditingId(eq.id);

        // Precisamos buscar as opções dessa enquete específica se elas não estiverem na lista
        // Como o 'listar' já traz a enquete, mas talvez não as opções separadas (ver backend)
        // O listar atual traz e.*, total_votos. Precisamos das opções para editar.
        // Vou fazer um fetch dos resultados/detalhes
        try {
            const res = await fetch(`/api/?route=enquetes&endpoint=resultados&id=${eq.id}`);
            if (res.ok) {
                const json = await res.json();
                const data = json.data;
                setNovaEnquete({
                    titulo: data.enquete.titulo,
                    pergunta: data.enquete.pergunta,
                    cor_tema: data.enquete.cor_tema || 'nexogeo',
                    mostrar_votos: data.enquete.mostrar_votos !== false,
                    opcoes: data.resultados.map(r => ({ texto: r.texto_opcao, cor: r.cor_grafico, id: r.id }))
                });
                setShowNovoModal(true);
            }
        } catch (err) {
            showToast('Erro ao carregar detalhes para edição', 'error');
        }
    };

    // Helpers do formulário
    const updateOpcao = (index, field, value) => {
        const novasOpcoes = [...novaEnquete.opcoes];
        novasOpcoes[index][field] = value;
        setNovaEnquete({ ...novaEnquete, opcoes: novasOpcoes });
    };

    const addOpcao = () => {
        if (novaEnquete.opcoes.length >= 6) {
            showToast('Máximo de 6 opções permitidas.', 'info');
            return;
        }
        setNovaEnquete({
            ...novaEnquete,
            opcoes: [...novaEnquete.opcoes, { texto: '', cor: '#F59E0B' }]
        });
    };

    const removerOpcao = (index) => {
        if (novaEnquete.opcoes.length <= 2) {
            showToast('Mínimo de 2 opções obrigatório.', 'warning');
            return;
        }
        const novas = novaEnquete.opcoes.filter((_, i) => i !== index);
        setNovaEnquete({ ...novaEnquete, opcoes: novas });
    };

    // Lógica de Filtro e Paginação
    const filteredEnquetes = React.useMemo(() => {
        return enquetes.filter(eq => {
            const matchesSearch = !searchText ||
                (eq.titulo && eq.titulo.toLowerCase().includes(searchText.toLowerCase())) ||
                (eq.pergunta && eq.pergunta.toLowerCase().includes(searchText.toLowerCase()));

            const matchesStatus = filterStatus === 'todas' || eq.status === filterStatus;

            return matchesSearch && matchesStatus;
        }).sort((a, b) => b.id - a.id);
    }, [enquetes, searchText, filterStatus]);

    const paginatedEnquetes = React.useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredEnquetes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredEnquetes, currentPage]);

    const totalPages = Math.ceil(filteredEnquetes.length / ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchText, filterStatus]);

    return (
        <div className="page-container">
            <Header
                title="Gestão de Enquetes (TV)"
                subtitle="Crie enquetes ao vivo para exibir na transmissão"
            />

            <div className="dashboard-content" style={{ padding: '24px' }}>
                {/* Barra de Ações (Busca, Filtro, Novo) */}
                <div className="actions-bar">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Buscar enquetes..."
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
                            <option value="ativa">Ativas</option>
                            <option value="pausada">Pausadas</option>
                            <option value="encerrada">Encerradas</option>
                        </select>
                    </div>

                    {!isReadOnly && (
                        <button className="btn-primary" onClick={() => {
                            setEditingId(null);
                            setNovaEnquete({
                                titulo: '',
                                pergunta: '',
                                cor_tema: 'nexogeo',
                                mostrar_votos: true,
                                opcoes: [
                                    { texto: '', cor: '#4F46E5' },
                                    { texto: '', cor: '#10B981' }
                                ]
                            });
                            setShowNovoModal(true);
                        }}>
                            + Nova Enquete
                        </button>
                    )}
                </div>

                <div className="table-container">

                    {loading ? (
                        <p>Carregando enquetes...</p>
                    ) : enquetes.length === 0 ? (
                        <div className="empty-state p-6 text-center">
                            <p className="text-gray-500 text-lg mb-4">Nenhuma enquete cadastrada.</p>
                            {!isReadOnly && (
                                <button className="btn btn-outline" onClick={() => setShowNovoModal(true)}>
                                    Criar Primeira Enquete
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="promocoes-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Título / Pergunta</th>
                                        <th>Status / Votos TV</th>
                                        <th>Total Votos</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEnquetes.map(eq => (
                                        <tr key={eq.id}>
                                            <td>#{eq.id}</td>
                                            <td>
                                                <strong>{eq.titulo}</strong>
                                                <div className="text-sm text-gray-500">{eq.pergunta}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className={`status-badge status-${eq.status}`}>{eq.status.toUpperCase()}</span>
                                                    {!isReadOnly && (
                                                        <button
                                                            className={`btn-toggle-mini ${eq.mostrar_votos ? 'active' : ''}`}
                                                            onClick={() => toggleVotos(eq.id)}
                                                            title={eq.mostrar_votos ? 'Ocultar contagem na TV' : 'Mostrar contagem na TV'}
                                                        >
                                                            {eq.mostrar_votos ? '👁 Votos On' : '🙈 Votos Off'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{eq.total_votos} votos</td>
                                            <td className="actions-cell">
                                                {eq.status !== 'ativa' && !isReadOnly && (
                                                    <button
                                                        className="btn-action-icon btn-success"
                                                        onClick={() => alterarStatus(eq.id, 'ativa')}
                                                        title={eq.status === 'encerrada' ? 'Reativar Votação' : 'Iniciar Votação'}
                                                    >
                                                        🚀
                                                    </button>
                                                )}
                                                {eq.status === 'ativa' && !isReadOnly && (
                                                    <button
                                                        className="btn-action-icon btn-warning"
                                                        onClick={() => alterarStatus(eq.id, 'encerrada')}
                                                        title="Encerrar Votação"
                                                    >
                                                        🛑
                                                    </button>
                                                )}
                                                <a
                                                    href={`/enquete-broadcast?id=${eq.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn-action-icon btn-outline"
                                                    title="Visualizar Tela da TV (Broadcast)"
                                                >
                                                    📺
                                                </a>
                                                <a
                                                    href={`/votar?promocao=${eq.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn-action-icon btn-outline"
                                                    title="Simular Voto pelo Celular"
                                                >
                                                    📱
                                                </a>
                                                {!isReadOnly && (
                                                    <button
                                                        className="btn-action-icon btn-outline"
                                                        onClick={() => abrirEditar(eq)}
                                                        title="Editar Enquete"
                                                    >
                                                        ✏️
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="pagination" style={{ marginTop: '20px', justifyContent: 'center' }}>
                            <button
                                className="pagination-btn"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                ← Anterior
                            </button>
                            <span className="pagination-info">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                className="pagination-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Próxima →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Criação / Edição */}
            {showNovoModal && (
                <div className="modal-overlay" onClick={() => setShowNovoModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Editar Enquete' : 'Nova Enquete'}</h2>
                            <button className="modal-close" onClick={() => setShowNovoModal(false)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={handleCreateEnquete}>
                                <div className="form-group">
                                    <label>Título (Interno)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Enquete Fim de Ano"
                                        value={novaEnquete.titulo}
                                        onChange={(e) => setNovaEnquete({ ...novaEnquete, titulo: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Pergunta (TV e Celular)</label>
                                    <textarea
                                        placeholder="Qual é a sua cor favorita?"
                                        value={novaEnquete.pergunta}
                                        onChange={(e) => setNovaEnquete({ ...novaEnquete, pergunta: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        id="mostrar_votos"
                                        checked={novaEnquete.mostrar_votos}
                                        onChange={(e) => setNovaEnquete({ ...novaEnquete, mostrar_votos: e.target.checked })}
                                        style={{ width: 'auto', margin: 0 }}
                                    />
                                    <label htmlFor="mostrar_votos" style={{ margin: 0, cursor: 'pointer' }}>Exibir total de votos na tela da TV</label>
                                </div>


                                <div className="form-group">
                                    <label>Opções de Resposta</label>
                                    <p className="text-secondary text-sm mb-3">Adicione no mínimo 2 e no máximo 6 opções</p>

                                    {novaEnquete.opcoes.map((op, idx) => (
                                        <div key={idx} className="opcao-row">
                                            <span style={{ fontWeight: 'bold' }}>{idx + 1}.</span>
                                            <input
                                                style={{ flex: 1 }}
                                                type="text"
                                                placeholder="Texto da opção"
                                                value={op.texto}
                                                onChange={(e) => updateOpcao(idx, 'texto', e.target.value)}
                                                required
                                            />
                                            <input
                                                type="color"
                                                className="color-picker"
                                                value={op.cor}
                                                onChange={(e) => updateOpcao(idx, 'cor', e.target.value)}
                                            />
                                            <button type="button" className="btn-remove" onClick={() => removerOpcao(idx)}>&times;</button>
                                        </div>
                                    ))}

                                    {novaEnquete.opcoes.length < 6 && (
                                        <button type="button" className="btn-secondary mt-3" onClick={addOpcao}>
                                            + Adicionar Opção
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowNovoModal(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleCreateEnquete} disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Enquete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnquetesPage;
