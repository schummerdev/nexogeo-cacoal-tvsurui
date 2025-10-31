# Diagnóstico: Erro "Unexpected token 'A'" no Login

## ❌ Problema

Ao tentar fazer login, o navegador retorna:
```
Unexpected token 'A', "A server e"... is not valid JSON
```

Isso significa que a resposta da API não é JSON válido, mas um texto começando com "A server...".

## 🔍 Causas Possíveis

### 1. **Dependências Não Instaladas** (Mais Provável)
A API está retornando erro HTML/texto em vez de JSON porque:
- Express não está carregado
- bcrypt não está disponível
- jsonwebtoken não está carregado
- As dependências do `package.json` não foram instaladas

**Sintomas:**
```
Error: Cannot find module 'express'
Error: Cannot find module 'bcrypt'
Error: Cannot find module 'jsonwebtoken'
```

### 2. **Banco de Dados Não Conectado**
A tabela `usuarios` não existe ou não está acessível.

**Sintomas:**
- Query falha ao buscar usuário
- Retorna erro SQL em texto puro

### 3. **JWT_SECRET Não Configurado**
O arquivo `.env` está faltando ou não tem a variável `JWT_SECRET`.

**Sintomas:**
```
JWT_SECRET environment variable is required
```

### 4. **DATABASE_URL Inválido**
A variável de ambiente `DATABASE_URL` não aponta para um banco PostgreSQL válido.

**Sintomas:**
- Erro de conexão ao tentar fazer query

## ✅ Solução Passo a Passo

### Passo 1: Instalar Dependências
```bash
# Instalar todas as dependências do projeto
npm install
```

**Verifica:**
```bash
# Confirmar instalação
npm ls express bcrypt jsonwebtoken
```

### Passo 2: Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env
```

**Edite `.env` e configure:**
```env
# Database (OBRIGATÓRIO)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT Secret (OBRIGATÓRIO)
JWT_SECRET=seu_secret_muito_longo_aqui_com_muitos_caracteres

# Ambiente (OPCIONAL)
NODE_ENV=development
```

### Passo 3: Testar Conexão com Banco
```bash
# Iniciar a API em desenvolvimento
npm run dev:api
```

A API deve iniciar em `http://localhost:3002`

```bash
# Em outro terminal, testar conexão:
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

### Passo 4: Verificar Tabela `usuarios`
```bash
# Verificar se tabela existe (conecte ao banco PostgreSQL)
psql YOUR_DATABASE_URL

-- Execute:
SELECT * FROM usuarios LIMIT 1;
```

Se a tabela não existir, execute a migração:
```bash
npm run migrate
```

### Passo 5: Criar Usuário de Teste
Você precisa ter pelo menos um usuário no banco para fazer login.

```bash
# Conecte ao banco e execute:
psql YOUR_DATABASE_URL

-- Crie usuário de teste (a senha será hasheada):
INSERT INTO usuarios (usuario, senha_hash, role, email)
VALUES (
  'admin',
  -- Use bcrypt hash da senha 'admin123':
  '$2b$10$...hash_bcryptado...',
  'admin',
  'admin@example.com'
);
```

**Ou execute o script de criação:**
```bash
node create-admin.js
```

### Passo 6: Testar Login via API
```bash
# Com a API rodando em localhost:3002
curl -X POST http://localhost:3002/api/?route=auth&endpoint=login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","senha":"admin123"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "usuario": "admin",
    "email": "admin@example.com",
    "role": "admin"
  },
  "timestamp": "2025-10-31T..."
}
```

### Passo 7: Iniciar Frontend
```bash
# Em novo terminal
npm start
```

Frontend abrirá em `http://localhost:3000`

## 🔧 Troubleshooting Adicional

### "Muitas requisições. Tente novamente em 1 minuto"
**Causa:** Rate limit atingido (60 req/min em produção, 200 em dev)
**Solução:** Esperar 1 minuto ou reiniciar servidor

### "Usuário ou senha incorretos"
**Causa:**
- Usuário não existe no banco
- Senha incorreta
- Hash de senha inválido

**Solução:**
```bash
# Recriar usuário de teste
node create-admin.js
```

### "Token inválido ou expirado"
**Causa:** JWT_SECRET não corresponde entre frontend/backend
**Solução:** Certificar que mesma `JWT_SECRET` em `.env` para ambos

### Erro "Cannot find module X"
**Causa:** Dependências não instaladas
**Solução:**
```bash
npm install
npm ci  # Instalar versão exata do package-lock.json
```

## 📋 Checklist de Solução Rápida

- [ ] `npm install` executado sem erros
- [ ] `.env` copiado de `.env.example`
- [ ] `DATABASE_URL` configurada no `.env`
- [ ] `JWT_SECRET` configurada no `.env`
- [ ] `npm run dev:api` rodando sem erros
- [ ] `curl http://localhost:3002/api/?route=db&endpoint=test` retorna sucesso
- [ ] Usuário admin existe na tabela `usuarios`
- [ ] Login funciona via curl com token válido
- [ ] Frontend (`npm start`) conecta sem erros

## 📞 Próximos Passos

Se ainda não funcionar:
1. Verificar logs do terminal onde `npm run dev:api` está rodando
2. Copiar a mensagem de erro exata
3. Verificar arquivo `CLAUDE.md` na seção "Troubleshooting & Common Issues"
4. Revisar variáveis de ambiente em `MIGRATIONS.md`

---

**Última atualização:** 2025-10-31
**Versão:** 2.5 (Estável)
