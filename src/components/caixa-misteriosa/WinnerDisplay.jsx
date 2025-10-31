import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// Tela que exibe o vencedor do sorteio
const WinnerDisplay = ({ winner, productName }) => {
    const { currentThemeData } = useTheme();

    const styles = {
        main: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '100vh',
            padding: '1rem',
            background: currentThemeData.background,
            color: currentThemeData.text,
            overflow: 'hidden',
            position: 'relative'
        },
        card: {
            zIndex: 10,
            animation: 'popup 0.5s ease-out forwards',
            background: currentThemeData.surface,
            padding: '2rem',
            borderRadius: '1rem',
            border: `1px solid ${currentThemeData.border}`,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        },
        winnerBox: {
            background: currentThemeData.secondary,
            padding: '1.5rem',
            borderRadius: '0.75rem',
            marginTop: '2rem',
            display: 'inline-block',
            border: `2px solid ${currentThemeData.primary}`
        }
    };

    const confettiStyles = `
        @keyframes popup {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
        }

        .confetti-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
        .confetti {
            width: 15px; height: 15px; background-color: #f0f; position: absolute; left: 50%;
            animation: confetti-fall 5s linear infinite;
            opacity: 0;
        }
        .confetti:nth-child(1) { background-color: #f0a; left: 10%; animation-delay: 0s; }
        .confetti:nth-child(2) { background-color: #a0f; left: 20%; animation-delay: -0.5s; }
        .confetti:nth-child(3) { background-color: #0af; left: 30%; animation-delay: -1s; }
        .confetti:nth-child(4) { background-color: #0fa; left: 40%; animation-delay: -1.5s; }
        .confetti:nth-child(5) { background-color: #af0; left: 50%; animation-delay: -2s; }
        .confetti:nth-child(6) { background-color: #fa0; left: 60%; animation-delay: -2.5s; }
        .confetti:nth-child(7) { background-color: #f0a; left: 70%; animation-delay: -3s; }
        .confetti:nth-child(8) { background-color: #a0f; left: 80%; animation-delay: -3.5s; }
        .confetti:nth-child(9) { background-color: #0af; left: 90%; animation-delay: -4s; }
        .confetti:nth-child(10){ background-color: #0fa; left: 100%; animation-delay: -4.5s;}

        @keyframes confetti-fall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
    `;

    if (!winner) {
        return (
            <div style={styles.main}>
                <h1 style={{ fontSize: '2.5rem', color: currentThemeData.warning }}>Sorteio Finalizado!</h1>
                <p style={{ color: currentThemeData.text, fontSize: '1.2rem' }}>
                    O prêmio era: <strong>{productName || 'Produto não informado'}</strong>
                </p>
                <p style={{ color: currentThemeData.textSecondary, fontSize: '1.2rem', marginTop: '1rem' }}>Não houve palpites corretos ou o sorteio foi encerrado sem um vencedor.</p>
            </div>
        );
    }

    return (
        <main style={styles.main}>
            {/* Animação de confete (simplificada com CSS) */}
            <div className="confetti-container">
                {[...Array(10)].map((_, i) => <div key={i} className="confetti"></div>)}
            </div>

            <div style={styles.card}>
                <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: currentThemeData.primary }}>Temos um Vencedor!</h1>
                <p style={{ color: currentThemeData.text, fontSize: '1.2rem', marginTop: '0.5rem' }}>
                    O prêmio era: <span style={{ fontWeight: 'bold', color: currentThemeData.primary }}>{productName || 'Produto não informado'}</span>
                </p>

                <div style={styles.winnerBox}>
                    <p style={{ fontSize: '1.5rem', color: currentThemeData.textSecondary }}>Parabéns para</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: currentThemeData.text, marginTop: '0.5rem' }}>
                        {winner.user_name}
                    </p>
                    <p style={{ fontSize: '1rem', color: currentThemeData.textSecondary }}>{winner.user_city} - {winner.user_neighborhood}</p>
                </div>

                <p style={{ marginTop: '2rem', color: currentThemeData.textSecondary }}>Obrigado a todos por participarem!</p>
            </div>

            <style>{confettiStyles}</style>
        </main>
    );
};

export default WinnerDisplay;
