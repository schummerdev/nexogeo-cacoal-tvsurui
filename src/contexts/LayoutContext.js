import React, { createContext, useState, useContext } from 'react';

// 1. Criar o Contexto
const LayoutContext = createContext();

// 2. Criar o Provedor do Contexto
export const LayoutProvider = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const value = {
    isSidebarOpen,
    toggleSidebar
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

// 3. Criar um Hook customizado para usar o contexto mais facilmente
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};