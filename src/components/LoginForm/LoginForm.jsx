// src/components/LoginForm/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import './LoginForm.css';

const LoginForm = () => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, error
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const data = await login(usuario, senha);
      
      // Usar o AuthContext para fazer login
      authLogin(data.user, data.token);
      
      // Redirecionar para o dashboard
      navigate('/dashboard');

    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-header">
          <img src="/imagens/logo.png" alt="NexoGeo Logo" className="logo" />
          <h2>NexoGeo</h2>
          <p>Painel de Controle</p>
        </div>

        <div className="form-group">
          <label htmlFor="usuario">Usuário</label>
          <input
            type="text"
            id="usuario"
            placeholder="Digite seu usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="senha">Senha</label>
          <input
            type="password"
            id="senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        {status === 'error' && <p className="error-message">{errorMessage}</p>}

        <div className="form-group align-right">
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm; 