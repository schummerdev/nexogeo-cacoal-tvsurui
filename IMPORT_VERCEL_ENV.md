# 📥 Como Importar Variáveis de Ambiente no Vercel

## ⏱️ Tempo estimado: 5 minutos

---

## 🚀 Opção 1: Importação Manual (Recomendado)

### Passo 1: Acesse o Vercel Dashboard
```
https://vercel.com/dashboard
```

### Passo 2: Selecione seu Projeto
```
Clique em: nexogeo-cacoal-tvsurui
```

### Passo 3: Vá para Settings
```
Canto superior direito → Click em "Settings"
```

### Passo 4: Vá para Environment Variables
```
Menu esquerdo → Click em "Environment Variables"
```

### Passo 5: Adicione as Variáveis (uma por uma)

#### Variável 1: DATABASE_URL
```
Name: DATABASE_URL
Value: postgresql://neondb_owner:npg_7EADUX3QeGaO@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require

Ambientes: ✅ Production
            ✅ Preview
            ✅ Development

Click: Save
```

#### Variável 2: JWT_SECRET
```
Name: JWT_SECRET
Value: f3d66f17f4cc0e9629a75d86ebccdfd7d7881135116e403f15ea0b1ecf14f5597680f82ddfb38091fee9b43070fdfec28608a042ba1c9a6d1433d60b44f7ab28

Ambientes: ✅ Production
            ✅ Preview
            ✅ Development

Click: Save
```

#### Variável 3: GOOGLE_API_KEY
```
Name: GOOGLE_API_KEY
Value: AIzaSyBxFsDb0lGl5zUhtw_keTSgz6q3xhDYwNU

Ambientes: ✅ Production
            ✅ Preview
            ✅ Development

Click: Save
```

#### Variável 4: NODE_ENV (Opcional)
```
Name: NODE_ENV
Value: production

Ambientes: ✅ Production
            ✅ Preview
            ❌ Development (deixe vazio ou development)

Click: Save
```

---

## ✅ Após Importar Todas as Variáveis

### Passo 6: Redeploy da Aplicação
```
Vá para: Deployments
↓
Clique no último deployment
↓
Clique em "Redeploy" (canto superior direito)
↓
Aguarde 2-3 minutos para rebuild
```

---

## 📋 Checklist de Verificação

- [ ] DATABASE_URL configurada (Production + Preview + Development)
- [ ] JWT_SECRET configurada (Production + Preview + Development)
- [ ] GOOGLE_API_KEY configurada (Production + Preview + Development)
- [ ] NODE_ENV configurada (Production + Preview apenas)
- [ ] Todas as 4 variáveis aparecem em "Environment Variables"
- [ ] Clicou em "Redeploy"
- [ ] Aguardou 2-3 minutos para build completar
- [ ] Testou em: https://nexogeo-cacoal-tvsurui.vercel.app/login

---

## 🎯 Valores das Variáveis (Copiar e Colar)

### DATABASE_URL
```
postgresql://neondb_owner:npg_7EADUX3QeGaO@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

### JWT_SECRET
```
f3d66f17f4cc0e9629a75d86ebccdfd7d7881135116e403f15ea0b1ecf14f5597680f82ddfb38091fee9b43070fdfec28608a042ba1c9a6d1433d60b44f7ab28
```

### GOOGLE_API_KEY
```
AIzaSyBxFsDb0lGl5zUhtw_keTSgz6q3xhDYwNU
```

### NODE_ENV
```
production
```

---

## 🔍 Como Verificar se Funcionou

### 1. Verifique o Build
```
Deployments → Último deployment → verifique se tem ✅ (checkmark verde)
Se tiver ❌, clique para ver logs e identificar o erro
```

### 2. Teste a Aplicação
```
Acesse: https://nexogeo-cacoal-tvsurui.vercel.app/login
Tente fazer login com um usuário
Abra o Console do navegador (F12) e procure por erros
```

### 3. Erros Esperados vs. Novos

**❌ Erros que DEVEM desaparecer:**
- "column deleted_at does not exist"
- "function cleanup_old_rate_limits() does not exist"
- "Cannot find module 'cookie-parser'"
- Erro 500 em /api/promocoes

**✅ Se tiver sucesso:**
- Login funcionando
- Dashboard carregando
- Nenhum erro 500 no console

---

## 🆘 Troubleshooting

### Problema: "Connection refused" ou "ECONNREFUSED"
**Causa**: DATABASE_URL está incompleto ou inválido

**Solução**:
- Verifique se DATABASE_URL é exatamente: `postgresql://neondb_owner:npg_7EADUX3QeGaO@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require`
- Copie e cole novamente do arquivo `.env_vercel`

### Problema: "JWT Secret must be at least 32 characters"
**Causa**: JWT_SECRET inválido

**Solução**:
- Copie JWT_SECRET exatamente do arquivo `.env_vercel`
- Certifique-se de não adicionar espaços

### Problema: "Still getting error 500"
**Causa**: Build anterior não atualizou

**Solução**:
1. Aguarde 5 minutos após salvar as variáveis
2. Vá em Deployments
3. Clique em "Redeploy" novamente
4. Force refresh do navegador (Ctrl+Shift+R)

---

## 📚 Arquivos de Referência

- `.env_vercel` - Este arquivo com as variáveis
- `.env` - Arquivo local (não commitar)
- `VERCEL_ENV_SETUP.md` - Documentação original
- `DATABASE_URL_FIX.md` - Guia específico do DATABASE_URL

---

## 📞 Suporte

Se tiver dúvidas:
1. Consulte `VERCEL_ENV_SETUP.md`
2. Consulte `DATABASE_URL_FIX.md`
3. Verifique se todas as 4 variáveis estão configuradas
4. Verifique os logs em Vercel Dashboard → Deployments

---

**Última atualização**: 03/Nov/2025
**Status**: CRÍTICO - Necessário para aplicação funcionar
