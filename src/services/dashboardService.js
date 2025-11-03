// src/services/dashboardService.js
// ✅ SEGURANÇA: Removido getCurrentToken() - token agora é HttpOnly cookie

// Usar URL relativa para funcionar com Vercel
const API_BASE_URL = '/api';

// Função para buscar dados do dashboard
export const fetchDashboardData = async () => {
  try {
    console.log('🔍 Iniciando fetchDashboardData...');
    // ✅ SEGURANÇA: Token agora é HttpOnly cookie
    console.log('🔑 Fazendo requisição para:', `${API_BASE_URL}/?route=dashboard`);

    const response = await fetch(`${API_BASE_URL}/?route=dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
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
    return data;
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    throw error;
  }
};