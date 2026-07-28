// Gera o hash da senha do painel. Uso: node scripts/senha.js "minha senha"
const bcrypt = require('bcryptjs');
const senha = process.argv[2];
if (!senha) {
  console.error('Uso: node scripts/senha.js "sua senha aqui"');
  process.exit(1);
}
console.log('\nCole esta linha no seu .env:\n');
console.log(`ADMIN_SENHA_HASH='${bcrypt.hashSync(senha, 10)}'\n`);
