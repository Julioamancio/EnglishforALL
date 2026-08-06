/**
 * Qual personagem aparece ao fim do simulado, e o que ele diz.
 *
 * Os quatro já existem na área de gramática, cada um com uma função — Sofia
 * explica, Maya é a aluna, Leo dá os macetes, Max faz os mini-testes. No
 * simulado eles não apareciam. Um número não gera reação; alguém reagindo ao
 * número, sim.
 *
 * A REGRA QUE ORGANIZA TUDO: o personagem reage ao esforço e à evolução, nunca
 * ao fracasso.
 *
 * Um personagem "se dando mal" com quem tirou 1 de 5 é engraçado para quem
 * tirou 5 e humilhante para quem tirou 1 — e quem tirou 1 é exatamente quem se
 * está tentando não perder. Por isso não há reação de decepção em lugar nenhum
 * deste arquivo, e a comparação, quando existe, é do aluno com ele mesmo na
 * semana passada. Nunca com a turma: `desempenho.js` já decidiu isso.
 *
 * A ordem das causas também não é acaso. "Melhorou" ganha de quase tudo porque
 * é a única conquista alcançável em qualquer nível: subir de 1 para 2 é a mesma
 * vitória que subir de 3 para 4, e é a que mais precisa ser dita em voz alta.
 *
 * A nota aparece nesta tela desde sempre — o que espera 24 horas é a correção
 * comentada. Então reagir ao resultado aqui não adianta nada a ninguém.
 */
const { db } = require('../db');
const notas = require('./notas');

/** O simulado concluído imediatamente anterior a este, do mesmo aluno. */
function anterior(usuarioId, simulado) {
  return db
    .prepare(
      `SELECT acertos, total, semana FROM simulados
        WHERE usuario_id = ? AND concluido_em IS NOT NULL AND semana < ?
        ORDER BY semana DESC LIMIT 1`
    )
    .get(usuarioId, simulado.semana);
}

function numeros(usuarioId, simulado) {
  // a etapa a que ESTE simulado pertence, e não a de hoje: quem abre um
  // resultado antigo tem de ler os números daquela etapa
  const etapa = notas.CALENDARIO.find((e) => e.semanas.includes(simulado.semana))
    || notas.etapaAtual();
  const semanas = etapa.semanas;
  const marcas = semanas.map(() => '?').join(',');
  const feitos = db
    .prepare(
      `SELECT semana, acertos, total FROM simulados
        WHERE usuario_id = ? AND concluido_em IS NOT NULL AND semana IN (${marcas})`
    )
    .all(usuarioId, ...semanas);

  return {
    etapa,
    concluidos: feitos.length,
    seguidas: notas.corridaDeSemanas(
      new Set(feitos.map((f) => f.semana)),
      notas.semanaISO(new Date()),
      semanas
    ),
    antes: anterior(usuarioId, simulado),
  };
}

/**
 * Devolve { persona, titulo, fala, atalho } para a tela de conclusão.
 *
 * `atalho` é sempre uma ação concreta, e não um elogio solto: a tela em que o
 * aluno mais tem energia é esta, logo depois de terminar.
 */
function daConclusao(usuarioId, simulado) {
  const n = numeros(usuarioId, simulado);
  const acertos = simulado.acertos;
  const total = simulado.total;
  const gabaritou = total > 0 && acertos === total;
  const subiu = n.antes && acertos > n.antes.acertos;
  const primeiro = n.concluidos <= 1;
  const seq = n.seguidas.atual;
  const min = n.etapa.minimo;
  const faltam = Math.max(0, min - n.concluidos);

  const rumoAoMinimo = faltam > 0
    ? { texto: `Faltam ${faltam} para a presença estar garantida`, href: '/simulado/desempenho' }
    : { texto: `Ver a sua nota da ${n.etapa.nome}`, href: '/simulado/desempenho' };

  if (gabaritou) {
    return {
      persona: 'maya',
      titulo: 'Cinco de cinco!',
      fala: subiu
        ? `Você acertou tudo — e na semana passada tinham sido ${n.antes.acertos}. Isso é subir e chegar no topo na mesma semana.`
        : 'Você acertou todas as cinco. Não tem nota melhor que essa.',
      atalho: rumoAoMinimo,
    };
  }

  if (subiu) {
    return {
      persona: 'maya',
      titulo: `Você melhorou: ${n.antes.acertos} para ${acertos}`,
      fala: 'Comparado com o seu próprio simulado da semana passada. É o único placar que interessa aqui.',
      atalho: rumoAoMinimo,
    };
  }

  if (primeiro) {
    return {
      persona: 'sofia',
      titulo: 'Primeiro simulado concluído',
      fala: `Este conta como 1 dos ${min} obrigatórios da ${n.etapa.nome}. A partir daqui é um por semana — e o que pesa na nota é aparecer, não acertar tudo.`,
      atalho: rumoAoMinimo,
    };
  }

  if (seq >= 2) {
    return {
      persona: 'max',
      titulo: `${seq} semanas seguidas`,
      fala: `Você não deixou passar nenhuma das últimas ${seq}. É exatamente esse hábito que a nota da ${n.etapa.nome} cobra.`,
      atalho: rumoAoMinimo,
    };
  }

  if (acertos >= total - 1) {
    return {
      persona: 'leo',
      titulo: 'Perto do gabarito',
      fala: `${acertos} de ${total}. Quando a correção abrir, vale olhar a que escapou — costuma ser uma pegadinha só.`,
      atalho: rumoAoMinimo,
    };
  }

  /* O caso mais delicado, e por isso o mais específico.
   *
   * Aqui não há "que pena" nem consolo vazio. Há o que a regra do bimestre de
   * fato diz — este simulado já contou como presença — e uma coisa para fazer,
   * porque é refazendo o que se errou que a nota da semana seguinte muda. */
  return {
    persona: 'leo',
    titulo: 'Este já está contado',
    fala: `Fez ${acertos} de ${total}, e o simulado entrou na sua contagem do mesmo jeito: a exigência da ${n.etapa.nome} é de presença. Quando a correção abrir, refazer o que escapou é o que muda o resultado da próxima.`,
    atalho: { texto: 'Questões que eu errei', href: '/simulado/erros' },
  };
}

module.exports = { daConclusao };
