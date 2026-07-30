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
const norm = (s) => s.toLowerCase().replace(/[“”"’'‘`]/g, "'").replace(/\s+/g, ' ').trim();

// --- parte 2: citacoes em ingles, "(paragraph n)", usadas pela PUC Minas.
// Aqui da para ser exato: extrai o trecho citado antes do parenteses e confere
// se ele esta no n-esimo bloco de prosa (titulo, linha de autoria e fonte fora).
const RE_ING = /[“"]([^“”"]{6,160})[”"][^()]{0,40}\(paragraph\s+(\d)\)/gi;
const blocosDeProsa = (t) => (t || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  .filter((b) => b.split(/\s+/).length >= 12 && !/^(fonte|from:|source|disponível|available)/i.test(b));
let ingOk = 0; const ingFalhas = [];
db.prepare("SELECT id, instituicao, ano, enunciado, texto_base FROM questoes WHERE publicada=1 AND enunciado LIKE '%paragraph%' AND texto_base <> ''").all().forEach((q) => {
  const blocos = blocosDeProsa(q.texto_base);
  let m; const re = new RegExp(RE_ING.source, 'gi');
  while ((m = re.exec(q.enunciado)) !== null) {
    const [, trecho, n] = m;
    // reticencias no inicio ou no fim do trecho citado sao do enunciado, nao do texto
    const ini = norm(trecho).replace(/[.…]{2,}|…/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
    if (ini.split(' ').length < 2) continue;
    if (norm(blocos[+n - 1] || '').includes(ini)) ingOk++;
    else {
      const real = blocos.findIndex((b) => norm(b).includes(ini));
      ingFalhas.push({ id: q.id, prova: `${q.instituicao} ${q.ano}`, n, real: real >= 0 ? real + 1 : '?', trecho: trecho.slice(0, 40) });
    }
  }
});

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

console.log('\n================ citacoes em ingles "(paragraph n)" ================');
console.log(`conferidas OK: ${ingOk} | divergentes: ${ingFalhas.length}`);
ingFalhas.forEach((f) => console.log(`  [${f.id}] ${f.prova}: cita paragraph ${f.n}, trecho esta no bloco ${f.real} — ${JSON.stringify(f.trecho)}`));
