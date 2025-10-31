# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NexoGeo is a complete promotion management platform with interactive features, real-time analytics, and advanced AI integration. This document covers development commands, architecture patterns, and key implementation guidelines.

## Project Overview

**Project Name:** NexoGeo
**Current Version:** 2.5 (Stable)
**Status:** Production-ready
**Deploy:** Vercel Serverless Functions
**Database:** PostgreSQL (Neon)

**Key Stack:**
- Frontend: React 18.2 + React Router (SPA with lazy loading)
- Backend: Express.js on Vercel (consolidated handler pattern)
- Database: PostgreSQL with node-pg-migrate
- Testing: Jest + React Testing Library (97+ tests)
- AI Integration: Google Generative AI (Gemini)

## Development Commands

### Development & Running
```bash
npm start              # Frontend only (React dev server on port 3000)
npm run dev:api        # Backend only (Express API on port 3002)
npm run dev:full       # Frontend + Backend simultaneously (recommended)
npm run build          # Production build of React frontend
```

### Testing
```bash
npm test                    # Run tests interactively
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:ci            # CI mode (coverage + no watch)
npm run test:sprite        # TestSprite MCP testing tool
```

### Performance & Bundle Analysis
```bash
npm run analyze            # Analyze bundle size with source-map-explorer
npm run analyze:bundle     # Analyze bundle with webpack-bundle-analyzer
npm run performance:audit  # Run Lighthouse performance audit
```

### Database Migrations
```bash
npm run migrate                    # Run all pending migrations
npx node-pg-migrate create NAME    # Create new migration
npx node-pg-migrate down           # Revert last migration
```

**Location:** Migration files in `api/migrations/`

**Important:** After Vercel deploy, migrations must be run manually (see `MIGRATIONS.md`)

## Architecture Overview

### Directory Structure
```
nexogeo/
├── src/                        # React frontend SPA
│   ├── components/             # Reusable components
│   │   ├── DashboardLayout/    # Main dashboard wrapper (Header, Sidebar)
│   │   ├── LoginForm/          # Authentication form
│   │   ├── ThemeSelector/      # Light/dark mode toggle
│   │   ├── InteractiveMap/     # Leaflet map integration
│   │   ├── ConfirmModal/       # Confirmation dialogs
│   │   └── ...other components
│   ├── pages/                  # Lazy-loaded route pages
│   │   ├── AdminDashboardPage.jsx
│   │   ├── ParticipantesPage.jsx
│   │   ├── CaixaMisteriosaPage.jsx (admin panel)
│   │   ├── CaixaMisteriosaPubPage.jsx (public game)
│   │   ├── MapasPage.jsx
│   │   ├── GeradorLinksPage.jsx
│   │   ├── SorteioPage.jsx
│   │   ├── AuditLogsPage.jsx
│   │   └── ...other pages
│   ├── contexts/               # Global state management
│   │   ├── AuthContext.js      # User auth, roles, permissions
│   │   ├── ThemeContext.jsx    # Theme light/dark
│   │   ├── ToastContext.js     # Notification system
│   │   └── LayoutContext.js    # Sidebar open/closed state
│   ├── services/               # API communication layer
│   │   ├── authService.js
│   │   ├── participanteService.js
│   │   ├── promocaoService.js
│   │   ├── sorteioService.js
│   │   ├── dashboardService.js
│   │   ├── auditService.js
│   │   └── ...other services
│   ├── hooks/                  # Custom React hooks
│   │   └── useCaixaMisteriosa.js
│   ├── utils/                  # Utilities
│   │   ├── formatters.js       # Data formatting functions
│   │   └── validators.js       # Validation functions
│   └── App.jsx                 # Root component with routes
│
├── api/                        # Backend (Express on Vercel)
│   ├── index.js                # Main consolidated handler (router)
│   ├── caixa-misteriosa.js     # Dedicated handler for mystery box game
│   ├── _handlers/              # Modular endpoint handlers
│   │   ├── participantes.js    # Participants endpoint
│   │   ├── auth.js             # Authentication endpoint
│   │   ├── audit.js            # Audit logs endpoint
│   │   ├── dashboard.js        # Dashboard metrics
│   │   ├── authHelper.js       # JWT validation utility
│   │   └── ...other handlers
│   ├── _lib/                   # Shared utilities
│   │   ├── security.js         # Rate limiting, CORS, headers
│   │   └── database.js         # Connection pooling
│   └── migrations/             # PostgreSQL migrations
│
├── lib/                        # Shared utilities (frontend + backend)
│   └── db.js                   # PostgreSQL connection management
│
├── public/                     # Static assets
└── package.json               # Dependencies and scripts
```

