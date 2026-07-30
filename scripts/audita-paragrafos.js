/**
 * SOMENTE LEITURA — auditoria: questao que cita "N-esimo paragrafo" tem, no
 * texto-base, pelo menos N paragrafos demarcados?
 * Paragrafo = bloco separado por linha em branco (o template renderiza assim).
 * Se o texto e um bloco unico, o aluno nao tem como identificar "o segundo
 * paragrafo" — mesmo tipo de defeito da citacao de linha sem numeracao.
 */
const Database = require('better-sqlite3');
const db = new Database('dados/banco.db', { readonly: true });

const ORD = { primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, sexto: 6, sétimo: 7, oitavo: 8 };
const qs = db.prepare("SELECT id, instituicao, ano, enunciado, texto_base, imagem_alt FROM questoes WHERE publicada=1 AND enunciado LIKE '%parágrafo%'").all();
let comCitacao = 0, ok = 0;
const falhas = [];

qs.forEach((q) => {
  const m = [...q.enunciado.matchAll(/(primeiro|segundo|terceiro|quarto|quinto|sexto|sétimo|oitavo|último)\s+parágrafos?/gi)];
  if (!m.length) return;
  comCitacao++;
  // quando a peca nao tem texto_base, o texto que o aluno le esta no imagem_alt
  // (caso das questoes cujo enunciado veio dentro da reproducao da pagina)
  const fonteTexto = (q.texto_base && q.texto_base.trim()) ? q.texto_base : (q.imagem_alt || '');
  const blocos = fonteTexto.split(/\n\s*\n/).filter((b) => b.trim()).length;
  const semTexto = !fonteTexto.trim();
  m.forEach((h) => {
    const palavra = h[1].toLowerCase();
    const n = palavra === 'último' ? blocos : ORD[palavra];
    if (semTexto) { falhas.push({ id: q.id, prova: `${q.instituicao} ${q.ano}`, palavra, blocos: 'sem texto-base' }); return; }
    if (blocos >= n && blocos > 1) ok++;
    else falhas.push({ id: q.id, prova: `${q.instituicao} ${q.ano}`, palavra, blocos });
  });
});

console.log(`questoes publicadas que citam paragrafo: ${comCitacao}`);
console.log(`citacoes resolviveis: ${ok} | problematicas: ${falhas.length}`);
console.log('\n--- citacoes que o texto nao consegue atender ---');
const porProva = {};
falhas.forEach((f) => { (porProva[f.prova] = porProva[f.prova] || []).push(f); });
Object.entries(porProva).forEach(([prova, fs]) => {
  console.log(`\n${prova} — ${fs.length}`);
  fs.forEach((f) => console.log(`  [${f.id}] cita "${f.palavra} parágrafo", mas o texto tem ${f.blocos} bloco(s)`));
});
console.log('\nids afetados:', [...new Set(falhas.map((f) => f.id))].join(','));
