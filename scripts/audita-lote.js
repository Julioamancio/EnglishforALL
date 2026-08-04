#!/usr/bin/env node
/* SOMENTE LEITURA — confere um lote antes de ele virar questão no acervo.
 *
 *   node20 scripts/audita-lote.js conteudo/lotes/2026-08-vestibular/lote.json
 *
 * Os quatro bugs de atribuição encontrados neste lote eram todos do mesmo tipo:
 * conteúdo vazando de uma questão para a vizinha. Nenhum deles aparece lendo a
 * questão isolada — só cruzando campos que deveriam bater entre si. É isso que
 * as quatro primeiras checagens fazem, e as quatro têm de dar zero.
 *
 * A [2c] nasceu do quinto caso, achado na curadoria: a Q81 (PUC-RS 2007)
 * carregava um texto-base sobre o coqueiro do Taiti, alheio à tirinha do Snoopy
 * que a questão analisa. A [2] não o via, porque agrupa por texto-base e a
 * questão irmã, a Q82, estava com o campo vazio.
 *
 * Sai com status 1 se algo falhar, para poder entrar num encadeamento.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('uso: node20 scripts/audita-lote.js <lote.json>');
  process.exit(1);
}

const lote = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const IMAGENS = path.join(path.dirname(arquivo), 'imagens');

const TIPOS = new Set(['interpretacao', 'gramatica', 'vocabulario']);
const NIVEIS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const GENEROS = new Set(Object.keys(require('../src/rotulos').ROTULOS_GENERO));
const CURADOS = ['titulo', 'meta_description', 'tipo', 'genero_textual', 'tema',
                 'nivel_cefr', 'comentario', 'imagem_alt'];
const COM_ASPAS = ['texto_base', 'titulo', 'enunciado', 'comentario',
                   'meta_description', 'imagem_alt'];

let falhas = 0;
const falha = (m) => { falhas++; console.log(`    !! ${m}`); };
const agrupa = (chave, valor) => {
  const m = new Map();
  for (const q of lote) {
    const k = chave(q);
    if (k === null || k === undefined) continue;
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(valor(q));
  }
  return [...m].filter(([, v]) => v.size > 1);
};

/* --- [1] nenhuma imagem usada por questões de fontes diferentes ----------- */
const fontes = agrupa((q) => q.imagem_arquivo || null, (q) => `${q.instituicao}/${q.ano}`);
console.log(`[1] imagem compartilhada por fontes diferentes: ${fontes.length}`);
fontes.forEach(([k, v]) => falha(`${k} usada por ${[...v].sort().join(', ')}`));

/* --- [2] nenhum texto-base cobrindo imagens diferentes -------------------- */
const textos = agrupa((q) => (q.texto_base || '').trim() || null, (q) => q.imagem_arquivo);
console.log(`[2] texto-base cobrindo imagens diferentes: ${textos.length}`);
textos.forEach(([k, v]) => falha(`${JSON.stringify(k.slice(0, 60))} -> ${[...v].sort().join(', ')}`));

/* --- [2b] imagens byte-idênticas com descrições divergentes --------------- */
/* §6, "um texto, uma versão": a mesma peça guarda a mesma descrição em todas as
   questões que a usam, inclusive quando o arquivo foi duplicado com outro nome. */
const digest = (nome) => {
  const p = path.join(IMAGENS, nome);
  return fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
};
const alts = agrupa(
  (q) => (q.imagem_arquivo && (q.imagem_alt || '').trim() ? digest(q.imagem_arquivo) : null),
  (q) => q.imagem_alt
);
console.log(`[2b] imagens idênticas com descrições divergentes: ${alts.length}`);
alts.forEach(([k, v]) => falha(`imagem ${k.slice(0, 12)} tem ${v.size} descrições diferentes`));

/* --- [2c] mesma imagem com texto-base divergente -------------------------- */
const tbs = agrupa((q) => q.imagem_arquivo || null, (q) => (q.texto_base || '').trim());
console.log(`[2c] imagem com texto-base divergente entre questões: ${tbs.length}`);
tbs.forEach(([k, v]) => falha(`${k}: ${[...v].map((t) => JSON.stringify(t.slice(0, 40))).join(' | ')}`));

/* --- [3] imagens ausentes e órfãs ----------------------------------------- */
const usadas = new Set(lote.filter((q) => q.imagem_arquivo).map((q) => q.imagem_arquivo));
const ausentes = [...usadas].filter((n) => !fs.existsSync(path.join(IMAGENS, n)));
const orfas = fs.existsSync(IMAGENS) ? fs.readdirSync(IMAGENS).filter((n) => !usadas.has(n)) : [];
console.log(`[3] imagens referenciadas e ausentes no disco: ${ausentes.length}`);
ausentes.forEach((n) => falha(`imagem ausente: ${n}`));
console.log(`[4] imagens no disco que nenhuma questão usa: ${orfas.length}`);
orfas.forEach((n) => falha(`imagem órfã: ${n}`));

