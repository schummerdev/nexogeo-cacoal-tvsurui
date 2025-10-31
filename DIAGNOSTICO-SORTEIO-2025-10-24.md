# Diagnóstico - Problema no Sorteio Caixa Misteriosa
**Data:** 2025-10-24
**Status:** 🔍 Causa Raiz Identificada

---

## 🐛 Problema Relatado

1. **Erro 400 no sorteio**: API retorna "Nenhum palpite correto encontrado"
2. **Contradição**: Frontend mostra "1 PALPITES CORRETOS"
3. **Dados do participante**:
   - Nome: raquel
   - Bairro: industrial
   - Palpite: `"maquina lavar"`
   - Produto correto: `"maquina de lavar roupa"`

---

## 🔍 Causa Raiz

### Inconsistência entre validação Frontend vs Backend

#### **Frontend** (CaixaMisteriosaSorteioPage.jsx:9-52)
Usa função `simpleValidateGuess` que implementa validação por **palavras-chave**:

```javascript
// Extrai palavras principais (remove stopwords, plural)
guessWords = ["maquina", "lavar"]
answerWords = ["maquina", "lavar", "roupa"]

// Verifica se TODAS as palavras do palpite estão na resposta
guessWords.every(word => answerWords.includes(word)) // ✅ TRUE
```

**Resultado**: `"maquina lavar"` = `"maquina de lavar roupa"` → **ACEITO** ✅

---

#### **Backend** (api/caixa-misteriosa.js:354-388)
Usa função `validateWithLevenshtein` que compara **strings completas**:

```javascript
normalizedGuess = "maquina lavar"
normalizedAnswer = "maquina lavar roupa"

distance = levenshteinDistance("maquina lavar", "maquina lavar roupa") // = 6
tolerance = 3  // Para strings >10 caracteres

isCorrect = distance <= tolerance  // 6 > 3 → ❌ FALSE
```

**Resultado**: `"maquina lavar"` ≠ `"maquina de lavar roupa"` → **REJEITADO** ❌

---

### Por que a validação com IA não é chamada?

A validação com IA (Google Gemini) SÓ é chamada se:
1. Levenshtein falhar E
2. `GOOGLE_API_KEY` estiver configurada na Vercel

**Hipótese**: `GOOGLE_API_KEY` NÃO está configurada nas variáveis de ambiente da Vercel, então a IA nunca é chamada.

---

## 📊 Fluxo Atual vs Esperado

### Fluxo Atual (Backend)
```
validateGuessWithAI()
  ├─ 1️⃣ validateWithLevenshtein() → ❌ Rejeita "maquina lavar"
  ├─ 2️⃣ Verifica GOOGLE_API_KEY → ❓ Provavelmente ausente
  ├─ 3️⃣ Se não tem API key → Retorna resultado Levenshtein (❌)
  └─ 4️⃣ correctSubmissions.length === 0 → Erro 400
```

### Fluxo Esperado (Frontend)
```
validateGuessWithAI()
  ├─ 1️⃣ simpleValidateGuess() → ✅ Aceita "maquina lavar"
  └─ 2️⃣ Se passou → Retorna TRUE (não chama API)
```

---

## 💡 Soluções Propostas

### **Opção 1: Adicionar validação por palavras-chave no backend** ⭐ RECOMENDADO

Adicionar lógica de palavras-chave ANTES da validação Levenshtein:

```javascript
// api/caixa-misteriosa.js - Adicionar ANTES da linha 268

function validateByKeywords(guess, correctAnswer) {
    const normalize = (text) => text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

    const stopWords = ['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'para', 'com'];

    const extractWords = (text) => normalize(text)
        .split(/\s+/)
        .filter(word => !stopWords.includes(word) && word.length > 2)
        .map(word => word.endsWith('s') && word.length > 3 ? word.slice(0, -1) : word);

    const guessWords = extractWords(guess);
    const answerWords = extractWords(correctAnswer);

    // Se TODAS as palavras do palpite estão no produto, aceitar
    if (guessWords.length > 0 && guessWords.every(word => answerWords.includes(word))) {
        return {
            isCorrect: true,
            confidence: 1.0,
            reason: `Palpite aceito por conter todas as palavras-chave do produto`
        };
    }

    return null; // Continua para Levenshtein
}

// Modificar validateGuessWithAI (linha 263):
async function validateGuessWithAI(guess, correctAnswer) {
    try {
        console.log('🎯 [VALIDAÇÃO] Iniciando validação:', { guess, correctAnswer });

        // 1️⃣ PRIMEIRA TENTATIVA: Validação por palavras-chave
        const keywordValidation = validateByKeywords(guess, correctAnswer);
        if (keywordValidation) {
            console.log('✅ [VALIDAÇÃO KEYWORDS] Palpite correto!', keywordValidation);
            return keywordValidation;
        }

        // 2️⃣ SEGUNDA TENTATIVA: Validação Levenshtein (para typos)
        const levenshteinValidation = validateWithLevenshtein(guess, correctAnswer);
        if (levenshteinValidation.isCorrect) {
            console.log('✅ [VALIDAÇÃO LEVENSHTEIN] Palpite correto!', levenshteinValidation);
            return levenshteinValidation;
        }

        // 3️⃣ TERCEIRA TENTATIVA: Validação com IA (apenas se tudo falhou)
        // ... (código existente)
    }
}
```

---

### **Opção 2: Configurar GOOGLE_API_KEY na Vercel**

1. Acessar Vercel Dashboard → nexogeo-demo → Settings → Environment Variables
2. Adicionar:
   - **Key**: `GOOGLE_API_KEY`
   - **Value**: `AIza...` (sua API key do Google)
   - **Environment**: Production, Preview, Development
3. Redeploy

**Problema**: Depende de serviço externo (Google) e pode ter custos/limites.

---

### **Opção 3: Usar lógica simples do frontend no backend**

Substituir completamente a validação do backend pela lógica do frontend (simples e eficaz).

---

## 🎯 Recomendação Final

**Implementar Opção 1** (validação por palavras-chave):

✅ Alinha backend com frontend
✅ Não depende de serviços externos
✅ Resolve o problema imediatamente
✅ Mantém Levenshtein e IA como fallbacks

---

## 📝 Próximos Passos

1. ✅ Implementar `validateByKeywords()` no backend
2. ✅ Modificar fluxo de `validateGuessWithAI()`
3. ✅ Testar com dados reais (jogo 31)
4. ✅ Deploy e validação
5. ⚠️ (Opcional) Adicionar `GOOGLE_API_KEY` como backup

---

**Gerado por:** Claude Code
**Arquivo de origem:** `erro.navegador.md`, `print-tela.png`
