/**
 * SOMENTE LEITURA — auditoria: questoes que citam "(linha N)" batem com o texto?
 * Extrai o trecho entre aspas imediatamente antes da citacao e testa se ele esta
 * na linha N do texto-base (contando linhas com conteudo a partir do marcador 1).
 */
const Database = require('better-sqlite3');
const db = new Database('dados/banco.db', { readonly: true });

const norm = (s) => s.toLowerCase().replace(/[“”"’'‘]/g, '').replace(/\s+/g, ' ').trim();
const RE_CIT = /[“"]([^“”"]{6,160})[”"][^()]{0,40}\(linhas?\s+(\d{1,2})(?:\s*(?:e|a|,)\s*(\d{1,2}))?\)/g;

const qs = db.prepare("SELECT id, slug, instituicao, ano, enunciado, texto_base FROM questoes WHERE publicada=1 AND texto_base <> '' AND enunciado LIKE '%linha%'").all();
let comCitacao = 0, ok = 0;
const falhas = [];

qs.forEach((q) => {
  const linhas = q.texto_base.split('\n');
  const iIni = linhas.findIndex((l) => /^\s*1\s+\S/.test(l));
  if (iIni < 0) return; // texto sem numeracao embutida
  // duas convencoes de numeracao convivem no acervo: em alguns textos a prova
  // numera so as linhas com conteudo, em outros a linha em branco tambem conta
  // (caso de "A HISTORY OF PI", onde o marcador 5 cai numa linha vazia).
  const semBrancos = linhas.slice(iIni).filter((l) => l.trim() !== '');
  const comBrancos = linhas.slice(iIni);
  const corpo = semBrancos;
  let m, achou = false;
  while ((m = RE_CIT.exec(q.enunciado)) !== null) {
    const [, trecho, n1, n2] = m;
    achou = true;
    const alvo = norm([corpo[Number(n1) - 1], n2 ? corpo[Number(n2) - 1] : ''].join(' '));
    // trechos que comecam com reticencias ("... mostly on") ou com marcacao de
    // grifo comecam no meio da linha: descarta o lixo inicial antes de comparar
    const limpo = norm(trecho).replace(/^[.…\s]*/, '').replace(/^\[\[|\]\]/g, '');
    const inicio = limpo.split(' ').slice(0, 4).join(' ').replace(/\[\[|\]\]/g, '');
    const alvoB = norm([comBrancos[Number(n1) - 1], n2 ? comBrancos[Number(n2) - 1] : ''].join(' '));
    if (alvo.replace(/\[\[|\]\]/g, '').includes(inicio) || alvoB.replace(/\[\[|\]\]/g, '').includes(inicio)) ok++;
    else {
      // onde o trecho realmente esta?
      const real = corpo.findIndex((l) => norm(l).replace(/\[\[|\]\]/g, '').includes(inicio));
      falhas.push({ id: q.id, prova: `${q.instituicao} ${q.ano}`, citada: n1, real: real >= 0 ? real + 1 : '?', trecho: trecho.slice(0, 46) });
    }
  }
  if (achou) comCitacao++;
});

console.log(`questoes publicadas com texto numerado e citacao de linha: ${comCitacao}`);
console.log(`citacoes conferidas OK: ${ok} | divergentes: ${falhas.length}`);
console.log('\n--- divergencias (linha citada -> linha real) ---');
const porTexto = {};
falhas.forEach((f) => {
  const k = f.prova;
  porTexto[k] = porTexto[k] || [];
  porTexto[k].push(f);
});
Object.entries(porTexto).forEach(([prova, fs]) => {
  console.log(`\n${prova} — ${fs.length} divergencias`);
  fs.slice(0, 8).forEach((f) => console.log(`  [${f.id}] citada linha ${f.citada}, real ${f.real}: ${JSON.stringify(f.trecho)}`));
  if (fs.length > 8) console.log(`  … e mais ${fs.length - 8}`);
});
console.log('\nids afetados:', [...new Set(falhas.map((f) => f.id))].join(','));
