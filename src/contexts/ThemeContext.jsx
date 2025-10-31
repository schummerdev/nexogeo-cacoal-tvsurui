// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('nexogeo-theme') || 'roxo';
  });

  const themes = {
    azul: {
      name: 'Azul',
      primary: '#1A73E8',
      primaryDark: '#0D47A1',
      primaryLight: '#60a5fa',
      secondary: '#E8F0FE',
      background: '#F8F9FA',
      surface: '#ffffff',
      text: '#202124',
      textSecondary: '#5F6368',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#FF9800',
      danger: '#ef4444',
      gradient: 'linear-gradient(135deg, #1A73E8 0%, #0D47A1 100%)'
    },
    verde: {
      name: 'Verde',
      primary: '#10b981',
      primaryDark: '#059669',
      primaryLight: '#34d399',
      secondary: '#dcfce7',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#d1fae5',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)'
    },
    vermelho: {
      name: 'Vermelho',
      primary: '#ef4444',
      primaryDark: '#dc2626',
      primaryLight: '#f87171',
      secondary: '#fef2f2',
      background: '#fefefe',
      surface: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#fecaca',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      gradient: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)'
    },
    roxo: {
      name: 'Roxo',
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      primaryLight: '#a78bfa',
      secondary: '#f3f4f6',
      background: '#faf7ff',
      surface: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
    },
    dark: {
      name: 'Escuro',
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      primaryLight: '#60a5fa',
      secondary: '#374151',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      border: '#374151',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      gradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
    }
  };

  useEffect(() => {
    localStorage.setItem('nexogeo-theme', currentTheme);
    applyTheme(themes[currentTheme]);
  }, [currentTheme, themes]);

  const applyTheme = (theme) => {
    const root = document.documentElement;
    
    // Aplicar variáveis CSS
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-dark', theme.primaryDark);
    root.style.setProperty('--color-primary-light', theme.primaryLight);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-background', theme.background);
    root.style.setProperty('--color-surface', theme.surface);
    root.style.setProperty('--color-text', theme.text);
    root.style.setProperty('--color-text-secondary', theme.textSecondary);
    root.style.setProperty('--color-border', theme.border);
    root.style.setProperty('--color-success', theme.success);
    root.style.setProperty('--color-warning', theme.warning);
    root.style.setProperty('--color-danger', theme.danger);
    root.style.setProperty('--color-gradient', theme.gradient);
    
  };

  // Aplicar tema inicial na montagem
  useEffect(() => {
    applyTheme(themes[currentTheme]);
  }, []);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const value = {
    currentTheme,
    themes,
    changeTheme,
    currentThemeData: themes[currentTheme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};