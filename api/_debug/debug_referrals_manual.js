

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.vercel.prod') });
// Fallback para .env local se necessário
if (!process.env.POSTGRES_URL) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const { query } = require('../lib/db');


async function testReferral() {
    console.log('🧪 Iniciando teste de correção de Referral...');

    const timestamp = Date.now();
    const phoneReferrer = `99${timestamp.toString().substring(5)}8`; // Gera número único
    const phoneReferee = `99${timestamp.toString().substring(5)}9`;  // Gera número único

    console.log(`📞 Telefones de teste: Indicador=${phoneReferrer}, Indicado=${phoneReferee}`);

    try {
        // 1. Criar o Indicador (Referrer)
        console.log('👤 Criando Indicador...');
        // Modificado para usar require local, simulando a chamada interna para evitar dependência de servidor rodando
        // Mas como a lógica está no handler, o ideal é chamar a função diretamente ou via HTTP se o server estiver on.
        // Vamos tentar via HTTP assumindo dev server on, se falhar, avisamos user.

        const referrerRes = await fetch('http://localhost:3000/api/caixa-misteriosa?endpoint=register', { // Ajuste de rota se necessario, ou uso direto
            // Na verdade, a rota é /api/caixa-misteriosa/register (mapeada no nextjs ou custom server)
            // Vamos usar o endpoint direto baseado no código lido: /register
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Teste Indicador',
                phone: phoneReferrer,
                neighborhood: 'Centro',
                city: 'Test City',
                latitude: -10,
                longitude: -60
            })
        });

        // Nota: se o fetch falhar (servidor off), vamos ter que adaptar o teste para importar a função.
        // Mas importar a função exige mock de req/res.
        // Vamos assumir que o usuário pode rodar o server. 
        // Se não, melhor criar um script que IMPORTA o handler e passa req/res mockados.

    } catch (e) {
        console.log("⚠️ Servidor parece offline ou erro de fetch. Tentando via import direto (mock)...");
        await testViaMock(phoneReferrer, phoneReferee);
        return;
    }

    // ... (restante da lógica anterior se fetch funcionasse)
    // Para garantir execução sem server, vou fazer a versão COMPLETA com mock aqui mesmo.
}

async function testViaMock(phoneReferrer, phoneReferee) {
    const handler = require('../api/caixa-misteriosa.js');

    // Mock de Response
    const createRes = () => {
        return {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };
    };

    // 1. Registrar Referrer
    const req1 = {
        method: 'POST',
        url: '/register',
        originalUrl: '/api/caixa-misteriosa/register',
        body: {
            name: 'Teste Indicador',
            phone: phoneReferrer,
            neighborhood: 'Centro',
            city: 'Test City',
            latitude: -10,
            longitude: -60
        }
    };
    const res1 = createRes();

    console.log('👤 Criando Indicador (Mock)...');
    await handler(req1, res1);

    if (!res1.data || !res1.data.success) {
        throw new Error(`Falha ao criar indicador: ${res1.data?.message}`);
    }

    const referrerId = res1.data.participantId;

    // Buscar código no banco
    const referrerDb = await query('SELECT own_referral_code FROM public_participants WHERE id = $1', [referrerId]);
    const referralCode = referrerDb.rows[0].own_referral_code;
    console.log(`✅ Indicador criado. ID: ${referrerId}, Código: ${referralCode}`);

    // 2. Registrar Referee
    const req2 = {
        method: 'POST',
        url: '/register',
        originalUrl: '/api/caixa-misteriosa/register',
        body: {
            name: 'Teste Indicado',
            phone: phoneReferee,
            neighborhood: 'Bairro Novo',
            city: 'Test City',
            referralCode: referralCode,
            latitude: -10,
            longitude: -60
        }
    };
    const res2 = createRes();

    console.log('👤 Criando Indicado com código (Mock)...');
    await handler(req2, res2);

    if (!res2.data || !res2.data.success) {
        throw new Error(`Falha ao criar indicado: ${res2.data?.message}`);
    }

    const refereeId = res2.data.participantId;
    console.log(`✅ Indicado criado. ID: ${refereeId}`);

    // 3. Verificação
    console.log('🔍 Verificando vínculo no banco de dados...');
    const checkQuery = await query(`
        SELECT id, name, referred_by_id 
        FROM public_participants 
        WHERE id = $1
    `, [refereeId]);

    const refereeDbResult = checkQuery.rows[0];

    if (refereeDbResult.referred_by_id == referrerId) {
        console.log('🎉 SUCESSO! O referred_by_id foi salvo corretamente.');
    } else {
        console.error('❌ FALHA! O referred_by_id NÃO corresponde ao ID do indicador.');
        console.error(`   Esperado: ${referrerId}`);
        console.error(`   Encontrado: ${refereeDbResult.referred_by_id}`);
    }
}

testReferral()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
