# 📊 Relatório de Atualização do Schema - NexoGeo

**Data:** 2025-11-16
**Versão do Schema Esperado:** 2.3.0
**Banco Analisado:** nexogeo-rolim-record (Neon/PostgreSQL)

---

## 🎯 Resumo Executivo

O banco de dados está **parcialmente atualizado**, com algumas tabelas e recursos faltantes que são importantes para conformidade LGPD e otimização de performance.

### Estatísticas Atuais:
- **Participantes regulares:** 2
- **Participantes públicos:** 7
- **Promoções ativas:** 1
- **Ganhadores:** 0
- **Usuários:** 3

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 🔴 PRIORIDADE ALTA

#### 1. Tabelas de Auditoria LGPD Faltantes
```
❌ data_access_logs    - Log de acesso a dados pessoais (Art. 37 LGPD)
❌ consent_logs        - Registro de consentimentos
❌ system_logs         - Logs técnicos do sistema
```

**Impacto:** Não conformidade com LGPD, falta de rastreabilidade de acessos a dados pessoais.

#### 2. Índices Críticos de Performance Faltantes
```
❌ idx_participantes_telefone           - Busca rápida por telefone
❌ idx_participantes_promocao_id        - Filtro por promoção
❌ idx_participante_unico_por_promocao  - Evita duplicação de telefone por promoção
❌ idx_ganhadores_promocao_id           - Consulta de ganhadores
❌ idx_promocoes_status                 - Filtro por status de promoção
```

**Impacto:** Queries lentas conforme o banco crescer, possível duplicação de participantes.

#### 3. Views Úteis Faltantes
```
❌ participantes_unificados  - Combinação de participantes regulares + públicos
❌ participantes_unicos      - Deduplicação por telefone
```

**Impacto:** Código mais complexo no backend, performance reduzida.

#### 4. Função de Limpeza Faltante
```
❌ cleanup_old_logs()  - Limpeza automática de logs antigos
```

**Impacto:** Logs acumulando indefinidamente, consumo de espaço.

---

### 🟡 PRIORIDADE MÉDIA

#### 5. Colunas Faltantes em Tabelas Existentes

**configuracoes_emissora:**
```
❌ created_at   - Data de criação do registro
❌ updated_at   - Data de última atualização
```

**ganhadores:**
```
❌ video_url    - URL do vídeo do sorteio
```

**games:**
```
❌ winner_id      - ID do participante vencedor
❌ winner_guess   - Palpite vencedor
❌ finished_at    - Data de finalização
```
*Nota: Usa winner_submission_id e ended_at como alternativa*

**public_participants:**
```
❌ reference_code      - Código usado para indicação
❌ total_submissions   - Total de palpites enviados
❌ correct_guesses     - Total de acertos
❌ game_id             - Último jogo participado
```
*Nota: Usa referral_code e referred_by_id como alternativa*

**submissions:**
```
❌ submitted_at  - Data de submissão
```
*Nota: Usa created_at como alternativa*

---

## ✅ O QUE ESTÁ CORRETO

### Tabelas Principais (100% completas):
- ✅ **usuarios** - Todas as colunas presentes
- ✅ **promocoes** - Todas as colunas presentes (incluindo slug, is_drawing)
- ✅ **participantes** - Todas as colunas presentes (soft delete OK)
- ✅ **sponsors** - Todas as colunas presentes
- ✅ **products** - Todas as colunas presentes
- ✅ **audit_logs** - Tabela existe com índices
- ✅ **rate_limits** - Rate limiting configurado

### Tabela Extra (Não esperada):
- ✅ **referral_rewards** - Sistema de recompensas por indicação

### Índices de Performance Existentes:
- ✅ audit_logs: 4 índices (user_id, action, table_name, created_at)
- ✅ games: status, product_id
- ✅ products: sponsor_id
- ✅ public_participants: phone, referral_code, own_referral_code
- ✅ submissions: game_id, participant_id, phone, deleted_at
- ✅ usuarios: usuario (unique)

---

## 🛠️ SCRIPTS DE CORREÇÃO

### Script 1: Criar Tabelas de Auditoria LGPD (ALTA PRIORIDADE)

