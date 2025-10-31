import React, { useEffect, useRef } from 'react';

// Visão de Controle do Jogo Ao Vivo
const LiveControlView = ({ liveGame, actions, loading }) => {

    const { giveaway, revealedCluesCount, status, submissions } = liveGame || {};

    // Auto-refresh a cada 60 segundos
    const intervalRef = useRef(null);

    useEffect(() => {
        // Inicia auto-refresh
        intervalRef.current = setInterval(() => {
            console.log('🔄 Auto-refresh: Atualizando dados do jogo...');
            actions.refreshLiveGame();
        }, 60000); // 60 segundos

        // Cleanup ao desmontar componente
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                console.log('🔄 Auto-refresh desativado');
            }
        };
    }, [actions]);

    // Verificação de segurança para garantir que giveaway existe
    if (!giveaway || !giveaway.product || !giveaway.product.name) {
        console.log('🔍 LiveControlView - liveGame:', liveGame, 'giveaway:', giveaway);
        return (
            <div style={styles.card}>
                <h3 style={styles.h3}>Dados Incompletos</h3>
                <p style={{color: '#F59E0B', marginBottom: '1rem', fontWeight: '500'}}>
                    ⚠️ Os dados do jogo estão incompletos ou em formato antigo. Por favor, recarregue ou reset o jogo.
                </p>
                <button
                    style={styles.button.primary}
                    onClick={() => {
                        // Limpa localStorage e força refetch
                        localStorage.removeItem('caixaMisteriosa_liveGame');
                        window.location.reload();
                    }}
                >
                    Recarregar Dados
                </button>
                <button
                    style={{...styles.button.danger, marginTop: '1rem'}}
                    onClick={() => window.confirm('Tem certeza?') && actions.resetGame()}
                    disabled={loading}
                >
                    Resetar Jogo
                </button>
            </div>
        );
    }

    return (
        <div style={styles.grid}>
            {/* Coluna de Controles */}
            <div style={styles.column}>
                <div style={styles.card}>
                    <h3 style={styles.h3}>Controles do Jogo</h3>
                    <p style={{color: getCSSVar('--color-text') || '#1F2937'}}>
                        Sorteio atual: <strong>{giveaway?.product?.name || 'Produto não informado'}</strong>
                    </p>
                    <p style={{color: getCSSVar('--color-text') || '#1F2937'}}>
                        Status: <span style={styles.status(status)}>{
                            status === 'accepting' ? 'Aceitando Palpites' :
                            status === 'closed' ? 'Encerrado' :
                            status === 'finished' ? 'Finalizado' :
                            status || 'Desconhecido'
                        }</span>
                    </p>

                    {/* Botão para Link Público */}
                    <div style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginTop: '1rem',
                        border: '1px solid #059669'
                    }}>
                        <h4 style={{color: 'white', margin: '0 0 0.5rem 0', fontWeight: '600'}}>🔗 Link Público para Participantes</h4>
                        <p style={{color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem', margin: '0 0 1rem 0'}}>
                            Compartilhe este link com participantes que não têm login:
                        </p>
                        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                            <input
                                type="text"
                                value={`${window.location.origin}/caixa-misteriosa-pub`}
                                readOnly
                                style={{
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '0.25rem',
                                    padding: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.85rem'
                                }}
                            />
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/caixa-misteriosa-pub`;
                                    navigator.clipboard.writeText(url).then(() => {
                                        alert('Link copiado para a área de transferência!');
                                    }).catch(() => {
                                        alert('Erro ao copiar link. URL: ' + url);
                                    });
                                }}
                                style={{
                                    background: 'white',
                                    color: '#10B981',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.25rem',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    fontWeight: '600'
                                }}
                            >
                                📋 Copiar
                            </button>
                        </div>
                    </div>
                    <div style={styles.buttonGroup}>
                        <button 
                            style={styles.button.primary}
                            onClick={actions.revealClue}
                            disabled={loading || (revealedCluesCount || 0) >= 5 || status !== 'accepting'}
                        >
                            {(revealedCluesCount || 0) >= 5 ? 'Todas as dicas reveladas' : `Revelar Dica (${(revealedCluesCount || 0) + 1}/5)`}
                        </button>
                        {status === 'accepting' && (
                            <button 
                                style={styles.button.warning}
                                onClick={actions.endSubmissions}
                                disabled={loading}
                            >
                                Encerrar Palpites
                            </button>
                        )}
                        {status === 'closed' && (
                            <button
                                style={styles.button.success}
                                onClick={actions.drawWinner}
                                disabled={loading || (submissions || []).length === 0}
                            >
                                Sortear Ganhador
                            </button>
                        )}
                        {status === 'finished' && (
                            <div style={{
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                marginTop: '1rem',
                                border: '1px solid #7C3AED'
                            }}>
                                <h4 style={{color: 'white', margin: '0 0 0.5rem 0', fontWeight: '600'}}>🏆 Jogo Finalizado!</h4>
                                {liveGame.winner ? (
                                    <p style={{color: 'rgba(255, 255, 255, 0.95)', margin: '0 0 1rem 0'}}>
                                        Vencedor: <strong>{liveGame.winner.userName}</strong><br/>
                                        Palpite: <strong>{liveGame.winner.guess}</strong>
                                    </p>
                                ) : (
                                    <p style={{color: 'rgba(255, 255, 255, 0.9)', margin: '0 0 1rem 0'}}>Jogo finalizado sem vencedor.</p>
                                )}
                                <button
                                    style={{...styles.button.primary, background: 'white', color: '#8B5CF6', fontWeight: '600'}}
                                    onClick={() => window.confirm('Iniciar um novo jogo? Isso limpará todos os dados atuais.') && actions.resetGame()}
                                    disabled={loading}
                                >
                                    Iniciar Novo Jogo
                                </button>
                            </div>
                        )}
                    </div>
                    <button 
                        style={{...styles.button.danger, marginTop: '1rem'}}
                        onClick={() => window.confirm('Tem certeza?') && actions.resetGame()}
                        disabled={loading}
                    >
                        Resetar Jogo (Emergência)
                    </button>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.h3}>Dicas</h3>
                    <ul style={{listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        {(giveaway?.product?.clues || []).map((clue, i) => (
                            <li key={i} style={styles.clue(i < (revealedCluesCount || 0))}>
                                <strong>Dica {i + 1}:</strong> {clue}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Coluna de Palpites */}
            <div style={styles.column}>
                <div style={styles.card}>
                    <h3 style={styles.h3}>Palpites Recebidos ({(submissions || []).length})</h3>
                    {/* Botão para atualizar palpites */}
                    <button
                        onClick={() => {
                            console.log('🔄 Atualizando dados do jogo...');
                            actions.refreshLiveGame();
                        }}
                        style={{
                            background: getCSSVar('--color-primary') || '#6D28D9',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            marginBottom: '1rem',
                            width: '100%',
                            fontWeight: '500'
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Atualizando...' : '🔄 Atualizar Palpites'}
                    </button>
                    <div style={styles.feedContainer}>
                        {(submissions || []).length > 0 ? (
                            [...(submissions || [])].reverse().map((sub, index) => (
                                <div key={index} style={styles.submissionItem}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <div style={{color: getCSSVar('--color-text') || '#1F2937'}}>
                                            <strong style={{color: getCSSVar('--color-primary') || '#6D28D9'}}>{sub.userName || sub.user_name}:</strong> {sub.guess}
                                            {sub.submissionNumber && (
                                                <span style={{color: getCSSVar('--color-text-secondary') || '#6B7280', fontSize: '0.8rem', marginLeft: '0.5rem'}}>
                                                    (#{sub.submissionNumber})
                                                </span>
                                            )}
                                        </div>
                                        {sub.created_at && (
                                            <small style={{color: getCSSVar('--color-text-secondary') || '#6B7280'}}>
                                                {new Date(sub.created_at).toLocaleString('pt-BR')}
                                            </small>
                                        )}
                                    </div>
                                    {sub.phone && (
                                        <div style={{color: getCSSVar('--color-text-secondary') || '#6B7280', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                                            📱 {sub.phone} • {sub.neighborhood}, {sub.city}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{textAlign: 'center', color: getCSSVar('--color-text-secondary') || '#6B7280', padding: '2rem'}}>
                                <p>Aguardando o primeiro palpite...</p>
                                <p style={{fontSize: '0.9rem', marginTop: '1rem'}}>
                                    📝 Os palpites aparecerão aqui conforme forem enviados pelos participantes.
                                </p>
                                <p style={{fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8}}>
                                    Dica: Clique em "Atualizar Palpites" para verificar novos envios.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper para obter variáveis CSS
const getCSSVar = (varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

// Estilos usando variáveis CSS para adaptar ao tema
const styles = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' },
    column: { display: 'flex', flexDirection: 'column', gap: '2rem' },
    card: {
        background: getCSSVar('--color-surface') || '#FFFFFF',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: `1px solid ${getCSSVar('--color-border') || '#E5E7EB'}`
    },
    h3: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: getCSSVar('--color-text') || '#1F2937',
        marginBottom: '1rem'
    },
    status: (status) => ({
        fontWeight: 'bold',
        color: status === 'accepting' ? '#34D399' :
               status === 'closed' ? '#F59E0B' :
               status === 'finished' ? '#8B5CF6' : getCSSVar('--color-text-secondary') || '#6B7280'
    }),
    buttonGroup: { display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' },
    button: {
        primary: { background: getCSSVar('--color-primary') || '#6D28D9', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' },
        warning: { background: '#F59E0B', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' },
        success: { background: '#10B981', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' },
        danger: { background: '#EF4444', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' },
    },
    clue: (isRevealed) => ({
        padding: '0.75rem', borderRadius: '0.5rem',
        background: isRevealed ? (getCSSVar('--color-background-light') || '#F3F4F6') : (getCSSVar('--color-background') || '#FFFFFF'),
        color: isRevealed ? (getCSSVar('--color-text') || '#1F2937') : (getCSSVar('--color-text-secondary') || '#6B7280'),
        border: `1px solid ${getCSSVar('--color-border') || '#E5E7EB'}`,
        transition: 'all 0.3s'
    }),
    feedContainer: {
        height: '400px',
        overflowY: 'auto',
        background: getCSSVar('--color-background') || '#F9FAFB',
        padding: '1rem',
        borderRadius: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        border: `1px solid ${getCSSVar('--color-border') || '#E5E7EB'}`
    },
    submissionItem: {
        background: getCSSVar('--color-surface') || '#FFFFFF',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: `1px solid ${getCSSVar('--color-border') || '#E5E7EB'}`
    }
};

export default LiveControlView;
