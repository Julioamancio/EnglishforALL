/**
 * SOMENTE LEITURA — o template so mostra a imagem e o alt quando `imagem` esta
 * preenchida (views/publico/questao.ejs:17). Entao:
 *  - alt preenchido SEM imagem = conteudo invisivel para o aluno;
 *  - imagem preenchida SEM alt = imagem sem descricao (acessibilidade).
 * Alem disso, questao sem texto_base e sem imagem so tem o enunciado.
 */
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
