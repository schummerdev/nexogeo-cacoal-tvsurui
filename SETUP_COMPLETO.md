# Guia Completo de Setup do NexoGeo

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Setup Local](#setup-local)
3. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
4. [Primeira Execução](#primeira-execução)
5. [Estrutura de Dados](#estrutura-de-dados)
6. [Fluxo de Autenticação](#fluxo-de-autenticação)
7. [Deploy na Vercel](#deploy-na-vercel)

---

## Pré-requisitos

### Sistema Operacional
- Windows 10+, macOS 10.15+, ou Linux (Ubuntu 20.04+)

### Software Obrigatório
- **Node.js 18+** (incluí npm)
  - Verificar: `node --version` (deve ser v18.x ou superior)
  - Download: https://nodejs.org/

- **PostgreSQL 12+**
  - Download: https://www.postgresql.org/download/
  - Ou usar serviço gerenciado: Neon (https://neon.tech) - Recomendado

- **Git**
  - Download: https://git-scm.com/

### Contas Online (Opcionais mas Recomendadas)
- **Neon** (PostgreSQL gerenciado) - Free tier: https://neon.tech
- **Vercel** (Deploy) - Free tier: https://vercel.com
- **Google Cloud** (Gemini AI) - Para hints de Caixa Misteriosa

---

## Setup Local

### 1️⃣ Clonar Repositório
```bash
git clone https://github.com/schummerdev/nexogeo-cacoal-tvsurui.git
cd nexogeo-cacoal-tvsurui
```

### 2️⃣ Instalar Dependências
```bash
# Instalar todas as dependências (frontend + backend)
npm install

# Verificar instalação
npm list express bcrypt jsonwebtoken
```

**Saída esperada:**
```
├── bcrypt@6.0.0
├── express@5.1.0
└── jsonwebtoken@9.0.2
```

### 3️⃣ Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
# Usar seu editor preferido (VS Code, Vim, etc)
```

**Conteúdo mínimo do `.env`:**
```env
# ========== OBRIGATÓRIO ==========

# Database URL (use Neon ou sua instância local)
# Formato: postgresql://user:password@host:5432/database
DATABASE_URL=postgresql://neon_user:password@ep-xyz.neon.tech/neon_db

# Secret para assinar tokens JWT
# ⚠️ IMPORTANTE: Use uma string longa e aleatória (mín. 32 caracteres)
# Pode gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=seu_jwt_secret_muito_longo_aqui_com_muitos_caracteres_aleatrios

# ========== OPCIONAL ==========

# Google Gemini API (para dicas da Caixa Misteriosa)
GOOGLE_API_KEY=AIzaSy...

# Ambiente de execução
NODE_ENV=development
```

### 4️⃣ Verificar Conexão com Banco

Comece o servidor de desenvolvimento em um terminal:
```bash
npm run dev:api
```

Você verá:
```
🚀 Servidor API rodando em http://localhost:3002
```

Em **outro terminal**, teste a conexão:
```bash
curl http://localhost:3002/api/?route=db&endpoint=test
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "timestamp": "2025-10-31T..."
}
```

Se falhar, verifique:
- ✅ `DATABASE_URL` está correta no `.env`
- ✅ PostgreSQL está rodando
- ✅ Credenciais (usuário/senha) são válidas
- ✅ Banco de dados existe

---

## Configuração do Banco de Dados

### 📊 Estrutura de Tabelas

O projeto usa PostgreSQL com as seguintes tabelas principais:

#### 1. **usuarios** (Autenticação)
```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(255) UNIQUE NOT NULL,     -- Login único
    email VARCHAR(255),
    senha_hash VARCHAR(255) NOT NULL,         -- Hash bcrypt da senha
    role VARCHAR(50) DEFAULT 'user',          -- admin, moderator, editor, viewer, user
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Papéis disponíveis:**
- `admin` - Acesso total ao sistema
- `moderator` - Gerenciar conteúdo
- `editor` - Editar promoções/participantes
- `viewer` - Apenas visualização
- `user` - Acesso básico

#### 2. **promocoes** (Promoções)
```sql
CREATE TABLE promocoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ativa',  -- ativa, encerrada, pausada
    link_participacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **participantes** (Inscritos)
```sql
CREATE TABLE participantes (
    id SERIAL PRIMARY KEY,
    promocao_id INT REFERENCES promocoes(id),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    bairro VARCHAR(255),
    cidade VARCHAR(255),
    latitude DECIMAL(10, 8),           -- Para mapa
    longitude DECIMAL(11, 8),
    origem_source VARCHAR(100),         -- UTM source (instagram, whatsapp, etc)
    origem_medium VARCHAR(100),         -- UTM medium (story, feed, etc)
    participou_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. **ganhadores** (Sorteados)
```sql
CREATE TABLE ganhadores (
    id SERIAL PRIMARY KEY,
    promocao_id INT REFERENCES promocoes(id),
    participante_id INT REFERENCES participantes(id),
    sorteado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. **audit_logs** (Segurança)
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    usuario_id INT,
    acao VARCHAR(255),                 -- LOGIN, SORTEIO, DELETE_PARTICIPANT, etc
    tabela VARCHAR(255),               -- Nome da tabela afetada
    registro_id INT,                   -- ID do registro afetado
    dados_antigos JSONB,               -- Dados antes da mudança
    dados_novos JSONB,                 -- Dados após a mudança
    ip_address VARCHAR(45),
    user_agent TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🔄 Executar Migrações

Após configurar o banco, execute as migrações:

```bash
# Executar todas as migrações pendentes
npm run migrate

# Saída esperada:
# ✅ 001_create_base_schema.sql
# ✅ 002_add_audit_logs.sql
# ✅ 003_add_geolocation.sql
# ...
```

**Migrações localizadas em:** `api/migrations/`

### 👤 Criar Usuário Admin Inicial

Após migrações, crie um usuário admin:

```bash
# Script automático (recomendado)
node create-admin.js

# Você será solicitado a:
# - Digite o nome de usuário: admin
# - Digite a senha: (escolha uma senha forte)
# - Role [admin]: admin
```

Ou manualmente via SQL:
```sql
-- Conectar ao banco PostgreSQL
psql postgresql://user:password@host:5432/database

-- Inserir usuário (com hash bcrypt da senha)
-- Senha: "admin123" com hash bcrypt: $2b$10$...
INSERT INTO usuarios (usuario, email, senha_hash, role)
VALUES (
  'admin',
  'admin@example.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm',  -- hash da senha
  'admin'
);

-- Verificar
SELECT id, usuario, role FROM usuarios;
```

---

## Primeira Execução

### ✅ Checklist Pré-Execução
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL rodando (local ou Neon)
- [ ] Repositório clonado
- [ ] `npm install` concluído
- [ ] `.env` configurado com DATABASE_URL e JWT_SECRET
- [ ] Migrações executadas (`npm run migrate`)
- [ ] Usuário admin criado

### 🚀 Iniciar Aplicação

**Terminal 1 - Backend:**
```bash
npm run dev:api
```

Saída esperada:
```
✅ API rodando em http://localhost:3002
✅ Database conectado
```

**Terminal 2 - Frontend:**
```bash
npm start
```

Saída esperada:
```
✅ Frontend rodando em http://localhost:3000
✅ Abrindo navegador...
```

### 🔐 Fazer Login
1. Navegador abre em `http://localhost:3000`
2. Tela de login aparece
3. **Usuário:** admin
4. **Senha:** (a que você configurou ou "admin123" se usou script)
5. Clique em "Entrar"

**Sucesso esperado:**
- ✅ Login realizado
- ✅ Redirecionamento para dashboard
- ✅ Token JWT salvo em localStorage

---

## Fluxo de Autenticação

### 📊 Fluxo Visual
```
┌─────────────────┐
│  Frontend Login │
└────────┬────────┘
         │ POST /api/?route=auth&endpoint=login
         │ {usuario, senha}
         ▼
┌─────────────────┐
│  Backend Auth   │────────────────┐
│  (api/index.js) │                │
└────────┬────────┘                │
         │                          │
         ├─► Buscar usuario         │
         │   em BD                  │
         │                          │
         ├─► Validar senha          │
         │   (bcrypt.compare)       │
         │                          │
         └─► Gerar JWT token        │
             (7 dias validade)      │
                   │                │
                   ▼                │
         ┌─────────────────────┐    │
         │ Resposta JSON:      │    │
         │ {                   │◄───┘
         │  success: true,     │
         │  token: "eyJ...",   │
         │  user: {...}        │
         │ }                   │
         └────────┬────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Frontend Storage│
         │ localStorage    │
         │ .setItem token  │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Dashboard      │
         │  Autenticado ✅ │
         └─────────────────┘
```

### 🔐 Fluxo de Verificação de Token

Em cada requisição protegida:
```
Frontend:
  Authorization: Bearer eyJ...token...

Backend:
  ├─ Extrai token do header
  ├─ Decodifica com JWT_SECRET
  ├─ Verifica expiração
  ├─ Busca usuário em BD
  └─ Permite/Nega acesso

Frontend:
  Token expirado?
  └─ Limpar localStorage
     └─ Redirecionar para login
```

---

## Deploy na Vercel

### 1️⃣ Preparar Repositório

```bash
# Confirmar que tudo está commitado
git status

# Se houver mudanças, fazer commit
git add .
git commit -m "Preparar para deploy Vercel"

# Push para main
git push origin main
```

### 2️⃣ Conectar Vercel

```bash
# Instalar CLI Vercel
npm install -g vercel

# Login na Vercel
vercel login

# Fazer deploy
vercel
```

Você será solicitado:
- Qual projeto? → Criar novo
- Nome do projeto? → nexogeo-cacoal-tvsurui
- Diretório? → ./ (raiz)

### 3️⃣ Configurar Variáveis de Ambiente

No dashboard Vercel:
1. Settings → Environment Variables
2. Adicionar variáveis:
   - `DATABASE_URL` → sua URL PostgreSQL
   - `JWT_SECRET` → seu secret JWT
   - `GOOGLE_API_KEY` → (opcional) Gemini API
   - `NODE_ENV` → production

### 4️⃣ Executar Migrações em Produção

Após deploy inicial:
```bash
# Conectar ao banco de produção
DATABASE_URL=<sua_url_produção> npm run migrate
```

### 5️⃣ Verificar Saúde

Após deploy, verificar:
```bash
# Testar database
curl https://seu-projeto.vercel.app/api/?route=db&endpoint=test

# Testar auth
curl -X POST https://seu-projeto.vercel.app/api/?route=auth&endpoint=login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"admin123"}'
```

---

## 🆘 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| `MODULE_NOT_FOUND: express` | Executar `npm install` |
| `DATABASE_URL is required` | Configurar `.env` com DATABASE_URL |
| `JWT_SECRET is required` | Adicionar JWT_SECRET em `.env` |
| `connection refused` | PostgreSQL não está rodando |
| `ECONNREFUSED 127.0.0.1:5432` | Verificar credenciais do banco |
| `Unexpected token 'A'` | Ver `DIAGNOSTICO_LOGIN_ERROR.md` |
| `Rate limit 429` | Aguardar 1 minuto ou reiniciar servidor |

---

## 📚 Documentação Relacionada

- **CLAUDE.md** - Orientações de desenvolvimento
- **DIAGNOSTICO_LOGIN_ERROR.md** - Troubleshooting de autenticação
- **MIGRATIONS.md** - Guia de migrações do banco
- **TESTING.md** - Estratégia de testes
- **DESIGN_SYSTEM_v2.7.md** - Sistema de design CSS

---

## 🎓 Próximos Passos

Após setup bem-sucedido:
1. ✅ Criar promoção via dashboard (`/dashboard/promocoes`)
2. ✅ Testar Caixa Misteriosa (`/dashboard/caixa-misteriosa`)
3. ✅ Executar sorteio (`/dashboard/sorteio`)
4. ✅ Verificar logs de auditoria (`/dashboard/audit-logs`)
5. ✅ Deploy em produção

---

**Versão:** 2.5 | **Data:** 2025-10-31 | **Status:** ✅ Estável
