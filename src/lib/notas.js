/**
 * Nota das etapas a partir dos simulados semanais.
 *
 * A regra, definida pelo professor:
 *
 *   - acontece um simulado por semana;
 *   - o aluno é obrigado a fazer **70%** dos simulados **da etapa**;
 *   - a nota é a média dos simulados que ele fez, de 0 a 10;
 *   - **quem não atingir o mínimo da etapa fica com 0**, por melhor que tenha
 *     ido nos simulados que fez.
 *
 * O ano tem três etapas, cada uma com a sua nota. Até 06/08/2026 havia aqui uma
 * temporada só, de julho a novembro; nessa data o professor passou o calendário
 * escolar de verdade, e ele não é uniforme:
 *
 *   1ª  02/03 a 03/05   DESCONSIDERADA — o banco de simulados não existia
 *   2ª  04/05 a 31/08   RECORTADA — a etapa já ia pela metade quando o primeiro
 *                       simulado saiu; contam as semanas de 03/08 em diante, e
 *                       os 70% são calculados sobre essas
 *   3ª  01/09 a 30/11   INTEIRA, do jeito padrão
 *
 * O ano que vem começa do início e não precisa de nada disto. Acrescentar as
 * três etapas de 2027 em ETAPAS — sem `desconsiderada` e sem `contaDe` — faz
 * tudo funcionar sozinho. É por isso que o recorte é **campo de dados** e não
 * um `if` no meio da conta: exceção escrita como código vira dívida; escrita
 * como dado, some sozinha quando deixa de existir.
 *
 * ------------------------------------------------------------------------
 *
 * Três coisas que este módulo trata com cuidado, porque é nota de aluno:
 *
 * 1. O mínimo se calcula com aritmética inteira, `ceil(total * 70 / 100)`. Isso
 *    é precaução, não conserto de defeito: eu havia escrito aqui que
 *    `ceil(total * 0.7)` quebraria por arredondamento binário, fui conferir e é
 *    falso — `10 * 0.7` dá exatamente 7, e para todo total de 1 a 500 as duas
 *    formas concordam. A inteira fica porque é exata por construção e dispensa
 *    quem ler no futuro de refazer essa verificação; não porque a outra falhe.
 *
 * 2. Só contam simulados **concluídos** e **dentro das semanas da etapa**. Um
 *    simulado começado e abandonado não é simulado feito.
 *
 * 3. Uma semana pertence à etapa da sua **quinta-feira**. É a mesma convenção
 *    que define o ano de uma semana ISO, e resolve sozinha o caso que aparece
 *    neste calendário: 31/08/2026 cai numa segunda, e a semana dela é quase
 *    toda setembro. Pela quinta, ela é da 3ª etapa — que é onde ela pertence de
 *    fato. Sem essa regra, a mesma semana cairia em duas etapas ou em nenhuma,
 *    e alguém seria cobrado duas vezes pelo mesmo simulado.
 */
const { db } = require('../db');

/** Percentual de presença exigido. */
const EXIGENCIA = 70;

/**
 * O calendário escolar. Acrescentar etapa aqui é a única coisa necessária para
 * um ano novo funcionar.
 *
 *   desconsiderada  texto do porquê; a etapa não gera nota e não cobra nada
 *   contaDe         recorta o início: só semanas a partir desta data contam
 *   contaAte        recorta o fim; existe para o caso de a última semana da
 *                   etapa não ter simulado
 */
const ETAPAS = [
  {
    id: '2026-1',
    nome: '1ª etapa',
    ano: 2026,
    inicio: '2026-03-02',
    fim: '2026-05-03',
    desconsiderada:
      'O banco de simulados não existia nesta etapa — o primeiro simulado é de 03/08/2026. '
      + 'Ela não gera nota e não cobra nada de ninguém.',
  },
  {
    id: '2026-2',
    nome: '2ª etapa',
    ano: 2026,
    inicio: '2026-05-04',
    fim: '2026-08-31',
    // Decisão do professor em 06/08/2026: conta de 03/08, e os 70% valem sobre
    // as semanas que sobraram — não sobre a etapa inteira, em que não havia o
    // que fazer. Cobrar semanas sem simulado seria cobrar o impossível.
    contaDe: '2026-08-03',
    recorte:
      'A etapa começou em 04/05, mas o primeiro simulado é de 03/08. Contam as semanas '
      + 'de 03/08 em diante, e a exigência de 70% é calculada sobre elas.',
  },
  {
    id: '2026-3',
    nome: '3ª etapa',
    ano: 2026,
    inicio: '2026-09-01',
    fim: '2026-11-30',
  },
];

