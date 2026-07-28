/**
 * Coleções autorais do site — conteúdo escrito para o English for ALL, separado
 * do acervo de provas (ENEM e vestibulares), que fica na coleção '' (vazia).
 *
 * Cada coleção tem uma página própria em /<caminho>, organizada por nível CEFR.
 * Para criar uma nova, basta acrescentar uma entrada aqui, uma pasta em
 * conteudo/<chave>/ com os JSON por nível, e rodar:
 *
 *   node scripts/importar-colecao.js <chave>
 */

const NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const COLECOES = {
  reading: {
    chave: 'reading',
    caminho: '/reading',
    nome: 'Reading',
    tipo: 'interpretacao',
    h1: 'Reading em inglês, do <em>A1</em> ao <em>C2</em>',
    chamada:
      'textos originais, escritos especialmente para esta coleção. Cada um traz uma questão de interpretação, cinco alternativas e gabarito comentado em português.',
    tituloBase: 'Reading em inglês do A1 ao C2 com gabarito comentado',
    descricaoBase:
      'Coleção de textos originais de reading em inglês, organizados do A1 ao C2, cada um com questão de interpretação e gabarito comentado em português.',
    tituloNivel: (n, total) => `Reading em inglês nível ${n}: ${total} textos com gabarito`,
    descricaoNivel: (n, total) =>
      `${total} textos originais de reading nível ${n} com questão de interpretação, cinco alternativas e gabarito comentado em português.`,
    substantivo: ['texto', 'textos'],
    ctaTitulo: 'Montar uma prova com estes textos',
    ctaTexto:
      'Escolha os textos por nível e gere um PDF pronto para imprimir ou um Word editável, com cabeçalho da escola e folha de gabarito.',
    niveis: {
      A1: 'Frases curtas no presente, vocabulário do dia a dia. Primeiro contato com leitura em inglês.',
      A2: 'Textos com passado simples e conectores básicos. Situações concretas e familiares.',
      B1: 'Textos de opinião e reportagem. Já exigem inferência e leitura de conectores.',
      B2: 'Argumentação com nuance e ironia leve. Nível típico das provas do ENEM.',
      C1: 'Ensaio e crítica: metáfora, ambiguidade e tese implícita.',
      C2: 'Prosa densa de proficiência. Paradoxo, mudança de registro e leitura nas entrelinhas.',
    },
  },

  'use-of-english': {
    chave: 'use-of-english',
    caminho: '/use-of-english',
    nome: 'Use of English',
    tipo: 'gramatica',
    h1: 'Use of English, do <em>A1</em> ao <em>C2</em>',
    chamada:
      'exercícios originais de gramática em contexto. Cada um traz um texto curto com lacuna, cinco alternativas e a explicação da regra em português.',
    tituloBase: 'Use of English do A1 ao C2: gramática em contexto com gabarito',
    descricaoBase:
      'Exercícios originais de Use of English em inglês, do A1 ao C2: texto curto com lacuna, cinco alternativas e explicação da regra em português.',
    tituloNivel: (n, total) => `Use of English nível ${n}: ${total} exercícios com gabarito`,
    descricaoNivel: (n, total) =>
      `${total} exercícios originais de Use of English nível ${n} com lacuna em contexto, cinco alternativas e explicação da regra em português.`,
    substantivo: ['exercício', 'exercícios'],
    ctaTitulo: 'Montar uma prova com estes exercícios',
    ctaTexto:
      'Escolha os exercícios por nível e gere um PDF pronto para imprimir ou um Word editável, com cabeçalho da escola e folha de gabarito.',
    niveis: {
      A1: 'Verbo to be, artigos, plural, presente simples e preposições de lugar.',
      A2: 'Passado simples, comparativos, futuro com going to e quantificadores.',
      B1: 'Present perfect, condicionais, voz passiva e verbos seguidos de gerúndio.',
      B2: 'Discurso indireto, condicionais mistas, phrasal verbs e colocações.',
      C1: 'Inversão, estruturas enfáticas, nuances modais e conectores formais.',
      C2: 'Registro, elipse, subjuntivo e escolhas idiomáticas de precisão.',
    },
  },
};

module.exports = { NIVEIS, COLECOES };
