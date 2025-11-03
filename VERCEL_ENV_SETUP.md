# 🚀 Configuração de Variáveis de Ambiente - Vercel

## ⚠️ CRÍTICO: Configure estas variáveis no Vercel Dashboard

Para que a aplicação funcione corretamente no Vercel, você **DEVE** configurar as seguintes variáveis de ambiente:

### 📝 Passo-a-Passo

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto: `nexogeo-cacoal-tvsurui`
3. Vá para **Settings** → **Environment Variables**
4. Adicione cada variável abaixo:

---

### 📋 Variáveis Obrigatórias

#### 1️⃣ DATABASE_URL (OBRIGATÓRIA)
```
DATABASE_URL=postgresql://neondb_owner:npg_7EADUX3QeGaO@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
```
**Descrição**: String de conexão ao banco PostgreSQL Neon com pgbouncer

**Ambientes**: Production + Preview + Development

---

#### 2️⃣ JWT_SECRET (OBRIGATÓRIA)
```
JWT_SECRET=f3d66f17f4cc0e9629a75d86ebccdfd7d7881135116e403f15ea0b1ecf14f5597680f82ddfb38091fee9b43070fdfec28608a042ba1c9a6d1433d60b44f7ab28
```
**Descrição**: Chave JWT para autenticação de usuários (128 caracteres hex)

**Ambientes**: Production + Preview + Development

---

#### 3️⃣ GOOGLE_API_KEY (OBRIGATÓRIA para Caixa Misteriosa)
```
GOOGLE_API_KEY=AIzaSyBxFsDb0lGl5zUhtw_keTSgz6q3xhDYwNU
```
**Descrição**: Chave da API Google para geração de dicas com IA

**Ambientes**: Production + Preview + Development

---

### 📋 Variáveis Opcionais

#### 4️⃣ NODE_ENV
```
NODE_ENV=production
```
**Descrição**: Ambiente de execução (production para Vercel)

**Ambientes**: Production + Preview

---

## ✅ Checklist de Verificação

- [ ] `DATABASE_URL` configurada no Vercel Dashboard
- [ ] `JWT_SECRET` configurada no Vercel Dashboard
- [ ] `GOOGLE_API_KEY` configurada no Vercel Dashboard
- [ ] Todas estão nos ambientes: **Production + Preview + Development**
- [ ] Redeploy executado após configurar as variáveis

---

## 🔄 Como Redeploy após Configurar

1. Configure as variáveis no Vercel Dashboard
2. Aguarde alguns segundos (dashboard atualiza)
3. Vá para **Deployments** → Clique no último deploy
4. Clique em **Redeploy** (canto superior direito)

**OU** faça um novo push no repositório:
```bash
git add .
git commit -m "chore: Atualiza variáveis de ambiente"
git push
```

---

## 🐛 Troubleshooting

### Erro: "column deleted_at does not exist"
**Causa**: DATABASE_URL aponta para banco antigo ou sem as migrações

**Solução**:
1. Verifique se DATABASE_URL no Vercel é exatamente: `postgresql://neondb_owner:npg_7EADUX3QeGaO@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require`
2. Faça redeploy para que as mudanças tomem efeito

### Erro: "function cleanup_old_rate_limits() does not exist"
**Causa**: Migração não foi executada

**Solução**: A migração foi criada localmente em `api/migrations/create-cleanup-function.sql` e foi executada no banco Neon. Se o erro persistir, o DATABASE_URL está apontando para o banco errado.

### Erro: "Invalid JWT Secret"
**Causa**: JWT_SECRET não está configurada ou está inválida

**Solução**: Configure `JWT_SECRET` com exatamente 128 caracteres hexadecimais

---

## 📚 Documentação

- `.env` - Arquivo local com variáveis (não commitar credenciais)
- `CLAUDE.md` - Instruções completas do projeto
- `api/index.js` - Handler principal da API
- `lib/db.js` - Conexão ao banco de dados

---

**Última atualização**: 03/Nov/2025
