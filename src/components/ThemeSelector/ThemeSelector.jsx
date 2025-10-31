// src/components/ThemeSelector/ThemeSelector.jsx
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeSelector.css';

const ThemeSelector = ({ inline = false, showLabel = true }) => {
  const { currentTheme, themes, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (themeName) => {
    if (changeTheme) {
      changeTheme(themeName);
    }
    setIsOpen(false);
  };

  // Verificar se themes existe e não está vazio
  if (!themes || Object.keys(themes).length === 0) {
    return null;
  }

  if (inline) {
    return (
      <div className="theme-selector-inline">
        {showLabel && <label className="theme-label">Tema:</label>}
        <select 
          value={currentTheme} 
          onChange={(e) => changeTheme && changeTheme(e.target.value)}
          className="theme-select"
        >
          {Object.entries(themes).map(([key, theme]) => (
            <option key={key} value={key}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="theme-selector">
      <button 
        className="theme-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Alterar tema"
      >
        <span className="theme-icon">🎨</span>
        <span className="theme-name">{themes[currentTheme]?.name || 'Tema'}</span>
        <span className={`theme-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="theme-dropdown">
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              className={`theme-option ${currentTheme === key ? 'active' : ''}`}
              onClick={() => handleThemeChange(key)}
            >
              <span 
                className="theme-preview" 
                style={{ backgroundColor: theme.primary }}
              ></span>
              <span className="theme-option-name">{theme.name}</span>
              {currentTheme === key && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;