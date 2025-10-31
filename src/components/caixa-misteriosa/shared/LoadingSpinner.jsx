import React from 'react';

// Um componente simples de spinner para indicar carregamento.
// No projeto real, você pode usar uma biblioteca de componentes ou um SVG mais elaborado.
const LoadingSpinner = ({ message = 'Carregando...' }) => {
    const spinnerStyle = {
        border: '4px solid rgba(0, 0, 0, 0.1)',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        borderLeftColor: '#6D28D9', // Cor roxa para combinar com o tema original
        animation: 'spin 1s linear infinite',
    };

    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '80vh',
        color: '#E5E7EB', // cinza claro
        backgroundColor: '#111827', // cinza escuro
    };

    return (
        <div style={containerStyle}>
            <div style={spinnerStyle} />
            <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>{message}</p>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default LoadingSpinner;