### Technology Stack
- **Frontend**: React 18.2.0 SPA with React Router v6
- **Backend**: Express.js API on Vercel Serverless Functions
- **Database**: PostgreSQL with node-pg-migrate for schema management
- **Deploy**: Vercel (consolidate handler pattern due to 12-function limit)
- **Testing**: Jest + React Testing Library
- **AI**: Google Generative AI (Gemini) for hint generation
- **Mapping**: Leaflet + react-leaflet for interactive maps
- **Auth**: JWT (jsonwebtoken) with bcrypt password hashing
- **Data Export**: ExcelJS for Excel file generation


### Key Architectural Patterns

#### 1. Page Lazy Loading Strategy
All pages are code-split and lazy-loaded on demand using `React.lazy()` and `Suspense`:
- Critical components (LoginForm, DashboardLayout) load immediately
- Pages load on-demand with loading spinners
- External routes (`/external/*`) bypass main layout for popups
- Benefits: Reduces initial bundle size, improves FCP/LCP metrics

#### 2. Context-Based Global State
Four main contexts provide global state management:
- **AuthContext** (`src/contexts/AuthContext.js`): User authentication, roles, permissions
- **ThemeContext** (`src/contexts/ThemeContext.jsx`): Light/dark theme toggle with persistence
- **ToastContext** (`src/contexts/ToastContext.js`): Global notification system
- **LayoutContext** (`src/contexts/LayoutContext.js`): Sidebar open/closed state

Usage example:
```javascript
const { user, userRole, canExport } = useAuth();
const { theme, toggleTheme } = useTheme();
const { showToast } = useToast();
```

#### 3. Service Layer Architecture
Services in `src/services/` abstract all API communication:
- **authService.js**: User login/logout, JWT token management
- **participanteService.js**: Participant CRUD and list queries
- **promocaoService.js**: Promotion management
- **sorteioService.js**: Draw/raffle functionality
- **dashboardService.js**: Dashboard analytics and metrics
- **auditService.js**: Security audit logging
- **logService.js**: General application logging

Each service handles:
- API endpoint construction
- Authorization header management
- Request/response transformation
- Error handling and user feedback

#### 4. Role-Based Access Control (RBAC)
Routes are protected with granular permissions via `ProtectedRoute` component:
- **admin**: Full system access
- **moderator**: Content management
- **editor**: Content editing
- **viewer**: Read-only access
- **user**: Basic participant access

Example usage:
```javascript
<ProtectedRoute requiredRole="admin">
  <AdminDashboard />
</ProtectedRoute>
```

### Backend Architecture

#### Vercel Serverless Function Constraint
- **Vercel Free Tier Limit**: Maximum 12 serverless functions
- **Solution**: Consolidated handler pattern in `api/index.js` with query-param routing
- **Dedicated handlers**: Only for complex features (e.g., `api/caixa-misteriosa.js`)
- **Modular organization**: Handler logic split across `api/_handlers/` for clarity

#### Request Routing Strategy
Routes can be accessed via:
1. **Query parameters** (explicit): `/api/?route=promocoes&endpoint=list`
2. **Path-based** (automatic): `/api/promocoes` → extracts to `route=promocoes`
3. **Dedicated handlers** (bypass main router): `/api/caixa-misteriosa/*`

Backend flow:
```
Request → api/index.js
  ├─ Security checks (rate limit, CORS, headers)
  ├─ Route extraction (from query or path)
  ├─ Main handler switch statement
  │   ├─ route=auth → _handlers/auth.js
  │   ├─ route=participantes → _handlers/participantes.js
  │   ├─ route=audit → _handlers/audit.js
  │   ├─ route=dashboard → _handlers/dashboard.js
  │   └─ ...other routes
  └─ Dedicated handler (caixa-misteriosa only)
```

