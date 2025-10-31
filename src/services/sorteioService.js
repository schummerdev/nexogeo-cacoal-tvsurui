// src/services/sorteioService.js
import { getCurrentToken } from './authService';
import { auditHelpers } from './auditService';

// Usar URL relativa para funcionar com Vercel
const API_BASE_URL = '/api';

// Função para fazer requisições autenticadas
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = getCurrentToken();
  
  if (!token) {
    throw new Error('Token de acesso não encontrado. Faça login para continuar.');
  }
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, mergedOptions);
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token expirado. Faça login novamente.');
    }
    const errorText = await response.text();
    throw new Error(`Erro ${response.status}: ${errorText}`);
  }

  return response.json();
};

// Buscar participantes disponíveis para sorteio
export const buscarParticipantesDisponiveis = async (promocaoId) => {
  try {
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/?route=sorteio&action=participantes&promocaoId=${promocaoId}`,
      { method: 'GET' }
    );
    // API retorna data.participantes, padronizar para data.data
    if (data.participantes && !data.data) {
      data.data = data.participantes;
    }
    return data;
  } catch (error) {
    console.error('Erro ao buscar participantes disponíveis:', error);
    throw error;
  }
};

// Realizar sorteio e atualizar status da promoção para 'encerrada'
export const realizarSorteio = async (promocaoId) => {
  try {
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/?route=sorteio&action=sortear`,
      {
        method: 'POST',
        body: JSON.stringify({ promocaoId }),
      }
    );
    
    // Após realizar o sorteio com sucesso, atualizar status da promoção para 'encerrada'
    if (data && data.success) {
      try {
        console.log(`🔄 Iniciando atualização de status da promoção ${promocaoId} para 'encerrada'`);
        await atualizarStatusPromocao(promocaoId, 'encerrada');
        console.log(`✅ Status da promoção ${promocaoId} atualizado para 'encerrada' após sorteio`);

        // Log de auditoria para sorteio realizado
        if (data.ganhador && data.ganhador.id) {
          auditHelpers.performDraw(promocaoId, data.ganhador.id);
          console.log('🎯 Sorteio auditado:', { promocaoId, ganhadorId: data.ganhador.id });
        }
      } catch (statusError) {
        console.error('❌ ERRO ao atualizar status da promoção após sorteio:', statusError);
        console.error('❌ Stack trace:', statusError.stack);
        // Não propagar o erro de status, pois o sorteio já foi realizado
      }
    } else {
      console.warn('⚠️ Sorteio não retornou sucesso, status não será atualizado:', data);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao realizar sorteio:', error);
    throw error;
  }
};

// Buscar ganhadores de uma promoção
export const buscarGanhadores = async (promocaoId) => {
  try {
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/?route=sorteio&action=ganhadores&id=${promocaoId}`,
      { method: 'GET' }
    );
    // API retorna data.ganhadores, padronizar para data.data
    if (data.ganhadores && !data.data) {
      data.data = data.ganhadores;
    }
    return data;
  } catch (error) {
    console.error('Erro ao buscar ganhadores:', error);
    throw error;
  }
};

// Buscar todos os ganhadores
export const buscarTodosGanhadores = async () => {
  try {
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/sorteio/ganhadores`,
      { method: 'GET' }
    );
    return data;
  } catch (error) {
    console.error('Erro ao buscar todos ganhadores:', error);
    throw error;
  }
};

// Cancelar sorteio (remover ganhador) e atualizar status da promoção para 'ativa'
export const cancelarSorteio = async (ganhadorId, promocaoId) => {
  try {
    console.log(`🚫 Cancelando sorteio - ganhadorId: ${ganhadorId}, promocaoId: ${promocaoId}`);
    
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/?route=sorteio&action=ganhadores&id=${ganhadorId}`,
      { method: 'DELETE' }
    );
    
    console.log('📊 Resposta do cancelamento:', data);
    
    // Após cancelar o sorteio com sucesso, atualizar status da promoção para 'ativa'
    if (data && data.success && promocaoId) {
      try {
        console.log(`🔄 Iniciando atualização de status da promoção ${promocaoId} para 'ativa' após cancelamento`);
        await atualizarStatusPromocao(promocaoId, 'ativa');
        console.log(`✅ Status da promoção ${promocaoId} atualizado para 'ativa' após cancelar sorteio`);
      } catch (statusError) {
        console.error('❌ ERRO ao atualizar status da promoção após cancelamento:', statusError);
        // Não propagar o erro de status, pois o cancelamento já foi realizado
      }
    } else {
      console.warn('⚠️ Cancelamento não retornou sucesso ou promocaoId ausente:', { success: data?.success, promocaoId });
    }
    
    return data;
  } catch (error) {
    console.error('❌ ERRO ao cancelar sorteio:', error);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
};

// Obter estatísticas de sorteio
export const obterEstatisticas = async () => {
  try {
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/?route=sorteio&action=estatisticas`,
      { method: 'GET' }
    );

    // Transformar resposta da API para formato esperado pelo frontend
    if (data.success && !data.data) {
      data.data = {
        totalGanhadores: parseInt(data.total_ganhadores) || 0,
        promocoesComGanhadores: parseInt(data.promocoes_com_sorteio) || 0,
        participantesDisponiveis: parseInt(data.participantes_disponiveis) || 0,
        participantesTotal: parseInt(data.participantes_total) || 0,
      };
    }

    return data;
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    throw error;
  }
};

