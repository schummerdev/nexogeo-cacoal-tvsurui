# Changelog - NexoGeo

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [2.2.0] - 2026-03-06

### 🚀 Melhorias e Segurança
- **Segurança**: Implementação de restrições de segurança e auditoria no frontend.
- **Correções**: Resolução de conflitos em restrições de chaves estrangeiras (`participantes_promocao_id_fkey`) para garantir o registro correto em sorteios e pesquisas.
- **Frontend**: Remoção de elementos de áudio legados de `SorteioPage.jsx` e migração para `SorteioPublicoPage.jsx`.
- **Manutenibilidade**: Auditoria de arquivos obsoletos e organização de scripts de banco de dados.

## [2.1.0] - 2025-10-30

### ✨ Ajustes Intermediários
- Implementação de sistema automático de backup inteligente.
- Scripts de sincronização de schema de banco de dados (`sync-database-schema.js`).
- Melhorias nos testes de funcionalidade do sistema.

## [2.0.0] - 2025-10-13

### 🎉 Novas Funcionalidades

#### Página de Demonstração
- **Carrossel de Banners**: Sistema rotativo com até 4 banners configuráveis
  - Rotação automática a cada 10 segundos
  - Indicadores de navegação manual
  - Links clicáveis opcionais
  - Design responsivo

- **Integração com Temas**: Aplicação dinâmica de cores
  - Tema padrão alterado para Roxo
  - 26 cards com cores dinâmicas baseadas no tema selecionado
  - Gradiente do tema aplicado ao fundo da página
  - Contraste otimizado para legibilidade

- **Novo Layout de Header**:
  - Logo e texto lado a lado
  - Remoção do título duplicado "NexoGeo"
  - Texto atualizado: "Sistema de Gestão de Promoções e Engajamento de Telespectadores para Emissoras Locais"

#### Melhorias na Interface

- **Sidebar Otimizada**:
  - Espaçamento reduzido entre itens do menu
  - Título "NexoGeo" restaurado
  - Remoção do subtítulo "Painel Administrativo"
  - Scroll automático quando necessário
  - Todos os itens do menu visíveis (incluindo Configurações)

### 📚 Documentação

- **Auditoria de Código Completa** (`AUDITORIA_CODIGO.md`):
  - 683 linhas de análise detalhada
  - Identificação de 5 arquivos desnecessários
  - 294 console.logs em produção identificados
  - Vulnerabilidades de segurança mapeadas
  - Recomendações de performance
  - Checklist de ações prioritárias

- **Plano de Integração** (`PLANO_INTEGRACAO_PUBLIC_PARTICIPANTS.md`):
  - Análise da tabela `public_participants`
  - Plano em 4 fases para integração com mapas
  - Estimativa: 8-12 horas de desenvolvimento
  - Checklist completo de implementação
  - Métricas de sucesso definidas

### 🐛 Correções

- **Tema Escuro**: Containers de diferenciais agora com fundo transparente
- **Contraste**: Textos brancos com sombra para melhor legibilidade
- **Extensão de Arquivos**: Banners usando .png correto
- **Gradiente**: Aplicação correta no body da página

### 🎨 Melhorias Visuais

- Todos os cards da página demo agora seguem o tema selecionado
- Ícones em dourado (#ffd700) para destaque
- Títulos e subtítulos em branco com sombra
- Design responsivo aprimorado para mobile

### 📦 Recursos Adicionados

- 4 novos banners (banner1-4.png)
- 2 novas imagens da Caixa Misteriosa
- Ícones Material Design

### 🔧 Mudanças Técnicas

- Header do sidebar reduzido: 1.5rem → 0.75rem padding
- Logo do sidebar: 60px → 50px
- Nav items: 0.75rem → 0.5rem padding vertical
- Fonte dos itens: 0.875rem → 0.8125rem
- Sidebar nav com overflow-y: auto

### 📊 Estatísticas

- **Commits nesta versão**: 15
- **Arquivos modificados**: 12
- **Linhas de documentação**: 1383 (auditoria + plano)
- **Imagens adicionadas**: 6

---

## [1.0.1] - 2025-10-06

### Funcionalidades Base
- Sistema de autenticação JWT
- Gerenciamento de promoções
- Painel de controle com métricas
- Sistema de temas (6 cores)
- Mapas interativos com Leaflet
- Caixa Misteriosa com IA (Google Gemini)
- Gerador de links com tracking
- Sistema de sorteios
- Módulo de participantes

### Segurança
- Rate limiting (60 req/min)
- Headers de segurança (HSTS, CSP, X-Frame-Options)
- SQL injection prevention
- Bcrypt para senhas
- SSL com validação de certificado

### Performance
- Lazy loading de componentes
- Code splitting
- Service Worker (PWA)
- Connection pooling no PostgreSQL

---

## Formato

Este changelog segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

### Tipos de Mudanças

- **Added** (Adicionado): para novas funcionalidades
- **Changed** (Modificado): para mudanças em funcionalidades existentes
- **Deprecated** (Obsoleto): para funcionalidades que serão removidas
- **Removed** (Removido): para funcionalidades removidas
- **Fixed** (Corrigido): para correções de bugs
- **Security** (Segurança): para vulnerabilidades corrigidas
