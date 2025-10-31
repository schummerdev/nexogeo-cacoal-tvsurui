import React from 'react';
import { useCaixaMisteriosa } from '../hooks/useCaixaMisteriosa';

// Importa os componentes de UI que criaremos a seguir
import AdminDashboard from '../components/caixa-misteriosa/AdminDashboard';
import ParticipantView from '../components/caixa-misteriosa/ParticipantView';
import WinnerDisplay from '../components/caixa-misteriosa/WinnerDisplay';
import LoadingSpinner from '../components/caixa-misteriosa/shared/LoadingSpinner';
import ErrorDisplay from '../components/caixa-misteriosa/shared/ErrorDisplay';
import WaitingScreen from '../components/caixa-misteriosa/WaitingScreen';

// Importa o contexto real de autenticação
import { useAuth } from '../contexts/AuthContext';

const CaixaMisteriosaPage = () => {
    const { liveGame, lastFinishedGame, loading, error, actions } = useCaixaMisteriosa();
    const { user } = useAuth();

    // Versão corrigida - rotas públicas funcionando
    console.log('🎮 CaixaMisteriosaPage render - loading:', loading, 'liveGame:', !!liveGame, 'error:', error);

    // Fallback para role se não estiver definido
    const userRole = user?.role || 'participant';

    // Exibe um spinner de carregamento baseado no estado loading, não na presença dos dados
    if (loading) {
        return <LoadingSpinner message="Carregando jogo..." />;
    }

    // Exibe uma mensagem de erro se algo falhar
    if (error) {
        return <ErrorDisplay message={error} />;
    }

    // Visão do Administrador - SEMPRE mostra AdminDashboard, mesmo com jogo finalizado
    if (userRole === 'admin') {
        // Se não há jogo ativo, o admin vê o painel de setup.
        // Se há um jogo ativo, ele vê o dashboard de controle.
        // Se o jogo terminou, ele vê o dashboard com opções de reset.
        return <AdminDashboard liveGame={liveGame} lastFinishedGame={lastFinishedGame} actions={actions} loading={loading} />;
    }

    // Se o jogo terminou E o usuário NÃO é admin, mostra o vencedor
    if (liveGame?.status === 'finished') {
        console.log("Status is 'finished'. liveGame object:", JSON.stringify(liveGame, null, 2));
        console.log("Value of liveGame.giveaway:", JSON.stringify(liveGame.giveaway, null, 2));

        // SUPER-DEFENSIVE CHECK: Only render WinnerDisplay if the full data path exists.
        if (liveGame && liveGame.giveaway && liveGame.giveaway.product && typeof liveGame.giveaway.product.name !== 'undefined') {
            return <WinnerDisplay winner={liveGame.winner} productName={liveGame.giveaway.product.name} />;
        }

        // If the data is incomplete, render a fallback or a debug message.
        // This will prevent the crash and show us what the liveGame object actually looks like.
        return (
            <div>
                <h1>Jogo Finalizado - Dados Incompletos</h1>
                <pre>{JSON.stringify(liveGame, null, 2)}</pre>
            </div>
        );
    }

    // Visão do Participante
    if (liveGame && (liveGame.status === 'accepting' || liveGame.status === 'closed')) {
        return <ParticipantView liveGame={liveGame} actions={actions} loading={loading} />;
    }

    // Se nenhuma das condições acima for atendida, o participante vê uma tela de espera.
    return <WaitingScreen />;
};

export default CaixaMisteriosaPage;
