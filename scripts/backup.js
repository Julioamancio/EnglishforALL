/**
 * Backup do acervo. Roda com o site no ar.
 *
 * Usa a API de backup online do SQLite (db.backup), e NÃO cópia de arquivo: o
 * banco está em modo WAL, e copiar só o .db produz um arquivo sem as escritas
 * recentes — foi exatamente assim que uma questão danificada sobreviveu a um
 * "restore" que não restaurou nada.
 *
 * O que entra:
 *   - dados/banco.db     todo dia (4 MB; é o acervo e as contas dos alunos)
 *   - dados/sessoes.db   todo dia (quem está logado)
 *   - public/uploads/    só quando muda (36 MB; as 105 imagens das questões)
 *
 * Cada cópia é conferida com PRAGMA integrity_check ANTES de ser aceita. Um
 * backup corrompido que ninguém testou é pior que nenhum, porque dá confiança
 * falsa.
 *
 * Uso: node scripts/backup.js [--destino /outro/caminho]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');

const RAIZ = path.join(__dirname, '..');
const arg = process.argv.indexOf('--destino');
const DESTINO = arg > -1 ? process.argv[arg + 1] : '/var/backups/banco-questoes';

const MANTER_DIARIOS = 14;   // duas semanas de cópias diárias
const MANTER_MENSAIS = 6;    // e a primeira de cada mês, por meio ano

const agora = new Date();
const carimbo = agora.toISOString().slice(0, 19).replace(/[:T]/g, '-');
const dia = carimbo.slice(0, 10);

fs.mkdirSync(path.join(DESTINO, 'diarios'), { recursive: true });
fs.mkdirSync(path.join(DESTINO, 'mensais'), { recursive: true });
fs.mkdirSync(path.join(DESTINO, 'uploads'), { recursive: true });

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
let falhas = 0;

/** Copia um banco com a API online e só aceita se passar no integrity_check. */
async function copiaBanco(origem, destino) {
  const src = new Database(path.join(RAIZ, origem), { readonly: true });
  await src.backup(destino);
  src.close();

  const conf = new Database(destino, { readonly: true });
  const ok = conf.pragma('integrity_check')[0].integrity_check === 'ok';
  const fk = conf.pragma('foreign_key_check').length;
  const linhas = {};
  for (const t of conf.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
    linhas[t.name] = conf.prepare(`SELECT COUNT(*) n FROM "${t.name}"`).get().n;
  }
  conf.close();

  // A conferência abre a cópia e o SQLite cria -wal e -shm ao lado dela.
  // Sem isto, sobram arquivos que não são backup na pasta de backups.
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(destino + ext)) fs.unlinkSync(destino + ext);
  }

  if (!ok || fk) {
    fs.unlinkSync(destino);
    log(`  ✗ ${origem}: cópia recusada (integrity=${ok}, fk=${fk})`);
    falhas++;
    return null;
  }
  const mb = (fs.statSync(destino).size / 1048576).toFixed(1);
  log(`  ✓ ${origem} → ${path.basename(destino)} (${mb} MB) ${JSON.stringify(linhas)}`);
  return linhas;
}

/** Impressão digital de uma pasta, para não repetir tarball igual. */
function digital(dir) {
  const h = crypto.createHash('sha256');
  for (const f of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isFile()) h.update(`${f}:${s.size}:`);
  }
  return h.digest('hex').slice(0, 16);
}

(async () => {
  log(`destino: ${DESTINO}`);

  const alvo = path.join(DESTINO, 'diarios', `banco-${carimbo}.db`);
  const contagens = await copiaBanco('dados/banco.db', alvo);
  await copiaBanco('dados/sessoes.db', path.join(DESTINO, 'diarios', `sessoes-${carimbo}.db`));

  // uploads: tarball só quando o conteúdo muda
  const dirUp = path.join(RAIZ, 'public', 'uploads');
  if (fs.existsSync(dirUp)) {
    const dig = digital(dirUp);
    const jaTem = fs.readdirSync(path.join(DESTINO, 'uploads')).some((f) => f.includes(dig));
    if (jaTem) {
      log(`  = uploads sem mudança (${dig}), tarball não repetido`);
    } else {
      const tar = path.join(DESTINO, 'uploads', `uploads-${dia}-${dig}.tar.gz`);
      execFileSync('tar', ['-czf', tar, '-C', path.join(RAIZ, 'public'), 'uploads']);
      const n = fs.readdirSync(dirUp).length;
      log(`  ✓ uploads → ${path.basename(tar)} (${(fs.statSync(tar).size / 1048576).toFixed(1)} MB, ${n} arquivos)`);
    }
  }

  // promove a primeira cópia do mês
  const mes = dia.slice(0, 7);
  const temDoMes = fs.readdirSync(path.join(DESTINO, 'mensais')).some((f) => f.includes(mes));
  if (contagens && !temDoMes) {
    fs.copyFileSync(alvo, path.join(DESTINO, 'mensais', `banco-${mes}.db`));
    log(`  ✓ guardado como cópia mensal de ${mes}`);
  }

  // rotação
  const rotaciona = (sub, manter, filtro) => {
    const dir = path.join(DESTINO, sub);
    const arqs = fs.readdirSync(dir).filter(filtro).sort().reverse();
    arqs.slice(manter).forEach((f) => { fs.unlinkSync(path.join(dir, f)); log(`  − apagado ${sub}/${f}`); });
  };
  // .endsWith('.db') é essencial: sem ele, um banco-....db-shm entra na conta
  // das cópias a manter e a rotação apaga um backup bom no lugar dele.
  rotaciona('diarios', MANTER_DIARIOS, (f) => f.startsWith('banco-') && f.endsWith('.db'));
  rotaciona('diarios', MANTER_DIARIOS, (f) => f.startsWith('sessoes-') && f.endsWith('.db'));
  rotaciona('mensais', MANTER_MENSAIS, (f) => f.startsWith('banco-') && f.endsWith('.db'));
  rotaciona('uploads', 4, (f) => f.startsWith('uploads-'));

  const total = ['diarios', 'mensais', 'uploads']
    .flatMap((s) => fs.readdirSync(path.join(DESTINO, s)).map((f) => fs.statSync(path.join(DESTINO, s, f)).size))
    .reduce((a, b) => a + b, 0);
  log(`ocupação total dos backups: ${(total / 1048576).toFixed(0)} MB`);
  log(falhas ? `${falhas} FALHA(S)` : 'backup concluído');
  process.exit(falhas ? 1 : 0);
})();