```sql
-- ============================================================
-- 1. TABELA DE LOGS DE ACESSO A DADOS PESSOAIS (LGPD Art. 37)
-- ============================================================
CREATE TABLE IF NOT EXISTS data_access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    participant_id INTEGER,
    data_type VARCHAR(50) NOT NULL,
    access_reason VARCHAR(100),
    legal_basis VARCHAR(50),
    masked_data BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_access_logs IS 'Log específico de acesso a dados pessoais conforme Art. 37 da LGPD';

CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_participant_id ON data_access_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_type ON data_access_logs(data_type);

-- ============================================================
-- 2. TABELA DE LOGS DE CONSENTIMENTO
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_logs (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER,
    consent_type VARCHAR(50) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT,
    consent_version VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    withdrawal_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE consent_logs IS 'Registro de consentimentos e retiradas conforme LGPD';

CREATE INDEX IF NOT EXISTS idx_consent_logs_participant_id ON consent_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type ON consent_logs(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_logs_created_at ON consent_logs(created_at);

-- ============================================================
-- 3. TABELA DE LOGS DO SISTEMA
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL, -- 'ERROR', 'WARN', 'INFO', 'DEBUG'
    component VARCHAR(50),
    message TEXT NOT NULL,
    error_code VARCHAR(20),
    stack_trace TEXT,
    additional_data JSONB,
    user_id INTEGER,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_logs IS 'Logs técnicos do sistema para monitoramento e debugging';

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
```

### Script 2: Criar Índices Críticos de Performance (ALTA PRIORIDADE)

```sql
-- ============================================================
-- ÍNDICES PARA TABELA PARTICIPANTES
-- ============================================================

-- Busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_participantes_telefone
  ON participantes(telefone);

-- Filtro por promoção
CREATE INDEX IF NOT EXISTS idx_participantes_promocao_id
  ON participantes(promocao_id)
  WHERE deleted_at IS NULL;

-- ⚠️ CRÍTICO: Evita duplicação de telefone por promoção
CREATE UNIQUE INDEX IF NOT EXISTS idx_participante_unico_por_promocao
  ON participantes(promocao_id, telefone)
  WHERE deleted_at IS NULL AND promocao_id IS NOT NULL;

-- Busca por nome
CREATE INDEX IF NOT EXISTS idx_participantes_nome
  ON participantes(nome)
  WHERE deleted_at IS NULL;

-- Filtro por cidade
CREATE INDEX IF NOT EXISTS idx_participantes_cidade
  ON participantes(cidade)
  WHERE deleted_at IS NULL;

-- Filtro por bairro
CREATE INDEX IF NOT EXISTS idx_participantes_bairro
  ON participantes(bairro)
  WHERE deleted_at IS NULL;

-- Ordenação por data
CREATE INDEX IF NOT EXISTS idx_participantes_criado_em
  ON participantes(participou_em DESC)
  WHERE deleted_at IS NULL;

-- Soft delete
CREATE INDEX IF NOT EXISTS idx_participantes_soft_delete
  ON participantes(deleted_at);

-- Geolocalização
CREATE INDEX IF NOT EXISTS idx_participantes_geolocalizacao
  ON participantes(latitude, longitude);

-- ============================================================
-- ÍNDICES PARA TABELA GANHADORES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ganhadores_promocao_id
  ON ganhadores(promocao_id)
  WHERE deleted_at IS NULL OR deleted_at = false;

CREATE INDEX IF NOT EXISTS idx_ganhadores_participante_id
  ON ganhadores(participante_id);

CREATE INDEX IF NOT EXISTS idx_ganhadores_sorteado_em
  ON ganhadores(sorteado_em DESC);

CREATE INDEX IF NOT EXISTS idx_ganhadores_cancelado
  ON ganhadores(cancelado);

-- ============================================================
-- ÍNDICES PARA TABELA PROMOCOES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_promocoes_status
  ON promocoes(status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_promocoes_datas
  ON promocoes(data_inicio, data_fim)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_promocoes_criado_em
  ON promocoes(criado_em DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_promocoes_slug
  ON promocoes(slug)
  WHERE deleted_at IS NULL;
```

### Script 3: Criar Views Úteis (MÉDIA PRIORIDADE)

