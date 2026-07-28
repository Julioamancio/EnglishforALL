/**
 * Importa uma coleção autoral a partir dos JSON em conteudo/<colecao>/.
 *
 *   node scripts/importar-colecao.js reading
 *   node scripts/importar-colecao.js use-of-english --publicar
 *   node scripts/importar-colecao.js use-of-english a1.json
 *
 * Reimportar é seguro: questão com o mesmo slug é atualizada, não duplicada.
 */
require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const db = require('../src/db');
const { COLECOES, NIVEIS } = require('../src/lib/colecoes');

const SITE = process.env.SITE_URL || 'https://ingles.destruitor.com.br';

const args = process.argv.slice(2);
const publicar = args.includes('--publicar');
const chave = args.find((a) => COLECOES[a]);
const arquivos = args.filter((a) => a.endsWith('.json'));

if (!chave) {
  console.error(`Informe a coleção. Disponíveis: ${Object.keys(COLECOES).join(', ')}`);
  process.exit(1);
}

const col = COLECOES[chave];
const PASTA = path.join(__dirname, '../conteudo', chave);

if (!fs.existsSync(PASTA)) {
  console.error(`Pasta não encontrada: ${PASTA}`);
  process.exit(1);
}

function validar(q, arquivo, i) {
  const onde = `${arquivo}[${i}] ${q.titulo || '(sem título)'}`;
  const erros = [];

  if (!q.titulo) erros.push('sem titulo');
  if (!q.tema) erros.push('sem tema');
  if (!NIVEIS.includes(q.nivel)) erros.push(`nivel invalido (${q.nivel})`);
  if (!q.texto_base) erros.push('sem texto_base');
  if (!q.enunciado) erros.push('sem enunciado');
  if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) {
    erros.push(`precisa de 5 alternativas (tem ${q.alternativas?.length ?? 0})`);
  } else {
    if (q.alternativas.some((a) => !a || !a.trim())) erros.push('alternativa vazia');
    const unicas = new Set(q.alternativas.map((a) => (a || '').trim().toLowerCase()));
    if (unicas.size !== 5) erros.push('alternativa repetida');
  }
  if (!/^[A-E]$/.test(q.gabarito || '')) erros.push('gabarito precisa ser A..E');
  if (!q.comentario) erros.push('sem comentario');

  const md = q.meta_description || '';
  if (md.length < 50 || md.length > 160) {
    erros.push(`meta_description com ${md.length} caracteres (precisa 50–160)`);
  }

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
  const itens = JSON.parse(fs.readFileSync(path.join(PASTA, arquivo), 'utf8'));

  itens.forEach((q, i) => {
    const erro = validar(q, arquivo, i);
    if (erro) return problemas.push(erro);

    const base = slugify(`${q.titulo} ${col.nome} ${q.nivel}`, { lower: true, strict: true });
    const existente = db.db.prepare('SELECT id FROM questoes WHERE slug = ?').get(base);

    const dados = {
      slug: existente ? base : db.slugLivre(base),
      titulo: q.titulo,
      meta_description: q.meta_description,
      tipo: col.tipo,
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
      colecao: col.chave,
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

console.log(
  `\n[${col.nome}] ${novas} novas, ${atualizadas} atualizadas — como ${publicar ? 'PUBLICADA' : 'rascunho'}`
);

if (problemas.length) {
  console.log(`\n${problemas.length} item(ns) recusado(s):`);
  problemas.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
