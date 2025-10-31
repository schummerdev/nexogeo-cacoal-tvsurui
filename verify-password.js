const bcrypt = require('bcrypt');

const hash = '$2b$10$WLVMvrW49rz61coMWt80mOxKHro.RtZknts43MJ9Rkw8XrzcsTi8q';
const senhaAtual = '90864c11739ecc18';

console.log('\n🔐 Verificando correspondência de senha\n');
console.log('Hash no banco:', hash);
console.log('Senha testada:', senhaAtual);
console.log('');

bcrypt.compare(senhaAtual, hash).then(result => {
  if (result) {
    console.log('✅ SENHA CORRETA - Hash corresponde!');
  } else {
    console.log('❌ SENHA INCORRETA - Hash NÃO corresponde!');
    console.log('\n⚠️  O hash no banco é diferente do gerado pelo script reset.');
    console.log('Isso significa que o banco da Vercel está diferente do local.');
  }
  process.exit(result ? 0 : 1);
});
