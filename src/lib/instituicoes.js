/**
 * As instituições que aparecem no cadastro.
 *
 * Antes o campo era texto livre, e a mesma escola chegava de seis jeitos:
 * "Colégio São José", "Colégio São José Escolápias", "Colegio Sao Jose
 * Escolapias", "CSJ", "Escola"… Isso tornava o filtro do painel inútil, porque
 * cada grafia virava um grupo. Com a lista fechada o problema não nasce.
 *
 * Para acrescentar uma escola, basta uma linha aqui: o formulário de cadastro,
 * a edição no painel e o filtro leem todos desta mesma fonte.
 */
const INSTITUICOES = [
  { sigla: 'CSJ', nome: 'Colégio São José' },
  { sigla: 'CSA', nome: 'CSA' },
  { sigla: 'Arnaldo', nome: 'Colégio Arnaldo' },
];

const SIGLAS = INSTITUICOES.map((i) => i.sigla);

/** Rótulo para a tela: mostra o nome quando ele acrescenta algo à sigla. */
function rotulo(sigla) {
  const i = INSTITUICOES.find((x) => x.sigla === sigla);
  if (!i) return sigla;
  return i.nome === i.sigla ? i.sigla : `${i.sigla} — ${i.nome}`;
}

/** A sigla é válida? Usado antes de gravar, no cadastro e na edição. */
function valida(sigla) {
  return SIGLAS.includes(String(sigla || '').trim());
}

module.exports = { INSTITUICOES, SIGLAS, rotulo, valida };