```sql
-- ============================================================
-- VIEW: PARTICIPANTES UNIFICADOS (regulares + públicos)
-- ============================================================
CREATE OR REPLACE VIEW participantes_unificados AS
SELECT
    id,
    promocao_id,
    nome AS name,
    telefone AS phone,
    bairro AS neighborhood,
    cidade AS city,
    latitude,
    longitude,
    email,
    origem_source,
    origem_medium,
    participou_em AS created_at,
    'regular' AS participant_type
FROM participantes
WHERE deleted_at IS NULL

UNION ALL

SELECT
    id,
    NULL AS promocao_id,
    name,
    phone,
    neighborhood,
    city,
    latitude,
    longitude,
    NULL AS email,
    'caixa_misteriosa' AS origem_source,
    'game' AS origem_medium,
    created_at,
    'public' AS participant_type
FROM public_participants
WHERE deleted_at IS NULL;

COMMENT ON VIEW participantes_unificados IS 'View combinada de participantes regulares e públicos';

-- ============================================================
-- VIEW: PARTICIPANTES ÚNICOS (sem duplicação de telefone)
-- ============================================================
CREATE OR REPLACE VIEW participantes_unicos AS
SELECT DISTINCT ON (phone) *
FROM participantes_unificados
ORDER BY phone, created_at DESC;

COMMENT ON VIEW participantes_unicos IS 'Participantes únicos baseado no telefone (mais recente por telefone)';
```

### Script 4: Criar Função de Limpeza (MÉDIA PRIORIDADE)

```sql
-- ============================================================
-- FUNÇÃO: LIMPEZA AUTOMÁTICA DE LOGS ANTIGOS
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Audit logs: manter 2 anos
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Data access logs: manter 1 ano (LGPD)
    DELETE FROM data_access_logs WHERE created_at < NOW() - INTERVAL '1 year';

    -- System logs: manter 6 meses (INFO/WARN/DEBUG) ou 1 ano (ERROR)
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '6 months' AND level != 'ERROR';
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '1 year' AND level = 'ERROR';

    -- Consent logs: manter 5 anos (conformidade legal)
    DELETE FROM consent_logs WHERE created_at < NOW() - INTERVAL '5 years';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_logs() IS 'Remove logs antigos conforme política de retenção';
```

### Script 5: Adicionar Colunas Faltantes (BAIXA PRIORIDADE)

```sql
-- ============================================================
-- COLUNAS EM CONFIGURACOES_EMISSORA
-- ============================================================
ALTER TABLE configuracoes_emissora
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE configuracoes_emissora
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- COLUNA EM GANHADORES
-- ============================================================
ALTER TABLE ganhadores
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- ============================================================
-- COLUNAS EM PUBLIC_PARTICIPANTS (para compatibilidade)
-- ============================================================
ALTER TABLE public_participants
ADD COLUMN IF NOT EXISTS total_submissions INT DEFAULT 0;

ALTER TABLE public_participants
ADD COLUMN IF NOT EXISTS correct_guesses INT DEFAULT 0;

ALTER TABLE public_participants
ADD COLUMN IF NOT EXISTS game_id INT;
```

---

## 📋 ORDEM DE EXECUÇÃO RECOMENDADA

1. **IMEDIATO (Conformidade LGPD):**
   - Script 1: Criar tabelas de auditoria

2. **ALTA PRIORIDADE (Performance):**
   - Script 2: Criar índices críticos

3. **MÉDIA PRIORIDADE (Usabilidade):**
   - Script 3: Criar views úteis
   - Script 4: Função de limpeza

4. **BAIXA PRIORIDADE (Compatibilidade):**
   - Script 5: Colunas adicionais

---

## ✅ PRÓXIMOS PASSOS

1. **Fazer backup** do banco atual (no Neon Console)
2. **Executar Script 1** - Tabelas de auditoria LGPD
3. **Executar Script 2** - Índices de performance
4. **Testar aplicação** para garantir que tudo funciona
5. **Executar Script 3 e 4** - Views e função de limpeza
6. **Re-executar verificação:** `curl "https://nexogeo-rolim-record.vercel.app/api/schema-check"`

---

## 📌 Observações Importantes

1. **O banco está funcional** - Apenas otimizações e conformidade faltam
2. **Soft delete OK** - Todas as tabelas principais têm deleted_at
3. **Tabela extra** - `referral_rewards` não está no schema esperado mas pode ser útil
4. **Alternativas válidas** - Algumas colunas faltantes têm equivalentes funcionais
5. **Índices parciais** - Alguns índices importantes já existem

---

**Gerado por:** Claude Code
**API utilizada:** /api/schema-check