// Buscar promoções ativas (reutiliza do promocaoService)
export const buscarPromocoesAtivas = async () => {
  try {
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/?route=promocoes`,
      { method: 'GET' }
    );
    return data;
  } catch (error) {
    console.error('Erro ao buscar promoções ativas:', error);
    throw error;
  }
};

// Função auxiliar para atualizar status da promoção
export const atualizarStatusPromocao = async (promocaoId, novoStatus) => {
  try {
    console.log(`🏷️ atualizarStatusPromocao: promocaoId=${promocaoId}, novoStatus=${novoStatus}`);
    console.log(`🌐 Endpoint: ${API_BASE_URL}/promocoes/status`);
    
    const requestBody = {
      status: novoStatus
    };
    console.log('📦 Request body:', requestBody);
    
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/?route=promocoes&id=${promocaoId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      }
    );
    
    console.log('✅ Resposta da API de status:', data);
    return data;
  } catch (error) {
    console.error(`❌ ERRO em atualizarStatusPromocao - promocaoId: ${promocaoId}, status: ${novoStatus}`);
    console.error('❌ Erro detalhado:', error);
    console.error('❌ Stack trace do erro:', error.stack);
    throw error;
  }
};

// Buscar últimas 5 promoções encerradas com ganhadores
export const buscarPromocoesEncerradas = async () => {
  try {
    console.log('🔍 Buscando últimas 5 promoções encerradas...');
    
    const data = await makeAuthenticatedRequest(
      `${API_BASE_URL}/?route=sorteio&action=encerradas`,
      { method: 'GET' }
    );
    
    console.log('✅ Promoções encerradas recebidas:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar promoções encerradas:', error);
    throw error;
  }
};

// Cancelar ganhador específico
export const cancelarGanhador = async (ganhadorId, motivo = 'Cancelado pelo administrador') => {
  try {
    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    console.log('🔄 Cancelando ganhador:', ganhadorId);
    
    const response = await fetch('/api/?route=sorteio&action=ganhadores&id=' + ganhadorId, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ganhador_id: ganhadorId,
        motivo: motivo,
        user_id: userData.id
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao cancelar ganhador');
    }
    
    console.log('✅ Ganhador cancelado com sucesso:', data);

    // Verificar se foi o último ganhador da promoção e reativar se necessário
    if (data && data.success && data.data && data.data.promocao_id) {
      try {
        console.log(`🔄 Verificando se precisa reativar promoção ${data.data.promocao_id} após cancelar ganhador`);

        // Buscar ganhadores restantes da promoção
        const ganhadoresResponse = await fetch(`/api/?route=sorteio&action=ganhadores&id=${data.data.promocao_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (ganhadoresResponse.ok) {
          const ganhadoresData = await ganhadoresResponse.json();

          // Se não há mais ganhadores, reativar a promoção
          if (ganhadoresData.success && (!ganhadoresData.ganhadores || ganhadoresData.ganhadores.length === 0)) {
            console.log(`🔄 Sem ganhadores restantes, reativando promoção ${data.data.promocao_id}`);
            await atualizarStatusPromocao(data.data.promocao_id, 'ativa');
            console.log(`✅ Promoção ${data.data.promocao_id} reativada após cancelar último ganhador`);
          }
        }
      } catch (reactivateError) {
        console.error('❌ Erro ao reativar promoção:', reactivateError);
        // Não propagar o erro, pois o cancelamento do ganhador foi bem-sucedido
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao cancelar ganhador:', error);
    throw error;
  }
};