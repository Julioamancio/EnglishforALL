/**
 * Rendimento por turma — a visão que o professor precisa para dar aula.
 *
 * O `desempenho.js` responde "como vai este aluno". Aqui a pergunta é outra:
 * "como vai esta turma, e quem dentro dela precisa de atenção". Por isso as
 * contas são de participação, distribuição e comparação, não só de média — uma
 * turma com média 60% pode ser toda de alunos em 60% ou metade em 90% e metade
 * em 30%, e essas duas turmas pedem aulas diferentes.
 *
 * Só entram simulados oficiais concluídos, como no resto do sistema.
 */
const { db } = require('../db');
const series = require('./series');
const { ROTULOS_TIPO } = require('../rotulos');

/** Chave de turma: escola + série. */
function chave(instituicao, serie) {
  return `${instituicao || ''}|${serie || ''}`;
}

/** As turmas existentes, com participação e média. */
function turmas() {
  const linhas = db
    .prepare(
      `SELECT u.instituicao, u.serie,
              COUNT(DISTINCT u.id) alunos,
              COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN u.id END) participantes,
              COUNT(s.id) simulados,
              COALESCE(SUM(s.acertos), 0) acertos,
              COALESCE(SUM(s.total), 0) questoes
         FROM usuarios u
         LEFT JOIN simulados s ON s.usuario_id = u.id AND s.concluido_em IS NOT NULL
        WHERE TRIM(COALESCE(u.serie,'')) <> ''
        GROUP BY u.instituicao, u.serie`
    )
    .all();

  return linhas
    .map((t) => ({
      ...t,
      chave: chave(t.instituicao, t.serie),
      rotulo: `${t.instituicao} · ${series.rotulo(t.serie)}`,
      media: t.questoes ? Math.round((t.acertos / t.questoes) * 100) : null,
      participacao: t.alunos ? Math.round((t.participantes / t.alunos) * 100) : 0,
      erros: t.questoes - t.acertos,
    }))
    .sort((a, b) =>
      a.instituicao.localeCompare(b.instituicao, 'pt-BR') ||
      series.ordem(a.serie) - series.ordem(b.serie));
}

/** Um aluno da turma, com o essencial para o professor olhar a lista. */
function alunosDa(instituicao, serie) {
  return db
    .prepare(
      `SELECT u.id, u.nome, u.email,
              COUNT(s.id) simulados,
              COALESCE(SUM(s.acertos), 0) acertos,
              COALESCE(SUM(s.total), 0) questoes,
              MAX(s.concluido_em) ultimo,
              (SELECT ROUND(x.acertos * 100.0 / x.total) FROM simulados x
                WHERE x.usuario_id = u.id AND x.concluido_em IS NOT NULL
                ORDER BY x.concluido_em DESC LIMIT 1) ultima_nota,
              (SELECT COUNT(*) FROM simulados x
                WHERE x.usuario_id = u.id AND x.concluido_em IS NULL) em_aberto
         FROM usuarios u
         LEFT JOIN simulados s ON s.usuario_id = u.id AND s.concluido_em IS NOT NULL
        WHERE u.instituicao = ? AND u.serie = ?
        GROUP BY u.id
        ORDER BY u.nome COLLATE NOCASE`
    )
    .all(instituicao, serie)
    .map((a) => ({
      ...a,
      media: a.questoes ? Math.round((a.acertos / a.questoes) * 100) : null,
      erros: a.questoes - a.acertos,
    }));
}

/**
 * Distribuição das notas em faixas.
 *
 * É o gráfico que mais diz para quem dá aula: mostra se a turma é homogênea ou
 * se há dois grupos com necessidades diferentes — o que a média sozinha esconde.
 */
function distribuicao(instituicao, serie) {
  const faixas = [
    { rotulo: '0–20%', min: 0, max: 20 },
    { rotulo: '21–40%', min: 21, max: 40 },
    { rotulo: '41–60%', min: 41, max: 60 },
    { rotulo: '61–80%', min: 61, max: 80 },
    { rotulo: '81–100%', min: 81, max: 100 },
  ].map((f) => ({ ...f, alunos: 0 }));

  alunosDa(instituicao, serie)
    .filter((a) => a.media !== null)
    .forEach((a) => {
      const f = faixas.find((x) => a.media >= x.min && a.media <= x.max);
      if (f) f.alunos++;
    });
  return faixas;
}

/** Média da turma em cada semana, para ver se está subindo ou caindo. */
function evolucao(instituicao, serie) {
  return db
    .prepare(
      `SELECT s.semana,
              COUNT(*) simulados,
              COUNT(DISTINCT s.usuario_id) alunos,
              SUM(s.acertos) acertos,
              SUM(s.total) questoes
         FROM simulados s
         JOIN usuarios u ON u.id = s.usuario_id
        WHERE u.instituicao = ? AND u.serie = ? AND s.concluido_em IS NOT NULL
        GROUP BY s.semana
        ORDER BY s.semana`
    )
    .all(instituicao, serie)
    .map((e) => ({ ...e, media: Math.round((e.acertos / e.questoes) * 100) }));
}

