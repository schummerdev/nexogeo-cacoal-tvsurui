# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Instruções do Task Master AI
**Importar comandos e diretrizes do workflow de desenvolvimento do Task Master, tratar como se a importação estivesse no arquivo CLAUDE.md principal.**
@./.taskmaster/CLAUDE.md

## ⚠️ Regras Importantes do Cursor
Este projeto possui regras específicas em `.cursor/rules/`. Principais diretrizes:
- Estrutura de regras: descrição clara, globs específicos, código com ✅/❌ exemplos
- Referências a arquivos: `[filename](mdc:path/to/file)`
- Manter regras DRY e cross-referenciadas
- Ver `.cursor/rules/cursor_rules.mdc` para detalhes completos

## Comandos de Desenvolvimento

### Build & Desenvolvimento
```bash
npm start              # Inicia apenas o frontend (servidor de desenvolvimento React na porta 3000)
npm run dev:api        # Inicia apenas o servidor de API backend (porta 3002)
npm run dev:full       # Inicia frontend e backend simultaneamente
npm run build          # Build do frontend React para produção
```

### Testes
```bash
npm test                    # Executa testes interativamente
npm run test:watch         # Executa testes em modo watch
npm run test:coverage      # Executa testes com relatório de cobertura
npm run test:ci            # Executa testes em modo CI (cobertura + sem watch)
npm run test:sprite        # Executa ferramenta de teste TestSprite MCP
```

### Performance & Análise
```bash
npm run analyze            # Analisa tamanho do bundle com source-map-explorer
npm run analyze:bundle     # Analisa bundle com webpack-bundle-analyzer
npm run performance:audit  # Executa auditoria de performance Lighthouse
```

### Migrações de Banco de Dados
```bash
npm run migrate                    # Executa todas as migrações pendentes
npx node-pg-migrate create nome    # Cria nova migração
npx node-pg-migrate down           # Reverte última migração
```

Localização: arquivos em `api/migrations/`
**Importante**: Após deploy na Vercel, migrações devem ser executadas manualmente (ver `MIGRATIONS.md`)

## Visão Geral da Arquitetura

### Stack Tecnológico
- **Frontend**: React 18.2.0 SPA com React Router
- **Backend**: Express.js API servindo de `/api`
- **Banco de Dados**: PostgreSQL com `node-pg-migrate`
- **Deploy**: Vercel Serverless Functions
- **Testes**: Jest + React Testing Library (97+ testes)

### Estrutura de Diretórios
```
nexogeo/
├── src/                    # Frontend React
│   ├── components/        # Componentes reutilizáveis
│   ├── pages/            # Páginas da aplicação (lazy loaded)
│   ├── contexts/         # Contextos globais (Auth, Theme, Toast, Layout)
│   ├── services/         # Camada de serviços para API
│   └── utils/            # Utilitários (formatação, validação)
├── api/                   # Backend Express (Vercel serverless)
│   ├── index.js          # Handler consolidado (roteador principal)
│   ├── caixa-misteriosa.js  # Handler dedicado para jogo ao vivo
│   ├── migrations/       # Migrações PostgreSQL
│   └── _lib/            # Bibliotecas compartilhadas (security, etc)
├── lib/                   # Libs compartilhadas (db.js para conexão PostgreSQL)
└── public/               # Arquivos estáticos
```

### Principais Padrões Arquiteturais

#### 1. Estratégia de Lazy Loading
Todas as páginas são carregadas sob demanda usando `React.lazy()` e `Suspense`:
- Componentes críticos (LoginForm, DashboardLayout) carregam imediatamente
- Páginas carregam sob demanda com spinners de loading
- Rotas externas (`/external/*`) contornam o layout principal para popups

#### 2. Arquitetura de Contextos
Quatro contextos principais fornecem estado global:
- **AuthContext**: Autenticação de usuário, papéis, permissões
- **ThemeContext**: Alternância de temas (modos claro/escuro)
- **ToastContext**: Sistema global de notificações
- **LayoutContext**: Estado do layout do dashboard (sidebar aberta/fechada)

