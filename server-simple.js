// server-simple.js - Servidor simples para desenvolvimento local
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = 3002;

// Middleware CORS
app.use((req, res, next) => {
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
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Middleware para parsing JSON
app.use(express.json());

// Status endpoint
app.get('/status', (req, res) => {
  res.json({ status: 'API local funcionando', timestamp: new Date().toISOString() });
});

// Função handler para API
async function handleAPI(req, res) {
  try {
    console.log(`🔍 ${req.method} ${req.url} - Query:`, req.query);
    console.log(`📋 Headers:`, req.headers.authorization ? 'Bearer [TOKEN]' : 'No Auth');

    // Importar handler da API (sem cache para hot reload)
    delete require.cache[require.resolve('./api/index.js')];
    const apiHandler = require('./api/index.js');

    // Adapter melhorado para Vercel - simular o ambiente do Vercel
    const vercelReq = {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      url: req.url,
      originalUrl: req.originalUrl || req.url // Adicionar originalUrl para compatibilidade
    };

    let responseData = null;
    let responseStatus = 200;
    let responseHeaders = {};

    const vercelRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseData = data;
            res.status(code).json(data);
          },
          send: (data) => {
            responseData = data;
            res.status(code).send(data);
          },
          end: () => res.status(code).end()
        };
      },
      json: (data) => {
        responseData = data;
        res.json(data);
      },
      send: (data) => {
        responseData = data;
        res.send(data);
      },
      setHeader: (name, value) => {
        responseHeaders[name] = value;
        res.setHeader(name, value);
      }
    };

    await apiHandler(vercelReq, vercelRes);

    console.log(`✅ Resposta ${responseStatus}:`, responseData ? Object.keys(responseData) : 'sem dados');
  } catch (error) {
    console.error('❌ Erro API:', error.message);
    console.error('🔍 Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor local',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// API Router com handler da Vercel - capturar /api e /api/qualquer-coisa
app.all('/api', handleAPI);
app.use('/api', handleAPI);

app.listen(PORT, () => {
  console.log(`🚀 API local: http://localhost:${PORT}/api`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
});