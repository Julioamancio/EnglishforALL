/**
 * SOMENTE LEITURA — auditoria: questoes que citam "(linha N)" batem com o texto?
 * Extrai o trecho entre aspas imediatamente antes da citacao e testa se ele esta
 * na linha N do texto-base.
 *
 * A numeracao das provas aparece de varios jeitos, e todos convivem no acervo:
 *  1. marcadores no inicio da linha, comecando em 1;
 *  2. marcadores no inicio da linha, de 5 em 5, SEM o 1 (o mais comum na Fuvest:
 *     so aparecem 5, 10, 15, 20…);
 *  3. marcadores no fim da linha (Fuvest 2008, Fuvest 2021);
 *  4. numeracao que conta as linhas em branco e numeracao que nao conta.
 * Por isso a origem nao e procurada pelo marcador "1": ela e DEDUZIDA de
 * qualquer marcador. Se o marcador M esta no indice i, a linha 1 da prova esta
 * no indice i-M+1, e pelo menos dois marcadores tem de concordar com essa mesma
 * origem — o que descarta numero solto no meio do texto.
 */
const Database = require('better-sqlite3');
const db = new Database('dados/banco.db', { readonly: true });

// o marcador de linha fica DENTRO da linha; ao juntar duas linhas ele cai no meio
// do trecho citado e quebra a comparacao (caso da 1023, "this kind of | 15 barrier")
const semMarcador = (s) => String(s || '').replace(/^\s*\d{1,2}\s+/, '').replace(/\s+\d{1,2}\s*$/, '');
const norm = (s) => String(s || '').toLowerCase().replace(/[“”"’'‘]/g, '').replace(/\[\[|\]\]/g, '').replace(/\s+/g, ' ').trim();
// separador entre os dois numeros: "e", "a", ",", "-", "–" ou "/" ("linhas 19-20",
// "linhas 35/36", "linhas 2 e 3"); tambem aceita a forma abreviada "(l. 3)".
const RE_CIT = /[“"]([^“”"]{6,160})[”"][^()]{0,40}\((?:linhas?|lines?|l\.|L\.|ll\.)\s*(\d{1,2})(?:\s*(?:e|a|,|-|–|\/|and)\s*(\d{1,2}))?\)/g;
const RE_TEM_CIT = /\((?:linhas?|lines?|l\.|L\.|ll\.)\s*\d/i;

// cabecalho de prova nao e linha de texto e costuma terminar em numero
// ("TEXTO PARA AS QUESTOES DE 56 A 58") — nao pode ser lido como marcador
const ehCabecalho = (l) => /^\s*(TEXTO|INSTRU|LEIA|Read |Based on)/i.test(l) || /^\s*\[/.test(l);

/**
 * Descobre onde esta a linha 1 da prova. Devolve as leituras possiveis (contando
 * e sem contar linhas em branco), ou null se o texto nao tiver numeracao.
 */
function ancora(linhas) {
  const saidas = [];
  [linhas, linhas.filter((l) => l.trim() !== '')].forEach((corpo) => {
    // aceita qualquer marcador: o ITA numera 1 e 3, a Fuvest so de 5 em 5. O que
    // separa marcador de numero solto no texto nao e o valor, e a concordancia:
    // dois marcadores DIFERENTES tem de apontar para a mesma linha 1.
    const votos = new Map();
    corpo.forEach((l, i) => {
      if (ehCabecalho(l)) return;
      const ini = l.match(/^\s*(\d{1,2})\s+\S/);
      const fim = l.match(/\S\s+(\d{1,2})\s*$/);
      const n = Number((ini || fim || [])[1]);
      if (!n) return;
      const o = i - n + 1;
      if (!votos.has(o)) votos.set(o, new Set());
      votos.get(o).add(n);
    });
    const [origem, ns] = [...votos.entries()].sort((a, b) => b[1].size - a[1].size)[0] || [];
    if (ns && ns.size >= 2 && origem >= 0) saidas.push({ corpo, origem });
  });
  return saidas.length ? saidas : null;
}

const qs = db.prepare(`SELECT id, slug, instituicao, ano, enunciado, texto_base FROM questoes
  WHERE publicada=1 AND texto_base <> ''
  AND (enunciado LIKE '%linha%' OR enunciado LIKE '%line %' OR enunciado LIKE '%(l. %' OR enunciado LIKE '%(L. %')`).all()
  .filter((q) => RE_TEM_CIT.test(q.enunciado));

let comCitacao = 0, ok = 0;
const falhas = [];
const semNumeracao = [];

qs.forEach((q) => {
  const leituras = ancora(q.texto_base.split('\n'));
  if (!leituras) { semNumeracao.push(q); return; }
  let m, achou = false;
  RE_CIT.lastIndex = 0;
  while ((m = RE_CIT.exec(q.enunciado)) !== null) {
    const [, trecho, n1, n2] = m;
    achou = true;
    // trechos que comecam com reticencias ("… mostly on") ou com marcacao de
    // grifo comecam no meio da linha: descarta o lixo inicial antes de comparar
    const inicio = norm(trecho).replace(/^[.…\s]*/, '').split(' ').slice(0, 4).join(' ');
    // basta uma das leituras (com ou sem linhas em branco) encaixar
    const bateu = leituras.some(({ corpo, origem }) => {
      const pega = (n) => semMarcador(corpo[origem + Number(n) - 1]);
      return norm([pega(n1), n2 ? pega(n2) : ''].join(' ')).includes(inicio);
    });
    if (bateu) ok++;
    else {
      const { corpo, origem } = leituras[0];
      const iReal = corpo.findIndex((l, i) => norm([semMarcador(l), semMarcador(corpo[i + 1])].join(' ')).includes(inicio));
      falhas.push({ id: q.id, prova: `${q.instituicao} ${q.ano}`, citada: n1, real: iReal >= 0 ? iReal - origem + 1 : '?', trecho: trecho.slice(0, 46) });
    }
  }
  if (achou) comCitacao++;
});

console.log(`questoes publicadas com texto numerado e citacao de linha: ${comCitacao}`);
console.log(`citacoes conferidas OK: ${ok} | divergentes: ${falhas.length}`);
console.log('\n--- divergencias (linha citada -> linha real) ---');
const porTexto = {};
falhas.forEach((f) => { (porTexto[f.prova] = porTexto[f.prova] || []).push(f); });
Object.entries(porTexto).forEach(([prova, fs]) => {
  console.log(`\n${prova} — ${fs.length} divergencias`);
  fs.slice(0, 8).forEach((f) => console.log(`  [${f.id}] citada linha ${f.citada}, real ${f.real}: ${JSON.stringify(f.trecho)}`));
  if (fs.length > 8) console.log(`  … e mais ${fs.length - 8}`);
});
console.log('\nids afetados:', [...new Set(falhas.map((f) => f.id))].join(','));

// Sem marcadores o aluno nao consegue contar ate a linha citada — o defeito
// mais silencioso, porque a conferencia acima simplesmente pula esses textos.
console.log('\n================ citacao de linha em texto SEM numeracao ================');
console.log(`questoes: ${semNumeracao.length}`);
const porP = {};
semNumeracao.forEach((q) => { (porP[`${q.instituicao} ${q.ano}`] = porP[`${q.instituicao} ${q.ano}`] || []).push(q.id); });
Object.entries(porP).forEach(([p, ids]) => console.log(`  ${p}: ${ids.join(', ')}`));
