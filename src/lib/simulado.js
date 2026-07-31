/**
 * Simulado oficial semanal.
 *
 * Cinco questões por semana, sorteadas para cada usuário individualmente. É um
 * modo separado do treinamento: aqui não há correção na hora nem comentário, o
 * gabarito só abre 24 horas depois de concluído, e só o que sai daqui entra no
 * histórico e no desempenho. A navegação livre pelas questões continua como
 * sempre foi e não conta para nada disso.
 */
const { db } = require('../db');
const { INSTITUICOES: MEDICINA } = require('./medicina');

const POR_SIMULADO = 5;
const HORAS_ATE_O_GABARITO = 24;

/**
 * Semana ISO ("2026-W31"), sempre calculada no servidor.
 * É a chave que impede dois simulados na mesma semana — junto com o UNIQUE
 * (usuario_id, semana) da tabela, que é quem de fato garante isso sob concorrência.
 */
function semanaAtual(agora = new Date()) {
  const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
  // quinta-feira da mesma semana define o ano ISO
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const inicioDoAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((d - inicioDoAno) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}

/**
 * O acervo elegível: ENEM e vestibulares de medicina, sem itens de gramática e
 * sem as coleções autorais (`reading` e `use-of-english`), que são justamente o
 * material de Use of English que o simulado oficial não usa.
 */
function elegiveis() {
  const marcas = MEDICINA.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT id FROM questoes
        WHERE publicada = 1
          AND colecao = ''
          AND tipo <> 'gramatica'
          AND (instituicao LIKE 'ENEM%' OR instituicao IN (${marcas}))`
    )
    .all(...MEDICINA)
    .map((r) => r.id);
}

/** Questões que este usuário já viu em simulados oficiais anteriores. */
function jaUsadas(usuarioId) {
  return new Set(
    db
      .prepare(
        `SELECT sq.questao_id id FROM simulado_questoes sq
           JOIN simulados s ON s.id = sq.simulado_id
          WHERE s.usuario_id = ?`
      )
      .all(usuarioId)
      .map((r) => r.id)
  );
}

function sorteia(lista, quantos) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, quantos);
}

/**
 * Escolhe as cinco questões. Prioriza o que o usuário ainda não viu; só repete
 * quando o acervo inédito acaba, e mesmo aí prefere as vistas há mais tempo.
 */
function escolherQuestoes(usuarioId) {
  const todas = elegiveis();
  if (todas.length < POR_SIMULADO) return null;

  const vistas = jaUsadas(usuarioId);
  const ineditas = todas.filter((id) => !vistas.has(id));

  if (ineditas.length >= POR_SIMULADO) return sorteia(ineditas, POR_SIMULADO);

  // acervo inédito esgotado: completa com as mais antigas já respondidas
  const faltam = POR_SIMULADO - ineditas.length;
  const antigas = db
    .prepare(
      `SELECT sq.questao_id id, MAX(s.criado_em) visto
         FROM simulado_questoes sq
         JOIN simulados s ON s.id = sq.simulado_id
        WHERE s.usuario_id = ?
        GROUP BY sq.questao_id
        ORDER BY visto ASC`
    )
    .all(usuarioId)
    .map((r) => r.id)
    .filter((id) => todas.includes(id));

  return [...ineditas, ...antigas.slice(0, faltam)];
}

/** O simulado da semana corrente, se já existir. */
function daSemana(usuarioId, semana = semanaAtual()) {
  return db
    .prepare('SELECT * FROM simulados WHERE usuario_id = ? AND semana = ?')
    .get(usuarioId, semana);
}

/** O simulado que ainda está aberto, de qualquer semana. */
function emAberto(usuarioId) {
  return db
    .prepare(
      'SELECT * FROM simulados WHERE usuario_id = ? AND concluido_em IS NULL ORDER BY id DESC LIMIT 1'
    )
    .get(usuarioId);
}

const gravar = db.transaction((usuarioId, semana, ids) => {
  const info = db
    .prepare('INSERT INTO simulados (usuario_id, semana, total) VALUES (?, ?, ?)')
    .run(usuarioId, semana, ids.length);
  const ins = db.prepare(
    'INSERT INTO simulado_questoes (simulado_id, questao_id, ordem) VALUES (?, ?, ?)'
  );
  ids.forEach((qid, i) => ins.run(info.lastInsertRowid, qid, i + 1));
  return info.lastInsertRowid;
});

/**
 * Devolve o simulado que o usuário deve responder agora.
 *
 * Um inacabado nunca é substituído: enquanto houver simulado em aberto, é ele
 * que volta, mesmo que a semana já tenha virado. Só depois de concluído é que a
 * semana seguinte libera um novo.
 */
function atual(usuarioId) {
  const aberto = emAberto(usuarioId);
  if (aberto) return { simulado: aberto, novo: false };

  const semana = semanaAtual();
  const desta = daSemana(usuarioId, semana);
  if (desta) return { simulado: desta, novo: false, concluido: true };

  const ids = escolherQuestoes(usuarioId);
  if (!ids) return { simulado: null, erro: 'acervo insuficiente' };

  try {
    const id = gravar(usuarioId, semana, ids);
    return { simulado: db.prepare('SELECT * FROM simulados WHERE id = ?').get(id), novo: true };
  } catch (e) {
    // corrida entre duas abas: o UNIQUE barrou a segunda inserção
    const existente = daSemana(usuarioId, semana);
    if (existente) return { simulado: existente, novo: false };
    throw e;
  }
}

/** As questões de um simulado. Sem gabarito nem comentário enquanto não liberar. */
function questoesDo(simuladoId, { comRespostas = false } = {}) {
  const campos = comRespostas
    ? 'q.*, sq.ordem, sq.resposta, sq.correta, sq.respondida_em'
    : `q.id, q.slug, q.titulo, q.texto_base, q.imagem, q.imagem_alt, q.enunciado,
       q.instituicao, q.ano, q.tema, q.nivel_cefr, q.tipo, q.genero_textual,
       sq.ordem, sq.resposta, sq.respondida_em`;
  const linhas = db
    .prepare(
      `SELECT ${campos} FROM simulado_questoes sq
         JOIN questoes q ON q.id = sq.questao_id
        WHERE sq.simulado_id = ? ORDER BY sq.ordem`
    )
    .all(simuladoId);
  return linhas.map((l) => ({
    ...l,
    alternativas: db
      .prepare('SELECT letra, texto FROM alternativas WHERE questao_id = ? ORDER BY letra')
      .all(l.id),
  }));
}

/**
 * Registra a resposta. Uma vez enviada, não muda mais — recarregar a página ou
 * mandar de novo não sobrescreve o que já foi marcado.
 */
const responder = db.transaction((simuladoId, questaoId, letra) => {
  const item = db
    .prepare('SELECT * FROM simulado_questoes WHERE simulado_id = ? AND questao_id = ?')
    .get(simuladoId, questaoId);
  if (!item) return { erro: 'questão não pertence a este simulado' };
  if (item.resposta) return { erro: 'já respondida', jaRespondida: true };

  const q = db.prepare('SELECT gabarito FROM questoes WHERE id = ?').get(questaoId);
  if (!q) return { erro: 'questão inexistente' };

  const correta = letra === q.gabarito ? 1 : 0;
  db.prepare(
    `UPDATE simulado_questoes
        SET resposta = ?, correta = ?, respondida_em = datetime('now')
      WHERE id = ?`
  ).run(letra, correta, item.id);

  // primeira resposta marca o início
  db.prepare(
    "UPDATE simulados SET iniciado_em = COALESCE(iniciado_em, datetime('now')) WHERE id = ?"
  ).run(simuladoId);

  const faltam = db
    .prepare('SELECT COUNT(*) c FROM simulado_questoes WHERE simulado_id = ? AND resposta IS NULL')
    .get(simuladoId).c;

  if (faltam === 0) {
    const acertos = db
      .prepare('SELECT COALESCE(SUM(correta),0) a FROM simulado_questoes WHERE simulado_id = ?')
      .get(simuladoId).a;
    db.prepare(
      "UPDATE simulados SET concluido_em = datetime('now'), acertos = ? WHERE id = ?"
    ).run(acertos, simuladoId);
  }
  return { ok: true, faltam };
});

/**
 * O gabarito abre 24 horas depois da conclusão, e quem decide é o banco — a
 * conta é feita com o datetime do SQLite, não com o relógio do navegador, então
 * mudar a hora do aparelho não adianta.
 */
function gabaritoLiberado(simulado) {
  if (!simulado || !simulado.concluido_em) return { liberado: false, quando: null };
  const linha = db
    .prepare(
      `SELECT datetime(?, '+${HORAS_ATE_O_GABARITO} hours') AS quando,
              datetime('now') >= datetime(?, '+${HORAS_ATE_O_GABARITO} hours') AS liberado`
    )
    .get(simulado.concluido_em, simulado.concluido_em);
  return { liberado: Boolean(linha.liberado), quando: linha.quando };
}

/** Só o dono enxerga o simulado. */
function doUsuario(simuladoId, usuarioId) {
  return db
    .prepare('SELECT * FROM simulados WHERE id = ? AND usuario_id = ?')
    .get(simuladoId, usuarioId);
}

function historico(usuarioId) {
  return db
    .prepare(
      `SELECT s.*,
              (SELECT COUNT(*) FROM simulado_questoes q WHERE q.simulado_id = s.id AND q.resposta IS NOT NULL) respondidas,
              -- tempo entre a primeira resposta e a última; NULL se faltar marca
              CAST((julianday(s.concluido_em) - julianday(s.iniciado_em)) * 1440 AS INTEGER) minutos
         FROM simulados s
        WHERE s.usuario_id = ? AND s.concluido_em IS NOT NULL
        ORDER BY s.concluido_em DESC`
    )
    .all(usuarioId)
    .map((s) => ({
      ...s,
      minutos: s.minutos == null ? null : Math.max(0, s.minutos),
      gabarito: gabaritoLiberado(s),
    }));
}

module.exports = {
  POR_SIMULADO,
  HORAS_ATE_O_GABARITO,
  semanaAtual,
  elegiveis,
  atual,
  questoesDo,
  responder,
  gabaritoLiberado,
  doUsuario,
  historico,
  emAberto,
};