#### 3. Camada de Serviços
Serviços em `src/services/` lidam com toda comunicação de API:
- **authService.js**: Autenticação, gerenciamento de tokens JWT
- **promocaoService.js**: Gerenciamento de promoções
- **participanteService.js**: Dados de participantes
- **sorteioService.js**: Funcionalidade de sorteios/draws
- **dashboardService.js**: Analytics do dashboard
- **auditService.js**: Logging de auditoria e segurança

#### 4. Controle de Acesso Baseado em Papéis
Rotas são protegidas com permissões granulares via `ProtectedRoute`:
- `admin`: Acesso completo ao sistema
- `moderator`: Gerenciamento de conteúdo
- `editor`: Edição de conteúdo
- `viewer`: Acesso somente leitura
- `user`: Acesso básico de participante

### Arquitetura Backend

#### Limite de Funções Serverless Vercel
- **Vercel Free Tier**: Máximo 12 funções serverless
- **Solução implementada**: Handler consolidado em `api/index.js`
- **Roteamento**: Via query params `?route=RESOURCE&endpoint=ACTION` OU path `/api/RESOURCE`
- **Handlers dedicados**: Apenas para funcionalidades complexas (ex: `api/caixa-misteriosa.js`)

#### Exemplo de Roteamento
```javascript
// Query params (explícito)
/api/?route=promocoes&endpoint=list

// Path-based (implícito - extraído automaticamente)
/api/promocoes  // → route=promocoes
/api/participantes  // → route=participantes

// Handlers dedicados (bypass do index.js)
/api/caixa-misteriosa/*  // → api/caixa-misteriosa.js
```

#### Segurança
- Rate limiting global (60 req/min por IP)
- CORS whitelist para origens permitidas
- Headers de segurança (CSP, X-Frame-Options, HSTS)
- Autenticação JWT com verificação de expiração
- Logging de auditoria para operações críticas

### Banco de Dados PostgreSQL
- Conexão gerenciada via `lib/db.js` com connection pooling
- Migrações com `node-pg-migrate` em `api/migrations/`
- Trilhas de auditoria para compliance
- **Variáveis requeridas**: `DATABASE_URL`, `JWT_SECRET`

## Principais Funcionalidades & Componentes

### Funcionalidades Especiais

#### 1. Caixa Misteriosa (`/dashboard/caixa-misteriosa`)
Sistema de jogo ao vivo interativo tipo "adivinhação de produto":
- **Painel Admin**: Gerenciamento de jogos, patrocinadores, produtos e dicas
- **Página Pública** (`/caixa-misteriosa-pub`): Interface para participantes enviarem palpites
- **Geração de Dicas com IA**: Integração com Google Gemini AI
  - Modelo: `gemini-2.0-flash-exp` (fallback automático entre 9 modelos)
  - Prompt dual: base técnico + complemento customizado
  - Moderação automática de conteúdo ofensivo
  - Requer `GOOGLE_API_KEY` em variáveis de ambiente
- **Recursos**: Revelação progressiva de dicas, sistema de referência, palpites extras
- **API dedicada**: `api/caixa-misteriosa.js` (handler separado por complexidade)

#### 2. Mapas Interativos (`/dashboard/mapas`)
Visualização geográfica de participantes usando Leaflet:
- Heatmaps de densidade de participantes
- Markers com informações detalhadas
- Filtros por promoção, cidade, bairro

#### 3. Gerador de Links (`/dashboard/gerador-links`)
Sistema completo de tracking e atribuição:
- Geração automática de links com parâmetros UTM
- QR Codes para campanhas offline
- Tracking de origem (source, medium, campaign)
- Dashboard de análise de tráfego (`/dashboard/mapa-participantes`)

#### 4. Sorteios & Promoções
- **Página de Sorteio Público** (`/sorteio-publico`): Resultados voltados ao público
- **Gerenciamento automático de status**: Promoções marcadas como "encerrada" após sorteio
- **Reversibilidade**: Cancelamento de ganhador restaura status "ativa"
- **Logs de Auditoria** (`/dashboard/audit-logs`): Monitoramento de segurança exclusivo para admins