/* -------------------------------------------------------------- semanas ISO */

/** Semana ISO de uma data, no mesmo formato que a tabela `simulados` guarda. */
function semanaISO(data) {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // quinta define o ano ISO
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((d - inicio) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}

const emDia = (s) => new Date(s + 'T00:00:00Z');

/** A quinta-feira da semana em que a data cai. É ela que decide a etapa. */
function quintaDa(data) {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d;
}

/** As semanas que contam para uma etapa, em ordem. */
function semanasDa(etapa) {
  if (etapa.desconsiderada) return [];

  const inicio = emDia(etapa.inicio);
  const fim = emDia(etapa.fim);
  const de = etapa.contaDe ? emDia(etapa.contaDe) : inicio;
  const ate = etapa.contaAte ? emDia(etapa.contaAte) : fim;

  const lista = [];
  // parte da segunda-feira da semana da data inicial e anda de sete em sete
  const d = new Date(de);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));

  for (; d <= fim; d.setUTCDate(d.getUTCDate() + 7)) {
    const quinta = quintaDa(d);
    if (quinta >= inicio && quinta <= fim && quinta >= de && quinta <= ate) {
      lista.push(semanaISO(d));
    }
  }
  return lista;
}

/** As etapas com o calendário já calculado. É o que o resto do sistema usa. */
const CALENDARIO = ETAPAS.map((e) => {
  const semanas = semanasDa(e);
  const total = semanas.length;
  return {
    ...e,
    semanas,
    total,
    minimo: Math.ceil((total * EXIGENCIA) / 100),
    exigencia: EXIGENCIA,
    primeira: semanas[0] || null,
    ultima: semanas[total - 1] || null,
    conta: !e.desconsiderada && total > 0,
  };
});

const porId = new Map(CALENDARIO.map((e) => [e.id, e]));

/** Todas as semanas que contam no ano, de todas as etapas. */
const TODAS_AS_SEMANAS = CALENDARIO.flatMap((e) => e.semanas);

/** A etapa a que uma data pertence; null se a data cai fora de todas. */
function etapaDe(agora = new Date()) {
  const q = quintaDa(agora);
  return CALENDARIO.find((e) => q >= emDia(e.inicio) && q <= emDia(e.fim)) || null;
}

/**
 * A etapa que a tela deve abrir por padrão.
 *
 * Fora do período letivo cai na última que contou, e não em nenhuma: quem abre
 * o site em janeiro quer ver como terminou o ano, não uma tela vazia.
 */
function etapaAtual(agora = new Date()) {
  const dela = etapaDe(agora);
  if (dela && dela.conta) return dela;
  const q = quintaDa(agora);
  const passadas = CALENDARIO.filter((e) => e.conta && emDia(e.fim) < q);
  if (passadas.length) return passadas[passadas.length - 1];
  return CALENDARIO.find((e) => e.conta) || CALENDARIO[0];
}

/** A etapa já acabou? */
function encerrada(etapa, agora = new Date()) {
  return quintaDa(agora) > emDia(etapa.fim);
}

/* ------------------------------------------------------- semanas seguidas */

