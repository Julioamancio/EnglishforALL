#!/usr/bin/env node
/* Importa um lote de questões de vestibular para o acervo.
 *
 *   node20 scripts/importar-lote.js <lote.json>            # simulação, não grava
 *   node20 scripts/importar-lote.js <lote.json> --gravar   # grava de verdade
 *
 * Só INSERT. Nunca UPDATE, nunca DELETE — nenhuma questão existente é tocada.
 * Duplicata é pulada e registrada, jamais sobrescrita.
 *
 * Tudo acontece dentro de uma transação: qualquer recusa no meio do caminho
 * derruba o lote inteiro e nada fica gravado pela metade.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const RAIZ = path.join(__dirname, '..');
const BANCO = process.env.DB_PATH || path.join(RAIZ, 'dados/banco.db');
const UPLOADS = path.join(RAIZ, 'public/uploads');

const arquivo = process.argv[2];
const gravar = process.argv.includes('--gravar');

if (!arquivo) {
  console.error('uso: node20 scripts/importar-lote.js <lote.json> [--gravar]');
  process.exit(1);
}

/* --------------------------------------------------------------- vocabulário
   Os mesmos valores que o site usa. Um campo fora desta lista vira página com
   filtro vazio, então é recusa, não aviso. */

const TIPOS = new Set(['interpretacao', 'gramatica', 'vocabulario']);
const NIVEIS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const GENEROS = new Set(Object.keys(require('../src/rotulos').ROTULOS_GENERO));

/* ------------------------------------------------------------------ apoio */

function digital(texto) {
  /* Impressão digital para comparar enunciados: só as letras e números, sem
     acento, caixa nem pontuação. Duas transcrições do mesmo item divergem na
     pontuação e nas aspas com muito mais frequência do que nas palavras. */
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function slugLivre(db, base) {
  const busca = db.prepare('SELECT id FROM questoes WHERE slug = ?');
  let slug = base;
  let n = 2;
  while (busca.get(slug)) slug = `${base}-${n++}`;
  return slug;
}

/* ------------------------------------------------------------------ leitura */

const lote = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const db = new Database(BANCO);

/* Índice do acervo por impressão digital, para pegar duplicata que o
   par instituição+ano não pegaria — item reaproveitado por outra prova. */
const acervo = new Map();
for (const r of db.prepare('SELECT id, enunciado FROM questoes').all()) {
  const d = digital(r.enunciado);
  if (d && !acervo.has(d)) acervo.set(d, r.id);
}
console.log(`acervo: ${acervo.size} enunciados indexados`);

/* ---------------------------------------------------------------- exame */

const entram = [];
const pulados = [];
const recusados = [];

for (const q of lote) {
  const eti = `Q${q.n_lote} (${q.instituicao}/${q.ano})`;

  if (q.duplicata_de) {
    pulados.push([eti, `duplicata da id ${q.duplicata_de} (marcada na curadoria)`]);
    continue;
  }
  const achou = acervo.get(digital(q.enunciado));
  if (achou) {
    pulados.push([eti, `duplicata da id ${achou} (enunciado idêntico no acervo)`]);
    continue;
  }

  /* Campos que exigem curadoria. Vazio aqui significa questão pela metade, e
     questão pela metade não entra: no ar ela apareceria sem nível, sem tema e
     sem descrição de imagem, e ninguém repara depois que já está publicada. */
  const faltando = ['titulo', 'meta_description', 'tipo', 'genero_textual',
                    'tema', 'nivel_cefr', 'comentario', 'imagem_alt']
    .filter((c) => !String(q[c] || '').trim());
  if (faltando.length) {
    recusados.push([eti, `curadoria incompleta: ${faltando.join(', ')}`]);
    continue;
  }

  if (!TIPOS.has(q.tipo)) { recusados.push([eti, `tipo fora do vocabulário: "${q.tipo}"`]); continue; }
  if (!NIVEIS.has(q.nivel_cefr)) { recusados.push([eti, `nível CEFR inválido: "${q.nivel_cefr}"`]); continue; }
  if (!GENEROS.has(q.genero_textual)) { recusados.push([eti, `gênero fora do vocabulário: "${q.genero_textual}"`]); continue; }

  const letras = q.alternativas.map((a) => a.letra);
  if (![4, 5].includes(letras.length)) { recusados.push([eti, `${letras.length} alternativas`]); continue; }
  if (new Set(letras).size !== letras.length) { recusados.push([eti, 'letra repetida entre as alternativas']); continue; }
  if (!letras.includes(q.gabarito)) { recusados.push([eti, `gabarito [${q.gabarito}] não existe entre as alternativas`]); continue; }
  if (q.alternativas.some((a) => !String(a.texto || '').trim())) { recusados.push([eti, 'alternativa vazia']); continue; }
  /* §1: o texto guarda só o conteúdo; a letra é impressa pelo template. */
  if (q.alternativas.some((a) => /^[a-eA-E][).]\s/.test(a.texto))) {
    recusados.push([eti, 'alternativa repete a própria letra no texto (§1)']); continue;
  }

  /* Imagem apontando para arquivo inexistente renderiza ícone quebrado, que o
     padrão registra como pior do que não ter imagem. */
  if (q.imagem_arquivo && !fs.existsSync(path.join(UPLOADS, q.imagem_arquivo))) {
    recusados.push([eti, `imagem ausente em uploads: ${q.imagem_arquivo}`]); continue;
  }
  /* O alt só é renderizado dentro da tag <img>: sem imagem ele é invisível. */
  if (q.imagem_alt && !q.imagem_arquivo) {
    recusados.push([eti, 'tem imagem_alt sem imagem — o alt nunca apareceria']); continue;
  }
  /* §9: o ano do slug não pode divergir do campo ano. */
  if (q.slug_base && !q.slug_base.includes(String(q.ano))) {
    recusados.push([eti, `ano do slug diverge do campo ano (${q.ano})`]); continue;
  }

  entram.push(q);
}