/**
 * Acertos da turma por campo da questão — onde a turma inteira tropeça.
 * É o que vira plano de aula: se todos erram "referência pronominal", a aula é
 * essa.
 */
function porCampo(instituicao, serie, campo, minimo = 3) {
  const permitidos = ['tema', 'nivel_cefr', 'tipo', 'genero_textual'];
  if (!permitidos.includes(campo)) throw new Error(`campo não permitido: ${campo}`);
  // Os apelidos precisam ser `n_total` e `n_acertos`, não `total` e `acertos`:
  // a tabela `simulados` do JOIN já tem colunas com esses dois nomes, e o SQLite
  // resolve o HAVING e o ORDER BY para as colunas, não para os agregados. Com o
  // nome repetido, o HAVING filtrava pela nota do simulado (sempre 5, ou seja,
  // não filtrava nada) e a ordenação usava o dado errado.
  return db
    .prepare(
      `SELECT q.${campo} valor, COUNT(*) n_total, COALESCE(SUM(sq.correta), 0) n_acertos
         FROM simulado_questoes sq
         JOIN simulados s ON s.id = sq.simulado_id
         JOIN questoes q  ON q.id = sq.questao_id
         JOIN usuarios u  ON u.id = s.usuario_id
        WHERE u.instituicao = ? AND u.serie = ?
          AND s.concluido_em IS NOT NULL AND sq.resposta IS NOT NULL
        GROUP BY q.${campo}
        HAVING n_total >= ?
        ORDER BY (n_acertos * 1.0 / n_total) ASC, n_total DESC`
    )
    .all(instituicao, serie, minimo)
    .map((r) => ({
      valor: campo === 'tipo' ? (ROTULOS_TIPO[r.valor] || r.valor) : r.valor,
      total: r.n_total,
      acertos: r.n_acertos,
      erros: r.n_total - r.n_acertos,
      percentual: Math.round((r.n_acertos / r.n_total) * 100),
    }));
}

/**
 * As questões que mais derrubaram a turma.
 *
 * Só entram as que alguém errou: uma questão que todos acertaram não "derrubou"
 * ninguém, e listá-la sob esse título só confunde quem está procurando o que
 * revisar.
 */
function questoesDificeis(instituicao, serie, limite = 8) {
  return db
    .prepare(
      `SELECT q.id, q.slug, q.titulo, q.instituicao prova, q.ano, q.nivel_cefr,
              COUNT(*) responderam, COALESCE(SUM(sq.correta), 0) acertaram
         FROM simulado_questoes sq
         JOIN simulados s ON s.id = sq.simulado_id
         JOIN questoes q  ON q.id = sq.questao_id
         JOIN usuarios u  ON u.id = s.usuario_id
        WHERE u.instituicao = ? AND u.serie = ?
          AND s.concluido_em IS NOT NULL AND sq.resposta IS NOT NULL
        GROUP BY q.id
       HAVING responderam >= 2 AND acertaram < responderam
        ORDER BY (acertaram * 1.0 / responderam) ASC, responderam DESC
        LIMIT ?`
    )
    .all(instituicao, serie, limite)
    .map((q) => ({ ...q, percentual: Math.round((q.acertaram / q.responderam) * 100) }));
}

/** Tudo o que a página da turma precisa, numa chamada. */
function detalhe(instituicao, serie) {
  const alunos = alunosDa(instituicao, serie);
  const comNota = alunos.filter((a) => a.media !== null);
  const questoes = alunos.reduce((s, a) => s + a.questoes, 0);
  const acertos = alunos.reduce((s, a) => s + a.acertos, 0);
  const ordenados = [...comNota].sort((a, b) => b.media - a.media);

  return {
    instituicao,
    serie,
    rotulo: `${instituicao} · ${series.rotulo(serie)}`,
    alunos,
    total: alunos.length,
    participantes: comNota.length,
    semParticipar: alunos.filter((a) => a.media === null),
    participacao: alunos.length ? Math.round((comNota.length / alunos.length) * 100) : 0,
    questoes,
    acertos,
    erros: questoes - acertos,
    media: questoes ? Math.round((acertos / questoes) * 100) : null,
    // mediana diz mais que a média quando a turma é desigual
    mediana: comNota.length
      ? (() => {
          const v = comNota.map((a) => a.media).sort((a, b) => a - b);
          const m = Math.floor(v.length / 2);
          return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
        })()
      : null,
    melhores: ordenados.slice(0, 5),
    atencao: [...ordenados].reverse().slice(0, 5),
    ranking: ordenados,
    distribuicao: distribuicao(instituicao, serie),
    evolucao: evolucao(instituicao, serie),
    porTema: porCampo(instituicao, serie, 'tema').slice(0, 8),
    porNivel: porCampo(instituicao, serie, 'nivel_cefr'),
    porTipo: porCampo(instituicao, serie, 'tipo'),
    dificeis: questoesDificeis(instituicao, serie),
  };
}

module.exports = { turmas, alunosDa, detalhe, distribuicao, evolucao, porCampo, questoesDificeis };
