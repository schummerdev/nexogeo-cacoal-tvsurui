// Script para testar o login via API
const fetch = require('node-fetch');

const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@nexogeo.com',
        senha: 'admin123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login bem-sucedido!');
      console.log('👤 Usuário:', data.user.nome);
      console.log('🔑 Token obtido:', data.token ? 'Sim' : 'Não');
    } else {
      console.log('❌ Erro no login:', data.message);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
};

testLogin();