### Componentes Críticos

#### Layout & Navegação
- **DashboardLayout**: Wrapper principal com Header/Sidebar responsivo mobile
- **Header**: Componente reutilizável com menu hamburger, aceita children para botões customizados
- **ProtectedRoute**: Guarda de rota com acesso baseado em papel

#### Formulários & Visualização
- **CapturaForm**: Formulário público de registro de participantes
- **InteractiveMap**: Integração Leaflet para funcionalidades de geolocalização
- **ThemeSelector**: Alternância de tema com persistência (modos dropdown/inline)

## Diretrizes de Desenvolvimento

### Comunicação da API
- **URL base**: `/api` (proxy configurado para desenvolvimento)
- **Autenticação**: Token JWT via header `Authorization: Bearer <token>`
- **Formato de resposta**: JSON com estrutura `{ success: boolean, data?: any, error?: string }`
- **CORS**: Configurado apenas para origens permitidas (localhost:3000-3002, domínios de produção)

### Padrões de Código

#### Frontend
```jsx
// ✅ DO: Lazy loading de páginas
const MyPage = React.lazy(() => import('./pages/MyPage'));

// ✅ DO: Usar Header padrão para consistência
import Header from '../DashboardLayout/Header';
<Header title="Título" subtitle="Subtítulo">
  {/* Botões customizados opcionais */}
</Header>

// ✅ DO: Usar utilitários de formatação
import { formatUserName, formatPhonePreview } from '../utils/formatters';
formatUserName('João Silva') // → "João S."
formatPhonePreview('11999999999') // → "****9999"

// ❌ DON'T: Aplicar .reverse() em listas da API (já vêm ordenadas)
// API retorna ORDER BY created_at DESC - usar ordem direta
```

#### Backend
```javascript
// ✅ DO: Auditar operações sensíveis
const { logAudit } = require('./auditService');
await logAudit(userId, 'SORTEIO_REALIZADO', { promocao_id });

// ✅ DO: Usar handler consolidado para novas rotas
// Em api/index.js, adicionar case no switch (route)

// ❌ DON'T: Criar novas funções serverless (limite de 12)
// Use api/index.js com query params route/endpoint
```

### Variáveis de Ambiente Requeridas
```env
# Banco de Dados
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Autenticação
JWT_SECRET=seu_secret_aqui

# Google AI (Caixa Misteriosa)
GOOGLE_API_KEY=AIzaSy...

# Opcional
NODE_ENV=production|development
```

### Estratégia de Testes
- **Jest + React Testing Library** para testes de componentes
- **97+ testes** com foco em fluxos críticos de usuário
- **Cobertura**: Componentes, serviços, contextos e páginas principais
- **Executar testes**: `npm test` (interativo) ou `npm run test:coverage`

### Operações de Banco de Dados
- **Sempre usar migrações** para mudanças de schema em `api/migrations/`
- **Connection pooling** gerenciado via `lib/db.js`
- **Auditar operações sensíveis** via `auditService.js`
- **Após deploy na Vercel**: Executar migrações manualmente (ver `MIGRATIONS.md`)

## Configuração do Ambiente
1. Copie `.env.example` para `.env` no diretório raiz
2. Configure `DATABASE_URL` e `JWT_SECRET`
3. (Opcional) Configure `GOOGLE_API_KEY` para Caixa Misteriosa
4. Deploy na Vercel requer variáveis de ambiente no dashboard

## Otimizações de Performance
- Lazy loading de componentes reduz tamanho do bundle inicial
- Chart.js e Leaflet carregados apenas quando necessário
- Service Worker registrado para capacidades PWA
- Ferramentas de análise: `npm run analyze` ou `npm run analyze:bundle`