/**
 * Semanas seguidas com simulado concluído: a atual, a melhor, e o que está em
 * jogo. Contadas dentro de uma lista de semanas — a de uma etapa, ou a do ano.
 *
 * O cuidado que decide se isto motiva ou desanima está em **quando a semana
 * corrente conta contra**. Quem fez três seguidas e abre o site na segunda
 * ainda tem até domingo; dizer "sequência perdida" ali seria falso, e falso no
 * pior momento possível — bem antes da hora em que a pessoa ainda podia agir.
 * Por isso a contagem começa na semana de hoje quando ela já foi feita, e na
 * anterior quando não. A semana só conta contra depois de fechar.
 *
 * Essa cortesia vale uma vez só, e apenas para a semana aberta: a busca para no
 * primeiro buraco anterior. Semana vazia com a etapa já encerrada também conta
 * contra, porque ali não há mais o que esperar.
 *
 * `melhor` existe para que perder a sequência não apague o que a pessoa fez.
 * Zerar o único número visível transforma um tropeço em recomeço do zero, que é
 * exatamente o momento em que aluno desiste.
 */
function corridaDeSemanas(feitas, semanaDeHoje, semanas) {
  const SEM = semanas || TODAS_AS_SEMANAS;
  const TOTAL = SEM.length;
  const ultima = TOTAL ? SEM[TOTAL - 1] : null;

  const hoje = SEM.indexOf(semanaDeHoje);
  const acabou = ultima !== null && semanaDeHoje > ultima;
  const limite = hoje !== -1 ? hoje : acabou ? TOTAL - 1 : -1;

  let atual = 0;
  if (limite >= 0) {
    let i = limite;
    // a cortesia da semana ainda aberta — só existe com a etapa correndo
    if (hoje !== -1 && !feitas.has(SEM[i])) i -= 1;
    for (; i >= 0 && feitas.has(SEM[i]); i -= 1) atual += 1;
  }

  let melhor = 0;
  let corrida = 0;
  for (const semana of SEM) {
    if (feitas.has(semana)) {
      corrida += 1;
      if (corrida > melhor) melhor = corrida;
    } else {
      corrida = 0;
    }
  }

  const correndo = hoje !== -1;
  const fezEstaSemana = correndo && feitas.has(semanaDeHoje);
  return {
    atual,
    melhor,
    fezEstaSemana,
    emRisco: correndo && atual > 0 && !fezEstaSemana,
    noRecorde: atual > 0 && atual === melhor,
  };
}

/* ------------------------------------------------------------------ notas */

/** Aluno de uma etapa desconsiderada: aparece, e não deve nada. */
function semCobranca(u, etapa) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    instituicao: u.instituicao,
    serie: u.serie,
    etapa,
    concluidos: 0,
    acertos: 0,
    questoes: 0,
    media: null,
    notaProvisoria: null,
    notaFinal: null,
    atingiuMinimo: true,
    faltam: 0,
    semanasRestantes: 0,
    aindaDaTempo: true,
    temporadaEncerrada: true,
    desconsiderada: true,
    semanasSeguidas: { atual: 0, melhor: 0, fezEstaSemana: false, emRisco: false, noRecorde: false },
  };
}

/**
 * Nota de todos os alunos numa etapa, em duas consultas.
 *
 * Devolve, por aluno: quantos simulados concluiu dentro da etapa, a média, a
 * nota provisória (o desempenho até aqui), a nota final (a provisória, ou 0 se
 * não bateu o mínimo) e quantas semanas ainda restam para ele se salvar.
 */
