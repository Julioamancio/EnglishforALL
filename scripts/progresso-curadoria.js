// SOMENTE LEITURA â€” quanto falta da curadoria.
const Database = require('better-sqlite3');
const db = new Database('dados/banco.db', { readonly: true });
const ATE = 1040; // ultimo id ja curado
const tot = db.prepare('SELECT count(*) c FROM questoes').get().c;
const pub = db.prepare('SELECT count(*) c FROM questoes WHERE publicada=1').get().c;
const maxId = db.prepare('SELECT max(id) m FROM questoes').get().m;
const feitas = db.prepare('SELECT count(*) c FROM questoes WHERE id <= ?').get(ATE).c;
const faltam = db.prepare('SELECT count(*) c FROM questoes WHERE id > ?').get(ATE).c;
const faltamPub = db.prepare('SELECT count(*) c FROM questoes WHERE id > ? AND publicada=1').get(ATE).c;
console.log('total de questoes no banco:', tot, '| publicadas:', pub, '| maior id:', maxId);
console.log('ja curadas (id <=', ATE + '):', feitas);
console.log('faltam:', faltam, '(publicadas:', faltamPub + ')');
console.log('lotes de 25 restantes:', Math.ceil(faltam / 25));
console.log('\n--- distribuicao do que falta, por prova ---');
db.prepare('SELECT instituicao, count(*) c, min(id) de, max(id) ate FROM questoes WHERE id > ? GROUP BY instituicao ORDER BY c DESC').all(ATE)
  .forEach((r) => console.log(`  ${(r.instituicao || '(sem)').padEnd(22)} ${String(r.c).padStart(4)}  ids ${r.de}-${r.ate}`));
