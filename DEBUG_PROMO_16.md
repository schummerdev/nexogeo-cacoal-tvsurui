# Debug da Promoção 16 - Sorteio com Múltiplos Ganhadores

## Queries para Verificar os Dados

### 1. Verificar configuração da promoção 16
```sql
SELECT id, nome, numero_ganhadores, status, data_inicio, data_fim
FROM promocoes
WHERE id = 16;
```

**Esperado:** `numero_ganhadores = 2`

---

### 2. Verificar total de participantes da promoção 16
```sql
SELECT COUNT(*) as total_participantes
FROM participantes
WHERE promocao_id = 16;
```

**Esperado:** Número > 2 (para ter participantes disponíveis)

---

### 3. Verificar todos os ganhadores da promoção 16
```sql
SELECT
  g.id,
  g.participante_id,
  g.posicao,
  g.premio,
  g.cancelado,
  g.sorteado_em,
  p.nome,
  p.telefone,
  p.cidade
FROM ganhadores g
LEFT JOIN participantes p ON g.participante_id = p.id
WHERE g.promocao_id = 16
ORDER BY g.sorteado_em DESC, g.posicao;
```

**Esperado após sorteio:** 2 linhas (2 ganhadores, ambos com `cancelado = false`)

---

### 4. Verificar se há duplicatas ou conflitos
```sql
SELECT participante_id, promocao_id, COUNT(*) as total
FROM ganhadores
WHERE promocao_id = 16 AND (cancelado = false OR cancelado IS NULL)
GROUP BY participante_id, promocao_id
HAVING COUNT(*) > 1;
```

**Esperado:** Sem linhas (sem duplicatas)

---

## Logs a Monitorar no Vercel

Após fazer um novo sorteio, procure por estas mensagens no console do Vercel:

```
📊 [SORTEIO] Promo 16 - numero_ganhadores do BD: 2 (tipo: number)
📊 [SORTEIO] Quantidade após parseInt: 2 (tipo: number)
📊 [SORTEIO] Buscando 2 participantes para promo 16
📊 [SORTEIO] Participantes retornados: 2
📊 [SORTEIO] Iniciando loop para criar ganhadores - total a criar: 2
📊 [SORTEIO] Inserindo ganhador 1/2: [NOME]
✅ [SORTEIO] Ganhador 1 inserido com sucesso
📊 [SORTEIO] Inserindo ganhador 2/2: [NOME]
✅ [SORTEIO] Ganhador 2 inserido com sucesso
📊 [SORTEIO] Sorteio finalizado com 2 ganhador(es)
```

---

## Se aparecer erro durante inserção

```
❌ [SORTEIO] ERRO ao inserir ganhador 2/2: ...
❌ [SORTEIO] Detalhes do erro: ...
```

Isso indicará qual é a causa do problema na inserção.

---

## Passos para Debug

1. **Fazer novo sorteio** na promoção 16
2. **Copiar os logs** do console Vercel
3. **Executar queries acima** no banco
4. **Comparar resultados** com esperado

Isso nos ajudará a identificar se o problema é:
- ❌ Na leitura do `numero_ganhadores`
- ❌ Na busca dos participantes
- ❌ Na inserção dos ganhadores
- ❌ Na exibição dos resultados