#### Security Implementation (`api/_lib/security.js`)
- **Rate Limiting**: 60 requests/minute per IP (200 in development to prevent React Strict Mode issues)
- **CORS**: Whitelist of allowed origins (production domains + localhost)
- **Security Headers**:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy: default-src 'self'`
  - `Strict-Transport-Security: max-age=31536000`
- **Authentication**: JWT validation on protected endpoints
- **Audit Logging**: Security-critical operations logged for compliance

#### Database Management
- **Connection**: Managed via `lib/db.js` with connection pooling
- **Migrations**: PostgreSQL migrations in `api/migrations/` using node-pg-migrate
- **Deduplication**: Automatic participant deduplication by phone across multiple tables
- **Audit Trail**: Complete logging of sensitive operations (draw results, user actions)
- **Required Env Vars**: `DATABASE_URL`, `JWT_SECRET`

## Key Features & Special Functionality

### 1. Mystery Box Game (Caixa Misteriosa)
**Files**: `src/pages/CaixaMisteriosaPage.jsx`, `src/pages/CaixaMisteriosaPubPage.jsx`, `api/caixa-misteriosa.js`

Interactive live guessing game where participants guess a product based on AI-generated hints:
- **Admin Panel** (`/dashboard/caixa-misteriosa`): Game management, sponsors, products, hints
- **Public Page** (`/caixa-misteriosa-pub`): Participant interface for submitting guesses
- **AI Hint Generation**: Google Gemini AI integration
  - Primary model: `gemini-2.0-flash-exp` (automatic fallback to 8 other models)
  - Dual-prompt system: Fixed technical base + customizable context
  - Automatic content moderation (filters offensive responses)
  - Requires: `GOOGLE_API_KEY` environment variable
- **Game Features**: Progressive hint revelation, referral system, bonus guesses
- **Dedicated API**: `api/caixa-misteriosa.js` (separate handler due to complexity)

**3-Layer Guess Validation**:
1. **Keywords**: Normalized stemming for exact matches
2. **Levenshtein Distance**: Typo tolerance (edit distance ≤ 1)
3. **AI Validation**: Contextual synonym recognition via Gemini

### 2. Interactive Maps
**Files**: `src/pages/MapasPage.jsx`, `src/components/InteractiveMap.jsx`

Geographic visualization of participant distribution using Leaflet:
- Heatmaps showing participant density by region
- Clickable markers with detailed participant information
- Real-time filters (promotion, city, neighborhood)
- Browser geolocation support
- Built with: react-leaflet, leaflet.heat, OpenStreetMap tiles

### 3. Link Generator & UTM Tracking
**Files**: `src/pages/GeradorLinksPage.jsx`

Complete tracking and attribution system:
- Automatic link generation with UTM parameters
- QR code generation for offline campaigns
- Origin tracking (source, medium, campaign)
- Traffic analysis dashboard (`/dashboard/mapa-participantes`)
- Social media auto-generation (WhatsApp, Instagram, Facebook)

### 4. Draws & Promotions
**Files**: `src/pages/SorteioPage.jsx`, `src/pages/SorteioPublicoPage.jsx`

Smart raffle system with complete lifecycle management:
- **Admin Panel** (`/dashboard/sorteio`): Manage draws, select winners
- **Public Results** (`/sorteio-publico`): Public-facing results display
- **Auto-Status Management**: Promotions auto-marked as "ended" after draw
- **Reversibility**: Canceling a winner restores promotion to "active" status
- **Complete Audit Trail** (`/dashboard/audit-logs`): Admin-only security monitoring

### Critical Components

#### Layout System
- **DashboardLayout**: Main dashboard wrapper with responsive mobile sidebar
- **Header**: Reusable header with hamburger menu, accepts children for custom buttons
  - Includes: user info, logout, theme selector
  - Mobile-responsive navigation toggle
- **ProtectedRoute**: Route guard with role-based access control
- **Sidebar**: Context-managed sidebar state (open/closed)

#### Forms & Visualization
- **LoginForm** (`src/components/LoginForm/`): Authentication form with JWT handling
- **CapturaForm** (`src/pages/`): Public participant registration form
- **InteractiveMap** (`src/components/InteractiveMap/`): Leaflet map integration component
- **ThemeSelector** (`src/components/ThemeSelector/`): Light/dark mode toggle (persistent)
- **ConfirmModal**: Reusable confirmation dialogs for destructive actions
- **EditParticipanteModal**: Inline participant editing with API sync

## Development Guidelines

### API Communication Conventions
- **Base URL**: `/api` (proxy configured in development)
- **Authentication**: JWT token via `Authorization: Bearer <token>` header
- **Response Format**: JSON with structure `{ success: boolean, data?: any, error?: string }`
- **CORS**: Whitelist allows localhost:3000-3002 and production domains
- **Error Handling**: Services should parse responses and display user-friendly toast messages

### Frontend Code Patterns

**✅ DO: Use lazy loading for pages**
```jsx
const CaixaMisteriosaPage = React.lazy(() => import('./pages/CaixaMisteriosaPage'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard/caixa-misteriosa" element={<CaixaMisteriosaPage />} />
  </Routes>
</Suspense>
```

**✅ DO: Use standard Header component for consistency**
```jsx
import Header from '../DashboardLayout/Header';

<Header title="Participants" subtitle="Manage and export participants">
  <button onClick={handleExport}>Export</button>
</Header>
```

**✅ DO: Use formatting utilities**
```jsx
import { formatUserName, formatPhonePreview } from '../utils/formatters';

formatUserName('João Silva') // → "João S."
formatPhonePreview('11999999999') // → "****9999"
```

**✅ DO: Use context hooks for global state**
```jsx
const { user, userRole, canExport } = useAuth();
const { showToast } = useToast();
const { sidebarOpen, toggleSidebar } = useLayout();
```

**❌ DON'T: Reverse API lists**
```jsx
// ❌ WRONG - API already returns ORDER BY created_at DESC
const reversed = data.reverse();

// ✅ RIGHT - Use data as-is
return <ul>{data.map(item => ...)}</ul>
```

**❌ DON'T: Make direct fetch calls**
```jsx
// ❌ WRONG
const resp = await fetch('/api/participants');

// ✅ RIGHT - Use service layer
import { fetchParticipants } from '../services/participanteService';
const participants = await fetchParticipants();
```

### Backend Code Patterns

**✅ DO: Audit security-critical operations**
```javascript
const { logAudit } = require('../_handlers/audit');

// In draw endpoint
await logAudit(userId, 'DRAW_EXECUTED', { promocao_id, winner_id });
```

**✅ DO: Use consolidated handler for new routes**
```javascript
// In api/index.js switch statement
case 'myroutehandler':
  const handler = require('./_handlers/myroutehandler');
  return await handler(req, res, getAuthenticatedUser);
```

**✅ DO: Validate JWT before processing**
```javascript
const user = await getAuthenticatedUser(req);
if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
```

**❌ DON'T: Create new serverless functions**
```javascript
// ❌ WRONG - Vercel free tier limit is 12 functions
// Don't create api/mynewfunction.js

// ✅ RIGHT - Use api/index.js with route parameter
// POST /api/?route=mynewfunction&endpoint=list
```

### Environment Variables (Required)
```env
# Database (required)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Authentication (required)
JWT_SECRET=your_very_long_and_secure_secret_key

# AI Integration (optional, enables Gemini hints)
GOOGLE_API_KEY=AIzaSy...

# Environment (optional, defaults to development)
NODE_ENV=production|development
```

### Testing Strategy
- **Framework**: Jest + React Testing Library
- **Coverage**: 97+ tests covering components, services, contexts, pages
- **Focus**: User-critical flows (login, draw, participation)
- **Run Tests**:
  ```bash
  npm test              # Interactive
  npm run test:coverage # With coverage report
  npm run test:ci       # CI mode (no watch)
  ```

### Database Operations
- **Always use migrations** for schema changes (`api/migrations/`)
- **Connection pooling**: Managed via `lib/db.js`
- **Audit logging**: Track sensitive operations (draws, user actions, deletions)
- **Post-Vercel Deploy**: Manually run migrations (see `MIGRATIONS.md`)
- **Deduplication**: Automatic participant deduplication by phone number across tables

## Environment Setup
1. Copy `.env.example` to `.env` in project root
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Set `JWT_SECRET` to a long random string
4. (Optional) Set `GOOGLE_API_KEY` to enable Gemini AI hints
5. For Vercel deploy: Add environment variables in dashboard Settings → Environment Variables

## Performance Optimizations
- **Code Splitting**: Pages lazy-loaded reduce initial bundle size
- **Conditional Loading**: Chart.js and Leaflet only load when pages render
- **PWA Support**: Service Worker registered for offline capabilities
- **Bundle Analysis**: Run `npm run analyze` or `npm run analyze:bundle` to inspect size

## Important Documentation Files
- **`CLAUDE.md`**: This file - development guidance
- **`README.md`**: Full project documentation
- **`MIGRATIONS.md`**: Database migration guide
- **`RESTORE_POINTS.md`**: Documented Git restore points
- **`DESIGN_SYSTEM_v2.7.md`**: CSS classes and animations available
- **`TESTING.md`**: Test strategy and examples
- **`AUDITORIA_SEGURANCA_2025.md`**: Security audit report

## Known Stable Versions
### v2.5 (Current - Stable)
**Commit**: `61c7c87` | **Date**: 2025-10-24
- ✅ Unified dashboard with phone-based deduplication
- ✅ Automatic Caixa Misteriosa participant inclusion
- ✅ Fixed participant counts (0 → 45 unique)
- ✅ Optimized SQL with CTE queries

### v1.0.1 (Google AI Fixed)
**Commit**: `fab0da6` | **Date**: 2025-10-03
- ✅ Google Gemini AI integrated and working
- ✅ Automatic model detection and fallback
- ✅ Supports Gemini 2.0, 1.5, and 1.0 models

## Project-Specific UX/UI Patterns

### Dashboard Header (Mobile-First)
All dashboard modules **must use** the standard `Header` component:
```jsx
import Header from '../DashboardLayout/Header';

<Header title="Participants" subtitle="Manage and export participants">
  {/* Custom action buttons (optional) */}
</Header>
```
Features:
- Automatic hamburger menu (☰)
- Responsive sidebar toggle via LayoutContext
- Integrated theme selector (light/dark)
- User info and logout button

### Data Formatting Utilities
Located in `src/utils/formatters.js`:
- **Names**: `formatUserName(nome)` → "João Silva" becomes "João S."
- **Phones**: `formatPhonePreview(telefone)` → "11999999999" becomes "****9999"

### API List Ordering Convention (Caixa Misteriosa)
- **Backend Returns**: `ORDER BY created_at DESC` (newest first)
- **Frontend**: **DO NOT apply `.reverse()`** - use API order as-is
- **Display Format**: `HH:MM - Name - District - Guess ✅`

## Design System v2.7

Enhanced CSS animation and color system. See `DESIGN_SYSTEM_v2.7.md` for complete reference.

### Extended Color Palette
```css
/* Primary gradient colors */
--color-purple: #8b5cf6
--color-pink: #ec4899
--color-indigo: #6366f1
--color-cyan: #06b6d4
--color-teal: #14b8a6
--color-lime: #84cc16
```

### Common CSS Classes

**Animations**: `.float`, `.pulse-glow`, `.shimmer`, `.bounce-in`, `.slide-in-left`

**Visual Effects**: `.gradient-border`, `.neon`, `.blur-bg`, `.text-gradient`

**States**: `.loading-card`, `.success-state`, `.error-state`, `.warning-state`

See `DESIGN_SYSTEM_v2.7.md` for complete class reference and examples.

## Troubleshooting & Common Issues

### Rate Limit (429 Error)
- **Dev**: Increased to 200 req/min to accommodate React Strict Mode double-rendering
- **Production**: 60 req/min per IP
- **Solution**: Space out requests or wait for rate limit reset

### JWT Token Expired
- Frontend automatically clears localStorage and redirects to login
- AuthContext catches token errors and triggers logout
- Check `JWT_SECRET` matches between frontend and backend

### Database Connection Failed
- Verify `DATABASE_URL` environment variable
- Test with: `curl http://localhost:3002/api/?route=db&endpoint=test`
- Check PostgreSQL credentials and network access

### Gemini AI Hints Not Generating
- Verify `GOOGLE_API_KEY` is set and valid
- Check API quota limits in Google Cloud Console
- Fallback models automatically attempt if primary fails
- Check logs for error details

## Helpful Commands for Development

```bash
# Debug database connection
curl http://localhost:3002/api/?route=db&endpoint=test

# Check current git branch and status
git status

# View recent commits
git log --oneline -10

# Run specific test file
npm test -- LoginForm.test.jsx

# Build and analyze bundle
npm run analyze

# Create a new database migration
npx node-pg-migrate create migration_name
```

## Getting Help
- Check `README.md` for comprehensive documentation
- Review `TESTING.md` for test patterns and examples
- See `MIGRATIONS.md` for database schema changes
- Refer to `DESIGN_SYSTEM_v2.7.md` for available CSS animations
- Check existing tests in `src/**/*.test.js` for usage patterns
