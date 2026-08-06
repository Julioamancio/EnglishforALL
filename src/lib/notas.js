/**
 * Nota do bimestre a partir dos simulados semanais.
 *
 * A regra, definida pelo professor em 06/08/2026:
 *
 *   - acontece um simulado por semana, da primeira semana da temporada até a
 *     semana de 20 de novembro de 2026 — as aulas terminam no dia 30, mas a
 *     última semana de simulado é a do dia 20;
 *   - o aluno é obrigado a fazer **70% deles**;
 *   - a nota é a média dos simulados, de 0 a 10;
 *   - **quem não atingir o mínimo fica com 0**, por melhor que tenha ido nos
 *     simulados que fez.
 *
 * Duas coisas que este módulo trata com cuidado, porque é nota de aluno:
 *
 * 1. O mínimo se calcula com aritmética inteira, `ceil(total * 70 / 100)`. Isso
 *    é precaução, não conserto de defeito: eu havia escrito aqui que
 *    `ceil(total * 0.7)` quebraria por arredondamento binário, fui conferir e é
 *    falso — `10 * 0.7` dá exatamente 7, e para todo total de 1 a 500 as duas
 *    formas concordam. A inteira fica porque é exata por construção e dispensa
 *    quem ler no futuro de refazer essa verificação; não porque a outra falhe.
 * 2. Só contam simulados **concluídos** e **dentro da temporada**. Um simulado
 *    começado e abandonado não é simulado feito, e um de outra temporada não
 *    pertence a esta nota.
 */
const { db } = require('../db');

/**
 * Segunda-feira da primeira semana com simulado (2026-W31).
 *
 * É a semana do primeiro simulado que existe no banco, e **não** o começo do
 * bimestre letivo. Perguntei ao professor em 06/08/2026 se o início deveria
 * recuar caso as aulas tivessem começado antes, e a resposta foi que não
 * importa: a contagem vale das semanas em que houve simulado para fazer.
 * Recuar esta data aumentaria o total e, com ele, o mínimo — cobrando do aluno
 * semanas em que não havia o que fazer. Não mexer sem nova decisão dele.
 */
const PRIMEIRA_SEGUNDA = '2026-07-27';
/** "A última semana será a semana do dia 20 de novembro." */
const ULTIMA_REFERENCIA = '2026-11-20';
/** As aulas acabam no dia 30, mas a semana de 30/11 não tem simulado. */
const FIM_DAS_AULAS = '2026-11-30';
/** Percentual de presença exigido. */
const EXIGENCIA = 70;

/** Semana ISO de uma data, no mesmo formato que a tabela `simulados` guarda. */
function semanaISO(data) {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // quinta define o ano ISO
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((d - inicio) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}

/** Todas as semanas da temporada, em ordem. */
function semanas() {
  const lista = [];
  const fim = new Date(ULTIMA_REFERENCIA + 'T00:00:00Z');
  for (let d = new Date(PRIMEIRA_SEGUNDA + 'T00:00:00Z'); d <= fim; d.setUTCDate(d.getUTCDate() + 7)) {
    lista.push(semanaISO(d));
  }
  return lista;
}

const SEMANAS = semanas();
const TOTAL = SEMANAS.length;
const MINIMO = Math.ceil((TOTAL * EXIGENCIA) / 100);

const CALENDARIO = {
  primeira: SEMANAS[0],
  ultima: SEMANAS[TOTAL - 1],
  semanas: SEMANAS,
  total: TOTAL,
  minimo: MINIMO,
  exigencia: EXIGENCIA,
  fimDasAulas: FIM_DAS_AULAS,
  ultimaReferencia: ULTIMA_REFERENCIA,
};

/** A temporada já acabou? */
function encerrada(agora = new Date()) {
  return semanaISO(agora) > CALENDARIO.ultima;
}

/**
 * Nota de todos os alunos, numa consulta só.
 *
 * Devolve, por aluno: quantos simulados concluiu dentro da temporada, a média,
 * a nota provisória (o desempenho até aqui), a nota final (a provisória, ou 0
 * se não bateu o mínimo) e quantas semanas ainda restam para ele se salvar.
 */
function todos(agora = new Date()) {
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
  const acabou = semanaDeHoje > CALENDARIO.ultima;

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
    };
  });
}

/** A mesma conta, para um aluno só. */
function doAluno(usuarioId, agora = new Date()) {
  return todos(agora).find((a) => a.id === usuarioId) || null;
}

module.exports = { CALENDARIO, semanaISO, encerrada, todos, doAluno };
