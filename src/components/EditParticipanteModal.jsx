import React, { useState, useEffect } from 'react';

const EditParticipanteModal = ({ 
  isOpen, 
  onClose, 
  participante, 
  promocoes,
  onSave 
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    bairro: '',
    cidade: '',
    promocao: '',
    latitude: '',
    longitude: ''
  });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (participante && isOpen) {
      setFormData({
        nome: participante.nome || '',
        telefone: participante.telefone || '',
        bairro: participante.bairro || '',
        cidade: participante.cidade || '',
        promocao: participante.promocao_id || participante.promocao || '',
        latitude: participante.latitude || '',
        longitude: participante.longitude || ''
      });
    }
  }, [participante, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada pelo navegador');
      return;
    }

    setGettingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        }));
        setGettingLocation(false);
      },
      (error) => {
        setLocationError('Erro ao obter localização: ' + error.message);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedData = {
        nome: formData.nome,
        telefone: formData.telefone,
        bairro: formData.bairro,
        cidade: formData.cidade,
        promocao_id: formData.promocao,
        latitude: formData.latitude,
        longitude: formData.longitude,
        email: participante.email || null,
        id: participante.id
      };
      await onSave(updatedData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Editar Participante</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nome">Nome *</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefone">Telefone *</label>
              <input
                type="tel"
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bairro">Bairro</label>
              <input
                type="text"
                id="bairro"
                name="bairro"
                value={formData.bairro}
                onChange={handleInputChange}
                placeholder="Bairro"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cidade">Cidade</label>
              <input
                type="text"
                id="cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleInputChange}
                placeholder="Cidade"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="promocao">Promoção</label>
              <select
                id="promocao"
                name="promocao"
                value={formData.promocao}
                onChange={handleInputChange}
              >
                <option value="">Selecionar promoção</option>
                {promocoes.map((promo) => (
                  <option key={promo.id} value={promo.id}>
                    {promo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                placeholder="-23.550520"
                step="0.000001"
              />
            </div>

            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                placeholder="-46.633309"
                step="0.000001"
              />
            </div>

            <div className="form-group full-width">
              <button
                type="button"
                className="btn-location"
                onClick={handleGetLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <>
                    <span className="loading-spinner"></span>
                    Obtendo localização...
                  </>
                ) : (
                  <>
                    📍 Obter Localização Atual
                  </>
                )}
              </button>
              {locationError && (
                <p className="error-message">{locationError}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleSave}
            disabled={loading || !formData.nome || !formData.telefone}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--color-surface);
          border-radius: 16px;
          box-shadow: var(--shadow-xl);
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--color-border);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid var(--color-border);
        }

        .modal-header h3 {
          margin: 0;
          color: var(--color-text);
          font-size: 1.25rem;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--color-text-secondary);
          padding: 4px;
          border-radius: 4px;
          transition: var(--transition-normal);
        }

        .modal-close:hover {
          background: var(--color-danger);
          color: white;
        }

        .modal-body {
          padding: 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 500;
          color: var(--color-text);
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group select {
          padding: 12px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-background);
          color: var(--color-text);
          font-size: 0.875rem;
          transition: var(--transition-normal);
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .btn-location {
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-normal);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-location:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .btn-location:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: var(--color-danger);
          font-size: 0.75rem;
          margin: 4px 0 0 0;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 24px;
          border-top: 1px solid var(--color-border);
          background: var(--color-background);
          border-radius: 0 0 16px 16px;
        }

        .btn-secondary,
        .btn-primary {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-normal);
          font-size: 0.875rem;
        }

        .btn-secondary {
          background: var(--color-background);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--color-border);
        }

        .btn-primary {
          background: var(--color-primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--color-primary-dark);
          transform: translateY(-1px);
        }

        .btn-secondary:disabled,
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .modal-content {
            width: 95%;
            margin: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default EditParticipanteModal;