function todos(agora = new Date(), etapaId) {
  const etapa = (etapaId && porId.get(etapaId)) || etapaAtual(agora);

  if (!etapa.conta) {
    return db
      .prepare('SELECT id, nome, email, instituicao, serie FROM usuarios ORDER BY nome')
      .all()
      .map((u) => semCobranca(u, etapa));
  }

  const SEMANAS = etapa.semanas;
  const marcas = SEMANAS.map(() => '?').join(',');

  const linhas = db
    .prepare(
      `SELECT u.id, u.nome, u.email, u.instituicao, u.serie,
              COUNT(s.id) AS concluidos,
              COALESCE(SUM(s.acertos), 0) AS acertos,
              COALESCE(SUM(s.total), 0)   AS questoes,
              AVG(s.acertos * 100.0 / s.total) AS media
         FROM usuarios u
         LEFT JOIN simulados s
           ON s.usuario_id = u.id
          AND s.concluido_em IS NOT NULL
          AND s.semana IN (${marcas})
        GROUP BY u.id
        ORDER BY u.nome`
    )
    .all(...SEMANAS);

  /* Semanas em que o aluno ainda pode fazer simulado: as que faltam da atual em
     diante e em que ele ainda não fez. Sem isto, a tela diria "faltam 11" a três
     semanas do fim, o que é verdade e ao mesmo tempo esconde o essencial — que
     já não há como. */
  const feitas = new Map();
  for (const r of db
    .prepare(
      `SELECT usuario_id, semana FROM simulados
        WHERE concluido_em IS NOT NULL AND semana IN (${marcas})`
    )
    .all(...SEMANAS)) {
    if (!feitas.has(r.usuario_id)) feitas.set(r.usuario_id, new Set());
    feitas.get(r.usuario_id).add(r.semana);
  }

  const semanaDeHoje = semanaISO(agora);
  const acabou = encerrada(etapa, agora);
  const MINIMO = etapa.minimo;

  return linhas.map((r) => {
    const media = r.media == null ? null : Math.round(r.media);
    // a nota é a média de 0 a 100 trazida para a escala de 0 a 10
    const provisoria = media == null ? null : Math.round((media / 10) * 10) / 10;
    const atingiu = r.concluidos >= MINIMO;
    const jaFeitas = feitas.get(r.id) || new Set();
    const restantes = SEMANAS.filter((s) => s >= semanaDeHoje && !jaFeitas.has(s)).length;
    const faltam = Math.max(0, MINIMO - r.concluidos);
    return {
      id: r.id,
      nome: r.nome,
      email: r.email,
      instituicao: r.instituicao,
      serie: r.serie,
      etapa,
      concluidos: r.concluidos,
      acertos: r.acertos,
      questoes: r.questoes,
      media,
      notaProvisoria: provisoria,
      // A regra do professor: sem o mínimo, a nota é 0, tenha ido bem ou não.
      notaFinal: atingiu ? (provisoria == null ? 0 : provisoria) : 0,
      atingiuMinimo: atingiu,
      faltam,
      semanasRestantes: restantes,
      // quando `faltam` passa das oportunidades que sobraram, a conta já fechou
      aindaDaTempo: faltam <= restantes,
      temporadaEncerrada: acabou,
      desconsiderada: false,
      semanasSeguidas: corridaDeSemanas(jaFeitas, semanaDeHoje, SEMANAS),
    };
  });
}

/** A mesma conta, para um aluno só. */
function doAluno(usuarioId, agora = new Date(), etapaId) {
  return todos(agora, etapaId).find((a) => a.id === usuarioId) || null;
}

/**
 * As três etapas de um aluno, na ordem do ano — é o que as abas mostram.
 *
 * `naoComecou` separa a etapa que ainda vem da etapa em que o aluno falhou. As
 * duas têm zero simulados feitos, e dizer a mesma coisa das duas seria acusar
 * alguém de não ter feito o que ainda não existe.
 */
function doAlunoEmTodas(usuarioId, agora = new Date()) {
  const atual = etapaAtual(agora);
  const q = quintaDa(agora);
  return CALENDARIO.map((e) => {
    const n = doAluno(usuarioId, agora, e.id);
    return {
      ...(n || {}),
      etapa: e,
      ehAtual: e.id === atual.id,
      naoComecou: e.conta && q < emDia(e.inicio),
    };
  });
}

/** O mesmo para a turma inteira, usado pelo painel. */
function turmaEmTodas(agora = new Date()) {
  return CALENDARIO.map((e) => ({ etapa: e, alunos: todos(agora, e.id) }));
}

module.exports = {
  CALENDARIO,
  ETAPAS: CALENDARIO,
  TODAS_AS_SEMANAS,
  EXIGENCIA,
  semanaISO,
  etapaDe,
  etapaAtual,
  encerrada,
  todos,
  doAluno,
  doAlunoEmTodas,
  turmaEmTodas,
  corridaDeSemanas,
};
