# Instruções de Correções da Semana (15/02 - 24/02/2026)

Correções aplicadas no projeto **nexogeo-cacoal-record** que devem ser replicadas em outro projeto similar.

---

## 1. Bloqueio de Cadastro Duplicado (participantes)

**Arquivo:** `api/_handlers/participantes.js`  
**Problema:** Participantes conseguiam se cadastrar múltiplas vezes na mesma promoção com o mesmo telefone.

**O que fazer:**
- Antes do `INSERT INTO participantes`, adicionar verificação de duplicidade
- Limpar o telefone removendo caracteres não numéricos

```javascript
// Limpar telefone - manter apenas dígitos
const telefoneClean = telefone.replace(/\D/g, '');

// Verificação prévia de duplicidade
if (promocao_id) {
  const existing = await databasePool.query(
    `SELECT id FROM participantes
     WHERE telefone = $1 AND promocao_id = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [telefoneClean, promocao_id]
  );

  if (existing.rows.length > 0) {
    res.status(409).json({
      message: 'Você já participou desta promoção com este telefone!',
      error: 'DUPLICATE_PARTICIPATION',
      details: 'Cada telefone pode participar apenas uma vez por promoção.'
    });
    return;
  }
}
```

- No `INSERT`, usar `telefoneClean` em vez de `telefone` diretamente.

---

## 2. Rate Limit de Login Relaxado

**Arquivo:** `api/_lib/security.js`  
**Problema:** Rate limit de 5 requisições/15min estava bloqueando logins legítimos durante testes.

**O que fazer:**
- Alterar a função `rateLimitLogin` de `5` para `20` requisições:

```javascript
// ANTES:
const rateLimitLogin = async (req, res) => {
  return await rateLimit(req, res, 5, 15 * 60 * 1000, 'auth_login');
};

// DEPOIS:
const rateLimitLogin = async (req, res) => {
  return await rateLimit(req, res, 20, 15 * 60 * 1000, 'auth_login');
};
```

---

## 3. Suporte a Senha na Criação/Edição de Usuários

**Arquivo:** `api/index.js` (rotas de administradores)  
**Problema:** Criação e edição de usuários não permitiam definir senha manualmente.

### 3.1 Criação (POST):

```javascript
// ANTES:
const { usuario, role } = req.body || {};
const senhaTemporaria = generateSecurePassword();
const hashedPassword = await bcrypt.hash(senhaTemporaria, 10);

// DEPOIS:
const { usuario, role, senha, password } = req.body || {};
const passwordToUse = senha || password || generateSecurePassword();
const hashedPassword = await bcrypt.hash(passwordToUse, 10);

// Log simplificado
if (!senha && !password) {
  console.log(`[AUTH] ⚠️ Senha gerada automaticamente para ${usuario}: ${passwordToUse}`);
} else {
  console.log(`[AUTH] ✅ Usando senha fornecida pelo cliente para ${usuario}`);
}
```

### 3.2 Edição (PUT):

```javascript
// ANTES:
const { usuario, role } = req.body || {};
const updateResult = await query(`
  UPDATE usuarios SET usuario = $1, role = $2 WHERE id = $3
  RETURNING id, usuario, role, created_at
`, [usuario, role || 'user', parseInt(id)]);

// DEPOIS:
const { usuario, role, senha, password } = req.body || {};

let updateQuery, queryParams;

if (senha || password) {
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

## 4. Áudio de Aplausos (Sorteio)

### 4.1 Remover do Dashboard

**Arquivo:** `src/pages/SorteioPage.jsx`

- Remover o elemento `<audio id="sorteio-audio">` do JSX
- Remover todo `document.getElementById('sorteio-audio')` e chamadas `.play()` / `.pause()` na função `handleDraw`

### 4.2 Adicionar na Página Pública

**Arquivo:** `src/pages/SorteioPublicoPage.jsx`

- Adicionar `useRef` para o áudio:
```javascript
const audioRef = useRef(null);
```

- Adicionar `useEffect` para tocar quando ganhadores aparecem:
```javascript
useEffect(() => {
  if (showWinners && audioRef.current) {
    audioRef.current.currentTime = 0;
    audioRef.current.volume = audioEnabled ? 1 : 0;
    audioRef.current.play().catch(e => console.log('Erro ao tocar aplausos:', e));
  }
}, [showWinners, audioEnabled]);
```

- Adicionar elemento `<audio>` no JSX (dentro da div principal):
```jsx
<audio ref={audioRef} preload="auto">
  <source src="/audio/sorteio-aplausos.mp3" type="audio/mpeg" />
</audio>
```

- Garantir que o arquivo `public/audio/sorteio-aplausos.mp3` existe.

---

## Resumo dos Arquivos a Alterar

| # | Arquivo | Correção |
|---|---------|----------|
| 1 | `api/_handlers/participantes.js` | Bloqueio de duplicatas por telefone |
| 2 | `api/_lib/security.js` | Rate limit login: 5 → 20 |
| 3 | `api/index.js` | Suporte a senha em POST/PUT de usuários |
| 4 | `src/pages/SorteioPage.jsx` | Remover áudio de aplausos |
| 5 | `src/pages/SorteioPublicoPage.jsx` | Adicionar áudio de aplausos |
