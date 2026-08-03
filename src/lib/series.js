/**
 * As séries que aparecem no cadastro, do 6º ano à 3ª série do médio.
 *
 * A nomenclatura segue a LDB e é a que as escolas usam no boletim: o
 * fundamental conta em **anos** (6º ao 9º) e o médio em **séries** (1ª a 3ª).
 * Escrever "1º ano do médio" é comum na fala, mas no documento escolar a 1ª
 * série do médio é o 10º ano — misturar as duas contagens confunde.
 *
 * O valor gravado é curto e estável ("6", "EM1"), e o rótulo é o que se lê. Assim
 * mudar o texto na tela não invalida o que já está no banco.
 */
const SERIES = [
  { valor: '6', rotulo: '6º ano', etapa: 'Ensino Fundamental' },
  { valor: '7', rotulo: '7º ano', etapa: 'Ensino Fundamental' },
  { valor: '8', rotulo: '8º ano', etapa: 'Ensino Fundamental' },
  { valor: '9', rotulo: '9º ano', etapa: 'Ensino Fundamental' },
  { valor: 'EM1', rotulo: '1ª série', etapa: 'Ensino Médio' },
  { valor: 'EM2', rotulo: '2ª série', etapa: 'Ensino Médio' },
  { valor: 'EM3', rotulo: '3ª série', etapa: 'Ensino Médio' },
];

const VALORES = SERIES.map((s) => s.valor);

/** Agrupado por etapa, para o <optgroup> do formulário. */
function porEtapa() {
  const etapas = [];
  SERIES.forEach((s) => {
    let e = etapas.find((x) => x.etapa === s.etapa);
    if (!e) { e = { etapa: s.etapa, series: [] }; etapas.push(e); }
    e.series.push(s);
  });
  return etapas;
}

function rotulo(valor) {
  const s = SERIES.find((x) => x.valor === valor);
  if (!s) return valor || '';
  // na lista do painel o rótulo sozinho é ambíguo: "1ª série" de quê?
  return s.etapa === 'Ensino Médio' ? `${s.rotulo} do médio` : s.rotulo;
}

function valida(valor) {
  return VALORES.includes(String(valor || '').trim());
}

/** Ordem escolar, para as turmas saírem na sequência certa no painel. */
function ordem(valor) {
  const i = VALORES.indexOf(valor);
  return i < 0 ? 99 : i;
}

module.exports = { SERIES, VALORES, porEtapa, rotulo, valida, ordem };
