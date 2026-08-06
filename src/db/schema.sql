PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS questoes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT    NOT NULL UNIQUE,
  titulo          TEXT    NOT NULL,
  meta_description TEXT   NOT NULL DEFAULT '',

  tipo            TEXT    NOT NULL,   -- interpretacao | gramatica | vocabulario
  genero_textual  TEXT    NOT NULL,   -- tirinha, charge, anuncio, reportagem...
  tema            TEXT    NOT NULL,
  nivel_cefr      TEXT    NOT NULL,   -- A1..C2

  texto_base      TEXT    NOT NULL DEFAULT '',
  imagem          TEXT,               -- caminho em /uploads
  imagem_alt      TEXT,               -- descrição para leitor de tela e SEO

  fonte_veiculo   TEXT    NOT NULL DEFAULT '',
  fonte_url       TEXT    NOT NULL DEFAULT '',
  fonte_data      TEXT,

  enunciado       TEXT    NOT NULL,
  gabarito        TEXT    NOT NULL,   -- A..E
  comentario      TEXT    NOT NULL DEFAULT '',

  -- '' = banco principal (ENEM e vestibulares); 'reading' = coleção autoral por nível
  colecao         TEXT    NOT NULL DEFAULT '',

  publicada       INTEGER NOT NULL DEFAULT 0,
  criada_em       TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizada_em   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alternativas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  questao_id INTEGER NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  letra      TEXT    NOT NULL,        -- A..E
  texto      TEXT    NOT NULL,
  UNIQUE (questao_id, letra)
);

CREATE TABLE IF NOT EXISTS provas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo     TEXT NOT NULL,
  escola     TEXT NOT NULL DEFAULT '',
  turma      TEXT NOT NULL DEFAULT '',
  criada_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prova_questoes (
  prova_id   INTEGER NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
  questao_id INTEGER NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  ordem      INTEGER NOT NULL,
  PRIMARY KEY (prova_id, questao_id)
);

CREATE TABLE IF NOT EXISTS assinantes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  email     TEXT NOT NULL UNIQUE,
  origem    TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_q_publicada ON questoes(publicada);
CREATE INDEX IF NOT EXISTS idx_q_colecao   ON questoes(colecao);
CREATE INDEX IF NOT EXISTS idx_q_tipo      ON questoes(tipo);
CREATE INDEX IF NOT EXISTS idx_q_nivel     ON questoes(nivel_cefr);
CREATE INDEX IF NOT EXISTS idx_q_tema      ON questoes(tema);
CREATE INDEX IF NOT EXISTS idx_alt_questao ON alternativas(questao_id);
-- ---------------------------------------------------------------------------
-- Simulado oficial semanal.
--
-- Convive com o modo de treinamento, que continua sendo a navegação livre pelas
-- questões: nada aqui altera `questoes`, `alternativas` ou o que já existia.
-- Só os simulados oficiais entram no histórico e no desempenho.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS simulados (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  -- semana ISO ("2026-W31"): é o que impede dois simulados na mesma semana
  semana        TEXT    NOT NULL,
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),
  iniciado_em   TEXT,
  concluido_em  TEXT,
  acertos       INTEGER,
  total         INTEGER NOT NULL DEFAULT 5,
  UNIQUE (usuario_id, semana)
);

CREATE TABLE IF NOT EXISTS simulado_questoes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  simulado_id  INTEGER NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  questao_id   INTEGER NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  ordem        INTEGER NOT NULL,
  resposta     TEXT,               -- letra marcada; NULL enquanto não respondida
  correta      INTEGER,            -- 0/1, gravado no momento da resposta
  respondida_em TEXT,
  UNIQUE (simulado_id, questao_id),
  UNIQUE (simulado_id, ordem)
);

-- Aviso semanal por e-mail. Existe para o mesmo aviso não sair duas vezes: o
-- cron pode repetir, e o professor pode rodar à mão no mesmo dia. A chave
-- (usuario_id, semana, tipo) é quem garante isso, não a boa vontade de quem
-- chama. Só se grava depois do envio dar certo — falha não conta como enviado,
-- para a próxima execução tentar de novo.
CREATE TABLE IF NOT EXISTS avisos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  semana     TEXT    NOT NULL,
  tipo       TEXT    NOT NULL DEFAULT 'simulado-semanal',
  enviado_em TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (usuario_id, semana, tipo)
);
CREATE INDEX IF NOT EXISTS idx_avisos_semana ON avisos(semana, tipo);

CREATE INDEX IF NOT EXISTS idx_sim_usuario  ON simulados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sim_semana   ON simulados(usuario_id, semana);
CREATE INDEX IF NOT EXISTS idx_simq_sim     ON simulado_questoes(simulado_id);
CREATE INDEX IF NOT EXISTS idx_simq_questao ON simulado_questoes(questao_id);
