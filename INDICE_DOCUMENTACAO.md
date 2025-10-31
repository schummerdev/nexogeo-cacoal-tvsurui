# 📚 Índice Completo de Documentação - NexoGeo

Bem-vindo ao NexoGeo! Esta página centraliza toda a documentação do projeto. Escolha o documento mais apropriado para sua necessidade.

---

## 🚀 Primeiros Passos

### Para Quem Está Começando

| Documento | Descrição | Tempo |
|-----------|-----------|-------|
| **[SETUP_COMPLETO.md](./SETUP_COMPLETO.md)** | Guia completo do zero até primeira execução | 30 min |
| **[README.md](./README.md)** | Visão geral do projeto e funcionalidades | 10 min |
| **[INICIO_RAPIDO.md](./INICIO_RAPIDO.md)** | Setup rápido e básico (se existe) | 10 min |

**Recomendado:** Iniciar com `SETUP_COMPLETO.md` → depois `CLAUDE.md`

---

## 🐛 Solução de Problemas

### Você está enfrentando um erro?

| Erro | Documento | Solução |
|------|-----------|---------|
| "Unexpected token 'A'... is not valid JSON" | **[DIAGNOSTICO_LOGIN_ERROR.md](./DIAGNOSTICO_LOGIN_ERROR.md)** | Verificar dependências e BD |
| "Cannot find module 'express'" | **[DIAGNOSTICO_LOGIN_ERROR.md](./DIAGNOSTICO_LOGIN_ERROR.md)** | Executar `npm install` |
| "DATABASE_URL is not defined" | **[SETUP_COMPLETO.md](./SETUP_COMPLETO.md)** ou **[VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)** | Configurar `.env` |
| Erro no deploy Vercel | **[VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)** | 10 soluções específicas |
| Erro de autenticação/login | **[DIAGNOSTICO_LOGIN_ERROR.md](./DIAGNOSTICO_LOGIN_ERROR.md)** ou **[SETUP_COMPLETO.md](./SETUP_COMPLETO.md)** | Criar usuário admin |
| CORS Error | **[VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md#6️⃣-cors-error)** | Adicionar domínio ao whitelist |
| Rate limit 429 | **[VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md#7️⃣-rate-limit)** | Aumentar limite ou reduzir requisições |

---

## 👨‍💻 Desenvolvimento

### Para Desenvolvedores

| Documento | Conteúdo |
|-----------|----------|
| **[CLAUDE.md](./CLAUDE.md)** | 📋 Guia principal para desenvolvimento com Claude Code |
| **[TESTING.md](./TESTING.md)** | 🧪 Estratégia de testes e exemplos |
| **[DESIGN_SYSTEM_v2.7.md](./DESIGN_SYSTEM_v2.7.md)** | 🎨 Sistema de design e classes CSS disponíveis |
| **[MIGRATIONS.md](./MIGRATIONS.md)** | 🗄️ Guia de migrações de banco de dados |

**Estrutura Importante:**
```
CLAUDE.md (START HERE!) ← Leia primeiro
├── Project Overview
├── Development Commands
├── Architecture Overview
├── Key Features
├── Development Guidelines
├── Code Patterns (DO/DON'T)
├── Troubleshooting
└── Helpful Commands
```

---

## 📊 Configuração e Arquitetura

### Entendendo o Projeto

| Documento | Tópicos |
|-----------|---------|
| **[SETUP_COMPLETO.md](./SETUP_COMPLETO.md)** | Estrutura de BD, tabelas, fluxo de autenticação |
| **[CLAUDE.md](./CLAUDE.md)** | Arquitetura do projeto, padrões, componentes |
| **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)** | Deploy específico para Vercel |
| **[AUDITORIA_SEGURANCA_2025.md](./AUDITORIA_SEGURANCA_2025.md)** | Relatório de segurança e implementações |

---

## 🚢 Deploy e Produção

### Deployar na Vercel

1. **Preparação:**
   - Ler: **[SETUP_COMPLETO.md](./SETUP_COMPLETO.md#deploy-na-vercel)** (seção Deploy)
   - Ler: **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)** (se existe guia específico)

2. **Problemas no Deploy?**
   - Consultar: **[VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)**

3. **Migrações em Produção:**
   - Consultar: **[MIGRATIONS.md](./MIGRATIONS.md)**

---

## 📋 Versão Atual e Histórico

### Versão 2.5 (Estável - 2025-10-31)

Principais características:
- ✅ Unified dashboard com deduplicação por telefone
- ✅ Inclusão automática de Caixa Misteriosa
- ✅ 97+ testes automatizados
- ✅ Sistema de sorteios com reversibilidade
- ✅ Mapa interativo com Leaflet
- ✅ Gerador de links com UTM tracking

### Histórico de Versões

| Versão | Data | Alterações | Restore |
|--------|------|-----------|---------|
| 2.5 | 2025-10-24 | Correções de contagens, deduplicação | `git checkout v2.5` |
| 1.0.1 | 2025-10-03 | Google Gemini AI funcionando | `git checkout v1.0.1-google-ai-fixed` |

Mais detalhes: **[RESTORE_POINTS.md](./RESTORE_POINTS.md)**

---

## 🆘 Guia de Referência Rápida

### Verificação de Status

```bash
# Testar banco de dados
curl http://localhost:3002/api/?route=db&endpoint=test

# Testar autenticação
curl -X POST http://localhost:3002/api/?route=auth&endpoint=login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"admin123"}'

# Ver logs da API
npm run dev:api

# Verificar saúde em produção
curl https://seu-projeto.vercel.app/api/?route=db&endpoint=test
```

### Comandos Essenciais

```bash
# Setup
npm install                    # Instalar dependências
npm run migrate               # Executar migrações
node create-admin.js          # Criar usuário admin

# Desenvolvimento
npm run dev:full              # Frontend + Backend
npm start                     # Frontend apenas
npm run dev:api              # Backend apenas

# Testes
npm test                      # Testes interativos
npm run test:coverage        # Com cobertura
npm run test:ci              # CI mode

# Build
npm run build                # Build de produção
npm run analyze              # Analisar bundle
```

---

## 📚 Documentação Completa (A-Z)

### Arquivos de Documentação

```
├── ANALISE_ARQUIVOS_OBSOLETOS.md      → Arquivos removidos/obsoletos
├── ANALISE_FUNCIONALIDADES.md          → Análise de features
├── AUDITORIA_SEGURANCA_2025.md        → 🔐 Relatório de segurança
├── CHANGELOG.md                        → Histórico de mudanças
├── CLAUDE.md                           → 📋 GUIA PRINCIPAL DESENVOLVIMENTO
├── CORRECAO-CONTAGENS-2025-10-24.md  → Correção de contagens
├── CORRECAO-SORTEIO-COMPLETA.md      → Documentação do sorteio
├── DESIGN_SYSTEM_v2.7.md             → 🎨 Classes CSS e animações
├── DIAGNOSTICO-SORTEIO-2025-10-24.md → Análise do sorteio
├── DIAGNOSTICO_LOGIN_ERROR.md        → 🐛 Erro de login JSON
├── INICIO_RAPIDO.md                  → ⚡ Setup rápido
├── INDICE_DOCUMENTACAO.md            → 📚 Este arquivo
├── MELHORIAS_IMPLEMENTADAS.md        → Features implementadas
├── MIGRATIONS.md                      → 🗄️ Migrações de BD
├── README.md                          → Visão geral do projeto
├── RELATORIO_LIMPEZA_FINAL.md        → Limpeza de código
├── RESTORE_POINTS.md                 → Git restore points
├── SECURITY_TEST_REPORT.md           → Testes de segurança
├── SETUP_COMPLETO.md                 → 🚀 Setup passo a passo
├── TESTING.md                        → 🧪 Estratégia de testes
├── VERCEL_DEPLOY.md                  → Deploy Vercel específico
└── VERCEL_TROUBLESHOOTING.md         → 🐛 Problemas de Vercel
```

---

## 🎯 Matriz de Decisão - Qual Documento Ler?

```
                          Sou novo no projeto?
                               |
                 ______________|______________
                |                             |
               SIM                            NÃO
                |                             |
                v                             |
         SETUP_COMPLETO.md      Estou com erro?
                |                     |
                v                     |___SIM___ → DIAGNOSTICO_LOGIN_ERROR.md
         CLAUDE.md                                  ou VERCEL_TROUBLESHOOTING.md
                |
                v
         README.md (opcional)


                Vou fazer deploy?
                     |
        _____________|_____________
        |                           |
       Local                      Vercel
        |                           |
        v                           v
   SETUP_COMPLETO.md        VERCEL_DEPLOY.md
        |                      +
        v                      v
   npm run dev:api      VERCEL_TROUBLESHOOTING.md


            Vou desenvolver?
                 |
        _________|_________
        |                  |
      Frontend           Backend
        |                  |
        v                  v
   CLAUDE.md          CLAUDE.md
   DESIGN_SYSTEM      (seção Backend)
   TESTING.md         MIGRATIONS.md
```

---

## 📞 Suporte e Ajuda

### Se Você Precisa De...

| Necessidade | Documento | Seção |
|-------------|-----------|-------|
| Setup inicial | SETUP_COMPLETO.md | Pré-requisitos → Deploy |
| Entender arquitetura | CLAUDE.md | Architecture Overview |
| Padrões de código | CLAUDE.md | Development Guidelines |
| Estrutura BD | SETUP_COMPLETO.md | Configuração do Banco |
| Fluxo de autenticação | SETUP_COMPLETO.md | Fluxo de Autenticação |
| Erro de login | DIAGNOSTICO_LOGIN_ERROR.md | Causas e Soluções |
| Deploy Vercel | VERCEL_DEPLOY.md | Setup Vercel |
| Problemas Vercel | VERCEL_TROUBLESHOOTING.md | 10 Problemas Comuns |
| Migrações BD | MIGRATIONS.md | Executar Migrações |
| Testes | TESTING.md | Estratégia de Testes |
| Design/CSS | DESIGN_SYSTEM_v2.7.md | Classes Disponíveis |
| Segurança | AUDITORIA_SEGURANCA_2025.md | Implementações |

---

## ✅ Checklist para Novas Instâncias de Claude Code

Quando um novo Claude Code iniciar neste repositório, ele deve:

1. **Ler CLAUDE.md** (obrigatório)
   - [ ] Visão geral do projeto
   - [ ] Stack tecnológico
   - [ ] Arquitetura
   - [ ] Padrões de código
   - [ ] Troubleshooting

2. **Consultar este Índice** quando precisar de um tópico específico
   - [ ] Use a matriz de decisão
   - [ ] Consulte a tabela de problemas

3. **Documentar qualquer alteração** que deixar o projeto mais claro

---

## 🔄 Como Manter Esta Documentação Atualizada

1. **Quando fix ou feature importante:**
   - Atualizar CHANGELOG.md
   - Adicionar exemplos em CLAUDE.md se aplicável

2. **Quando descobrir novo problema:**
   - Criar novo arquivo DIAGNOSTICO_*.md
   - Adicionar à seção apropriada deste índice

3. **Quando criar nova feature:**
   - Documentar em ANALISE_FUNCIONALIDADES.md
   - Adicionar padrão em CLAUDE.md se necessário

4. **Antes de fazer commit:**
   - Revisar documentação afetada
   - Atualizar versionamento se necessário

---

## 📈 Estatísticas da Documentação

- **Total de arquivos de documentação:** 20+
- **Linhas de documentação:** 3.000+
- **Exemplos de código:** 100+
- **Troubleshooting guides:** 5+
- **Documentação melhorada em:** 2025-10-31

---

## 🎓 Próximos Passos Recomendados

### Dia 1 (Setup)
- [ ] Ler SETUP_COMPLETO.md
- [ ] Executar instalação
- [ ] Fazer primeiro login
- [ ] Verificar padrão em CLAUDE.md

### Dia 2 (Entender)
- [ ] Ler CLAUDE.md completamente
- [ ] Revisar estrutura de arquivos
- [ ] Entender fluxo de autenticação
- [ ] Consultar DESIGN_SYSTEM_v2.7.md

### Dia 3+ (Desenvolver)
- [ ] Ler TESTING.md para escrita de testes
- [ ] Consultar MIGRATIONS.md para mudanças de BD
- [ ] Usar CLAUDE.md como referência
- [ ] Manter documentação atualizada

---

**Versão:** 2.5 | **Data:** 2025-10-31 | **Status:** ✅ Estável e Completo

---

## 📬 Feedback

Se algo está faltando, está confuso, ou pode ser melhorado:
1. Criar issue no GitHub
2. Abrir PR com melhorias
3. Manter este índice atualizado

**Obrigado por contribuir para a documentação!** 🙏
