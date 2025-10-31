# Guia de Troubleshooting - Deploy Vercel

## 🎯 Problemas Comuns e Soluções

### 1️⃣ "API 500 - Erro Interno do Servidor"

**Causa:** Erro não capturado no backend

**Solução:**
```bash
# Verificar logs Vercel em tempo real
vercel logs seu-projeto.vercel.app --tail

# Ou acessar dashboard:
# Vercel → seu-projeto → Logs → Function logs
```

**Diagnóstico:**
```bash
# Testar em produção via curl
curl https://seu-projeto.vercel.app/api/?route=db&endpoint=test

# Ver resposta completa com headers
curl -v https://seu-projeto.vercel.app/api/?route=db&endpoint=test
```

---

### 2️⃣ "DATABASE_URL is not defined"

**Causa:** Variável de ambiente não configurada

**Solução:**
1. Vercel Dashboard → Settings → Environment Variables
2. Adicionar variáveis:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db
   JWT_SECRET=seu_secret_aqui
   ```
3. Redeploy:
   ```bash
   vercel --prod
   ```

**Verificação:**
```bash
# Testar se variável está disponível
curl https://seu-projeto.vercel.app/api/?route=db&endpoint=test

# Resposta esperada (sucesso)
{
  "success": true,
  "message": "Database connection successful"
}
```

---

### 3️⃣ "Cannot connect to database"

**Causas possíveis:**
- ❌ DATABASE_URL incorreta
- ❌ Banco PostgreSQL offline
- ❌ Firewall bloqueando conexão
- ❌ IP de Vercel não liberado

**Solução:**

#### Para Neon (Recomendado)
```bash
# 1. Verificar URL do banco Neon
# Dashboard Neon → seu-projeto → Connection string
# Copiar "Connection string" (não a "Quick connect")

# 2. Testar conexão localmente
# Em seu .env local:
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech:5432/database?sslmode=require

# 3. Testar conexão
npm run dev:api

# Se passar, copiar a mesma URL para Vercel
```

#### Para PostgreSQL Local/Self-Hosted
```bash
# 1. Verificar que PostgreSQL está rodando
psql -h localhost -U seu_usuario -d seu_banco -c "SELECT 1"

# 2. Permitir conexão remota
# Editar postgresql.conf:
listen_addresses = '*'

# Editar pg_hba.conf:
host    all             all             0.0.0.0/0               md5

# 3. Reiniciar PostgreSQL
# Linux:   sudo systemctl restart postgresql
# macOS:   brew services restart postgresql
# Windows: Services → PostgreSQL → Restart

# 4. Liberar IP de Vercel no firewall
# Vercel IPs: https://vercel.com/docs/concepts/edge-network/edge-middleware#vercel-ip-addresses
```

#### Para RDS/Cloud SQL
```bash
# 1. Permitir IP de Vercel no security group
# AWS RDS → seu-banco → Modify
# Security group → Inbound rules
# Add rule: PostgreSQL (5432) from Vercel IPs

# 2. Usar SSL se required
# DATABASE_URL deve incluir:
?sslmode=require  # No final da URL
```

---

### 4️⃣ "Login retorna 401 - Unauthorized"

**Causas:**
- ❌ Usuário não existe no banco
- ❌ Senha incorreta
- ❌ Hash de senha inválido
- ❌ Coluna senha_hash não existe

**Solução:**

```bash
# 1. Verificar tabela usuarios
# Conectar ao banco Vercel/produção
psql YOUR_DATABASE_URL

# 2. Listar usuários
SELECT id, usuario, role, senha_hash FROM usuarios;

# 3. Se vazio, criar usuário
# (use script criado localmente)
node create-admin.js

# 4. Ou inserir manualmente via SQL
# Gerar hash bcrypt de uma senha:
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(console.log)"

# Copiar hash e inserir:
INSERT INTO usuarios (usuario, email, senha_hash, role)
VALUES ('admin', 'admin@example.com', '$2b$10$...hash...', 'admin');

# 5. Testar login
curl -X POST https://seu-projeto.vercel.app/api/?route=auth&endpoint=login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"admin123"}'
```

---

### 5️⃣ "JWT token inválido ou expirado"

**Causas:**
- ❌ JWT_SECRET diferente entre ambientes
- ❌ Token expirado (7 dias)
- ❌ Token mal formatado

**Solução:**

```bash
# 1. Certificar mesmo JWT_SECRET em todos os ambientes
# Local (.env):
JWT_SECRET=seu_secret_aqui_com_32_caracteres

# Vercel (Environment Variables):
JWT_SECRET=seu_secret_aqui_com_32_caracteres
# DEVE SER EXATAMENTE O MESMO

# 2. Redeploy após mudar JWT_SECRET
vercel --prod

# 3. Verificar token decodificado
# Use JWT.io para decodificar (não compartilhe token público)

