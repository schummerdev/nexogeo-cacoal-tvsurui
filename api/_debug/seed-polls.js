const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
    try {
        // Pegar o ID da última promoção ativa para não quebrar a FK
        const resPromo = await pool.query("SELECT id FROM promocoes WHERE status = 'ativa' AND deleted_at IS NULL ORDER BY criado_em DESC LIMIT 1");
        const promoId = resPromo.rows.length > 0 ? resPromo.rows[0].id : 77; // Fallback para 77 se não achar

        console.log('Using promocao_id:', promoId);

        // Criar participantes mockados
        const p1 = await pool.query(`INSERT INTO participantes (promocao_id, nome, telefone, cidade, participou_em) VALUES 
        ($1, 'João', '5511999999991', 'São Paulo', CURRENT_TIMESTAMP), 
        ($1, 'Maria', '5511999999992', 'Rio de Janeiro', CURRENT_TIMESTAMP), 
        ($1, 'Pedro', '5511999999993', 'Belo Horizonte', CURRENT_TIMESTAMP) RETURNING id;`, [promoId]);
        const parts = p1.rows;

        // Criar enquete
        const r1 = await pool.query(`INSERT INTO enquetes (titulo, pergunta, status, cor_tema) VALUES ('Enquete Teste TV', 'Qual sua preferência?', 'ativa', 'nexogeo') RETURNING id;`);
        const enqueteId = r1.rows[0].id;

        // Criar opcoes
        const o1 = await pool.query(`INSERT INTO enquete_opcoes (enquete_id, texto_opcao, cor_grafico) VALUES ($1, 'Opção A', '#4F46E5'), ($1, 'Opção B', '#EF4444') RETURNING id;`, [enqueteId]);
        const opts = o1.rows;

        // Inserir votos em cadeia para testar timeline (baloes) com delay
        const delay = ms => new Promise(res => setTimeout(res, ms));

        // Voto 1
        await pool.query(`INSERT INTO enquete_votos (enquete_id, opcao_id, participante_id) VALUES ($1, $2, $3);`, [enqueteId, opts[0].id, parts[0].id]);
        await delay(100);
        // Voto 2
        await pool.query(`INSERT INTO enquete_votos (enquete_id, opcao_id, participante_id) VALUES ($1, $2, $3);`, [enqueteId, opts[1].id, parts[1].id]);
        await delay(100);
        // Voto 3
        await pool.query(`INSERT INTO enquete_votos (enquete_id, opcao_id, participante_id) VALUES ($1, $2, $3);`, [enqueteId, opts[0].id, parts[2].id]);

        console.log('✅ Seed completed successfully! Enquete ID:', enqueteId);
    } catch (e) {
        console.error('Erro na seed:', e.message);
    } finally {
        pool.end();
    }
}

seed();
