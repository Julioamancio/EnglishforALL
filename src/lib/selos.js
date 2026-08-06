/**
 * Selos por marcos do simulado oficial.
 *
 * Três decisões que valem mais que a lista em si:
 *
 * 1. **Nenhum selo se perde.** Todo critério aqui é monotônico: usa a MELHOR
 *    sequência e não a atual, o total acumulado e não o do mês. Um selo que
 *    some depois de conquistado é punição vestida de jogo, e chega justamente
 *    a quem tropeçou — que é quem já estava mais perto de largar.
 *
 * 2. **Cinco de hábito para três de acerto.** Em 06/08/2026 a turma acertava
 *    68% e 27 dos 103 alunos não tinham feito nenhum simulado. Uma lista feita
 *    de acerto deixaria de fora exatamente quem precisa de motivo para voltar.
 *    A nota deste bimestre é de presença, e os selos seguem a nota.
 *
 * 3. **Nada premia velocidade.** Um selo de "terminou em menos de X minutos"
 *    pagaria por chutar, e o cronômetro da tela existe para a pessoa saber
 *    quanto gastou, não para competir.
 *
 * Não há tabela de selos, e é de propósito: tudo se calcula do que já está em
 * `simulados`. Sem gravação não há o que sair de sincronia, nada para migrar, e
 * corrigir um critério corrige o passado junto. O preço é não saber a data em
 * que cada um foi conquistado — barato, porque a tela não mostra data.
 */
const { db } = require('../db');
const notas = require('./notas');

/**
 * A lista. `alvo` alimenta a barrinha de progresso do selo ainda fechado: saber
 * que faltam dois é convite; um cadeado sem número é só recusa.
 */
const SELOS = [
  // ------------------------------------------------------------- hábito
  {
    chave: 'primeiro',
    emoji: '🎯',
    nome: 'Primeiro simulado',
    descricao: 'Concluir o primeiro simulado oficial.',
    grupo: 'hábito',
    alvo: 1,
    valor: (d) => d.concluidos,
  },
  {
    chave: 'duas-seguidas',
    emoji: '🔥',
    nome: 'Duas seguidas',
    descricao: 'Fazer o simulado em duas semanas seguidas.',
    grupo: 'hábito',
    alvo: 2,
    valor: (d) => d.melhorSequencia,
  },
  {
    chave: 'mes-inteiro',
    emoji: '📅',
    nome: 'Mês inteiro',
    descricao: 'Quatro semanas seguidas sem deixar passar nenhuma.',
    grupo: 'hábito',
    alvo: 4,
    valor: (d) => d.melhorSequencia,
  },
  {
    chave: 'meia-jornada',
    emoji: '🧗',
    nome: 'Meio caminho',
    descricao: 'Concluir seis simulados oficiais no ano.',
    grupo: 'hábito',
    // Número do ANO, e não metade do mínimo da etapa: o mínimo muda de etapa
    // para etapa (3 na 2ª, 10 na 3ª), e um alvo que sobe quando a etapa vira
    // tiraria do aluno um selo que ele já tinha. Nenhum selo se perde.
    alvo: 6,
    valor: (d) => d.concluidos,
  },
  {
    chave: 'presenca-garantida',
    emoji: '🛡️',
    nome: 'Presença garantida',
    descricao: 'Cumprir o mínimo exigido em uma etapa inteira — a nota daquela etapa deixa de ser 0.',
    grupo: 'hábito',
    // "em ALGUMA etapa", e não "na etapa atual": assim o selo continua valendo
    // depois que a etapa vira. O que foi conquistado fica conquistado.
    alvo: 1,
    valor: (d) => d.etapasGarantidas,
  },
  // -------------------------------------------------------------- acerto
  {
    chave: 'virada',
    emoji: '📈',
    nome: 'Melhorei',
    descricao: 'Acertar mais em um simulado do que no anterior.',
    grupo: 'acerto',
    alvo: 1,
    valor: (d) => (d.melhorou ? 1 : 0),
  },
  {
    chave: 'gabarito',
    emoji: '⭐',
    nome: 'Cinco de cinco',
    descricao: 'Acertar todas as questões de um simulado.',
    grupo: 'acerto',
    alvo: 1,
    valor: (d) => d.gabaritos,
  },
  {
    chave: 'tres-gabaritos',
    emoji: '🏅',
    nome: 'Gabaritou três vezes',
    descricao: 'Fazer o simulado inteiro certo em três semanas diferentes.',
    grupo: 'acerto',
    alvo: 3,
    valor: (d) => d.gabaritos,
  },
];

const resolve = (x, ...args) => (typeof x === 'function' ? x(...args) : x);

/**
 * Os números de que os critérios precisam, em duas consultas.
 *
 * Contados sobre o ANO inteiro — todas as semanas de todas as etapas que
 * contam. Selo é troféu do caminho, e o caminho não recomeça quando a etapa
 * vira. A nota é que é por etapa.
 */
function dadosDoAluno(usuarioId) {
  const semanas = notas.TODAS_AS_SEMANAS;
  const marcas = semanas.map(() => '?').join(',');

  const feitos = db
    .prepare(
      `SELECT semana, acertos, total FROM simulados
        WHERE usuario_id = ? AND concluido_em IS NOT NULL AND semana IN (${marcas})
        ORDER BY semana`
    )
    .all(usuarioId, ...semanas);

  const feitasSet = new Set(feitos.map((f) => f.semana));

  /* "Melhorou" olha simulados CONSECUTIVOS na ordem das semanas. Comparar com o
     melhor de sempre faria o selo ficar mais difícil quanto melhor o aluno vai,
     que é o contrário do que ele deveria incentivar. */
  let melhorou = false;
  for (let i = 1; i < feitos.length; i += 1) {
    if (feitos[i].acertos > feitos[i - 1].acertos) {
      melhorou = true;
      break;
    }
  }

  /* Em quantas etapas o aluno já cumpriu o mínimo. Uma vez cumprido, cumprido
     fica: a etapa acabou e o número dela não muda mais. */
  const etapasGarantidas = notas.CALENDARIO.filter(
    (e) => e.conta && e.semanas.filter((w) => feitasSet.has(w)).length >= e.minimo
  ).length;

  return {
    concluidos: feitos.length,
    gabaritos: feitos.filter((f) => f.total > 0 && f.acertos === f.total).length,
    melhorou,
    etapasGarantidas,
    // a MELHOR sequência, nunca a atual: é o que impede o selo de sumir
    melhorSequencia: notas.corridaDeSemanas(feitasSet, notas.semanaISO(new Date()), semanas).melhor,
  };
}

/** Os selos de um aluno, conquistados e não conquistados, na ordem da lista. */
function doAluno(usuarioId) {
  const d = dadosDoAluno(usuarioId);

  const lista = SELOS.map((s) => {
    const alvo = resolve(s.alvo);
    const valor = s.valor(d);
    return {
      chave: s.chave,
      emoji: s.emoji,
      nome: s.nome,
      descricao: resolve(s.descricao),
      grupo: s.grupo,
      conquistado: valor >= alvo,
      // quanto falta, limitado ao alvo: "7 de 6" não quer dizer nada
      feito: Math.min(valor, alvo),
      alvo,
    };
  });

  return {
    lista,
    conquistados: lista.filter((s) => s.conquistado).length,
    total: lista.length,
    // o próximo a cair, para a tela poder apontar um alvo só em vez de oito
    proximo: lista.find((s) => !s.conquistado) || null,
  };
}

module.exports = { SELOS, doAluno };
