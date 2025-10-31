import React from 'react';

// Componente para exibir uma mensagem de erro centralizada.
const ErrorDisplay = ({ message = 'Ocorreu um erro inesperado.' }) => {
    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '80vh',
        padding: '2rem',
        color: '#FCA5A5', // vermelho claro
        backgroundColor: '#1F2937', // cinza escuro
        border: '1px solid #374151',
        borderRadius: '0.75rem',
        textAlign: 'center',
    };

    return (
        <div style={containerStyle}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F87171' }}>Oops! Algo deu errado.</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{message}</p>
        </div>
    );
};

export default ErrorDisplay;
