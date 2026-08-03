/**
 * Manda o backup para fora do servidor, cifrado, num repositório PRIVADO.
 *
 * Por que não commitar o banco no repositório do projeto: ele é público, e o
 * arquivo tem nome, e-mail e hash de senha de 94 alunos, muitos menores. E
 * mesmo num repositório privado, o Git guarda toda versão para sempre — um
 * banco de 4,4 MB por dia viraria 1,5 GB em um ano, e binário não comprime
 * entre versões. Backup precisa apagar o velho; o Git foi feito para nunca
 * apagar.
 *
 * A saída: cada envio recria a história do zero (commit órfão + push forçado).
 * O repositório remoto guarda SEMPRE só o último conjunto, e não cresce. O
 * histórico fica onde faz sentido — nas 14 cópias diárias locais.
 *
 * Tudo é cifrado com AES-256 antes de sair daqui. A senha mora em
 * /root/.backup-senha (fora do repositório, fora do backup) e não é enviada.
 * Se ela se perder, os arquivos remotos são inúteis — nem eu, nem o GitHub.
 *
 * Uso: node scripts/backup-remoto.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DRY = process.argv.includes('--dry');
const ORIGEM = '/var/backups/banco-questoes';
const SENHA = '/root/.backup-senha';
const TRAB = '/tmp/backup-remoto';
const REMOTO = process.env.BACKUP_REMOTO || 'git@github.com:Julioamancio/EnglishforALL-backups.git';

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts });

if (!fs.existsSync(SENHA)) {
  console.log(`FALHA: falta a senha em ${SENHA}`);
  console.log('  crie com:  openssl rand -base64 32 > /root/.backup-senha && chmod 600 /root/.backup-senha');
  console.log('  e GUARDE UMA CÓPIA FORA DO SERVIDOR — sem ela o backup remoto não abre.');
  process.exit(1);
}
if ((fs.statSync(SENHA).mode & 0o077) !== 0) {
  console.log(`FALHA: ${SENHA} está legível por outros. Corrija com: chmod 600 ${SENHA}`);
  process.exit(1);
}

/** O arquivo mais novo de uma pasta, por nome (os nomes são datados). */
function maisNovo(pasta, prefixo, sufixo = '.db') {
  const dir = path.join(ORIGEM, pasta);
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir)
    .filter((x) => x.startsWith(prefixo) && x.endsWith(sufixo))
    .sort().reverse()[0];
  return f ? path.join(dir, f) : null;
}

function cifra(origem, destino) {
  sh('openssl', ['enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-salt',
    '-in', origem, '-out', destino, '-pass', `file:${SENHA}`]);
  return fs.statSync(destino).size;
}

const alvos = [
  ['banco.db.enc', maisNovo('diarios', 'banco-')],
  ['sessoes.db.enc', maisNovo('diarios', 'sessoes-')],
  ['uploads.tar.gz.enc', maisNovo('uploads', 'uploads-', '.tar.gz')],
  ['banco-mensal.db.enc', maisNovo('mensais', 'banco-')],
];

if (!alvos[0][1]) {
  console.log('FALHA: não há backup local para enviar. Rode scripts/backup.js antes.');
  process.exit(1);
}

fs.rmSync(TRAB, { recursive: true, force: true });
fs.mkdirSync(TRAB, { recursive: true });

let total = 0;
const enviados = [];
for (const [nome, origem] of alvos) {
  if (!origem) { log(`  – ${nome}: sem origem, pulado`); continue; }
  const destino = path.join(TRAB, nome);
  const bytes = cifra(origem, destino);
  total += bytes;
  enviados.push({ nome, origem: path.basename(origem), mb: (bytes / 1048576).toFixed(1) });
  log(`  ✓ ${nome} (${(bytes / 1048576).toFixed(1)} MB) ← ${path.basename(origem)}`);
}

// prova que o cifrado volta ao original, antes de enviar
const teste = path.join(TRAB, '_teste.db');
sh('openssl', ['enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '200000',
  '-in', path.join(TRAB, 'banco.db.enc'), '-out', teste, '-pass', `file:${SENHA}`]);
const igual = fs.readFileSync(teste).equals(fs.readFileSync(alvos[0][1]));
fs.unlinkSync(teste);
if (!igual) { log('FALHA: o arquivo decifrado não bate com o original'); process.exit(1); }
log('  ✓ conferido: o cifrado volta idêntico ao original');

// instruções de restauração viajam junto — de nada adianta o backup se, no dia
// do aperto, ninguém souber abrir
fs.writeFileSync(path.join(TRAB, 'LEIA-ME.md'), `# Backup do English for ALL

Gerado em ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC.
Cada envio SUBSTITUI o anterior: aqui fica sempre a cópia mais recente.
O histórico está no servidor, em \`/var/backups/banco-questoes/diarios\`.

| arquivo | o que é |
|---|---|
${enviados.map((e) => `| \`${e.nome}\` | ${e.mb} MB — de \`${e.origem}\` |`).join('\n')}

## Como abrir

Tudo está cifrado com AES-256. A senha está em \`/root/.backup-senha\` no
servidor e na cópia que o professor guardou fora dele. **Sem ela nada abre** —
nem o GitHub, nem quem escreveu isto.

\`\`\`bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \\
  -in banco.db.enc -out banco.db -pass file:CAMINHO_DA_SENHA
\`\`\`

Confira antes de usar:

\`\`\`bash
sqlite3 banco.db "PRAGMA integrity_check;"   # tem que dizer: ok
sqlite3 banco.db "SELECT COUNT(*) FROM questoes;"
\`\`\`

## Como voltar para o servidor

Não sobrescreva \`dados/banco.db\` com o serviço no ar: o SQLite está em modo
WAL e o banco antigo volta a valer por cima. Use o script do projeto, que para
o serviço e apaga o \`-wal\` e o \`-shm\`:

\`\`\`bash
node scripts/restaurar.js --conferir
node scripts/restaurar.js --restaurar CAMINHO/banco.db
\`\`\`

Restaurar o arquivo inteiro desfaz o que os alunos fizeram desde este backup.
Para estrago pontual, leia o valor certo daqui e conserte só aquilo.
`);

log(`total cifrado: ${(total / 1048576).toFixed(1)} MB`);

if (DRY) { log('[ENSAIO] nada enviado'); process.exit(0); }

// história recriada do zero a cada envio: o remoto nunca cresce
const git = (...a) => sh('git', a, { cwd: TRAB, stdio: 'pipe' });
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'backup@englishforall');
git('config', 'user.name', 'Backup automático');
git('add', '-A');
git('commit', '-q', '-m', `Backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
git('remote', 'add', 'origin', REMOTO);
try {
  git('push', '-q', '--force', 'origin', 'main');
  log(`enviado para ${REMOTO}`);
} catch (e) {
  log(`FALHA ao enviar: ${(e.stderr || e.message).toString().trim().split('\n').slice(0, 3).join(' | ')}`);
  log('confira: o repositório existe, é privado, e a chave do servidor está como deploy key COM permissão de escrita');
  process.exit(1);
}
fs.rmSync(TRAB, { recursive: true, force: true });
log('concluído');
