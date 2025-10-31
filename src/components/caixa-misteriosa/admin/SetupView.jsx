import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';

// Função para dar sugestões úteis nas dicas
const getDicaPlaceholder = (index) => {
    const placeholders = [
        'Categoria geral do produto (ex: eletrônico, vestuário, alimentício...)',
        'Características físicas (ex: tamanho, cor, material...)',
        'Para que serve ou como é usado',
        'Marca ou empresa fabricante',
        'Modelo específico ou detalhes únicos'
    ];
    return placeholders[index] || 'Detalhe específico do produto';
};

// Visão de Configuração do Jogo (Gerenciar Patrocinadores e Produtos)
const SetupView = ({
    actions,
    loading,
    lastFinishedGame, // Recebendo a nova prop
    editingSponsor,
    editingProduct,
    setEditingSponsor,
    setEditingProduct,
    onFinishEditing
}) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { currentThemeData } = useTheme();

    const [sponsors, setSponsors] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedSponsor, setSelectedSponsor] = useState(null);
    const [customPrompt, setCustomPrompt] = useState(''); // prompt editável para geração de dicas

    const loadingProductsRef = useRef(false);

    // Estilos com tema dinâmico
    const styles = {
        h2: {
            fontSize: '1.5rem',
            fontWeight: '600',
            color: currentThemeData.primary,
            borderBottom: `2px solid ${currentThemeData.primary}`,
            paddingBottom: '0.5rem'
        },
        h3: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: currentThemeData.primary,
            marginBottom: '1rem'
        },
        listContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '1rem'
        },
        listItem: (isSelected) => ({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: currentThemeData.surface,
            padding: '1rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            border: isSelected ? `2px solid ${currentThemeData.primary}` : `1px solid ${currentThemeData.border}`,
            color: currentThemeData.text,
            boxShadow: isSelected ? `0 0 0 3px ${currentThemeData.secondary}` : 'none'
        }),
        button: {
            primary: {
                background: currentThemeData.gradient,
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: `0 2px 4px ${currentThemeData.primary}33`,
                transition: 'all 0.2s ease'
            },
            secondary: {
                background: currentThemeData.secondary,
                color: currentThemeData.text,
                border: `1px solid ${currentThemeData.border}`,
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease'
            },
            danger: {
                background: currentThemeData.danger,
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: `0 2px 4px ${currentThemeData.danger}33`,
                transition: 'all 0.2s ease'
            },
        },
        input: {
            width: '100%',
            background: currentThemeData.surface,
            border: `1px solid ${currentThemeData.border}`,
            borderRadius: '0.5rem',
            padding: '0.75rem',
            color: currentThemeData.text,
            boxSizing: 'border-box',
            fontSize: '0.95rem',
            transition: 'border-color 0.2s ease'
        }
    };

    const handleUnauthorized = useCallback(() => {
        alert('⚠️ Sua sessão expirou. Por favor, faça login novamente.');
        logout();
        navigate('/login');
    }, [logout, navigate]);

    useEffect(() => {
        if (editingProduct) {
            setCustomPrompt('');
        }
    }, [editingProduct?.id]);

    const saveSponsorsToStorage = useCallback((sponsorsData) => {
        try {
            localStorage.setItem('caixaMisteriosa_sponsors', JSON.stringify(sponsorsData));
            console.log('💾 Patrocinadores salvos no localStorage');
        } catch (error) {
            console.error('❌ Erro ao salvar patrocinadores:', error);
        }
    }, []);

    const loadSponsorsFromStorage = useCallback(() => {
        try {
            const saved = localStorage.getItem('caixaMisteriosa_sponsors');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('❌ Erro ao carregar patrocinadores:', error);
            return null;
        }
    }, []);

    const saveProductsToStorage = useCallback((productsData, sponsorId) => {
        try {
            localStorage.setItem(`caixaMisteriosa_products_${sponsorId}`, JSON.stringify(productsData));
            console.log('💾 Produtos salvos no localStorage para patrocinador', sponsorId);
        } catch (error) {
            console.error('❌ Erro ao salvar produtos:', error);
        }
    }, []);

    const loadProductsFromStorage = useCallback((sponsorId) => {
        try {
            const saved = localStorage.getItem(`caixaMisteriosa_products_${sponsorId}`);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            return null;
        }
    }, []);

    const loadSponsors = useCallback(async () => {
        console.log('🔄 SetupView: Carregando patrocinadores...');
        const savedSponsors = loadSponsorsFromStorage();
        if (savedSponsors && savedSponsors.length > 0) {
            console.log('📂 Patrocinadores carregados do localStorage');
            setSponsors(savedSponsors);
            return;
        }
        const sponsorData = await actions.fetchSponsors();
        if(sponsorData) {
            setSponsors(sponsorData);
            saveSponsorsToStorage(sponsorData);
        }
    }, [actions.fetchSponsors, loadSponsorsFromStorage, saveSponsorsToStorage]);

    useEffect(() => {
        loadSponsors();
    }, []);

    const loadProducts = useCallback(async (sponsorId) => {
        if (loadingProductsRef.current) {
            console.log('⚠️ SetupView: Load de produtos já em andamento, pulando...');
            return;
        }
        loadingProductsRef.current = true;
        console.log('🔄 SetupView: Carregando produtos para patrocinador', sponsorId);
        try {
            try {
                const productData = await actions.fetchProductsBySponsor(sponsorId);
                if (productData && productData.length > 0) {
                    console.log('✅ Produtos carregados do BANCO para patrocinador', sponsorId, ':', productData.length);
                    setProducts(productData);
                    saveProductsToStorage(productData, sponsorId);
                    return;
                }
            } catch (error) {
                console.error('❌ Erro ao carregar produtos do banco:', error);
            }
            const savedProducts = loadProductsFromStorage(sponsorId);
            if (savedProducts && savedProducts.length > 0) {
                console.log('📂 Fallback: Produtos carregados do localStorage para patrocinador', sponsorId);
                setProducts(savedProducts);
            } else {
                console.log('⚠️ Nenhum produto encontrado para este patrocinador');
                setProducts([]);
            }
        } finally {
            setTimeout(() => {
                loadingProductsRef.current = false;
            }, 100);
        }
    }, [actions.fetchProductsBySponsor, loadProductsFromStorage, saveProductsToStorage]);

    useEffect(() => {
        if (selectedSponsor) {
            loadProducts(selectedSponsor.id);
        } else {
            setProducts([]);
        }
    }, [selectedSponsor, loadProducts]);

    const handleStartGame = (productId) => {
        const id = typeof productId === 'string' ? parseInt(productId, 10) : productId;
        const product = products.find(p => p.id === id);
        if (!product) {
            alert('Produto não encontrado!');
            return;
        }
        if (!product.clues || product.clues.length < 5) {
            alert('Este produto não tem 5 dicas completas. Por favor, complete as dicas antes de iniciar o jogo.');
            return;
        }
        const sponsor = sponsors.find(s => s.id === product.sponsor_id);
        const confirmMessage = `Iniciar jogo com:\n\nPatrocinador: ${sponsor?.name || 'Desconhecido'}\nProduto: ${product.name}\n\nTem certeza?`;
        if (window.confirm(confirmMessage)) {
            const gameData = {
                productId: product.id,
                productName: product.name,
                sponsorName: sponsor?.name || 'Patrocinador',
                clues: product.clues
            };
            console.log('🎮 Iniciando jogo com dados:', gameData);
            actions.startGame(id);
        }
    };

    const handleGenerateClues = async () => {
        if (!editingProduct || !editingProduct.name) {
            alert('Por favor, insira um nome para o produto primeiro.');
            return;
        }
        const hasExistingClues = editingProduct.clues?.some(clue => clue && clue.trim().length > 0);
        if (hasExistingClues) {
            const confirmRegenerate = window.confirm(
                '⚠️ Já existem dicas preenchidas!\n\n' +
                'Gerar novas dicas vai SOBRESCREVER as dicas atuais.\n\n' +
                'Deseja continuar e gerar novas dicas?'
            );
            if (!confirmRegenerate) {
                return;
            }
        }
        const contextoAdicional = customPrompt?.trim() || null;
        console.log('🤖 Gerando dicas com IA para:', editingProduct.name);
        if (contextoAdicional) {
            console.log('📝 Contexto adicional fornecido:', contextoAdicional.substring(0, 100) + '...');
        } else {
            console.log('📝 Usando apenas prompt padrão do backend');
        }
        try {
            const result = await actions.generateClues(editingProduct.name, contextoAdicional);
            if (result && result.success === false) {
                console.error('❌ API retornou erro:', result);
                alert(
                    `❌ ${result.message || 'Erro ao gerar dicas'}\n\n` +
                    `Por favor, preencha as dicas manualmente ou tente novamente mais tarde.`
                );
                return;
            }
            if (result && result.clues && result.clues.length === 5) {
                console.log('✅ Dicas recebidas da IA:', result.clues);
                setEditingProduct(p => ({ ...p, clues: result.clues }));
                alert('✅ Dicas geradas com sucesso! Revise e ajuste se necessário.');
            } else {
                console.error('❌ Resultado inválido da IA:', result);
                alert(
                    '❌ Erro: Resposta inválida da IA.\n\n' +
                    'Por favor, preencha as dicas manualmente.'
                );
            }
        } catch (error) {
            console.error('❌ Erro ao gerar dicas:', error);
            alert(
                '❌ Erro ao gerar dicas:\n\n' +
                (error.message || 'Erro desconhecido') + '\n\n' +
                'Por favor, preencha as dicas manualmente ou tente novamente mais tarde.'
            );
        }
    };

    const handleSaveSponsor = async () => {
        if (!editingSponsor || !editingSponsor.name) {
            alert('Por favor, insira um nome para o patrocinador.');
            return;
        }
        try {
            const { id, name, logo_url, facebook_url, instagram_url, whatsapp, address } = editingSponsor;
            let result;
            if (id) {
                result = await actions.updateSponsor(id, name, logo_url, facebook_url, instagram_url, whatsapp, address);
            } else {
                result = await actions.createSponsor(name, logo_url, facebook_url, instagram_url, whatsapp, address);
            }
            if (result && result.success) {
                alert('Patrocinador salvo com sucesso!');
                onFinishEditing(); // Usa a função do pai
                await loadSponsors();
            } else {
                alert('Erro ao salvar patrocinador: ' + (result?.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('❌ Erro ao salvar patrocinador:', error);
            alert('Erro ao salvar patrocinador: ' + error.message);
        }
    };

    const handleDeleteSponsor = (sponsorId) => {
        if (window.confirm('Tem certeza que deseja excluir este patrocinador? Todos os produtos associados também serão removidos.')) {
            const updatedSponsors = sponsors.filter(s => s.id !== sponsorId);
            setSponsors(updatedSponsors);
            saveSponsorsToStorage(updatedSponsors);
            localStorage.removeItem(`caixaMisteriosa_products_${sponsorId}`);
            if (selectedSponsor?.id === sponsorId) {
                setSelectedSponsor(null);
                setProducts([]);
            }
        }
    };

    const handleSaveProduct = async () => {
        if (!editingProduct || !editingProduct.name) {
            alert('Por favor, insira um nome para o produto.');
            return;
        }
        if (!selectedSponsor && !editingProduct.sponsor_id) {
            alert('Selecione um patrocinador primeiro.');
            return;
        }
        const clues = Array.isArray(editingProduct.clues) ? editingProduct.clues : Array(5).fill('');
        const validClues = clues.filter(clue => clue && clue.trim().length > 0);
        if (validClues.length < 5) {
            alert('Por favor, preencha todas as 5 dicas para o produto.');
            return;
        }
        const isEditing = editingProduct.id !== undefined && editingProduct.id !== null;
        try {
            let result;
            const sponsorId = selectedSponsor?.id || editingProduct.sponsor_id;
            if (isEditing) {
                console.log('📝 Atualizando produto existente ID:', editingProduct.id);
                result = await actions.updateProduct(editingProduct.id, editingProduct.name, clues);
            } else {
                console.log('➕ Criando novo produto');
                result = await actions.createProduct(sponsorId, editingProduct.name, clues);
            }
            if (result && result.success) {
                console.log(`✅ Produto ${isEditing ? 'atualizado' : 'salvo'} no banco:`, result.product);
                await loadProducts(sponsorId);
                onFinishEditing(); // Usa a função do pai
                alert(`✅ Produto ${isEditing ? 'atualizado' : 'salvo'} com sucesso no banco de dados!`);
            } else {
                throw new Error(result?.message || `Erro ao ${isEditing ? 'atualizar' : 'salvar'} produto`);
            }
        } catch (error) {
            console.error(`❌ Erro ao ${isEditing ? 'atualizar' : 'salvar'} produto:`, error);
            alert(`❌ Erro ao ${isEditing ? 'atualizar' : 'salvar'} produto: ${error.message || error}`);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    handleUnauthorized();
                    return;
                }
                const response = await fetch(`/api/caixa-misteriosa/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const data = await response.json();
                if (data.success) {
                    const updatedProducts = products.filter(p => p.id !== productId);
                    setProducts(updatedProducts);
                    if (selectedSponsor) {
                        saveProductsToStorage(updatedProducts, selectedSponsor.id);
                    }
                    alert('✅ Produto excluído com sucesso!');
                } else {
                    alert(`❌ Erro ao excluir: ${data.message}`);
                }
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
                alert(`❌ Erro ao excluir produto: ${error.message}`);
            }
        }
    };

    return (
        <div>
            {/* Formulários de edição aparecem no topo se ativos */}
            {editingSponsor && (
                <div style={{
                    marginBottom: '2rem',
                    background: '#FFFFFF',
                    padding: '2rem',
                    borderRadius: '0.75rem',
                    border: `2px solid ${currentThemeData.secondary}`,
                    boxShadow: '0 2px 8px rgba(26, 115, 232, 0.1)'
                }}>
                    <h3 style={styles.h3}>{editingSponsor.id ? 'Editar Patrocinador' : 'Novo Patrocinador'}</h3>
                    <input
                        type="text"
                        placeholder="Nome do Patrocinador *"
                        value={editingSponsor.name || ''}
                        onChange={e => setEditingSponsor({...editingSponsor, name: e.target.value})}
                        style={styles.input}
                    />
                    <input
                        type="url"
                        placeholder="URL da Logo/Marca (ex: https://exemplo.com/logo.png)"
                        value={editingSponsor.logo_url || ''}
                        onChange={e => setEditingSponsor({...editingSponsor, logo_url: e.target.value})}
                        style={{...styles.input, marginTop: '1rem'}}
                    />
                    <input
                        type="url"
                        placeholder="URL do Facebook (ex: https://facebook.com/sua-pagina)"
                        value={editingSponsor.facebook_url || ''}
                        onChange={e => setEditingSponsor({...editingSponsor, facebook_url: e.target.value})}
                        style={{...styles.input, marginTop: '1rem'}}
                    />
                    <input
                        type="url"
                        placeholder="URL do Instagram (ex: https://instagram.com/seu-perfil)"
                        value={editingSponsor.instagram_url || ''}
                        onChange={e => setEditingSponsor({...editingSponsor, instagram_url: e.target.value})}
                        style={{...styles.input, marginTop: '1rem'}}
                    />
                    <input
                        type="tel"
                        placeholder="WhatsApp (ex: 5569999999999)"
                        value={editingSponsor.whatsapp || ''}
                        onChange={e => setEditingSponsor({...editingSponsor, whatsapp: e.target.value})}
                        style={{...styles.input, marginTop: '1rem'}}
                    />
                    <textarea
                        placeholder="Endereço completo (ex: Rua Exemplo, 123 - Centro, Cacoal - RO)"
                        value={editingSponsor.address || ''}
                        onChange={e => setEditingSponsor({...editingSponsor, address: e.target.value})}
                        style={{...styles.input, marginTop: '1rem', minHeight: '60px', resize: 'vertical'}}
                    />
                    <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                        <button onClick={handleSaveSponsor} style={styles.button.primary} disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar Patrocinador'}
                        </button>
                        <button onClick={onFinishEditing} style={styles.button.secondary}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {editingProduct && (
                <div style={{
                    marginTop: '2rem',
                    background: '#FFFFFF',
                    padding: '2rem',
                    borderRadius: '0.75rem',
                    border: `2px solid ${currentThemeData.secondary}`,
                    boxShadow: '0 2px 8px rgba(26, 115, 232, 0.1)'
                }}>
                    <h3 style={styles.h3}>{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <input
                        type="text"
                        placeholder="Nome do Produto"
                        value={editingProduct.name}
                        onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                        style={styles.input}
                    />
                    <h4 style={{marginTop: '1rem', color: currentThemeData.primary}}>🎯 Dicas para o Produto (todas obrigatórias):</h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem'}}>
                        {(Array.isArray(editingProduct.clues) ? editingProduct.clues : Array(5).fill('')).map((clue, index) => (
                            <input
                                key={index}
                                type="text"
                                placeholder={`Dica ${index + 1}: ${getDicaPlaceholder(index)}`}
                                value={clue || ''}
                                onChange={e => {
                                    const newClues = [...(editingProduct.clues || Array(5).fill(''))];
                                    newClues[index] = e.target.value;
                                    setEditingProduct({...editingProduct, clues: newClues});
                                }}
                                style={{
                                    ...styles.input,
                                    background: clue ? currentThemeData.secondary : '#FFFFFF',
                                    border: clue ? `2px solid ${currentThemeData.primary}` : '1px solid #E5E7EB'
                                }}
                            />
                        ))}
                    </div>
                    <div style={{marginTop: '1.5rem'}}>
                        <button onClick={handleGenerateClues} style={styles.button.secondary} disabled={loading}>{loading ? 'Gerando...' : '🤖 Gerar Dicas com IA'}</button>
                        <div style={{marginTop: '1rem'}}>
                            <label style={{display: 'block', color: currentThemeData.primary, marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500'}}>
                                📝 Contexto Adicional (opcional):
                            </label>
                            <textarea
                                value={customPrompt}
                                onChange={e => setCustomPrompt(e.target.value)}
                                placeholder="Adicione informações extras para guiar a IA (ex: 'É um produto premium', 'Popular no nordeste', 'Usado em cozinhas'...)"
                                style={{...styles.input, height: '80px', resize: 'vertical', fontSize: '0.85rem', lineHeight: '1.4'}}
                            />
                            <div style={{fontSize: '0.8rem', color: currentThemeData.textSecondary, marginTop: '0.25rem'}}>
                                💡 Deixe vazio para usar apenas o prompt padrão otimizado. Preencha para adicionar contexto específico.
                            </div>
                        </div>
                        <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                            <button onClick={handleSaveProduct} style={styles.button.primary} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Produto'}</button>
                            <button onClick={onFinishEditing} style={styles.button.secondary}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Seção de Gerenciamento do Jogo (só aparece se não estiver editando) */}
            {!editingSponsor && !editingProduct && (
                <>
                    <div style={{
                        marginBottom: '2rem',
                        background: currentThemeData.secondary,
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: `2px solid ${currentThemeData.primary}`,
                        boxShadow: '0 4px 12px rgba(26, 115, 232, 0.15)'
                    }}>
                        <h2 style={{...styles.h2, borderBottom: 'none', color: currentThemeData.primary, marginBottom: '1rem'}}>🎮 Controle do Jogo</h2>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem'}}>
                            <div>
                                <label style={{display: 'block', color: currentThemeData.primary, marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500'}}>🏢 Patrocinador:</label>
                                <select
                                    value={selectedSponsor?.id || ''}
                                    onChange={e => {
                                        const sponsor = sponsors.find(s => s.id == e.target.value);
                                        setSelectedSponsor(sponsor || null);
                                    }}
                                    style={{...styles.input, cursor: 'pointer'}}
                                >
                                    <option value="">Selecione um patrocinador</option>
                                    {sponsors.map(sponsor => (
                                        <option key={sponsor.id} value={sponsor.id}>{sponsor.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{display: 'block', color: currentThemeData.primary, marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500'}}>📦 Produto:</label>
                                <select
                                    value=""
                                    onChange={e => {
                                        const productId = e.target.value;
                                        if (productId) {
                                            handleStartGame(parseInt(productId, 10));
                                        }
                                    }}
                                    style={{...styles.input, cursor: 'pointer'}}
                                    disabled={!selectedSponsor || products.length === 0}
                                >
                                    <option value="">{!selectedSponsor ? 'Selecione patrocinador primeiro' : products.length === 0 ? 'Nenhum produto disponível' : 'Clique para iniciar jogo'}</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>🚀 {product.name} ({product.clues?.length || 0}/5 dicas)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {lastFinishedGame && lastFinishedGame.winner && (
                        <div style={{
                            marginBottom: '2rem',
                            background: '#FFFFFF',
                            padding: '1.5rem',
                            borderRadius: '0.75rem',
                            border: `2px solid ${currentThemeData.primary}`,
                            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.15)'
                        }}>
                            <h3 style={{...styles.h3, color: currentThemeData.warning}}>🏆 Último Sorteio Finalizado</h3>
                            <p style={{color: currentThemeData.text, marginBottom: '0.25rem'}}>
                                <strong>Ganhador:</strong> {lastFinishedGame.winner.user_name} ({lastFinishedGame.winner.user_neighborhood || 'bairro não informado'})
                            </p>
                            <p style={{color: currentThemeData.text, marginBottom: '0.25rem'}}>
                                <strong>Telefone:</strong> {lastFinishedGame.winner.user_phone}
                            </p>
                            <p style={{color: currentThemeData.text, marginBottom: '1rem'}}>
                                <strong>Palavra Secreta:</strong> {lastFinishedGame.productName}
                            </p>
                            <a
                                href={`/caixa-misteriosa-pub/${lastFinishedGame.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{color: currentThemeData.primary, textDecoration: 'underline', fontWeight: '500'}}
                            >
                                Ver Página do Sorteio &rarr;
                            </a>
                        </div>
                    )}

                    <h2 style={styles.h2}>1. Gerenciar Patrocinadores</h2>
                    <div style={styles.listContainer}>
                        {Array.isArray(sponsors) && sponsors.length > 0 ?
                            sponsors.map(sponsor => (
                                <div key={sponsor.id} style={styles.listItem(selectedSponsor?.id === sponsor.id)}>
                                    <div onClick={() => setSelectedSponsor(sponsor)} style={{flex: 1, cursor: 'pointer'}}>
                                        <strong style={{color: currentThemeData.primary}}>{sponsor.name}</strong>
                                        {sponsor.description && <div style={{color: currentThemeData.textSecondary, fontSize: '0.9rem'}}>{sponsor.description}</div>}
                                    </div>
                                    <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                                        <button
                                            onClick={() => {
                                                setSelectedSponsor(sponsor);
                                                setEditingProduct({ sponsor_id: sponsor.id, name: '', clues: Array(5).fill('') });
                                            }}
                                            style={styles.button.primary}
                                            title="Adicionar produto para este patrocinador"
                                        >
                                            📦 Produto
                                        </button>
                                        <button onClick={() => setEditingSponsor(sponsor)} style={styles.button.secondary}>✏️ Editar</button>
                                        <button onClick={() => handleDeleteSponsor(sponsor.id)} style={styles.button.danger}>🗑️ Excluir</button>
                                    </div>
                                </div>
                            )) : (
                                <div style={{padding: '1rem', color: currentThemeData.textSecondary, textAlign: 'center'}}>
                                    Nenhum patrocinador encontrado. Clique em "Adicionar Patrocinador" para começar.
                                </div>
                            )
                        }
                        <button
                            onClick={() => setEditingSponsor({ name: '', description: '' })}
                            style={{...styles.button.primary, width: '100%', marginTop: '1rem'}}
                        >
                            + Adicionar Novo Patrocinador
                        </button>
                    </div>

                    {selectedSponsor && (
                        <div style={{marginTop: '2rem'}}>
                            <h2 style={styles.h2}>2. Gerenciar Produtos de "{selectedSponsor.name}"</h2>
                            <div style={styles.listContainer}>
                                {Array.isArray(products) && products.length > 0 ?
                                    products.map(product => (
                                        <div key={product.id} style={styles.listItem(false)}>
                                            <span>{product.name} ({product.clues?.length || 0}/5 dicas)</span>
                                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                                <button onClick={() => setEditingProduct(product)} style={styles.button.secondary}>✏️ Editar</button>
                                                <button onClick={() => handleDeleteProduct(product.id)} style={styles.button.danger}>🗑️ Excluir</button>
                                                <button onClick={() => handleStartGame(product.id)} style={styles.button.primary} disabled={product.clues?.length < 5}>▶ Iniciar Jogo</button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{padding: '1rem', color: currentThemeData.textSecondary, textAlign: 'center'}}>
                                            Nenhum produto encontrado para este patrocinador.
                                        </div>
                                    )
                                }
                                <button onClick={() => setEditingProduct({ sponsor_id: selectedSponsor.id, name: '', clues: Array(5).fill('') })} style={{...styles.button.primary, width: '100%'}}>+ Adicionar Novo Produto</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};


export default SetupView;