/* --- [5] sanidade do item e completude da curadoria ----------------------- */
let pendentes = 0;
for (const q of lote) {
  const eti = `Q${q.n_lote}`;
  const letras = q.alternativas.map((a) => a.letra);
  if (!letras.includes(q.gabarito)) falha(`${eti} gabarito ${q.gabarito} fora das alternativas`);
  if (new Set(letras).size !== letras.length) falha(`${eti} letra repetida`);
  if (![4, 5].includes(letras.length)) falha(`${eti} tem ${letras.length} alternativas`);
  for (const a of q.alternativas) {
    if (!String(a.texto || '').trim()) falha(`${eti} alternativa ${a.letra} vazia`);
    if (/^[a-eA-E][).]\s/.test(a.texto)) falha(`${eti} alternativa ${a.letra} repete a própria letra (§1)`);
  }
  if (q.duplicata_de) continue;

  const faltando = CURADOS.filter((c) => !String(q[c] || '').trim());
  if (faltando.length) { pendentes++; continue; }
  if (!TIPOS.has(q.tipo)) falha(`${eti} tipo fora do vocabulário: ${q.tipo}`);
  if (!NIVEIS.has(q.nivel_cefr)) falha(`${eti} nível inválido: ${q.nivel_cefr}`);
  if (!GENEROS.has(q.genero_textual)) falha(`${eti} gênero fora do vocabulário: ${q.genero_textual}`);
  if (q.meta_description.length > 160) falha(`${eti} meta com ${q.meta_description.length} caracteres`);
  if (q.comentario.length < 150) falha(`${eti} comentário com ${q.comentario.length} caracteres`);
  if (!q.titulo.trimEnd().endsWith(')')) falha(`${eti} título sem a prova entre parênteses (§9)`);
  if (q.slug_base && !q.slug_base.includes(String(q.ano))) falha(`${eti} ano do slug diverge de ${q.ano}`);
  if (q.imagem_alt && !q.imagem_arquivo) falha(`${eti} tem alt sem imagem`);
}
console.log(`[5] não-duplicatas ainda sem curadoria: ${pendentes}`);

/* --- [6] aspas: nenhum campo mistura reta com curva (§14) ----------------- */
let mistura = 0;
const confereAspas = (eti, campo, v) => {
  if (!v) return;
  if (v.includes('"') && (v.includes('“') || v.includes('”'))) {
    falha(`${eti} campo ${campo} mistura aspa reta e curva`); mistura++;
  }
  const ab = (v.match(/“/g) || []).length;
  const fe = (v.match(/”/g) || []).length;
  if (fe > ab) falha(`${eti} campo ${campo} fecha mais aspas curvas do que abre (${ab}/${fe})`);
};
for (const q of lote) {
  COM_ASPAS.forEach((c) => confereAspas(`Q${q.n_lote}`, c, q[c]));
  q.alternativas.forEach((a) => confereAspas(`Q${q.n_lote}`, `alt ${a.letra}`, a.texto));
}
console.log(`[6] campos misturando aspa reta e curva: ${mistura}`);

/* --- [7] acentuação dos campos que são nossos (§12) ----------------------- */
/* `comentario` e `imagem_alt` ficam de fora: citam o inglês do original, e ali
   "travel" ou "available" não são erro nosso. */
const SUFIXO = /(?<![A-Za-zÀ-ÿ])[A-Za-zÀ-ÿ]{2,}?(cao|coes|avel|ivel|encia|ancia)(?![A-Za-zÀ-ÿ])/gi;
const VERBOS = new Set(['evidencia', 'influencia', 'providencia', 'diferencia', 'reverencia']);
let semAcento = 0;
for (const q of lote) {
  if (q.duplicata_de) continue;
  for (const c of ['tema', 'meta_description', 'titulo']) {
    for (const m of String(q[c] || '').matchAll(SUFIXO)) {
      if (VERBOS.has(m[0].toLowerCase())) continue;
      falha(`Q${q.n_lote} campo ${c} sem acento: ${m[0]}`); semAcento++;
    }
  }
}
console.log(`[7] palavras nossas sem acentuação: ${semAcento}`);

console.log(`\nFALHAS: ${falhas}`);
process.exit(falhas ? 1 : 0);
