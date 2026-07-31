/**
 * SOMENTE LEITURA — aspas retas e curvas misturadas dentro do mesmo campo.
 *
 * O que este verificador NAO cobra: que o acervo inteiro use aspas curvas. Essa
 * convencao nao existe aqui, e o levantamento do lote de tipografia mostrou por
 * que nao faria sentido inventa-la:
 *
 *     campo              retas   curvas
 *     texto_base           202      266
 *     titulo                68      100
 *     enunciado             99      142
 *     comentario           644      341   <- a reta e que e a regra
 *     imagem_alt           115        6   <- idem, com folga
 *
 * Em dois campos a aspa reta e o padrao. Uniformizar tudo seria reforma de ~1.500
 * campos por ganho estetico, nao correcao de defeito.
 *
 * O defeito e a MISTURA dentro de um mesmo campo: abrir com “ e fechar com ",
 * como em `“bioclimatic architecture"` (764-773). Isso quebra o par de aspas e
 * salta aos olhos na pagina. E o que se verifica aqui.
 *
 * Uso: NODE_PATH=/var/www/banco-questoes/node_modules node20 scripts/audita-aspas.js
 */
const Database = require('better-sqlite3');
const db = new Database('dados/banco.db', { readonly: true });

const CAMPOS = ['texto_base', 'titulo', 'enunciado', 'comentario', 'meta_description', 'imagem_alt'];
let total = 0;

console.log('=== campos que misturam aspa reta e aspa curva ===');
CAMPOS.forEach((c) => {
  const ids = db.prepare(`SELECT id FROM questoes
    WHERE ${c} LIKE '%"%' AND (${c} LIKE '%“%' OR ${c} LIKE '%”%')`).all().map((r) => r.id);
  total += ids.length;
  console.log(`  ${String(ids.length).padStart(4)}  ${c}${ids.length ? ': ' + ids.slice(0, 12).join(',') : ''}`);
});
const alts = db.prepare(`SELECT DISTINCT questao_id id FROM alternativas
  WHERE texto LIKE '%"%' AND (texto LIKE '%“%' OR texto LIKE '%”%')`).all().map((r) => r.id);
total += alts.length;
console.log(`  ${String(alts.length).padStart(4)}  alternativas${alts.length ? ': ' + alts.slice(0, 12).join(',') : ''}`);

console.log('\n=== aspas curvas desbalanceadas ===');
// Atencao: diferenca NAO e necessariamente defeito. O ingles cita em varios
// paragrafos abrindo aspas em cada um e fechando so no ultimo — e o caso das
// falas de Hawking e de Milner em 647-650, que sao 12 aberturas para 9
// fechamentos e estao certas assim.
CAMPOS.forEach((c) => {
  const ruins = db.prepare(`SELECT id, ${c} v FROM questoes WHERE ${c} LIKE '%“%'`).all()
    .map((q) => ({ id: q.id, ab: (q.v.match(/“/g) || []).length, fe: (q.v.match(/”/g) || []).length }))
    .filter((x) => x.fe > x.ab); // fechar mais do que abre nunca e convencao, e erro
  if (ruins.length) console.log(`  ${String(ruins.length).padStart(4)}  ${c}: ${ruins.map((r) => `${r.id}(${r.ab}/${r.fe})`).join(', ')}`);
});
console.log(`  (so se reporta fechamento sobrando; abertura sobrando pode ser citação em vários parágrafos)`);

console.log(`\ntotal de campos com estilo misturado: ${total}`);
