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
CREATE INDEX IF NOT EXISTS idx_q_tipo      ON questoes(tipo);
CREATE INDEX IF NOT EXISTS idx_q_nivel     ON questoes(nivel_cefr);
CREATE INDEX IF NOT EXISTS idx_q_tema      ON questoes(tema);
CREATE INDEX IF NOT EXISTS idx_alt_questao ON alternativas(questao_id);
