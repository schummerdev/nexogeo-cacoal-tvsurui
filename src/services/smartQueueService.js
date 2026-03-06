// src/services/smartQueueService.js

/**
 * Serviço de Fila Inteligente (Smart Queue)
 * Gerencia envios para a API com lógica de retentativa (Exponential Backoff)
 * para lidar com sobrecarga do servidor sem incomodar o usuário.
 */

 const MAX_RETRIES = 5;
 const BASE_DELAY = 1000; // 1 segundo
 
 /**
  * Envia dados para a API com retentativa automática em caso de sobrecarga
  * @param {string} url - Endpoint da API
  * @param {object} data - Dados para envio (serão convertidos para JSON)
  * @param {function} onStatusChange - Callback para informar status (tentativa X de Y)
  * @returns {Promise<object>} - Resposta da API
  */
 export const submitWithRetry = async (url, data, onStatusChange) => {
   let attempt = 0;
 
   const trySubmit = async () => {
     attempt++;
     
     try {
       console.log(`🚀 [SmartQueue] Tentativa ${attempt}/${MAX_RETRIES} para ${url}`);
       
       const response = await fetch(url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data),
       });
 
       // Se sucesso, retorna os dados
       if (response.ok) {
         console.log('✅ [SmartQueue] Sucesso na tentativa', attempt);
         return await response.json();
       }
 
       // Se erro 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict)
       // NÃO adianta retentar, pois é erro de cliente ou lógica
       if ([400, 401, 403, 404, 409].includes(response.status)) {
         const errorData = await response.json();
         // Repassar erro específico para tratamento do frontend
         const error = new Error(errorData.message || `Erro ${response.status}`);
         error.status = response.status;
         error.data = errorData;
         throw error; 
       }
 
       // Se chegou aqui, é erro 5xx (Server Error) ou 429 (Too Many Requests)
       // Joga erro para cair no catch e acionar retentativa
       throw new Error(`Server Error: ${response.status}`);
 
     } catch (error) {
       // Se for erro de cliente (status definido acima), não retenta
       if (error.status && [400, 401, 403, 404, 409].includes(error.status)) {
         throw error;
       }
 
       // Se excedeu tentativas máximas
       if (attempt >= MAX_RETRIES) {
         console.error('❌ [SmartQueue] Máximo de tentativas excedido');
         throw new Error('O servidor está muito ocupado no momento. Por favor, tente novamente em alguns minutos.');
       }
 
       // Calcula tempo de espera (Exponential Backoff com Jitter)
       // Ex: 2s, 4s, 8s, 16s... + tempo aleatório
       const delay = Math.min(30000, (BASE_DELAY * Math.pow(2, attempt - 1)) + (Math.random() * 1000));
       
       console.warn(`⏳ [SmartQueue] Falha na tentativa ${attempt}. Retentando em ${Math.round(delay)}ms...`);
       
       // Informa UI sobre a espera
       if (onStatusChange) {
         onStatusChange({
           status: 'queueing',
           attempt: attempt,
           maxRetries: MAX_RETRIES,
           nextRetryIn: Math.round(delay / 1000)
         });
       }
 
       // Espera e tenta de novo
       await new Promise(resolve => setTimeout(resolve, delay));
       return trySubmit();
     }
   };
 
   return trySubmit();
 };
