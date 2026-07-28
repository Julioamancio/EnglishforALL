/**
 * Importa lotes de questões de reading a partir de arquivos JSON em conteudo/reading/.
 *
 *   node scripts/importar-reading.js               # importa como rascunho
 *   node scripts/importar-reading.js --publicar    # importa já publicada
 *   node scripts/importar-reading.js a1.json       # só um arquivo
 *
 * Reimportar é seguro: questão com o mesmo slug é atualizada, não duplicada.
 */
require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const db = require('../src/db');

const PASTA = path.join(__dirname, '../conteudo/reading');
const SITE = process.env.SITE_URL || 'https://ingles.destruitor.com.br';

const args = process.argv.slice(2);
const publicar = args.includes('--publicar');
const arquivos = args.filter((a) => a.endsWith('.json'));

function validar(q, arquivo, i) {
  const onde = `${arquivo}[${i}] ${q.titulo || '(sem título)'}`;
  const erros = [];

  if (!q.titulo) erros.push('sem titulo');
  if (!q.tema) erros.push('sem tema');
  if (!q.nivel) erros.push('sem nivel');
  if (!q.texto_base) erros.push('sem texto_base');
  if (!q.enunciado) erros.push('sem enunciado');
  if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) {
    erros.push(`precisa de 5 alternativas (tem ${q.alternativas?.length ?? 0})`);
  }
  if (!/^[A-E]$/.test(q.gabarito || '')) erros.push('gabarito precisa ser A..E');
  if (!q.comentario) erros.push('sem comentario');

  const md = q.meta_description || '';
  if (md.length < 50 || md.length > 160) {
    erros.push(`meta_description com ${md.length} caracteres (precisa 50–160)`);
  }
  if (q.alternativas?.some((a) => !a || !a.trim())) erros.push('alternativa vazia');

  return erros.length ? `${onde}: ${erros.join('; ')}` : null;
}

const lista = (arquivos.length ? arquivos : fs.readdirSync(PASTA).filter((f) => f.endsWith('.json'))).sort();

if (!lista.length) {
  console.error(`Nenhum JSON em ${PASTA}`);
  process.exit(1);
}

let novas = 0;
let atualizadas = 0;
const problemas = [];

for (const arquivo of lista) {
  const caminho = path.join(PASTA, arquivo);
  const itens = JSON.parse(fs.readFileSync(caminho, 'utf8'));

  itens.forEach((q, i) => {
    const erro = validar(q, arquivo, i);
    if (erro) return problemas.push(erro);

    const base = slugify(`${q.titulo} reading ${q.nivel}`, { lower: true, strict: true });
    const existente = db.db.prepare('SELECT id FROM questoes WHERE slug = ?').get(base);

    const dados = {
      slug: existente ? base : db.slugLivre(base),
      titulo: q.titulo,
      meta_description: q.meta_description,
      tipo: 'interpretacao',
      genero_textual: q.genero_textual || 'texto didatico',
      tema: q.tema,
      nivel_cefr: q.nivel,
      texto_base: q.texto_base,
      imagem: null,
      imagem_alt: null,
      fonte_veiculo: 'English for ALL (texto original)',
      fonte_url: SITE,
      fonte_data: null,
      enunciado: q.enunciado,
      gabarito: q.gabarito,
      comentario: q.comentario,
      colecao: 'reading',
      publicada: publicar ? 1 : 0,
    };

    if (existente) {
      db.atualizar(existente.id, dados, q.alternativas);
      atualizadas++;
    } else {
      db.criar(dados, q.alternativas);
      novas++;
    }
  });

  console.log(`  ${arquivo}: ${itens.length} itens lidos`);
}

console.log(`\n${novas} novas, ${atualizadas} atualizadas — como ${publicar ? 'PUBLICADA' : 'rascunho'}`);

if (problemas.length) {
  console.log(`\n${problemas.length} item(ns) recusado(s):`);
  problemas.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
