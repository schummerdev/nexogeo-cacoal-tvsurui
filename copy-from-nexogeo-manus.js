// Script para copiar dados do banco nexogeo_manus para neondb
require('dotenv').config();
const { Pool } = require('pg');

// Banco de ORIGEM (nexogeo_manus)
const sourcePool = new Pool({
  connectionString: process.env.SOURCE_DATABASE_URL, // Configurar no .env
  ssl: {
    rejectUnauthorized: true
  }
});

// Banco de DESTINO (neondb - atual)
const destPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  }
});

async function copyData() {
  console.log('🔄 Iniciando cópia de dados...\n');

  try {
    // Testar conexões
    console.log('📡 Testando conexão com banco de ORIGEM...');
    const sourceTest = await sourcePool.query('SELECT NOW() as time, current_database() as db');
    console.log('✅ Origem conectada:', sourceTest.rows[0].db, '-', sourceTest.rows[0].time);

    console.log('📡 Testando conexão com banco de DESTINO...');
    const destTest = await destPool.query('SELECT NOW() as time, current_database() as db');
    console.log('✅ Destino conectado:', destTest.rows[0].db, '-', destTest.rows[0].time);
    console.log('');

    // === COPIAR USUÁRIOS ===
    console.log('👤 Copiando usuários...');
    const usuarios = await sourcePool.query('SELECT * FROM usuarios ORDER BY id');
    console.log(`   Encontrados: ${usuarios.rows.length} usuários`);

    if (usuarios.rows.length > 0) {
      await destPool.query('TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE');

      for (const user of usuarios.rows) {
        await destPool.query(
          `INSERT INTO usuarios (usuario, senha_hash, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.usuario, user.senha_hash, user.role, user.created_at, user.updated_at]
        );
      }
      console.log(`   ✅ ${usuarios.rows.length} usuários copiados`);
    }

    // === COPIAR CONFIGURAÇÕES ===
    console.log('⚙️  Copiando configurações da emissora...');
    const configs = await sourcePool.query('SELECT * FROM configuracoes_emissora LIMIT 1');

    if (configs.rows.length > 0) {
      await destPool.query('TRUNCATE TABLE configuracoes_emissora RESTART IDENTITY CASCADE');

      const config = configs.rows[0];
      await destPool.query(
        `INSERT INTO configuracoes_emissora
         (nome, logo_url, tema_cor, website, telefone, endereco, instagram, facebook,
          youtube, linkedin, twitter, whatsapp, email, descricao, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          config.nome, config.logo_url, config.tema_cor, config.website, config.telefone,
          config.endereco, config.instagram, config.facebook, config.youtube, config.linkedin,
          config.twitter, config.whatsapp, config.email, config.descricao, config.updated_at
        ]
      );
      console.log('   ✅ Configurações copiadas');
    }

    // === COPIAR PROMOÇÕES ===
    console.log('🎁 Copiando promoções...');
    const promocoes = await sourcePool.query('SELECT * FROM promocoes ORDER BY id');
    console.log(`   Encontradas: ${promocoes.rows.length} promoções`);

    if (promocoes.rows.length > 0) {
      await destPool.query('TRUNCATE TABLE promocoes RESTART IDENTITY CASCADE');

      for (const promo of promocoes.rows) {
        await destPool.query(
          `INSERT INTO promocoes (nome, descricao, status, data_inicio, data_fim,
           participantes_count, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            promo.nome, promo.descricao, promo.status, promo.data_inicio, promo.data_fim,
            promo.participantes_count, promo.created_at, promo.updated_at
          ]
        );
      }
      console.log(`   ✅ ${promocoes.rows.length} promoções copiadas`);
    }

    // === COPIAR PARTICIPANTES ===
    console.log('👥 Copiando participantes...');
    const participantes = await sourcePool.query('SELECT * FROM participantes ORDER BY id');
    console.log(`   Encontrados: ${participantes.rows.length} participantes`);

    if (participantes.rows.length > 0) {
      await destPool.query('TRUNCATE TABLE participantes RESTART IDENTITY CASCADE');

      for (const part of participantes.rows) {
        await destPool.query(
          `INSERT INTO participantes (nome, email, telefone, bairro, cidade, promocao_id,
           data_cadastro, origem_source, origem_medium)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            part.nome, part.email, part.telefone, part.bairro, part.cidade, part.promocao_id,
            part.data_cadastro, part.origem_source, part.origem_medium
          ]
        );
      }
      console.log(`   ✅ ${participantes.rows.length} participantes copiados`);
    }

    // === COPIAR PATROCINADORES (CAIXA MISTERIOSA) ===
    console.log('🏢 Copiando patrocinadores (Caixa Misteriosa)...');
    try {
      const sponsors = await sourcePool.query('SELECT * FROM sponsors ORDER BY id');
      console.log(`   Encontrados: ${sponsors.rows.length} patrocinadores`);

      if (sponsors.rows.length > 0) {
        await destPool.query('TRUNCATE TABLE sponsors RESTART IDENTITY CASCADE');

        for (const sponsor of sponsors.rows) {
          await destPool.query(
            'INSERT INTO sponsors (name, created_at) VALUES ($1, $2)',
            [sponsor.name, sponsor.created_at]
          );
        }
        console.log(`   ✅ ${sponsors.rows.length} patrocinadores copiados`);
      }
    } catch (e) {
      console.log('   ⚠️  Tabela sponsors não existe no banco de origem');
    }

    // === COPIAR PRODUTOS (CAIXA MISTERIOSA) ===
    console.log('📦 Copiando produtos (Caixa Misteriosa)...');
    try {
      const products = await sourcePool.query('SELECT * FROM products ORDER BY id');
      console.log(`   Encontrados: ${products.rows.length} produtos`);

      if (products.rows.length > 0) {
        await destPool.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');

        for (const product of products.rows) {
          await destPool.query(
            'INSERT INTO products (sponsor_id, name, clues, created_at) VALUES ($1, $2, $3, $4)',
            [product.sponsor_id, product.name, product.clues, product.created_at]
          );
        }
        console.log(`   ✅ ${products.rows.length} produtos copiados`);
      }
    } catch (e) {
      console.log('   ⚠️  Tabela products não existe no banco de origem');
    }

    // === COPIAR JOGOS (CAIXA MISTERIOSA) ===
    console.log('🎮 Copiando jogos (Caixa Misteriosa)...');
    try {
      const games = await sourcePool.query('SELECT * FROM games ORDER BY id');
      console.log(`   Encontrados: ${games.rows.length} jogos`);

      if (games.rows.length > 0) {
        await destPool.query('TRUNCATE TABLE games RESTART IDENTITY CASCADE');

        for (const game of games.rows) {
          await destPool.query(
            `INSERT INTO games (product_id, status, revealed_clues_count, winner_submission_id,
             created_at, ended_at) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              game.product_id, game.status, game.revealed_clues_count, game.winner_submission_id,
              game.created_at, game.ended_at
            ]
          );
        }
        console.log(`   ✅ ${games.rows.length} jogos copiados`);
      }
    } catch (e) {
      console.log('   ⚠️  Tabela games não existe no banco de origem');
    }

    // === COPIAR PALPITES (CAIXA MISTERIOSA) ===
    console.log('💭 Copiando palpites (Caixa Misteriosa)...');
    try {
      const submissions = await sourcePool.query('SELECT * FROM submissions ORDER BY id');
      console.log(`   Encontrados: ${submissions.rows.length} palpites`);

      if (submissions.rows.length > 0) {
        await destPool.query('TRUNCATE TABLE submissions RESTART IDENTITY CASCADE');

        for (const sub of submissions.rows) {
          await destPool.query(
            `INSERT INTO submissions (game_id, user_name, user_phone, user_neighborhood,
             user_city, guess, is_correct, created_at, public_participant_id, submission_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              sub.game_id, sub.user_name, sub.user_phone, sub.user_neighborhood,
              sub.user_city, sub.guess, sub.is_correct, sub.created_at,
              sub.public_participant_id || null, sub.submission_number || 1
            ]
          );
        }
        console.log(`   ✅ ${submissions.rows.length} palpites copiados`);
      }
    } catch (e) {
      console.log('   ⚠️  Tabela submissions não existe no banco de origem');
    }

    // === COPIAR PARTICIPANTES PÚBLICOS ===
    console.log('🌍 Copiando participantes públicos...');
    try {
      const publicParts = await sourcePool.query('SELECT * FROM public_participants ORDER BY id');
      console.log(`   Encontrados: ${publicParts.rows.length} participantes públicos`);

      if (publicParts.rows.length > 0) {
        await destPool.query('TRUNCATE TABLE public_participants RESTART IDENTITY CASCADE');

        for (const pp of publicParts.rows) {
          await destPool.query(
            `INSERT INTO public_participants (name, phone, neighborhood, city, latitude,
             longitude, referral_code, referred_by_id, own_referral_code, extra_guesses, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              pp.name, pp.phone, pp.neighborhood, pp.city, pp.latitude, pp.longitude,
              pp.referral_code, pp.referred_by_id, pp.own_referral_code, pp.extra_guesses,
              pp.created_at
            ]
          );
        }
        console.log(`   ✅ ${publicParts.rows.length} participantes públicos copiados`);
      }
    } catch (e) {
      console.log('   ⚠️  Tabela public_participants não existe no banco de origem');
    }

    console.log('\n🎉 Cópia de dados concluída com sucesso!');
    console.log('\n📊 Resumo:');
    console.log('   - Usuários: Copiados');
    console.log('   - Configurações: Copiadas');
    console.log('   - Promoções: Copiadas');
    console.log('   - Participantes: Copiados');
    console.log('   - Dados Caixa Misteriosa: Copiados (se existentes)');

  } catch (error) {
    console.error('\n❌ Erro na cópia:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sourcePool.end();
    await destPool.end();
  }

  process.exit(0);
}

copyData();
