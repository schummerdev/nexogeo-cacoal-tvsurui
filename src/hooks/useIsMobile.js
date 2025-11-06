import { useState, useEffect } from 'react';

// Hook customizado para detectar se a visualização é mobile com base na largura da tela
const useIsMobile = (maxWidth = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Garante que o código só rode no lado do cliente (navegador)
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    
    const handleResize = () => {
      setIsMobile(mediaQuery.matches);
    };

    // Verificação inicial
    handleResize();

    // Adiciona um listener para mudanças no tamanho da tela
    mediaQuery.addEventListener('change', handleResize);

    // Função de limpeza para remover o listener quando o componente for desmontado
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
    };
  }, [maxWidth]);

  return isMobile;
};

export default useIsMobile;
