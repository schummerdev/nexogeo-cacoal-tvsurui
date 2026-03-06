const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.prod') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyViews() {
    try {
        const res = await pool.query('SELECT COUNT(*) as count FROM participantes_unificados');
        console.log('✅ View participantes_unificados: OK (Contagem:', res.rows[0].count, ')');

        const resUnicos = await pool.query('SELECT COUNT(*) as count FROM participantes_unicos');
        console.log('✅ View participantes_unicos: OK (Contagem:', resUnicos.rows[0].count, ')');

        const resCancelado = await pool.query('SELECT COUNT(*) as count FROM ganhadores WHERE cancelado = false');
        console.log('✅ Consulta ganhadores.cancelado: OK (Ativos:', resCancelado.rows[0].count, ')');

    } catch (err) {
        console.error('❌ Erro na verificação das views:', err.message);
    } finally {
        await pool.end();
    }
}

verifyViews();
