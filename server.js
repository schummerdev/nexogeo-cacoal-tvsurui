// server.js - Servidor de desenvolvimento local
const express = require('express');
const path = require('path');
require('dotenv').config(); // Carregar variáveis do .env

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para parsing JSON
app.use(express.json());

// Middleware para CORS seguro em desenvolvimento
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Rota de status para verificar se o servidor está funcionando
app.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor de desenvolvimento local funcionando',
    timestamp: new Date().toISOString()
  });
});

// Importar e usar o handler da API
const apiHandler = require('./api/index.js');

// Middleware da API (captura todas as rotas que começam com /api)
app.use('/api', async (req, res) => {
  try {
    console.log('🔍 API Request:', req.method, req.url);
    console.log('🔍 Original URL:', req.originalUrl);
    console.log('🔍 Query params:', req.query);

    // Simular o objeto de request da Vercel
    const vercelRequest = {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,  // Express já processa automaticamente
      url: req.url,
      originalUrl: req.originalUrl  // Adiciona o originalUrl para path-based routing
    };

    // Simular o objeto de response da Vercel
    const vercelResponse = {
      status: (code) => ({
        json: (data) => res.status(code).json(data),
        send: (data) => res.status(code).send(data),
        end: () => res.status(code).end()
      }),
      json: (data) => res.json(data),
      send: (data) => res.send(data),
      setHeader: (name, value) => res.setHeader(name, value)
    };

    console.log('🚀 Chamando handler da API...');
    await apiHandler(vercelRequest, vercelResponse);
  } catch (error) {
    console.error('❌ Erro na API local:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor local',
      message: error.message
    });
  }
});

// Servir arquivos estáticos do React (quando não em desenvolvimento)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor de desenvolvimento rodando em http://localhost:${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}/api`);
  console.log(`🔍 Status: http://localhost:${PORT}/status`);
});