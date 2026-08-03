/**
 * Restauração do acervo a partir de um backup.
 *
 * Dois modos, e o primeiro é quase sempre o certo:
 *
 *   --conferir            lista os backups e compara com o banco atual,
 *                         sem tocar em nada. Comece sempre por aqui.
 *
 *   --restaurar ARQUIVO   troca dados/banco.db pelo backup. PARA o serviço,
 *                         guarda o estado atual em um "antes-de-restaurar",
 *                         remove o -wal e o -shm (senão o banco velho volta a
 *                         valer por cima do restaurado), põe a cópia no lugar,
 *                         confere e sobe o serviço de novo.
 *
 * Aviso que vale mais que o script: restaurar o arquivo inteiro DESFAZ tudo o
 * que os alunos fizeram desde aquele backup. Se o estrago for pontual — uma
 * questão, um usuário —, conserte só aquilo lendo o valor certo do backup, em
 * vez de voltar o banco todo.
 *
 * Uso: node scripts/restaurar.js --conferir
 *      node scripts/restaurar.js --restaurar /var/backups/.../banco-....db
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');

const RAIZ = path.join(__dirname, '..');
const VIVO = path.join(RAIZ, 'dados', 'banco.db');
const DESTINO = '/var/backups/banco-questoes';
const SERVICO = 'banco-questoes';

const retrato = (arq) => {
  const db = new Database(arq, { readonly: true });
  const r = {
    integridade: db.pragma('integrity_check')[0].integrity_check,
    questoes: db.prepare('SELECT COUNT(*) n FROM questoes').get().n,
    publicadas: db.prepare('SELECT COUNT(*) n FROM questoes WHERE publicada=1').get().n,
    usuarios: db.prepare('SELECT COUNT(*) n FROM usuarios').get().n,
    simulados: db.prepare('SELECT COUNT(*) n FROM simulados').get().n,
    respostas: db.prepare('SELECT COUNT(*) n FROM simulado_questoes WHERE resposta IS NOT NULL').get().n,
  };
  db.close();
  return r;
};

const listar = () => {
  const saida = [];
  for (const sub of ['diarios', 'mensais']) {
    const dir = path.join(DESTINO, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.startsWith('banco-')).sort().reverse()) {
      saida.push({ sub, arq: path.join(dir, f), nome: f, mb: (fs.statSync(path.join(dir, f)).size / 1048576).toFixed(1) });
    }
  }
  return saida;
};

if (process.argv.includes('--conferir')) {
  const atual = retrato(VIVO);
  console.log('BANCO ATUAL:', JSON.stringify(atual));
  console.log('\nBACKUPS DISPONÍVEIS (do mais novo para o mais antigo):');
  for (const b of listar()) {
    let r;
    try { r = retrato(b.arq); } catch (e) { console.log(`  ✗ ${b.nome}: ILEGÍVEL — ${e.message}`); continue; }
    const dif = [];
    for (const k of ['questoes', 'publicadas', 'usuarios', 'simulados', 'respostas']) {
      if (r[k] !== atual[k]) dif.push(`${k} ${r[k]} (atual ${atual[k]})`);
    }
    const marca = r.integridade === 'ok' ? '✓' : '✗';
    console.log(`  ${marca} ${b.sub}/${b.nome} ${b.mb} MB — ${dif.length ? dif.join(', ') : 'idêntico ao atual'}`);
  }
  const ups = fs.existsSync(path.join(DESTINO, 'uploads')) ? fs.readdirSync(path.join(DESTINO, 'uploads')) : [];
  console.log(`\nTARBALLS DE IMAGENS: ${ups.length}`);
  ups.sort().reverse().forEach((f) => console.log(`  ${f}`));
  process.exit(0);
}

const i = process.argv.indexOf('--restaurar');
if (i === -1) {
  console.log('use --conferir (seguro) ou --restaurar ARQUIVO');
  process.exit(1);
}
const fonte = process.argv[i + 1];
if (!fonte || !fs.existsSync(fonte)) { console.log(`não achei ${fonte}`); process.exit(1); }

const r = retrato(fonte);
if (r.integridade !== 'ok') { console.log('backup corrompido, abortando'); process.exit(1); }
console.log('BACKUP:', JSON.stringify(r));
console.log('ATUAL: ', JSON.stringify(retrato(VIVO)));

console.log('\nparando o serviço…');
execSync(`systemctl stop ${SERVICO}`);
try {
  const guarda = path.join(DESTINO, `antes-de-restaurar-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.db`);
  const dbv = new Database(VIVO, { readonly: true });
  dbv.backup(guarda).then(() => dbv.close());
  console.log(`estado atual guardado em ${guarda}`);

  // o -wal e o -shm precisam sair: senão o SQLite reaplica o banco velho
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(VIVO + ext)) { fs.unlinkSync(VIVO + ext); console.log(`removido ${path.basename(VIVO + ext)}`); }
  }
  fs.copyFileSync(fonte, VIVO);
  execSync(`chown www-data:www-data ${VIVO}`);
  const dep = retrato(VIVO);
  console.log('DEPOIS:', JSON.stringify(dep));
  if (dep.questoes !== r.questoes || dep.usuarios !== r.usuarios) throw new Error('o banco restaurado não bate com o backup');
} finally {
  execSync(`systemctl start ${SERVICO}`);
  console.log('serviço no ar de novo');
}
console.log('\nrestaurado.');
