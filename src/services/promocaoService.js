// src/services/promocaoService.js
// ✅ SEGURANÇA: Removido getCurrentToken() - token agora é HttpOnly cookie
import { auditHelpers, logAction, logError } from './auditService';

// Usar URL relativa para funcionar com Vercel
const API_BASE_URL = '/api';

// Função para buscar todas as promoções
export const fetchPromocoes = async () => {
  try {
    console.log('🔍 Iniciando fetchPromocoes...');
    // ✅ SEGURANÇA: Token agora é HttpOnly cookie
    console.log('🔑 Fazendo requisição para:', `${API_BASE_URL}/?route=promocoes`);

    const response = await fetch(`${API_BASE_URL}/?route=promocoes`, {
      credentials: 'include' // ✅ SEGURANÇA: Enviar cookies HttpOnly
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expirado. Faça login novamente.');
      }
      throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }

    // Verificar se a resposta é JSON válido
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Resposta não é JSON:', contentType);
      const text = await response.text();
      console.error('📄 Conteúdo da resposta:', text.substring(0, 200));
      throw new Error('Servidor retornou resposta inválida (HTML em vez de JSON). Verifique se a API está funcionando.');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Erro ao buscar promoções:', error);
    throw error;
  }
};

// Função para criar uma nova promoção
export const createPromocao = async (promocaoData) => {
  try {
    // ✅ SEGURANÇA: Token agora é HttpOnly cookie

    const response = await fetch(`${API_BASE_URL}/?route=promocoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // ✅ SEGURANÇA: Enviar cookies HttpOnly
      body: JSON.stringify(promocaoData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expirado. Faça login novamente.');
      }

      // Tentar extrair mensagem específica do backend
      let errorMessage = `Erro na requisição: ${response.status}`;
      try {
        const errorData = await response.json();
        // Priorizar campo 'error' que contém a mensagem amigável que adicionamos no backend
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        // Se não conseguir parsear, usar mensagem padrão
        errorMessage = `Erro na requisição: ${response.status} ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Log de auditoria para criação de promoção
    if (data.success && data.data && data.data.id) {
      auditHelpers.createPromotion(data.data.id);
      console.log('🎯 Criação de promoção auditada:', data.data.id);
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar promoção:', error);
    throw error;
  }
};

// Função para atualizar uma promoção
export const updatePromocao = async (id, promocaoData) => {
  try {
    // ✅ SEGURANÇA: Token agora é HttpOnly cookie

    // Buscar dados originais antes da atualização para auditoria
    let originalData = null;
    try {
      const originalResponse = await fetch(`${API_BASE_URL}/?route=promocoes&id=${id}`, {
        credentials: 'include' // ✅ SEGURANÇA: Enviar cookies HttpOnly
      });
      if (originalResponse.ok) {
        const originalResult = await originalResponse.json();
        originalData = originalResult.data;
      }
    } catch (error) {
      console.warn('Não foi possível buscar dados originais da promoção para auditoria:', error);
    }

    const response = await fetch(`${API_BASE_URL}/?route=promocoes&id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // ✅ SEGURANÇA: Enviar cookies HttpOnly
      body: JSON.stringify(promocaoData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expirado. Faça login novamente.');
      }

      // Tentar extrair mensagem específica do backend
      let errorMessage = `Erro na requisição: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // Se não conseguir parsear, usar mensagem padrão
        errorMessage = `Erro na requisição: ${response.status} ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Log de auditoria para edição de promoção
    if (data.success) {
      logAction('UPDATE', 'promocoes', id, {}, originalData, promocaoData);
      console.log('🎁 Edição de promoção auditada:', id);
    }

    return data;
  } catch (error) {
    console.error('Erro ao atualizar promoção:', error);
    logError('UPDATE_PROMOTION_FAILED', 'promocaoService', error.message, { promotion_id: id });
    throw error;
  }
};

// Função para excluir uma promoção
export const deletePromocao = async (id) => {
  try {
    // ✅ SEGURANÇA: Token agora é HttpOnly cookie

    // Buscar dados da promoção antes da exclusão para auditoria
    let promocaoData = null;
    try {
      const promocaoResponse = await fetch(`${API_BASE_URL}/?route=promocoes&id=${id}`, {
        credentials: 'include' // ✅ SEGURANÇA: Enviar cookies HttpOnly
      });
      if (promocaoResponse.ok) {
        const promocaoResult = await promocaoResponse.json();
        promocaoData = promocaoResult.data;
      }
    } catch (error) {
      console.warn('Não foi possível buscar dados da promoção para auditoria:', error);
    }

    const response = await fetch(`${API_BASE_URL}/?route=promocoes&id=${id}`, {
      method: 'DELETE',
      credentials: 'include' // ✅ SEGURANÇA: Enviar cookies HttpOnly
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expirado. Faça login novamente.');
      }

      // Tentar extrair mensagem específica do backend
      let errorMessage = `Erro na requisição: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // Se não conseguir parsear, usar mensagem padrão
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Log de auditoria para exclusão de promoção
    if (data.success && promocaoData) {
      logAction('DELETE', 'promocoes', id, {}, promocaoData, null);
      console.log('🗑️ Exclusão de promoção auditada:', id);
    }

    return data;
  } catch (error) {
    console.error('Erro ao excluir promoção:', error);
    logError('DELETE_PROMOTION_FAILED', 'promocaoService', error.message, { promotion_id: id });
    throw error;
  }
};

// Função para buscar uma promoção por ID
export const getPromocaoById = async (id) => {
  try {
    // ✅ SEGURANÇA: Token agora é HttpOnly cookie

    const response = await fetch(`${API_BASE_URL}/?route=promocoes&id=${id}`, {
      credentials: 'include' // ✅ SEGURANÇA: Enviar cookies HttpOnly
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expirado. Faça login novamente.');
      }
      throw new Error(`Erro na requisição: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Erro ao buscar promoção por ID:', error);
    throw error;
  }
};