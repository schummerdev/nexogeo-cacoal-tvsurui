// Endpoint estático dedicado para /api/caixa-misteriosa-live
// Serve como fallback quando o handler consolidado não consegue processar

const caixaMisteriosaHandler = require('./caixa-misteriosa.js');

module.exports = async function handler(req, res) {
  console.log('🔗 caixa-misteriosa-live.js chamado - redirecionando para handler consolidado');

  // Simular chamada para getLiveGame
  req.originalPath = '/game/live';
  req.query = { ...req.query, endpoint: 'get-live-game' };

  return await caixaMisteriosaHandler(req, res);
};