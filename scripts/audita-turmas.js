/**
 * Verificador permanente do painel de rendimento por turma.
 *
 * Existe por causa de um bug que passou despercebido: em `porCampo` os apelidos
 * dos agregados se chamavam `total` e `acertos`, os mesmos nomes de duas colunas
 * da tabela `simulados` que entra no JOIN. O SQLite resolveu o HAVING e o ORDER
 * BY para as colunas, não para os agregados — então o corte por número mínimo de
 * respostas não filtrava nada e a ordenação usava a nota do simulado. A página
 * continuava bonita e os números continuavam plausíveis; só estavam errados.
 *
 * Daí a forma destas conferências: em vez de comparar com valores fixos (que
 * mudam a cada simulado), elas checam invariantes — o corte vale, a ordem é do
 * pior para o melhor, o histograma fecha com o total, e uma questão que todos
 * acertaram não aparece entre as que derrubaram a turma.
 *
 * Uso: NODE_PATH=/var/www/banco-questoes/node_modules node20 scripts/audita-turmas.js
 */
const path = require('path');
const turmas = require(path.join(__dirname, '..', 'src', 'lib', 'turmas'));

const MINIMO_RECORTE = 3; // igual ao padrão de porCampo
const MINIMO_QUESTAO = 2; // igual ao padrão de questoesDificeis

let falhas = 0;
const falha = (m) => { console.log(`  ✗ ${m}`); falhas++; };

/** Confere que a lista está ordenada do pior aproveitamento para o melhor. */
function conferOrdem(nome, itens) {
  for (let i = 1; i < itens.length; i++) {
    if (itens[i].percentual < itens[i - 1].percentual) {
      return falha(`${nome}: fora de ordem — ${itens[i - 1].percentual}% antes de ${itens[i].percentual}%`);
    }
  }
}

const lista = turmas.turmas();
console.log(`${lista.length} turma(s)\n`);

for (const t of lista) {
  console.log(`${t.rotulo} — ${t.alunos} alunos, ${t.participantes} participaram, média ${t.media ?? '—'}%`);
  const d = turmas.detalhe(t.instituicao, t.serie);

  for (const [nome, itens] of [['tema', d.porTema], ['nível', d.porNivel], ['tipo', d.porTipo]]) {
    const magros = itens.filter((i) => i.total < MINIMO_RECORTE);
    if (magros.length) falha(`por ${nome}: ${magros.length} recorte(s) com menos de ${MINIMO_RECORTE} respostas passaram pelo corte`);
    conferOrdem(`por ${nome}`, itens);
    itens.forEach((i) => {
      if (i.acertos > i.total) falha(`por ${nome}: "${i.valor}" tem ${i.acertos} acertos em ${i.total} respostas`);
      if (i.percentual !== Math.round((i.acertos / i.total) * 100)) falha(`por ${nome}: "${i.valor}" com percentual inconsistente`);
    });
  }

  const perfeitas = d.dificeis.filter((q) => q.acertaram >= q.responderam);
  if (perfeitas.length) falha(`${perfeitas.length} questão(ões) com 100% na lista das que derrubaram a turma`);
  const poucas = d.dificeis.filter((q) => q.responderam < MINIMO_QUESTAO);
  if (poucas.length) falha(`${poucas.length} questão(ões) com menos de ${MINIMO_QUESTAO} respostas entre as difíceis`);
  conferOrdem('difíceis', d.dificeis);

  const noHistograma = d.distribuicao.reduce((s, f) => s + f.alunos, 0);
  if (noHistograma !== d.participantes) {
    falha(`histograma soma ${noHistograma} alunos, mas ${d.participantes} participaram`);
  }
  if (d.total !== d.participantes + d.semParticipar.length) {
    falha(`${d.total} alunos, mas ${d.participantes} participantes + ${d.semParticipar.length} sem participar`);
  }
  if (d.ranking.length !== d.participantes) {
    falha(`ranking com ${d.ranking.length} alunos, mas ${d.participantes} participaram`);
  }
  if (d.media !== null && (d.media < 0 || d.media > 100)) falha(`média fora de 0–100: ${d.media}`);
  if (d.mediana !== null && (d.mediana < 0 || d.mediana > 100)) falha(`mediana fora de 0–100: ${d.mediana}`);
}

console.log(falhas ? `\n${falhas} problema(s)` : '\nSem problemas.');
process.exit(falhas ? 1 : 0);
