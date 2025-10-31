-- Schema para NexoGeo Manus API (PostgreSQL básico, sem PostGIS)

-- Tabela para armazenar os dados da emissora
CREATE TABLE emissoras (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    logo_url TEXT,
    tema_cor VARCHAR(50) DEFAULT 'branco'
);

-- Tabela para os usuários administradores
CREATE TABLE usuarios_admin (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para promoções
CREATE TABLE promocoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ativa',
    link_participacao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para participantes
CREATE TABLE participantes (
    id SERIAL PRIMARY KEY,
    promocao_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    bairro VARCHAR(255),
    cidade VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    origem_source VARCHAR(100),
    origem_medium VARCHAR(100),
    participou_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promocao_id) REFERENCES promocoes(id) ON DELETE CASCADE
);

-- Tabela para ganhadores
CREATE TABLE ganhadores (
    id SERIAL PRIMARY KEY,
    promocao_id INT NOT NULL,
    participante_id INT NOT NULL,
    sorteado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promocao_id) REFERENCES promocoes(id),
    FOREIGN KEY (participante_id) REFERENCES participantes(id)
);

-- Índices para otimização
CREATE INDEX idx_participantes_geolocalizacao ON participantes (latitude, longitude);
CREATE INDEX idx_participantes_telefone ON participantes (telefone);
CREATE UNIQUE INDEX idx_participante_unico_por_promocao ON participantes (promocao_id, telefone); 