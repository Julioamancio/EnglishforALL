/**
 * Prova que o backup serve para consertar. NAO toca no banco de producao:
 * monta um banco descartavel em /tmp, faz backup dele, destroi, restaura.
 *
 * Testa justamente o modo de falha que me pegou hoje: escrita em WAL que
 * sobrevive a uma copia de arquivo.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const T = '/tmp/teste-restauro';
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T, { recursive: true });

const VIVO = path.join(T, 'vivo.db');
const COPIA = path.join(T, 'copia.db');
const RUIM = path.join(T, 'copia-ingenua.db');

let ok = 0;
let total = 0;
const conf = (nome, cond) => { total++; if (cond) { ok++; console.log(`  ✓ ${nome}`); } else console.log(`  ✗ ${nome}`); };

(async () => {
  // banco em WAL, como o de producao
  let db = new Database(VIVO);
  db.pragma('journal_mode = WAL');
  db.exec('CREATE TABLE questoes (id INTEGER PRIMARY KEY, gabarito TEXT, titulo TEXT)');
  const ins = db.prepare('INSERT INTO questoes (id,gabarito,titulo) VALUES (?,?,?)');
  for (let i = 1; i <= 500; i++) ins.run(i, 'ABCDE'[i % 5], `questao ${i}`);
  console.log('banco de teste: 500 questoes, modo', db.pragma('journal_mode')[0].journal_mode);

  // 1) backup pela API online
  await db.backup(COPIA);
  conf('backup online criado', fs.existsSync(COPIA));
  const c1 = new Database(COPIA, { readonly: true });
  conf('backup integro', c1.pragma('integrity_check')[0].integrity_check === 'ok');
  conf('backup com as 500 questoes', c1.prepare('SELECT COUNT(*) n FROM questoes').get().n === 500);
  c1.close();

  // 2) copia ingenua do arquivo, com WAL pendente — o erro que eu cometi.
  // Em WAL ate o esquema pode estar so no -wal: a copia sai vazia, sem tabela.
  fs.copyFileSync(VIVO, RUIM);
  const c2 = new Database(RUIM, { readonly: true });
  let nRuim;
  try { nRuim = c2.prepare('SELECT COUNT(*) n FROM questoes').get().n; }
  catch (e) { nRuim = 'nem a tabela existe'; }
  c2.close();
  conf(`copia ingenua perde dados (viu: ${nRuim}, esperado 500)`, nRuim !== 500);

  // 3) desastre: gabaritos destruidos
  db.prepare("UPDATE questoes SET gabarito='Z'").run();
  conf('desastre aplicado', db.prepare("SELECT COUNT(*) n FROM questoes WHERE gabarito='Z'").get().n === 500);

  // 4) restaurar copiando por cima com o app AINDA SEGURANDO o banco aberto.
  // Esta e a condicao real: o servico no ar mantem o -wal vivo, e o estrago
  // continua la depois da copia. Fechar a conexao antes faria o checkpoint e
  // esconderia o problema — foi assim que a primeira versao deste teste se
  // enganou sozinha.
  fs.copyFileSync(COPIA, VIVO);   // db continua ABERTO de proposito
  let d = new Database(VIVO, { readonly: true });
  const aindaZ = d.prepare("SELECT COUNT(*) n FROM questoes WHERE gabarito='Z'").get().n;
  d.close();
  conf(`copiar por cima com o servico no ar NAO conserta (ainda ${aindaZ} com Z)`, aindaZ > 0);

  // 5) restauro correto: parar quem usa, apagar -wal e -shm, depois copiar
  db.close();
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(VIVO + ext)) fs.unlinkSync(VIVO + ext);
  fs.copyFileSync(COPIA, VIVO);
  d = new Database(VIVO, { readonly: true });
  const zeros = d.prepare("SELECT COUNT(*) n FROM questoes WHERE gabarito='Z'").get().n;
  const n = d.prepare('SELECT COUNT(*) n FROM questoes').get().n;
  const integro = d.pragma('integrity_check')[0].integrity_check === 'ok';
  d.close();
  conf('restauro correto elimina o estrago', zeros === 0);
  conf('restauro correto devolve as 500 questoes', n === 500);
  conf('banco restaurado integro', integro);

  fs.rmSync(T, { recursive: true, force: true });
  console.log(`\n${ok}/${total} conferencias passaram`);
  process.exit(ok === total ? 0 : 1);
})();