/* ---------------------------------------------------------------- relatório */

const linha = (par) => `  ${par[0].padEnd(28)} ${par[1]}`;
if (pulados.length) {
  console.log(`\nPULADAS — já existem no acervo (${pulados.length}):`);
  pulados.forEach((p) => console.log(linha(p)));
}
if (recusados.length) {
  console.log(`\nRECUSADAS — não entram como estão (${recusados.length}):`);
  recusados.forEach((p) => console.log(linha(p)));
}
console.log(`\nENTRAM (${entram.length}):`);
for (const q of entram) {
  const pub = q.publicada ? 'publicada' : 'rascunho ';
  console.log(`  Q${String(q.n_lote).padEnd(3)} ${pub}  ${q.instituicao}/${q.ano}  ${q.titulo}`);
}

if (!gravar) {
  console.log(`\n--dry: nada foi gravado. Para valer, repita com --gravar.`);
  process.exit(0);
}
if (!entram.length) {
  console.log('\nNada a gravar.');
  process.exit(0);
}

/* ---------------------------------------------------------------- gravação */

const inserirQuestao = db.prepare(
  `INSERT INTO questoes
     (slug, titulo, meta_description, tipo, genero_textual, tema, nivel_cefr,
      texto_base, imagem, imagem_alt, fonte_veiculo, fonte_url, fonte_data,
      enunciado, gabarito, comentario, colecao, publicada, instituicao, ano)
   VALUES
     (@slug, @titulo, @meta_description, @tipo, @genero_textual, @tema, @nivel_cefr,
      @texto_base, @imagem, @imagem_alt, @fonte_veiculo, @fonte_url, @fonte_data,
      @enunciado, @gabarito, @comentario, @colecao, @publicada, @instituicao, @ano)`
);
const inserirAlt = db.prepare(
  'INSERT INTO alternativas (questao_id, letra, texto) VALUES (?, ?, ?)'
);

const gravarLote = db.transaction((lista) => {
  const feitos = [];
  for (const q of lista) {
    const slug = slugLivre(db, q.slug_base);
    const info = inserirQuestao.run({
      slug,
      titulo: q.titulo,
      meta_description: q.meta_description,
      tipo: q.tipo,
      genero_textual: q.genero_textual,
      tema: q.tema,
      nivel_cefr: q.nivel_cefr,
      texto_base: q.texto_base || '',
      imagem: q.imagem_arquivo ? `/uploads/${q.imagem_arquivo}` : null,
      imagem_alt: q.imagem_alt || null,
      fonte_veiculo: q.fonte_veiculo || `${q.instituicao} ${q.ano}`,
      fonte_url: q.fonte_url || '',
      fonte_data: q.fonte_data || null,
      enunciado: q.enunciado,
      gabarito: q.gabarito,
      comentario: q.comentario,
      colecao: '',
      publicada: q.publicada ? 1 : 0,
      instituicao: q.instituicao,
      ano: String(q.ano),
    });
    for (const a of q.alternativas) inserirAlt.run(info.lastInsertRowid, a.letra, a.texto);
    feitos.push([q.n_lote, info.lastInsertRowid, slug]);
  }
  return feitos;
});

const feitos = gravarLote(entram);
console.log(`\nGRAVADAS ${feitos.length}:`);
for (const [n, id, slug] of feitos) console.log(`  Q${String(n).padEnd(3)} -> id ${id}  /${slug}`);
console.log('\nAgora: systemctl restart banco-questoes && rodar as auditorias.');
