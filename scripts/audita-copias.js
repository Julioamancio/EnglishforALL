/**
 * SOMENTE LEITURA — auditoria: cópias do mesmo texto que divergem entre si.
 *
 * Varias questoes guardam a propria copia do texto-base para poder realcar
 * ([[...]]) o trecho que analisam. Isso e deliberado. O risco e as copias
 * divergirem por outro motivo — uma corrigida e a outra nao, como aconteceu no
 * anuncio da GE Capital. Este script tira o realce e a pontuacao de cada copia e
 * agrupa: se duas questoes tem o mesmo texto "nu" mas bytes diferentes, ha
 * divergencia real a conferir.
 */
const Database = require('better-sqlite3');
const db = new Database('dados/banco.db', { readonly: true });

const nu = (s) => s.replace(/\[\[|\]\]/g, '').replace(/\s+/g, ' ').trim();
const idem = (s) => nu(s).toLowerCase().replace(/[^a-z0-9à-ÿ ]/g, '');

const qs = db.prepare("SELECT id, instituicao, ano, texto_base FROM questoes WHERE publicada=1 AND texto_base <> '' AND length(texto_base) > 120").all();
const grupos = new Map();
qs.forEach((q) => {
  const k = idem(q.texto_base);
  if (!grupos.has(k)) grupos.set(k, []);
  grupos.get(k).push(q);
});

let comCopias = 0, divergentes = 0;
const relatorio = [];
grupos.forEach((lista) => {
  if (lista.length < 2) return;
  comCopias++;
  const versoes = new Set(lista.map((q) => nu(q.texto_base)));
  if (versoes.size === 1) return;
  divergentes++;
  const v = [...versoes];
  // acha o primeiro ponto de divergencia entre as duas primeiras versoes
  let i = 0; while (i < v[0].length && v[0][i] === v[1][i]) i++;
  relatorio.push({
    ids: lista.map((q) => q.id),
    prova: `${lista[0].instituicao} ${lista[0].ano}`,
    versoes: versoes.size,
    trecho: v.map((s) => s.slice(Math.max(0, i - 45), i + 45)),
  });
});

console.log(`textos com mais de uma copia: ${comCopias}`);
console.log(`grupos em que as copias DIVERGEM (fora o realce): ${divergentes}`);
relatorio.forEach((r) => {
  console.log(`\n[${r.ids.join(', ')}] ${r.prova} — ${r.versoes} versoes distintas`);
  r.trecho.forEach((t, k) => console.log(`  v${k + 1}: …${t}…`));
});

console.log('\n--- questoes com realce [[ ]] no texto-base ---');
console.log('  total:', db.prepare("SELECT count(*) c FROM questoes WHERE publicada=1 AND texto_base LIKE '%[[%'").get().c);
const semFecho = db.prepare("SELECT group_concat(id) ids FROM questoes WHERE publicada=1 AND texto_base LIKE '%[[%' AND texto_base NOT LIKE '%]]%'").get().ids;
console.log('  com [[ sem ]] (realce quebrado):', semFecho || 'nenhuma');
