-- Adiciona a coluna participante_id e garante que a tabela já esteja vazia ou com IDs válidos
-- Como acabamos de lançar, podemos limpar os votos de testes anônimos anteriores
TRUNCATE TABLE enquete_votos;

-- Adiciona o vínculo com participante
ALTER TABLE enquete_votos 
ADD COLUMN participante_id INTEGER NOT NULL REFERENCES participantes(id) ON DELETE CASCADE;

-- Remove a restrição antiga
DROP INDEX IF EXISTS idx_enquete_votos_ip;

-- Cria o novo Unique Index que garante 1 voto por Participante por Enquete
CREATE UNIQUE INDEX IF NOT EXISTS unq_voto_por_participante ON enquete_votos(enquete_id, participante_id);

-- Cria indice para busca de votos por participante
CREATE INDEX IF NOT EXISTS idx_enquete_votos_participante_id ON enquete_votos(participante_id);