## Pontos de Restauração
Consulte `RESTORE_POINTS.md` para pontos de restauração Git documentados:
- **v1.0.1-google-ai-fixed**: Google AI Integration funcionando (commit: fab0da6)
  - Detecção automática de modelos Gemini disponíveis
  - Suporte para Gemini 2.0, 1.5 e 1.0
  - Prompt dual: base técnico + complemento customizado

## Padrões de UX/UI Específicos do Projeto

### Menu Mobile
Todos os módulos do dashboard **devem usar** o componente `Header` padrão:
```jsx
import Header from '../DashboardLayout/Header';

<Header title="Título" subtitle="Subtítulo">
  {/* Botões customizados opcionais */}
</Header>
```
- Menu hamburger automático (☰)
- Sidebar responsiva via LayoutContext
- ThemeSelector integrado
- User info e logout

### Formatação de Dados
Use utilitários em `src/utils/`:
- **Nomes**: `formatUserName(nome)` - "João Silva" → "João S."
- **Telefones**: `formatPhonePreview(telefone)` - "11999999999" → "****9999"

### Ordem de Listas (Caixa Misteriosa)
- **API retorna**: `ORDER BY created_at DESC` (mais recentes primeiro)
- **Frontend**: NÃO aplicar `.reverse()` - usar ordem direta da API
- **Formato de exibição**: `HH:MM - Nome - Bairro - Palpite ✅`

## 🎨 Design System v2.7 (Novo!)

O projeto agora possui um Design System aprimorado com novos efeitos visuais e cores. Consulte `DESIGN_SYSTEM_v2.7.md` para documentação completa.

### Paleta de Cores Extendida
```css
/* Cores Complementares */
--color-purple: #8b5cf6       /* Roxo */
--color-pink: #ec4899         /* Rosa */
--color-indigo: #6366f1       /* Índigo */
--color-cyan: #06b6d4         /* Ciano */
--color-teal: #14b8a6         /* Teal */
--color-lime: #84cc16         /* Lima */
```

### Novos Efeitos Disponíveis

#### Animações
- `.float` / `.float-slow`: Flutuação suave
- `.pulse-glow`: Pulso de luminosidade
- `.shimmer`: Efeito brilho (skeleton loading)
- `.bounce-in`: Entrada com salto
- `.slide-in-left` / `.slide-in-right`: Entradas laterais
- `.color-shift`: Rotação contínua de cores

#### Estilos Visuais
- `.gradient-border`: Borda com gradiente vibrante
- `.glow-border`: Borda com efeito luminoso
- `.neon`: Texto neon com brilho
- `.blur-bg` / `.blur-bg-dark`: Glassmorphism
- `.btn-gradient`: Botão com gradiente aprimorado
- `.text-gradient`: Texto com gradiente de cor
- `.underline-hover`: Sublinha animada ao hover

#### Efeitos de Ícones
- `.icon-rotate`: Rotação ao hover
- `.icon-scale`: Escala ao hover
- `.icon-bounce`: Salto ao hover

#### Estados Visuais
- `.loading-card`: Animação de carregamento
- `.success-state`: Estado de sucesso
- `.error-state`: Estado de erro (shake)
- `.warning-state`: Estado de aviso (pulsante)

### Como Usar

```jsx
// Exemplo: Card flutuante com brilho
<div class="card-modern float pulse-glow">
  <h2 class="text-gradient">Título Especial</h2>
  <button class="btn btn-gradient">Ação</button>
</div>

// Exemplo: Texto neon com entrada animada
<h1 class="neon slide-in-left">Bem-vindo</h1>

// Exemplo: Link com sublinha animada
<a href="#" class="underline-hover">Clique aqui</a>

// Exemplo: Ícone com rotação
<i class="icon-rotate">⚙️</i>
```

### Tema Escuro Automático
Todos os efeitos se adaptam automaticamente ao tema escuro do usuário via `@media (prefers-color-scheme: dark)`.

### Performance
- ✅ CSS-only (sem JavaScript)
- ✅ GPU Accelerated
- ✅ Acessibilidade (respeita `prefers-reduced-motion`)
- ✅ ~15KB adicional apenas
- ✅ Compatível com v2.6
