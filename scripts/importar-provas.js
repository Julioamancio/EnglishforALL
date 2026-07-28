/**
 * Importa questões transcritas de provas reais (vestibulares e ENEM).
 *
 *   node scripts/importar-provas.js                    # tudo, como rascunho
 *   node scripts/importar-provas.js --publicar
 *   node scripts/importar-provas.js einstein-2026.json
 *
 * Diferente de importar-colecao.js: aqui o conteúdo NÃO é autoral, então
 * instituicao, ano e a fonte do texto-base são obrigatórios — é o que sustenta
 * a citação correta de cada questão.
 *
 * Os arquivos ficam em conteudo/provas/.
 */
require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const db = require('../src/db');

const PASTA = path.join(__dirname, '../conteudo/provas');
const NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const TIPOS = ['interpretacao', 'gramatica', 'vocabulario'];

const args = process.argv.slice(2);
const publicar = args.includes('--publicar');
const arquivos = args.filter((a) => a.endsWith('.json'));

if (!fs.existsSync(PASTA)) {
  console.error(`Pasta não encontrada: ${PASTA}`);
  process.exit(1);
}

function validar(q, arquivo, i) {
  const onde = `${arquivo}[${i}] ${q.titulo || '(sem título)'}`;
  const e = [];

  if (!q.titulo) e.push('sem titulo');
  if (!q.tema) e.push('sem tema');
  if (!NIVEIS.includes(q.nivel)) e.push(`nivel invalido (${q.nivel})`);
  if (!TIPOS.includes(q.tipo)) e.push(`tipo invalido (${q.tipo})`);
  if (!q.texto_base && !q.imagem) e.push('sem texto_base nem imagem');
  if (!q.enunciado) e.push('sem enunciado');
  if (!q.instituicao) e.push('sem instituicao');
  if (!q.ano) e.push('sem ano');
  if (!q.fonte_veiculo) e.push('sem fonte_veiculo (de onde veio o texto original)');

  if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) {
    e.push(`precisa de 5 alternativas (tem ${q.alternativas?.length ?? 0})`);
  } else {
    if (q.alternativas.some((a) => !a || !a.trim())) e.push('alternativa vazia');
    if (new Set(q.alternativas.map((a) => (a || '').trim().toLowerCase())).size !== 5) {
      e.push('alternativa repetida');
    }
  }
  if (!/^[A-E]$/.test(q.gabarito || '')) e.push('gabarito precisa ser A..E');
  if (!q.comentario) e.push('sem comentario');

  const md = q.meta_description || '';
  if (md.length < 50 || md.length > 160) e.push(`meta_description com ${md.length} caracteres (50–160)`);

  return e.length ? `${onde}: ${e.join('; ')}` : null;
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

    const base = slugify(`${q.titulo} ${q.instituicao} ${q.ano}`, { lower: true, strict: true });
    const existente = db.db.prepare('SELECT id FROM questoes WHERE slug = ?').get(base);

    const dados = {
      slug: existente ? base : db.slugLivre(base),
      titulo: q.titulo,
      meta_description: q.meta_description,
      tipo: q.tipo,
      genero_textual: q.genero_textual || 'texto',
      tema: q.tema,
      nivel_cefr: q.nivel,
      texto_base: q.texto_base || '',
      imagem: q.imagem || null,
      imagem_alt: q.imagem_alt || null,
      fonte_veiculo: q.fonte_veiculo,
      fonte_url: q.fonte_url || '',
      fonte_data: q.fonte_data || null,
      enunciado: q.enunciado,
      gabarito: q.gabarito,
      comentario: q.comentario,
      colecao: '',
      publicada: publicar ? 1 : 0,
    };

    if (existente) {
      db.atualizar(existente.id, dados, q.alternativas);
      atualizadas++;
    } else {
      db.criar(dados, q.alternativas);
      novas++;
    }

    // instituicao e ano não passam por criar/atualizar; gravados à parte.
    const id = existente ? existente.id : db.db.prepare('SELECT id FROM questoes WHERE slug = ?').get(dados.slug).id;
    db.db.prepare('UPDATE questoes SET instituicao = ?, ano = ? WHERE id = ?').run(q.instituicao, q.ano, id);
  });

  console.log(`  ${arquivo}: ${itens.length} itens lidos`);
}

console.log(`\n${novas} novas, ${atualizadas} atualizadas — como ${publicar ? 'PUBLICADA' : 'rascunho'}`);

if (problemas.length) {
  console.log(`\n${problemas.length} item(ns) recusado(s):`);
  problemas.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
