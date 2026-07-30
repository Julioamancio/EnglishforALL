/**
 * Questões despublicadas por serem duplicata de outra já no ar.
 *
 * A URL antiga não pode virar 404: ela esteve no sitemap e pode estar indexada
 * ou salva por algum aluno. Cada slug daqui responde 301 para a versão que
 * ficou — sempre a que tem a procedência real da prova, não a cópia rotulada
 * "Simulado".
 *
 * Ao despublicar uma nova duplicata, acrescente a linha aqui no mesmo formato:
 *   'slug-que-saiu': 'slug-que-ficou',
 */
module.exports = {
  // Joy of Tech, telejornal — a cópia traduzia as alternativas do original do ITA.
  'joy-of-tech-tv-obesity-simulado-2021': 'joy-of-tech-telejornal-relacao-entre-quadros-ita-2015',

  // Maggie's Farm, Bob Dylan — enunciado e alternativas idênticos aos da Fuvest.
  'maggies-farm-bob-dylan-simulado-2023-2a-etapa':
    'maggies-farm-bob-dylan-restricao-a-liberdade-fuvest-2021',

  // Arctic Circle, "go off" — mesma questão da Unesp, entrada duas vezes.
  'tirinha-chocolate-go-off-unesp-2025-simulado-2025':
    'tirinha-arctic-circle-o-sentido-de-go-off-unesp-2025',

  // PUC Minas (Medicina) 2019 — o caderno 2 repete as cinco questões do
  // caderno 1 com as alternativas embaralhadas.
  'conectivo-as-well-as-arquitetura-bioclimatica-caderno-2-puc-minas-2019':
    'conectivo-as-well-as-arquitetura-bioclimatica-puc-minas-2019',
  'correntes-de-vento-e-conforto-termico-caderno-2-puc-minas-2019':
    'ventilacao-natural-para-resfriar-predios-puc-minas-2019',
  'referencia-de-which-em-which-houses-350-families-caderno-2-puc-minas-2019':
    'pronome-relativo-which-predio-de-apartamentos-puc-minas-2019',
  'modal-can-e-ideia-de-possibilidade-caderno-2-puc-minas-2019':
    'modal-can-possibilidade-em-you-can-do-it-puc-minas-2019',
  'economia-de-energia-e-agua-nas-cidades-caderno-2-puc-minas-2019':
    'por-que-adotar-recursos-bioclimaticos-puc-minas-2019',
};
