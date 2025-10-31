import React from 'react';
import './Toast.css';

const Toast = ({ message, type = 'success', title, onClose, closable = true, duration = 4000 }) => {
  React.useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const getToastClass = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-success';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📄';
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return 'Sucesso!';
      case 'error':
        return 'Erro!';
      case 'warning':
        return 'Atenção!';
      case 'info':
        return 'Informação';
      default:
        return 'Notificação';
    }
  };

  return (
    <div className={`toast ${getToastClass()}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-body">
        <div className="toast-title">{getTitle()}</div>
        <div className="toast-message">{message}</div>
      </div>
      {closable && (
        <button className="toast-close" onClick={onClose}>&times;</button>
      )}
    </div>
  );
};

export default Toast;