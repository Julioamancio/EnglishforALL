/**
 * Vestibulares cujo processo seletivo é de medicina (ou de área da saúde).
 *
 * A página /medicina é um recorte do acervo de provas, não uma coleção nova:
 * as questões continuam vivendo no banco principal, com sua instituição e ano.
 * Basta acrescentar o nome aqui, exatamente como gravado em questoes.instituicao,
 * para que a prova passe a aparecer na página.
 */
const INSTITUICOES = [
  'Albert Einstein',
  'EBMSP',
  'Famema',
  'Famerp',
  'FCM-MG',
  'FCMSCSP',
  'Fac. Sírio Libanês',
  'FMABC',
  'Santa Casa',
  'São Leopoldo Mandic',
  'Unifesp',
  'UNICID',
];

/** Nome amigável quando a sigla não diz muito para quem está estudando. */
const NOMES = {
  FCMSCSP: 'Santa Casa de São Paulo',
  Famerp: 'Famerp (São José do Rio Preto)',
  Famema: 'Famema (Marília)',
  EBMSP: 'Bahiana (EBMSP)',
  'FCM-MG': 'FCM de Minas Gerais',
  FMABC: 'FMABC (Santo André)',
};

function nomeAmigavel(sigla) {
  return NOMES[sigla] || sigla;
}

module.exports = { INSTITUICOES, nomeAmigavel };
