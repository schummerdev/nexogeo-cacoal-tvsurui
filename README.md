# 🎯 NexoGeo - Sistema Completo de Promoções e Engajamento

> Sistema web completo para gerenciamento de promoções, sorteios e engajamento de participantes com recursos avançados de IA, geolocalização e analytics.

![Versão](https://img.shields.io/badge/versão-2.5-blue.svg)
![Status](https://img.shields.io/badge/status-estável-green.svg)
![Testes](https://img.shields.io/badge/testes-97%2B-brightgreen.svg)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black.svg)

---

## 📑 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação](#-instalação)
- [Comandos Disponíveis](#-comandos-disponíveis)
- [Funcionalidades Especiais](#-funcionalidades-especiais)
- [Arquitetura](#-arquitetura)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Versões Estáveis](#-versões-estáveis)
- [Documentação Adicional](#-documentação-adicional)

---

## 🎯 Visão Geral

NexoGeo é uma plataforma completa para gerenciamento de promoções e engajamento de participantes, com recursos avançados como:

- 🎮 **Jogo Interativo "Caixa Misteriosa"** com geração de dicas por IA
- 🗺️ **Mapas Interativos** com visualização de participantes
- 📊 **Dashboard Analytics** com métricas em tempo real
- 🎲 **Sistema de Sorteios** inteligente e automatizado
- 🔗 **Gerador de Links** com tracking UTM
- 📱 **QR Codes** para campanhas offline
- 🔐 **Sistema de Autenticação** com controle de acesso baseado em papéis

**Versão Atual:** 2.5 (Estável)
**Última Atualização:** 2025-10-24
**Deploy:** https://nexogeo-demo.vercel.app

---

## ✨ Funcionalidades

### 🎮 Caixa Misteriosa (Mystery Box Game)

Sistema de jogo ao vivo interativo tipo "adivinhação de produto":

- **Painel Admin** (`/dashboard/caixa-misteriosa`)
  - Gerenciamento de jogos, patrocinadores e produtos
  - Controle ao vivo com revelação progressiva de dicas
  - Sistema de referência para palpites extras
  - Sorteio automático de ganhadores

- **Geração de Dicas com IA Google Gemini**
  - Modelo: `gemini-2.0-flash-exp` (fallback automático entre 9 modelos)
  - Prompt dual: base técnico + complemento customizado
  - Moderação automática de conteúdo ofensivo
  - Logs detalhados para diagnóstico

- **Página Pública** (`/caixa-misteriosa-pub`)
  - Interface para participantes enviarem palpites
  - Cadastro integrado com geolocalização
  - Sistema de referência (ganhe +1 palpite por amigo indicado)
  - Histórico de palpites em tempo real

- **Validação Inteligente de Palpites**
  - 1ª camada: Validação por palavras-chave (normalização + stemming)
  - 2ª camada: Levenshtein distance (tolerância a typos)
  - 3ª camada: Google Gemini AI (validação contextual)

### 🗺️ Mapas Interativos

**Página:** `/dashboard/mapas`

- Visualização geográfica de participantes usando Leaflet
- Heatmaps de densidade por região
- Markers com informações detalhadas
- Filtros por promoção, cidade e bairro
- Geolocalização automática via browser

### 🔗 Gerador de Links

**Página:** `/dashboard/gerador-links`

- Geração automática de links com parâmetros UTM
- QR Codes para campanhas offline
- Tracking de origem (source, medium, campaign)
- Dashboard de análise de tráfego (`/dashboard/mapa-participantes`)
- Auto-geração para redes sociais (WhatsApp, Instagram, Facebook)

### 🎲 Sistema de Sorteios

**Páginas:**
- `/dashboard/sorteio` - Painel admin
- `/sorteio-publico` - Resultados públicos

**Recursos:**
- Gerenciamento automático de status de promoções
- Validação de participantes elegíveis
- Logs de auditoria completos
- Reversibilidade (cancelar sorteio restaura status "ativa")
- Página pública responsiva para divulgação

### 📊 Dashboard Analytics

**Página:** `/dashboard`

**Métricas em Tempo Real:**
- Total de participantes únicos (deduplicados)
- Promoções ativas
- Participantes últimas 24h
- Gráficos de crescimento
- Atividades recentes

**Recursos:**
- Query SQL otimizada com CTE
- Deduplicação automática por telefone
- Inclusão de participantes da Caixa Misteriosa
- Atualização automática

### 👥 Gerenciamento de Participantes

**Página:** `/dashboard/participantes`

- Lista unificada (promoções regulares + Caixa Misteriosa)
- Filtros por promoção, cidade, bairro
- Busca por nome/telefone
- Edição e exclusão de participantes
- Exportação para Excel
- Toggle para incluir/excluir Caixa Misteriosa
- Paginação (50 registros por página)

### 🔐 Sistema de Autenticação

- Login com JWT
- Controle de acesso baseado em papéis:
  - `admin` - Acesso completo
  - `moderator` - Gerenciamento de conteúdo
  - `editor` - Edição de conteúdo
  - `viewer` - Somente leitura
  - `user` - Acesso básico
- Logs de auditoria (`/dashboard/audit-logs`)

---

## 🛠️ Stack Tecnológico

### Frontend
- **React** 18.2.0 - SPA com React Router
- **Leaflet** - Mapas interativos
- **Chart.js** - Gráficos e visualizações
- **ExcelJS** - Exportação de dados
- **QRCode.react** - Geração de QR codes

### Backend
- **Node.js** + **Express.js** - API RESTful
- **PostgreSQL** - Banco de dados relacional
- **node-pg-migrate** - Migrações de banco
- **Google Generative AI** - Integração com Gemini

### Deploy & Infraestrutura
- **Vercel** - Serverless Functions
- **Neon** - PostgreSQL gerenciado
- **JWT** - Autenticação stateless

### Testes
- **Jest** - Framework de testes
- **React Testing Library** - Testes de componentes
- **97+ testes** - Cobertura abrangente

---

## 📁 Estrutura do Projeto

```
nexogeo/
├── src/                          # Frontend React
│   ├── components/               # Componentes reutilizáveis
│   │   ├── DashboardLayout/      # Header, Sidebar
│   │   ├── LoginForm/            # Formulário de login
│   │   ├── ThemeSelector/        # Seletor de tema
│   │   ├── InteractiveMap/       # Mapa Leaflet
│   │   ├── ConfirmModal/         # Modais de confirmação
│   │   └── EditParticipanteModal/
│   ├── pages/                    # Páginas da aplicação (lazy loaded)
│   │   ├── AdminDashboardPage.jsx        # Dashboard principal
│   │   ├── ParticipantesPage.jsx         # Lista de participantes
│   │   ├── CaixaMisteriosaPage.jsx       # Admin Caixa Misteriosa
│   │   ├── CaixaMisteriosaPubPage.jsx    # Página pública do jogo
│   │   ├── CaixaMisteriosaSorteioPage.jsx # Sorteio do jogo
│   │   ├── MapasPage.jsx                 # Mapas interativos
│   │   ├── GeradorLinksPage.jsx          # Gerador de links
│   │   ├── SorteioPage.jsx               # Sorteios gerais
│   │   └── AuditLogsPage.jsx             # Logs de auditoria
│   ├── contexts/                 # Contextos globais
│   │   ├── AuthContext.js        # Autenticação
│   │   ├── ThemeContext.jsx      # Tema claro/escuro
│   │   ├── ToastContext.js       # Notificações
│   │   └── LayoutContext.js      # Estado do layout
│   ├── services/                 # Camada de serviços (API)
│   │   ├── authService.js        # Autenticação
│   │   ├── participanteService.js # Participantes
│   │   ├── promocaoService.js    # Promoções
│   │   ├── sorteioService.js     # Sorteios
│   │   ├── dashboardService.js   # Dashboard
│   │   └── auditService.js       # Auditoria
│   ├── hooks/                    # Custom hooks
│   │   └── useCaixaMisteriosa.js # Hook do jogo
│   ├── utils/                    # Utilitários
│   │   ├── formatters.js         # Formatação de dados
│   │   └── validators.js         # Validações
│   └── App.jsx                   # Componente raiz
│
├── api/                          # Backend Express (Vercel Serverless)
│   ├── index.js                  # Handler consolidado (router principal)
│   ├── caixa-misteriosa.js       # Handler dedicado para jogo ao vivo
│   ├── _handlers/                # Handlers modulares
│   │   ├── participantes.js      # Endpoint unificado de participantes
│   │   └── authHelper.js         # Autenticação helper
│   ├── _lib/                     # Bibliotecas compartilhadas
│   │   ├── security.js           # Rate limiting, CORS, headers
│   │   └── database.js           # Connection pool PostgreSQL
│   └── migrations/               # Migrações PostgreSQL
│       ├── 1234567890123_create-participantes.js
│       ├── 1234567890124_create-promocoes.js
│       └── ...
│
├── lib/                          # Libs compartilhadas (frontend + backend)
│   └── db.js                     # Conexão PostgreSQL
│
├── public/                       # Arquivos estáticos
│   ├── index.html
│   └── favicon.ico
│
├── docs/                         # Documentação
│   ├── CLAUDE.md                 # Instruções para Claude Code
│   ├── MIGRATIONS.md             # Guia de migrações
│   ├── RESTORE_POINTS.md         # Pontos de restauração Git
│   ├── CORRECAO-CONTAGENS-2025-10-24.md
│   └── DIAGNOSTICO-SORTEIO-2025-10-24.md
│
├── .vercel/                      # Configuração Vercel
├── .env.example                  # Exemplo de variáveis
├── package.json                  # Dependências
└── README.md                     # Este arquivo
```

### Arquivos Críticos

**Backend:**
- `api/index.js` - Roteador principal (consolidado para limite de 12 funções Vercel)
- `api/caixa-misteriosa.js` - Handler dedicado do jogo (complexidade)
- `api/_handlers/participantes.js` - Endpoint unificado (deduplicação + Caixa Misteriosa)
- `api/_lib/security.js` - Rate limiting, CORS, CSP headers
- `lib/db.js` - Connection pool PostgreSQL

**Frontend:**
- `src/App.jsx` - Rotas e lazy loading
- `src/contexts/AuthContext.js` - Autenticação global
- `src/services/*.js` - Camada de comunicação com API
- `src/pages/*.jsx` - Páginas lazy-loaded
- `src/hooks/useCaixaMisteriosa.js` - Lógica do jogo

**Configuração:**
- `vercel.json` - Configuração de rotas e rewrites
- `package.json` - Scripts e dependências
- `.env` - Variáveis de ambiente (não commitado)

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta PostgreSQL (Neon recomendado)
- Conta Vercel (para deploy)
- Google API Key (para Gemini AI - opcional)

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/schummerdev/nexogeo-demo.git
   cd nexogeo-demo
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```

   Edite `.env` e configure:
   ```env
   DATABASE_URL=postgresql://user:pass@host:port/dbname
   JWT_SECRET=seu_secret_aqui
   GOOGLE_API_KEY=AIzaSy...  # Opcional (Caixa Misteriosa)
   ```

4. **Execute as migrações**
   ```bash
   npm run migrate
   ```

5. **Inicie o ambiente de desenvolvimento**
   ```bash
   npm run dev:full
   ```

   Ou separadamente:
   ```bash
   npm start           # Frontend (porta 3000)
   npm run dev:api     # Backend (porta 3002)
   ```

6. **Acesse a aplicação**
   - Frontend: http://localhost:3000
   - API: http://localhost:3002/api

---

## ⚙️ Comandos Disponíveis

### Desenvolvimento

```bash
npm start               # Frontend apenas (porta 3000)
npm run dev:api         # Backend apenas (porta 3002)
npm run dev:full        # Frontend + Backend simultaneamente
```

### Build

```bash
npm run build           # Build de produção do React
npm run analyze         # Análise de bundle com source-map-explorer
npm run analyze:bundle  # Análise com webpack-bundle-analyzer
```

### Testes

```bash
npm test                # Testes interativos
npm run test:watch      # Testes em modo watch
npm run test:coverage   # Testes com relatório de cobertura
npm run test:ci         # Testes em modo CI (sem watch)
npm run test:sprite     # Ferramenta TestSprite MCP
```

### Banco de Dados

```bash
npm run migrate                    # Executa migrações pendentes
npx node-pg-migrate create nome    # Cria nova migração
npx node-pg-migrate down           # Reverte última migração
```

### Performance

```bash
npm run performance:audit  # Lighthouse audit
```

---

## 🎨 Funcionalidades Especiais

### 1. Caixa Misteriosa - Integração com IA

**Arquivo:** `api/caixa-misteriosa.js`

A Caixa Misteriosa usa Google Gemini AI para gerar dicas criativas sobre produtos:

**Modelos Suportados (fallback automático):**
```javascript
const GEMINI_MODELS = [
  'gemini-2.0-flash-exp',      // Primeiro (mais recente)
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-latest',
  'gemini-1.0-pro-latest',
  'gemini-1.0-pro',
  'gemini-pro',
  'models/gemini-1.5-flash',
  'models/gemini-pro'
];
```

**Prompt Dual:**
- **Base Técnico** (invisível ao usuário): Regras fixas, formatação JSON
- **Complemento Customizado**: Contexto adicional opcional (ex: "tema infantil")

**Moderação de Conteúdo:**
- Detecção automática de conteúdo ofensivo
- Rejeição de prompts maliciosos
- Logs detalhados para auditoria

**Validação de Palpites (3 camadas):**

```javascript
// 1️⃣ Keywords (mais rápido)
validateByKeywords(guess, product)
// → "maquina lavar" ✅ aceita para "máquina de lavar roupa"

// 2️⃣ Levenshtein (typos)
validateWithLevenshtein(guess, product)
// → "maqina lavar" ✅ aceita (distância 1)

// 3️⃣ Google Gemini AI (contexto)
validateWithAI(guess, product)
// → "lavadora" ✅ aceita (sinônimo contextual)
```

### 2. Mapas Interativos - Leaflet

**Arquivo:** `src/pages/MapasPage.jsx`

**Recursos:**
- Heatmaps de densidade
- Markers customizados com popups
- Filtros em tempo real
- Geolocalização via browser

**Componente:** `src/components/InteractiveMap.jsx`

**Bibliotecas:**
- `react-leaflet` - Integração React
- `leaflet.heat` - Heatmaps
- OpenStreetMap tiles

### 3. Gerador de Links - UTM Tracking

**Arquivo:** `src/pages/GeradorLinksPage.jsx`

**Geração Automática:**
```javascript
// Exemplo de link gerado
https://nexogeo.com.br/captura/5?utm_source=instagram&utm_medium=story&utm_campaign=verao2025

// QR Code associado
<QRCode value={link} size={256} />
```

**Tracking Persistido:**
- Parâmetros salvos em `participantes.origem_source/medium`
- Dashboard de análise (`/dashboard/mapa-participantes`)
- Relatórios por origem

### 4. Deduplicação Automática de Participantes

**Arquivo:** `api/_handlers/participantes.js` (linhas 122-152)

**Lógica:**
```sql
-- CTE unificada
WITH participantes_unificados AS (
  SELECT telefone as phone, participou_em as created_at
  FROM participantes

  UNION ALL

  SELECT phone, created_at
  FROM public_participants
),
participantes_unicos AS (
  -- Deduplicar por telefone, manter mais recente
  SELECT DISTINCT ON (phone) phone, created_at
  FROM participantes_unificados
  ORDER BY phone, created_at DESC
)
SELECT COUNT(*) FROM participantes_unicos;
```

**Resultado:**
- 107 registros → 78 únicos (29 duplicatas removidas)
- Prioriza participante mais recente
- Inclui Caixa Misteriosa automaticamente

---

## 🏗️ Arquitetura

### Padrões Arquiteturais

#### 1. Lazy Loading de Páginas

Todas as páginas são carregadas sob demanda:

```javascript
// src/App.jsx
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));
const ParticipantesPage = React.lazy(() => import('./pages/ParticipantesPage'));
const CaixaMisteriosaPage = React.lazy(() => import('./pages/CaixaMisteriosaPage'));
// ...

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<AdminDashboardPage />} />
    {/* ... */}
  </Routes>
</Suspense>
```

**Benefícios:**
- Reduz tamanho do bundle inicial
- Carrega Chart.js e Leaflet apenas quando necessário
- Melhora performance (FCP, LCP)

#### 2. Arquitetura de Contextos

Quatro contextos principais para estado global:

```javascript
// src/contexts/
AuthContext.js      // Autenticação, papéis, permissões
ThemeContext.jsx    // Tema claro/escuro
ToastContext.js     // Sistema de notificações
LayoutContext.js    // Estado do sidebar (aberto/fechado)
```

**Uso:**
```javascript
const { userRole, canExportData } = useAuth();
const { theme, toggleTheme } = useTheme();
const { showToast } = useToast();
```

#### 3. Camada de Serviços

Abstração completa da comunicação com API:

```javascript
// src/services/participanteService.js
export const fetchParticipantesUnificados = async (includePublic = true) => {
  const url = `/api/participantes?unified=true&includePublic=${includePublic}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Serviços Disponíveis:**
- `authService.js` - Login, logout, JWT
- `participanteService.js` - CRUD participantes
- `promocaoService.js` - CRUD promoções
- `sorteioService.js` - Sorteios e ganhadores
- `dashboardService.js` - Métricas e stats
- `auditService.js` - Logs de auditoria

#### 4. Controle de Acesso Baseado em Papéis (RBAC)

```javascript
// Componente ProtectedRoute
<ProtectedRoute requiredRole="admin">
  <AdminPage />
</ProtectedRoute>

// Hook useAuth
const { canViewParticipants, canExportData, canDeletePromotion } = useAuth();
```

**Papéis:**
- `admin` - Acesso total
- `moderator` - Gerenciar conteúdo
- `editor` - Editar conteúdo
- `viewer` - Somente visualização
- `user` - Acesso básico

### Backend - Limite de Funções Serverless

**Vercel Free Tier:** Máximo 12 funções serverless

**Solução Implementada:**
- Handler consolidado (`api/index.js`) com roteamento via query params
- Handlers dedicados apenas para lógica complexa (`api/caixa-misteriosa.js`)

**Roteamento:**
```javascript
// Query params (explícito)
/api/?route=promocoes&endpoint=list

// Path-based (implícito)
/api/promocoes  // → route=promocoes (extraído automaticamente)

// Handler dedicado (bypass do index.js)
/api/caixa-misteriosa/game/31  // → api/caixa-misteriosa.js
```

### Segurança

**Arquivo:** `api/_lib/security.js`

**Implementações:**
- Rate limiting global (60 req/min por IP)
- CORS whitelist para origens permitidas
- Security headers (CSP, X-Frame-Options, HSTS)
- JWT com verificação de expiração
- Logs de auditoria para operações críticas

**Headers de Segurança:**
```javascript
'X-Frame-Options': 'DENY',
'X-Content-Type-Options': 'nosniff',
'Referrer-Policy': 'strict-origin-when-cross-origin',
'Content-Security-Policy': "default-src 'self'; ...",
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
```

---

## 🔐 Variáveis de Ambiente

### Variáveis Requeridas

```env
# Banco de Dados (obrigatório)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Autenticação (obrigatório)
JWT_SECRET=seu_secret_seguro_aqui

# Google AI - Caixa Misteriosa (opcional)
GOOGLE_API_KEY=AIzaSy...

# Ambiente (opcional)
NODE_ENV=production|development
```

### Configuração no Vercel

1. Acesse o dashboard do projeto na Vercel
2. Settings → Environment Variables
3. Adicione cada variável (Production, Preview, Development)
4. Redeploy após adicionar variáveis

### Arquivo .env.example

```env
# Database
DATABASE_URL=postgresql://user:password@hostname:5432/database?sslmode=require

# Authentication
JWT_SECRET=your_very_long_and_secure_secret_key_here

# Google Generative AI (Gemini) - Optional
GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Environment
NODE_ENV=development
```

---

## 🧪 Testes

### Estrutura de Testes

```
src/
├── components/
│   ├── LoginForm/
│   │   ├── LoginForm.jsx
│   │   └── LoginForm.test.jsx
│   ├── ThemeSelector/
│   │   ├── ThemeSelector.jsx
│   │   └── ThemeSelector.test.jsx
│   └── DashboardLayout/
│       ├── Header.jsx
│       ├── Header.test.jsx
│       ├── Sidebar.jsx
│       └── Sidebar.test.jsx
├── contexts/
│   ├── ThemeContext.jsx
│   ├── ThemeContext.test.jsx
│   ├── ToastContext.js
│   └── ToastContext.test.jsx
├── services/
│   ├── authService.js
│   ├── authService.test.js
│   └── ...outros serviços com testes
└── pages/
    ├── DashboardHomePage.jsx
    └── DashboardHomePage.test.jsx
```

### Estatísticas de Testes

- **Total:** 97+ testes
- **Componentes:** Header, Sidebar, LoginForm, ThemeSelector
- **Contextos:** ThemeContext, ToastContext
- **Serviços:** authService, participanteService, etc.
- **Páginas:** DashboardHomePage

### Executar Testes

```bash
# Todos os testes
npm test

# Com cobertura
npm run test:coverage

# Modo watch
npm run test:watch

# Testes específicos
npm test -- --testPathPattern="LoginForm"

# CI mode
npm run test:ci
```

### Exemplo de Teste

```javascript
// src/components/LoginForm/LoginForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from './LoginForm';

test('deve exibir erro com credenciais inválidas', async () => {
  render(<LoginForm />);

  fireEvent.change(screen.getByLabelText(/usuário/i), {
    target: { value: 'usuario_invalido' }
  });

  fireEvent.change(screen.getByLabelText(/senha/i), {
    target: { value: 'senha_errada' }
  });

  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

  await waitFor(() => {
    expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
  });
});
```

---

## 🚀 Deploy

### Deploy na Vercel (Recomendado)

1. **Conecte o repositório GitHub**
   ```bash
   npx vercel
   ```

2. **Configure variáveis de ambiente**
   - Dashboard Vercel → Settings → Environment Variables
   - Adicione `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_API_KEY`

3. **Deploy automático**
   - Push na branch `main` → deploy automático
   - Pull requests → preview deployments

4. **Execute migrações (primeira vez)**
   ```bash
   # Localmente, apontando para DB de produção
   DATABASE_URL=<production_url> npm run migrate
   ```

### Configuração do Vercel

**vercel.json:**
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/api/caixa-misteriosa/(.*)",
      "destination": "/api/caixa-misteriosa"
    }
  ]
}
```

### Deploy Manual

```bash
# Build de produção
npm run build

# Deploy
VERCEL_TOKEN=<seu_token> npx vercel --prod
```

---

## 📌 Versões Estáveis

### v2.5 (Atual) - Correções de Contagens

**Commit:** `61c7c87` | **Tag:** `v2.5` | **Data:** 2025-10-24

**Correções Aplicadas:**
- ✅ Dashboard unificado com deduplicação por telefone
- ✅ Inclusão automática de participantes da Caixa Misteriosa
- ✅ Total Cadastrados corrigido (0 → 45)
- ✅ Query SQL otimizada com CTE
- ✅ 123 participantes únicos em todo o sistema

**Como Restaurar:**
```bash
git checkout v2.5
# ou
git checkout 61c7c87
```

**Documentação:** `CORRECAO-CONTAGENS-2025-10-24.md`

### v1.0.1 - Google AI Fixed

**Commit:** `fab0da6` | **Data:** 2025-10-03

**Estado:**
- ✅ Google Gemini AI integrado e funcionando
- ✅ Detecção automática de modelos disponíveis
- ✅ Suporte para Gemini 2.0, 1.5 e 1.0

**Como Restaurar:**
```bash
git checkout v1.0.1-google-ai-fixed
```

---

## 📚 Documentação Adicional

### Arquivos de Documentação

- **`CLAUDE.md`** - Instruções completas para desenvolvimento com Claude Code
- **`MIGRATIONS.md`** - Guia de migrações de banco de dados
- **`RESTORE_POINTS.md`** - Pontos de restauração Git documentados
- **`CORRECAO-CONTAGENS-2025-10-24.md`** - Correções v2.5 (detalhes técnicos)
- **`DIAGNOSTICO-SORTEIO-2025-10-24.md`** - Análise técnica do sistema de sorteio

### Guias de Uso

#### Criar Nova Promoção
1. Acesse `/dashboard/promocoes`
2. Clique em "Nova Promoção"
3. Preencha dados (nome, datas, regras)
4. Clique em "Salvar"

#### Realizar Sorteio
1. Acesse `/dashboard/sorteio`
2. Selecione promoção "ativa"
3. Revise participantes elegíveis
4. Clique em "Realizar Sorteio"
5. Sistema automaticamente marca promoção como "encerrada"

#### Criar Jogo Caixa Misteriosa
1. Acesse `/dashboard/caixa-misteriosa`
2. Clique em "Novo Jogo"
3. Adicione patrocinador e produto
4. Gere dicas com IA (ou adicione manualmente)
5. Inicie jogo ao vivo
6. Revele dicas progressivamente
7. Realize sorteio quando tiver palpites corretos

#### Exportar Participantes
1. Acesse `/dashboard/participantes`
2. Aplique filtros desejados
3. Clique em "Exportar Dados"
4. Arquivo Excel será baixado automaticamente

---

## 🤝 Contribuindo

### Padrões de Código

**Frontend:**
```jsx
// ✅ DO: Lazy loading de páginas
const MyPage = React.lazy(() => import('./pages/MyPage'));

// ✅ DO: Usar Header padrão
import Header from '../DashboardLayout/Header';
<Header title="Título" subtitle="Subtítulo" />

// ✅ DO: Usar utilitários de formatação
import { formatUserName, formatPhonePreview } from '../utils/formatters';

// ❌ DON'T: Aplicar .reverse() em listas da API
// API já retorna ORDER BY created_at DESC
```

**Backend:**
```javascript
// ✅ DO: Auditar operações sensíveis
const { logAudit } = require('./auditService');
await logAudit(userId, 'SORTEIO_REALIZADO', { promocao_id });

// ✅ DO: Usar handler consolidado
// Em api/index.js, adicionar case no switch (route)

// ❌ DON'T: Criar novas funções serverless
// Limite de 12 - usar api/index.js com query params
```

### Workflow Git

```bash
# Branch de feature
git checkout -b feature/nova-funcionalidade

# Commits semânticos
git commit -m "feat: Adiciona validação de CPF"
git commit -m "fix: Corrige bug no sorteio"
git commit -m "docs: Atualiza README"

# Push e PR
git push origin feature/nova-funcionalidade
```

---

## 📄 Licença

Este projeto é proprietário e confidencial.

---

## 👨‍💻 Autores

- **Schummer Dev** - Desenvolvimento principal
- **Claude Code** - Assistência de desenvolvimento e documentação

---

## 📞 Suporte

Para suporte e dúvidas:
- 📧 Email: suporte@nexogeo.com.br
- 🐛 Issues: https://github.com/schummerdev/nexogeo-demo/issues

---

**Última Atualização:** 2025-10-24
**Versão:** 2.5 (Estável)
**Status:** 🟢 Em Produção
