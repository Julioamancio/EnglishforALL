/**
 * Verificador permanente da busca da gramática.
 *
 * Confere três coisas, nesta ordem de importância:
 *
 * 1. A semântica: acento, caixa, pontuação e ordem das palavras não podem
 *    mudar o resultado, e todas as palavras precisam casar.
 * 2. A invariante do desenho: `buscar()` MARCA os tópicos, nunca os remove.
 *    É isso que deixa apagar o campo devolver os 60 sem recarregar, inclusive
 *    para quem chegou por um link com ?q=.
 * 3. A regra `[hidden] { display: none !important; }` no CSS. Parece
 *    desnecessária num script de Node, mas foi exatamente aqui que a busca
 *    quebrou: `.gcard { display: flex }` vence o `display:none` que o
 *    navegador dá ao atributo `hidden`, e 25 dos 55 cards escondidos
 *    continuavam na tela. O HTML estava certo, a contagem por atributo dizia
 *    que estava certo, e a página estava errada.
 *
 * O que este script NÃO cobre: o filtro instantâneo do site.js, que só o
 * navegador executa. Depois de mexer em public/js/site.js, abra /gramatica,
 * digite e confira que os cards somem de verdade — medindo altura, não o
 * atributo.
 *
 * Uso: NODE_PATH=/var/www/banco-questoes/node_modules node20 scripts/audita-busca.js
 */
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const g = require(path.join(raiz, 'src', 'lib', 'gramatica'));

let falhas = 0;
const falha = (m) => { console.log(`  ✗ ${m}`); falhas++; };

const TOTAL = g.total();
const conta = (t) => g.buscar(t).encontrados;

console.log(`${TOTAL} tópicos indexados\n`);

// 1. semântica
const equivalentes = [
  ['past simple', ['PAST SIMPLE', '  past   simple  ', 'past-simple', 'simple past', 'Past  Simple']],
  ['conditional', ['CONDITIONAL', 'conditional']],
];
for (const [base, variantes] of equivalentes) {
  const esperado = conta(base);
  console.log(`"${base}" → ${esperado}`);
  for (const v of variantes) {
    if (conta(v) !== esperado) falha(`"${v}" devolve ${conta(v)}, mas "${base}" devolve ${esperado}`);
  }
}

// acento não pode importar, nos dois sentidos
for (const [sem, com] of [['pontuacao', 'pontuação'], ['condicoes', 'condições'], ['metafora', 'metáfora']]) {
  if (conta(sem) !== conta(com)) falha(`"${sem}" (${conta(sem)}) != "${com}" (${conta(com)})`);
}

// mais palavras nunca pode achar mais resultados
if (conta('past simple') > conta('past')) falha('"past simple" acha mais que "past" — o E virou OU');
if (conta('') !== TOTAL) falha(`busca vazia devolve ${conta('')}, deveria devolver os ${TOTAL}`);
if (conta('zzqqxx') !== 0) falha('termo inexistente devolve resultado');

// 2. a invariante do desenho: marcar, não remover
for (const termo of ['', 'past simple', 'zzqqxx', 'b1']) {
  const r = g.buscar(termo);
  const naEstrutura = r.niveis.reduce((s, n) => s + n.topicos.length, 0);
  if (naEstrutura !== TOTAL) falha(`"${termo}": estrutura com ${naEstrutura} tópicos; buscar() deve marcar, não remover`);
  if (r.niveis.length !== 6) falha(`"${termo}": ${r.niveis.length} níveis na estrutura, deveriam ser 6`);
  const marcados = r.niveis.reduce((s, n) => s + n.topicos.filter((t) => t.casa).length, 0);
  if (marcados !== r.encontrados) falha(`"${termo}": encontrados=${r.encontrados} mas ${marcados} marcados`);
  const somaDosNiveis = r.niveis.reduce((s, n) => s + n.casam, 0);
  if (somaDosNiveis !== r.encontrados) falha(`"${termo}": soma dos níveis ${somaDosNiveis} != encontrados ${r.encontrados}`);
}

