/**
 * SOMENTE LEITURA — o template so mostra a imagem e o alt quando `imagem` esta
 * preenchida (views/publico/questao.ejs:17). Entao:
 *  - alt preenchido SEM imagem = conteudo invisivel para o aluno;
 *  - imagem preenchida SEM alt = imagem sem descricao (acessibilidade).
 * Alem disso, questao sem texto_base e sem imagem so tem o enunciado.
 */
const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('dados/banco.db', { readonly: true });

const altSemImagem = db.prepare("SELECT id, slug, instituicao, ano, length(imagem_alt) n FROM questoes WHERE publicada=1 AND (imagem IS NULL OR imagem='') AND imagem_alt IS NOT NULL AND TRIM(imagem_alt)<>'' ORDER BY id").all();
console.log('=== alt preenchido SEM imagem (conteudo nao renderizado) ===');
console.log('total:', altSemImagem.length);
const porProva = {};
altSemImagem.forEach((r) => { const k = `${r.instituicao} ${r.ano}`; porProva[k] = (porProva[k] || 0) + 1; });
Object.entries(porProva).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
console.log('   ids:', altSemImagem.map((r) => r.id).join(','));

const imgSemAlt = db.prepare("SELECT count(*) c FROM questoes WHERE publicada=1 AND imagem IS NOT NULL AND imagem<>'' AND (imagem_alt IS NULL OR TRIM(imagem_alt)='')").get().c;
console.log('\n=== imagem SEM alt (acessibilidade) ===');
console.log('total:', imgSemAlt);

const nada = db.prepare("SELECT count(*) c FROM questoes WHERE publicada=1 AND TRIM(COALESCE(texto_base,''))='' AND (imagem IS NULL OR imagem='') AND TRIM(COALESCE(imagem_alt,''))=''").get().c;
console.log('\n=== sem texto-base, sem imagem e sem alt (so enunciado) ===');
console.log('total:', nada, '(esperado: os itens discretos antigos da Fuvest, ver PADRAO §7)');

console.log('\n=== amostra: como esses alts orfaos comecam ===');
altSemImagem.slice(0, 8).forEach((r) => {
  const a = db.prepare('SELECT substr(imagem_alt,1,70) s FROM questoes WHERE id=?').get(r.id).s;
  console.log(`   [${r.id}] ${r.instituicao} ${r.ano} (${r.n} chars) ${JSON.stringify(a)}`);
});

// ---------------------------------------------------------------------------
// Descricao de imagem escrita COMO TEXTO, sem imagem na tela.
//
// Existe porque 57 questoes traziam blocos assim no texto-base:
//   "[Charge abaixo do texto: um homem de boina conversa animadamente...]"
// e nao havia charge nenhuma. O aluno lia, procurava a imagem, nao achava, e
// concluia que a pagina estava quebrada. Em 56 delas a peca visual era
// decorativa (o comando era "According to the passage" ou item de gramatica) e
// a descricao saiu; em 1 o comando pedia "os elementos visuais da figura", e
// ai o conserto foi extrair a imagem da prova oficial e publica-la.
//
// A regra que fica: ou a imagem esta no item, ou nao se fala dela no texto que
// o aluno le. Descricao de imagem tem lugar proprio, o imagem_alt.
const RE_LEGENDA = /\[\s*(?:imagem|tirinha|charge|foto(?:grafia)?|figura|cartum|quadrinhos?|cartaz|p[oô]ster|infogr[aá]fico|ilustra[cç][aã]o|logotipo|meme|verbete|quadro|gr[aá]fico|tabela|desenho|pintura|mapa|capa|placa|an[uú]ncio|ao lado do texto|acima do texto|abaixo do texto)[^\]]*\]/i;
const legendaOrfa = db.prepare(
  "SELECT id, slug, instituicao, ano, texto_base, enunciado FROM questoes WHERE publicada=1 AND COALESCE(imagem,'')=''"
).all().filter((q) => RE_LEGENDA.test(q.texto_base || '') || RE_LEGENDA.test(q.enunciado || ''));

console.log('\n=== descricao de imagem no texto, SEM imagem na tela ===');
console.log('total:', legendaOrfa.length, '(esperado: 0)');
legendaOrfa.forEach((q) => {
  const m = (q.texto_base || '').match(RE_LEGENDA) || (q.enunciado || '').match(RE_LEGENDA);
  console.log(`   [${q.id}] ${q.instituicao} ${q.ano} ${JSON.stringify(m[0].replace(/\s+/g, ' ').slice(0, 70))}`);
});

// ---------------------------------------------------------------------------
// Imagem apontando para arquivo que nao existe no disco: a questao renderiza
// com um icone quebrado, que e pior do que nao ter imagem.
const path = require('path');
const semArquivo = db.prepare(
  "SELECT id, slug, imagem FROM questoes WHERE publicada=1 AND COALESCE(imagem,'')<>'' AND imagem LIKE '/%'"
).all().filter((q) => !fs.existsSync(path.join(__dirname, '..', 'public', q.imagem)));

console.log('\n=== imagem apontando para arquivo inexistente ===');
console.log('total:', semArquivo.length, '(esperado: 0)');
semArquivo.forEach((q) => console.log(`   [${q.id}] ${q.imagem}`));

if (legendaOrfa.length || semArquivo.length) process.exit(1);
