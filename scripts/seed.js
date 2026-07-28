// Cria duas questões de exemplo para você ver o sistema funcionando.
// Os textos são de DEMONSTRAÇÃO e a fonte é fictícia — troque antes de publicar.
require('dotenv').config();
const db = require('../src/db');

const exemplos = [
  {
    dados: {
      slug: 'exemplo-interpretacao-b1-meio-ambiente',
      titulo: 'Exemplo: reportagem sobre reciclagem urbana',
      meta_description: 'Questão de exemplo de inglês estilo ENEM sobre reciclagem urbana, nível B1, com cinco alternativas e gabarito comentado.',
      tipo: 'interpretacao', genero_textual: 'reportagem', tema: 'meio-ambiente', nivel_cefr: 'B1',
      texto_base: `[TEXTO DE DEMONSTRAÇÃO — SUBSTITUIR POR TRECHO REAL COM FONTE]\n\nWhen the city council introduced separate bins for food waste last spring, most residents ignored them. Six months later, participation had tripled — not because of fines, but because collectors began leaving a small note on bins that were sorted correctly.\n\n"People respond to being noticed far more than to being punished," the programme coordinator said.`,
      imagem: null, imagem_alt: '',
      fonte_veiculo: 'Veículo de exemplo', fonte_url: 'https://example.com/substituir', fonte_data: '14/03/2026',
      enunciado: 'De acordo com o texto, a mudança no comportamento dos moradores foi provocada por',
      gabarito: 'B',
      comentario: '<mark>O texto atribui o aumento da adesão ao bilhete deixado nas lixeiras separadas corretamente</mark>, e não à punição.\n\nA) "fines" aparece, mas justamente negado.\nC) Os contêineres foram o ponto de partida ignorado, não a causa.\nD) Campanha publicitária não é mencionada.\nE) Não há informação sobre taxas de coleta.',
      publicada: 1,
    },
    alternativas: [
      'a aplicação de multas mais altas.',
      'o reconhecimento de quem separava corretamente.',
      'a instalação de novos contêineres.',
      'uma campanha publicitária na cidade.',
      'a redução da taxa de coleta de lixo.',
    ],
  },
  {
    dados: {
      slug: 'exemplo-gramatica-a2-tecnologia',
      titulo: 'Exemplo: aviso escolar sobre uso de celular',
      meta_description: 'Questão de exemplo de inglês estilo ENEM sobre uso de celular em sala, nível A2, com gabarito comentado dos cinco distratores.',
      tipo: 'gramatica', genero_textual: 'aviso', tema: 'tecnologia', nivel_cefr: 'A2',
      texto_base: `[TEXTO DE DEMONSTRAÇÃO — SUBSTITUIR POR TRECHO REAL COM FONTE]\n\nNOTICE TO ALL STUDENTS\n\nPhones must be switched off during lessons. If your phone rings, the teacher will keep it until the end of the day.`,
      imagem: null, imagem_alt: '',
      fonte_veiculo: 'Veículo de exemplo', fonte_url: 'https://example.com/substituir', fonte_data: '10/02/2026',
      enunciado: 'No trecho "If your phone rings, the teacher will keep it until the end of the day", a estrutura destacada expressa',
      gabarito: 'B',
      comentario: '<mark>É o first conditional: "if" + presente simples e "will" + verbo</mark>, para situações reais e possíveis.\n\nA) Não há marca de passado.\nC) Pediria second conditional.\nD) Pediria third conditional.\nE) Pediria present continuous.',
      publicada: 1,
    },
    alternativas: [
      'um fato passado e concluído.',
      'uma condição real e sua consequência.',
      'uma situação impossível no presente.',
      'um arrependimento sobre o passado.',
      'uma ação em andamento no momento.',
    ],
  },
];

let criadas = 0;
for (const ex of exemplos) {
  if (db.porSlug(ex.dados.slug, true)) continue;
  db.criar(ex.dados, ex.alternativas);
  criadas++;
}
console.log(`${criadas} questão(ões) de exemplo criada(s).`);