# 4. Gerar novo token fazendo login
curl -X POST https://seu-projeto.vercel.app/api/?route=auth&endpoint=login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"admin123"}'
```

---

### 6️⃣ "CORS Error - No 'Access-Control-Allow-Origin'"

**Causa:** Frontend em domínio diferente do backend

**Solução:**

Editar `api/index.js` - seção de CORS:
```javascript
// ⚠️ MUDAR ISSO:
const allowedOrigins = [
  'https://seu-projeto.vercel.app',  // ADD THIS
  'https://tvsurui.com.br',
  'http://localhost:3000',
  'http://localhost:3001'
];
```

Commit e push:
```bash
git add api/index.js
git commit -m "fix: add Vercel domain to CORS whitelist"
git push origin main

# Vercel fará deploy automático
```

---

### 7️⃣ "Rate limit 429 - Too many requests"

**Causa:** Excedeu limite de requisições (60 req/min)

**Solução:**

Para **Development** (aumentar limite):
- Editar `api/index.js` linha ~27:
  ```javascript
  const isDevelopment = process.env.NODE_ENV === 'development';
  const rateLimit = isDevelopment ? 200 : 60; // Mudar 60 para 100+
  ```

Para **Produção** (reduzir requisições):
- Implementar cache no frontend
- Debounce em buscas
- Usar pagination

---

### 8️⃣ "Deployment timeout - Function took too long"

**Causa:** Migrações ou queries muito lentas

**Solução:**

```bash
# 1. NÃO EXECUTAR MIGRAÇÕES DURANTE DEPLOY
# Migrações devem ser executadas ANTES

# 2. Executar migrações separadamente
DATABASE_URL=your_production_url npm run migrate

# 3. Depois fazer deploy
git push origin main

# 4. Se persistir, aumentar timeout
# vercel.json:
{
  "functions": {
    "api/**": {
      "maxDuration": 60  // 60 segundos (máximo)
    }
  }
}
```

---

### 9️⃣ "Build fails - Cannot find module X"

**Causa:** Dependências faltando no package.json

**Solução:**

```bash
# 1. Adicionar dependência localmente
npm install nome-do-modulo

# 2. Verificar que foi adicionado em package.json
cat package.json | grep nome-do-modulo

# 3. Fazer commit
git add package.json package-lock.json
git commit -m "deps: add nome-do-modulo"
git push origin main

# 4. Vercel fará rebuild com nova dependência
```

---

### 🔟 "Frontend não conecta ao backend"

**Causa:** Variáveis de ambiente ou proxy incorretos

**Solução:**

Para **desenvolvimento local:**
```bash
# Frontend usa proxy do package.json
"proxy": "http://localhost:3002"

# Certifique-se que backend está rodando
npm run dev:api
```

Para **produção Vercel:**
```bash
# Frontend deve fazer requisições para:
/api/?route=auth&endpoint=login

# Vercel redireciona automaticamente para:
# https://seu-projeto.vercel.app/api/... → api/index.js
# https://seu-projeto.vercel.app/api/caixa-misteriosa/... → api/caixa-misteriosa.js

# Verificar vercel.json:
cat vercel.json

# Deve ter:
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    }
  ]
}
```

---

## 📊 Checklist de Debug

```
Em Produção Vercel:

Database:
  ☐ DATABASE_URL configurada e válida
  ☐ PostgreSQL acessível pela internet
  ☐ IP de Vercel liberado no firewall
  ☐ Migrações já foram executadas

Autenticação:
  ☐ JWT_SECRET configurada em Vercel
  ☐ JWT_SECRET é igual em dev e prod
  ☐ Tabela usuarios existe
  ☐ Usuário admin criado com hash bcrypt
  ☐ Login funciona via curl

CORS:
  ☐ Domínio frontend adicionado em allowedOrigins
  ☐ Headers CORS configurados corretamente
  ☐ Vercel.json tem rewrites corretos

Ambiente:
  ☐ NODE_ENV=production em Vercel
  ☐ Vercel logs mostram sucesso
  ☐ Frontend consegue fazer requisições
```

---

## 🚀 Comandos Úteis para Vercel

```bash
# Listar projetos Vercel
vercel list

# Fazer deploy imediato
vercel --prod

# Ver logs em tempo real
vercel logs seu-projeto.vercel.app --tail

# Deletar deployment
vercel rm seu-projeto.vercel.app

# Redeploy sem mudanças de código
vercel --prod --force

# Rodar comando remoto
vercel env pull  # Puxar vars de ambiente para .env.local

# Verificar saúde do projeto
curl https://seu-projeto.vercel.app/api/?route=db&endpoint=test
```

---

## 📞 Próximos Passos se Problema Persistir

1. ✅ Executar comandos de debug acima
2. ✅ Verificar logs Vercel (`vercel logs seu-projeto.vercel.app --tail`)
3. ✅ Testar banco diretamente com `psql`
4. ✅ Testar API local (`npm run dev:api`)
5. ✅ Copiar erro exato do log
6. ✅ Consultar documentação oficial:
   - Vercel: https://vercel.com/docs
   - PostgreSQL: https://www.postgresql.org/docs/
   - Node.js: https://nodejs.org/docs/

---

**Versão:** 2.5 | **Data:** 2025-10-31 | **Status:** ✅ Estável