// 3. a regra de CSS sem a qual nada disso aparece certo na tela
const css = fs.readFileSync(path.join(raiz, 'public', 'css', 'estilo.css'), 'utf8');
const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
if (!/\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(semComentarios)) {
  falha('falta [hidden] { display: none !important } no estilo.css — os cards escondidos voltam a aparecer');
}
// Contar /* e */ NÃO basta, e isso custou o site fora do ar por uns minutos:
// ao inserir uma regra dentro do comentário de cabeçalho, o comentário fechou
// cedo e o resto do texto virou seletor — que engoliu o bloco :root inteiro e
// levou junto todas as variáveis de cor e fonte. A contagem continuava
// balanceada (2 aberturas, 2 fechamentos), o CSS "existia", e a página vinha
// sem estilo nenhum. O que denuncia é prosa em posição de seletor.
const seletores = semComentarios
  .split('}')
  .map((b) => b.split('{')[0])
  .filter((s) => s.trim() && !s.trim().startsWith('@'));
const suspeitos = seletores.filter((s) => /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(s) || s.trim().length > 160);
if (suspeitos.length) {
  falha(`estilo.css tem ${suspeitos.length} "seletor" que parece texto solto — comentário fechado no lugar errado?`);
  suspeitos.slice(0, 2).forEach((s) => console.log(`      → ${s.replace(/\s+/g, ' ').trim().slice(0, 70)}…`));
}

// as variáveis de tema precisam existir de fato
for (const v of ['--tinta', '--fundo', '--texto', '--superficie']) {
  if (!new RegExp(`\\${v}\\s*:`).test(semComentarios)) falha(`estilo.css sem a variável ${v}`);
}

/* Nenhum var(--x) pode apontar para variável que ninguém define.
 *
 * Escrever `background: var(--primaria)` quando o token se chama `--tinta` não
 * quebra nada: o CSS é válido, a regra é aceita, e a propriedade simplesmente
 * não pinta. Em 06/08/2026 foi assim que o número da página atual saiu sem
 * fundo nenhum na paginação nova — o "você está aqui" invisível, que é a única
 * coisa que uma paginação precisa acertar. No olho continuava parecendo uma
 * paginação; só medindo a cor computada aparecia o rgba(0, 0, 0, 0).
 *
 * As quatro da lista abaixo são definidas em tempo de execução, pelo próprio
 * JS, no atributo style do elemento — não estão nem podem estar no :root.
 */
const DEFINIDAS_PELO_JS = ['--cor', '--dx', '--dy', '--giro'];
const declaradas = new Set(
  [...semComentarios.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])
);
const usadas = new Set(
  [...semComentarios.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1])
);
const fantasmas = [...usadas].filter(
  (v) => !declaradas.has(v) && !DEFINIDAS_PELO_JS.includes(v)
);
if (fantasmas.length) {
  falha(`estilo.css usa ${fantasmas.length} variável(is) que ninguém define — a propriedade não pinta`);
  fantasmas.forEach((v) => console.log(`      \u2192 var(${v})`));
}

// o placeholder não pode sugerir um tópico que não existe
const view = fs.readFileSync(path.join(raiz, 'views', 'publico', 'gramatica.ejs'), 'utf8');
const ph = (view.match(/placeholder="Procure um tópico:([^"]*)"/) || [])[1];
if (ph) {
  ph.split(',').map((s) => s.replace('…', '').trim()).filter(Boolean).forEach((exemplo) => {
    if (!conta(exemplo)) falha(`o placeholder sugere "${exemplo}", que não acha nada`);
  });
} else {
  falha('não achei o placeholder da busca na view');
}

console.log(falhas ? `\n${falhas} problema(s)` : '\nSem problemas.');
process.exit(falhas ? 1 : 0);
