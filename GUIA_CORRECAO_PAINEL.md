# Guia de Correção: Painel de Usuários e Senhas

Este guia descreve como replicar as correções feitas no sistema de login e gerenciamento de usuários para outros projetos com o mesmo código-fonte.

## 1. Correção no Backend (`api/index.js`)

O problema principal era que o sistema ignorava a senha enviada pelo painel administrativo e gerava uma senha aleatória, ou não atualizava a senha em edições.

### No Handler de Criação (POST)
Procure pela rota `administradores` e o método `POST`. Substitua a lógica de senha para aceitar o campo vindo do frontend:

```javascript
// Localize: if (type === 'administradores') { ... if (req.method === 'POST') {
const { usuario, role, senha, password } = req.body || {};
// Se não houver senha no body, gera uma segura, senão usa a fornecida
const passwordToUse = senha || password || generateSecurePassword();

// Criptografa a senha antes de salvar
const hashedPassword = await bcrypt.hash(passwordToUse, 10);

const insertResult = await query(`
  INSERT INTO usuarios (usuario, senha_hash, role)
  VALUES ($1, $2, $3)
  RETURNING id, usuario, role, created_at
`, [usuario, hashedPassword, role || 'user']);
```

### No Handler de Edição (PUT)
No método `PUT`, adicione suporte para atualizar a senha se ela for enviada:

```javascript
// Localize: if (req.method === 'PUT') {
const { id } = req.query || {};
const { usuario, role, senha, password } = req.body || {};

let updateQuery;
let queryParams;

if (senha || password) {
  // Se enviou senha, criptografa e inclui no UPDATE
  const passwordToUse = senha || password;
  const hashedPassword = await bcrypt.hash(passwordToUse, 10);
  updateQuery = `
    UPDATE usuarios 
    SET usuario = $1, role = $2, senha_hash = $3, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $4 
    RETURNING id, usuario, role, created_at
  `;
  queryParams = [usuario, role || 'user', hashedPassword, parseInt(id)];
} else {
  // Caso contrário, atualiza apenas nome e cargo
  updateQuery = `
    UPDATE usuarios 
    SET usuario = $1, role = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $3 
    RETURNING id, usuario, role, created_at
  `;
  queryParams = [usuario, role || 'user', parseInt(id)];
}

const updateResult = await query(updateQuery, queryParams);
```

---

## 2. Ajuste de Rate Limit (`api/_lib/security.js`)

Para evitar o erro `429 (Too Many Requests)` durante testes iniciais ou se o usuário errar a senha algumas vezes, aumente o limite de tentativas.

Edite o arquivo `api/_lib/security.js`:

```javascript
// Localize a função rateLimitLogin
const rateLimitLogin = async (req, res) => {
  // Aumente de 5 para 20 (ou o valor desejado)
  return await rateLimit(req, res, 20, 15 * 60 * 1000, 'auth_login');
};
```

---

## 3. Verificação de Banco de Dados

Certifique-se de que a tabela `usuarios` no novo banco tenha a coluna `senha_hash` e não apenas `senha`.

**Comando SQL para garantir a estrutura:**
```sql
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(255) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Como Limpar Bloqueios Atuais

Se alguém já estiver bloqueado pelo erro 429, execute este comando no console do seu banco de dados (Neon SQL Editor):

```sql
DELETE FROM rate_limits;
```

---

**Dica:** Sempre verifique se o `bcrypt` está devidamente importado no topo do seu `api/index.js` para que a criptografia funcione corretamente.
