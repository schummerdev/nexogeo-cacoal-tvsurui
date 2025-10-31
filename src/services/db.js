// src/services/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Configuração para desenvolvimento (lê do .env)
const devConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
};

// Configuração para produção (usa a DATABASE_URL e exige SSL)
const prodConfig = {
  connectionString: process.env.DATABASE_URL, // Heroku, Render, etc., fornecem essa variável
  ssl: {
    rejectUnauthorized: false, // Necessário para a maioria dos provedores em nuvem
  },
};

// Usa a configuração de produção se NODE_ENV for 'production', senão usa a de desenvolvimento
const pool = new Pool(process.env.NODE_ENV === 'production' ? prodConfig : devConfig);

// Exporta uma função para fazer queries
module.exports = {
  query: (text, params) => pool.query(text, params),
};
