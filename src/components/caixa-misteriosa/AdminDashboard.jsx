import React, { useState } from 'react';
import Header from '../DashboardLayout/Header';

// Importa os sub-componentes
import SetupView from './admin/SetupView';
import LiveControlViewModern from './admin/LiveControlViewModern';
import WinnerDrawView from './admin/WinnerDrawView';
import './AdminDashboard.css';

// Painel de Controle do Administrador
const AdminDashboard = ({ liveGame, lastFinishedGame, actions, loading }) => {
    // Centraliza o estado de edição aqui
    const [editingSponsor, setEditingSponsor] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);

    // Estado para alternar entre view de controle e view de sorteio
    const [showDrawView, setShowDrawView] = useState(false);

    // Funções para entrar no modo de edição, chamadas pelo LiveControlViewModern
    const handleEditSponsor = (sponsor) => setEditingSponsor(sponsor);
    const handleEditProduct = (product) => setEditingProduct(product);

    // Função para sair do modo de edição, chamada pelo SetupView
    const handleFinishEditing = () => {
        setEditingSponsor(null);
        setEditingProduct(null);
        // Atualiza os dados do jogo ao vivo após a edição
        if (liveGame) {
            actions.refreshLiveGame();
        }
    };

    // Determina se estamos em modo de edição
    const isEditing = !!editingSponsor || !!editingProduct;

    // Se não há jogo ativo E não estamos editando, mostra a tela de setup
    const showSetup = !liveGame || liveGame.status === 'pending';

    // Verifica se o jogo está em status que permite sorteio
    const canShowDrawView = liveGame && (liveGame.status === 'closed' || liveGame.status === 'finished');

    return (
        <>
            <Header
                title="Caixa Misteriosa"
                subtitle="Gerencie jogos ao vivo, sorteios e participantes"
            >
                {canShowDrawView && (
                    <button
                        onClick={() => setShowDrawView(!showDrawView)}
                        className="btn btn-primary"
                        style={{marginLeft: '1rem'}}
                    >
                        {showDrawView ? '🎮 Controles' : '🏆 Página de Sorteio'}
                    </button>
                )}
                <a
                    href="/caixa-misteriosa-pub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{marginLeft: '1rem'}}
                >
                    👤 Visão Participante
                </a>
            </Header>

            <div className="caixa-misteriosa-content">
                {/*
                  Lógica de Renderização (PRIORIDADE):
                  1. Se showDrawView = true, SEMPRE mostra WinnerDrawView (mesmo se jogo finalizar)
                  2. Se estiver editando (isEditing = true), mostra SetupView
                  3. Se não houver jogo ativo (showSetup = true), mostra SetupView
                  4. Caso contrário, mostra a tela de controle ao vivo
                */}
                {showDrawView && canShowDrawView ? (
                    <WinnerDrawView
                        liveGame={liveGame}
                        actions={actions}
                        loading={loading}
                    />
                ) : isEditing || showSetup ? (
                    <SetupView
                        actions={actions}
                        loading={loading}
                        lastFinishedGame={lastFinishedGame}
                        editingSponsor={editingSponsor}
                        editingProduct={editingProduct}
                        setEditingSponsor={setEditingSponsor}
                        setEditingProduct={setEditingProduct}
                        onFinishEditing={handleFinishEditing}
                    />
                ) : (
                    <LiveControlViewModern
                        liveGame={liveGame}
                        actions={actions}
                        loading={loading}
                        onEditSponsor={handleEditSponsor}
                        onEditProduct={handleEditProduct}
                    />
                )}
            </div>
        </>
    );
};

export default AdminDashboard;
