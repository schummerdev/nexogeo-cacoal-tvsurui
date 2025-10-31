// src/services/participanteService.js
import { getCurrentToken } from './authService';
import { auditHelpers, logAction, logError } from './auditService';

// Usar URL relativa para funcionar com Vercel
const API_BASE_URL = '/api';

// Função para buscar todos os participantes
export const fetchParticipantes = async () => {
  try {
    console.log('🔍 Iniciando fetchParticipantes...');
    const token = getCurrentToken();
    if (!token) {
      throw new Error('Token de acesso não encontrado. Faça login para continuar.');
    }
    console.log('🔑 Token encontrado, fazendo requisição para:', `${API_BASE_URL}/?route=participantes`);
    
    const response = await fetch(`${API_BASE_URL}/?route=participantes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
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
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar participantes:', error);
    throw error;
  }
};

// Função para excluir um participante
export const deleteParticipante = async (id) => {
  try {
    const token = getCurrentToken();
    if (!token) {
      throw new Error('Token de acesso não encontrado. Faça login para continuar.');
    }

    // Buscar dados do participante antes da exclusão para auditoria
    let participantData = null;
    try {
      const participantResponse = await fetch(`${API_BASE_URL}/?route=participantes&id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (participantResponse.ok) {
        const participantResult = await participantResponse.json();
        participantData = participantResult.data;
      }
    } catch (error) {
      console.warn('Não foi possível buscar dados do participante para auditoria:', error);
    }

    const response = await fetch(`${API_BASE_URL}/?route=participantes&id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
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

    // Log de auditoria para exclusão de participante
    if (data.success && participantData) {
      logAction('DELETE', 'participantes', id, {}, participantData, null);
      console.log('🗑️ Exclusão de participante auditada:', id);
    }

    return data;
  } catch (error) {
    console.error('Erro ao excluir participante:', error);
    logError('DELETE_PARTICIPANT_FAILED', 'participanteService', error.message, { participant_id: id });
    throw error;
  }
};

// Função para atualizar um participante
export const updateParticipante = async (id, participanteData) => {
  try {
    const token = getCurrentToken();
    if (!token) {
      throw new Error('Token de acesso não encontrado. Faça login para continuar.');
    }

    // Buscar dados originais antes da atualização para auditoria
    let originalData = null;
    try {
      const originalResponse = await fetch(`${API_BASE_URL}/?route=participantes&id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (originalResponse.ok) {
        const originalResult = await originalResponse.json();
        originalData = originalResult.data;
      }
    } catch (error) {
      console.warn('Não foi possível buscar dados originais para auditoria:', error);
    }

    // Debug: Log dos dados sendo enviados
    console.log('🔄 Atualizando participante:', {
      id,
      url: `${API_BASE_URL}/participantes?id=${id}`,
      data: participanteData,
      dataJson: JSON.stringify(participanteData)
    });
    
    const response = await fetch(`${API_BASE_URL}/?route=participantes&id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(participanteData)
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expirado. Faça login novamente.');
      }
      if (response.status === 409) {
        // Tentar extrair mensagem específica do backend
        try {
          const errorData = await response.json();
          if (errorData.error === 'DUPLICATE_PHONE_IN_PROMOTION') {
            throw new Error(errorData.message || 'Este telefone já está sendo usado por outro participante nesta promoção!');
          }
        } catch (parseError) {
          // Se não conseguir parsear, usar mensagem padrão
        }
        throw new Error('Este número de telefone já está sendo usado por outro participante.');
      }
      
      // Tentar extrair mensagem detalhada do servidor
      let errorMessage = `Erro na requisição: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('Detalhes do erro 400:', errorData);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.received_body || errorData.received_data) {
          console.error('Dados enviados:', errorData.received_body || errorData.received_data);
        }
        if (errorData.stack) {
          console.error('Stack trace:', errorData.stack);
        }
      } catch (parseError) {
        console.error('Erro ao extrair detalhes:', parseError);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();

    // Log de auditoria para edição de participante
    if (data.success) {
      auditHelpers.editParticipant(id, originalData, participanteData);
      console.log('👤 Edição de participante auditada:', id);
    }

    return data;
  } catch (error) {
    console.error('Erro ao atualizar participante:', error);
    logError('UPDATE_PARTICIPANT_FAILED', 'participanteService', error.message, { participant_id: id });
    throw error;
  }
};

// Função para buscar participantes unificados (regulares + públicos da Caixa Misteriosa)
export const fetchParticipantesUnificados = async (includePublic = true) => {
  try {
    console.log('🔍 Iniciando fetchParticipantesUnificados...', { includePublic });
    const token = getCurrentToken();
    if (!token) {
      throw new Error('Token de acesso não encontrado. Faça login para continuar.');
    }

    const url = `${API_BASE_URL}/participantes?unified=true&includePublic=${includePublic}`;
    console.log('🔑 Token encontrado, fazendo requisição para:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
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

    const result = await response.json();
    console.log('✅ Participantes unificados recebidos:', {
      total: result.data?.length || 0,
      stats: result.stats
    });

    return {
      data: result.data || [],
      stats: result.stats || { total: 0, regular: 0, public: 0 }
    };
  } catch (error) {
    console.error('Erro ao buscar participantes unificados:', error);
    logError('FETCH_UNIFIED_PARTICIPANTS_FAILED', 'participanteService', error.message);
    throw error;
  }
};

// Função para buscar estatísticas dos participantes do jogo (Caixa Misteriosa)
export const fetchGameParticipantsStats = async () => {
  try {
    console.log('📊 Iniciando fetchGameParticipantsStats...');
    const token = getCurrentToken();
    if (!token) {
      throw new Error('Token de acesso não encontrado. Faça login para continuar.');
    }

    const url = `${API_BASE_URL}/caixa-misteriosa/stats/game-participants`;
    console.log('🔑 Token encontrado, fazendo requisição para:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
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

    const result = await response.json();
    console.log('✅ Estatísticas do jogo recebidas:', result.data);

    return result.data || {
      total_participants: 0,
      total_cities: 0,
      total_neighborhoods: 0,
      total_submissions: 0,
      correct_guesses: 0,
      participants_with_referrals: 0,
      avg_extra_guesses: 0,
      accuracy_rate: "0.00"
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do jogo:', error);
    logError('FETCH_GAME_STATS_FAILED', 'participanteService', error.message);
    throw error;
  }
};