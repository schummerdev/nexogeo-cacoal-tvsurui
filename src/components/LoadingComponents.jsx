// LoadingComponents.jsx - Sistema de Loading States Modernos
import React from 'react';

export const LoadingSpinner = ({ size = 'md', color = 'primary', fullScreen = false }) => {
  const sizeMap = { xs: '16px', sm: '24px', md: '32px', lg: '48px', xl: '64px' };
  const colorMap = {
    primary: 'var(--color-primary)', 
    success: 'var(--color-success)', 
    error: 'var(--color-danger)', 
    warning: 'var(--color-warning)'
  };

  const spinner = (
    <div style={{
      display: 'inline-block', 
      position: 'relative', 
      width: sizeMap[size], 
      height: sizeMap[size]
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="spinner-ring" style={{
          position: 'absolute', 
          border: '2px solid transparent', 
          borderRadius: '50%',
          borderTopColor: colorMap[color], 
          animation: `spin ${1.2 - i * 0.1}s linear infinite`,
          width: i === 0 ? '100%' : i === 1 ? '80%' : '60%',
          height: i === 0 ? '100%' : i === 1 ? '80%' : '60%',
          top: i === 0 ? 0 : i === 1 ? '10%' : '20%',
          left: i === 0 ? 0 : i === 1 ? '10%' : '20%',
          opacity: i === 0 ? 1 : i === 1 ? 0.7 : 0.4
        }} />
      ))}
    </div>
  );

  React.useEffect(() => {
    if (!document.getElementById('spinner-animations')) {
      const style = document.createElement('style');
      style.id = 'spinner-animations';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(248, 250, 252, 0.9)', 
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 9998
      }}>
        <div style={{
          textAlign: 'center', 
          background: 'var(--color-surface)', 
          padding: '32px',
          borderRadius: '24px', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
          border: '1px solid var(--color-border)'
        }}>
          {spinner}
          <p style={{ 
            marginTop: '16px', 
            color: 'var(--color-text-secondary)', 
            fontSize: '0.875rem' 
          }}>
            Carregando...
          </p>
        </div>
      </div>
    );
  }
  return spinner;
};

export const SkeletonLine = ({ width = '100%', height = '1rem' }) => (
  <div className="skeleton" style={{ width, height, borderRadius: '8px' }} />
);

export const SkeletonCircle = ({ size = '3rem' }) => (
  <div className="skeleton" style={{ 
    width: size, 
    height: size, 
    borderRadius: '50%'
  }} />
);

export const SkeletonKPI = () => (
  <div className="card" style={{
    padding: '24px',
    display: 'flex', 
    alignItems: 'center', 
    gap: '16px'
  }}>
    <SkeletonCircle size="3.5rem" />
    <div style={{ flex: 1 }}>
      <SkeletonLine width="60%" height="1.5rem" />
      <div style={{ marginBottom: '8px' }} />
      <SkeletonLine width="80%" height="1rem" />
    </div>
  </div>
);

export const SkeletonDashboard = () => (
  <div className="fade-in" style={{ marginTop: '32px' }}>
    <div className="grid grid-4" style={{ marginBottom: '32px' }}>
      {Array.from({ length: 4 }, (_, i) => <SkeletonKPI key={i} />)}
    </div>
    <div className="grid grid-2">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="card" style={{ padding: '24px' }}>
          <SkeletonLine width="40%" height="1.5rem" />
          <div style={{ marginBottom: '16px' }} />
          <div style={{
            width: '100%', 
            height: '200px', 
            borderRadius: '12px'
          }} className="skeleton" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="card">
    <div style={{ padding: '24px' }}>
      <SkeletonLine width="30%" height="1.5rem" />
      <div style={{ marginBottom: '16px' }} />
    </div>
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: 4 }, (_, i) => (
              <th key={i}>
                <SkeletonLine width="80%" height="1rem" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              {Array.from({ length: 4 }, (_, j) => (
                <td key={j}>
                  <SkeletonLine width="70%" height="0.875rem" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Hook para estados de loading
export const useLoading = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);
  
  return { isLoading, startLoading, stopLoading };
};