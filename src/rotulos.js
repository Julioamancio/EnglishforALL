// Rótulos de exibição — os valores no banco ficam em minúsculo e sem acento
const ROTULOS_TIPO = {
  interpretacao: 'Interpretação de texto',
  gramatica: 'Gramática',
  vocabulario: 'Vocabulário',
};

const ROTULOS_GENERO = {
  'tirinha': 'Tirinha',
  'cartum': 'Cartum',
  'charge': 'Charge',
  'letra de cancao': 'Letra de canção',
  'artigo': 'Artigo',
  'artigo de divulgacao': 'Artigo de divulgação',
  'artigo de divulgacao cientifica': 'Artigo de divulgação científica',
  'artigo de opiniao': 'Artigo de opinião',
  'noticia': 'Notícia',
  'reportagem': 'Reportagem',
  'poema': 'Poema',
  'propaganda': 'Propaganda',
  'cartaz': 'Cartaz',
  'infografico': 'Infográfico',
  'historia em quadrinhos': 'História em quadrinhos',
  'roteiro de cinema': 'Roteiro de cinema',
  'texto institucional': 'Texto institucional',
  'carta do leitor': 'Carta do leitor',
  'conto': 'Conto',
  'discurso': 'Discurso',
  'pintura': 'Pintura',
  'resenha': 'Resenha',
};

function rotuloGenero(g) {
  if (!g) return g;
  return ROTULOS_GENERO[g] || g.charAt(0).toUpperCase() + g.slice(1);
}

module.exports = { ROTULOS_TIPO, ROTULOS_GENERO, rotuloGenero };
