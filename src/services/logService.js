// Serviço de Logs do Sistema
// Registra acessos e ações executadas pelos usuários

import React from 'react';
import { getCurrentToken } from './authService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// Função auxiliar para obter dados do usuário
const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    return null;
  }
};

// Função para registrar log de ação
export const registrarLog = async (acao, detalhes = {}) => {
  try {
    const usuario = getCurrentUser();
    const logData = {
      data_hora: new Date().toISOString(),
      usuario: usuario ? usuario.email : 'Usuário não identificado',
      url: window.location.pathname + window.location.search,
      acao: acao,
      detalhes: JSON.stringify(detalhes),
      user_agent: navigator.userAgent,
      ip_address: 'Cliente' // Será definido pelo servidor
    };

    // Enviar log para o backend
    const response = await fetch(`${API_BASE_URL}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      console.warn('Falha ao registrar log:', response.statusText);
    }

    // Também salvar localmente como backup
    salvarLogLocal(logData);

  } catch (error) {
    console.warn('Erro ao registrar log:', error);
    // Salvar localmente se falhar no servidor
    const logData = {
      data_hora: new Date().toISOString(),
      usuario: getCurrentUser()?.email || 'Desconhecido',
      url: window.location.pathname,
      acao,
      detalhes: JSON.stringify(detalhes)
    };
    salvarLogLocal(logData);
  }
};

// Salvar log localmente no localStorage como backup
const salvarLogLocal = (logData) => {
  try {
    const logs = JSON.parse(localStorage.getItem('system_logs') || '[]');
    logs.push(logData);
    
    // Manter apenas os últimos 1000 logs
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    localStorage.setItem('system_logs', JSON.stringify(logs));
  } catch (error) {
    console.warn('Erro ao salvar log localmente:', error);
  }
};

// Função para obter logs (para tela de administração)
export const obterLogs = async (limite = 100, offset = 0) => {
  try {
    const response = await fetch(`${API_BASE_URL}/logs?limite=${limite}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Falha ao obter logs');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn('Erro ao obter logs do servidor, usando logs locais:', error);
    // Fallback para logs locais
    const logs = JSON.parse(localStorage.getItem('system_logs') || '[]');
    return logs.slice(offset, offset + limite);
  }
};

// Logs automáticos para ações importantes
export const logAcesso = (pagina) => {
  registrarLog('ACESSO_PAGINA', { pagina });
};

export const logLogin = (usuario) => {
  registrarLog('LOGIN', { usuario });
};

export const logLogout = () => {
  registrarLog('LOGOUT');
};

export const logSorteio = (promocaoId, ganhador) => {
  registrarLog('SORTEIO_REALIZADO', { promocaoId, ganhador });
};

export const logCancelamentoSorteio = (promocaoId, ganhadorId) => {
  registrarLog('SORTEIO_CANCELADO', { promocaoId, ganhadorId });
};

export const logCriacaoPromocao = (promocaoId, nome) => {
  registrarLog('PROMOCAO_CRIADA', { promocaoId, nome });
};

export const logEdicaoPromocao = (promocaoId, nome) => {
  registrarLog('PROMOCAO_EDITADA', { promocaoId, nome });
};

export const logExportacaoDados = (tipo, filtros) => {
  registrarLog('EXPORTACAO_DADOS', { tipo, filtros });
};

export const logConfiguracaoAlterada = (secao, alteracoes) => {
  registrarLog('CONFIGURACAO_ALTERADA', { secao, alteracoes });
};

// Hook para registrar automaticamente acessos a páginas
export const usePageAccessLog = (nomePagina) => {
  React.useEffect(() => {
    logAcesso(nomePagina);
  }, [nomePagina]);
};