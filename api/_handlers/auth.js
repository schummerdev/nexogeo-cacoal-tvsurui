// API de autenticação - versão simples baseada na index.js
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // CORS seguro - apenas origens permitidas
  const allowedOrigins = [
    'https://tvsurui.com.br',
    'https://nexogeo2.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  return res.status(200).json({
    success: true,
    message: 'API Auth funcionando!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}