const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const CAMINHO = process.env.DB_PATH || path.join(__dirname, '../../dados/banco.db');

fs.mkdirSync(path.dirname(CAMINHO), { recursive: true });

const db = new Database(CAMINHO);
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

// ---------------------------------------------------------------- consultas

function comAlternativas(questao) {
  if (!questao) return null;
  questao.alternativas = db
    .prepare('SELECT letra, texto FROM alternativas WHERE questao_id = ? ORDER BY letra')
    .all(questao.id);
  return questao;
}

function porSlug(slug, incluirRascunho = false) {
  const sql = incluirRascunho
    ? 'SELECT * FROM questoes WHERE slug = ?'
    : 'SELECT * FROM questoes WHERE slug = ? AND publicada = 1';
  return comAlternativas(db.prepare(sql).get(slug));
}

function porId(id) {
  return comAlternativas(db.prepare('SELECT * FROM questoes WHERE id = ?').get(id));
}

/**
 * Listagem com filtros combináveis. Todos os campos são opcionais.
 * Usada tanto pelo site público quanto pelo painel e pelo montador de provas.
 */
function listar({ tipo, nivel, tema, genero, instituicao, ano, busca, publicada = 1, limite, offset = 0 } = {}) {
  const where = [];
  const params = [];

  if (publicada !== null) {
    where.push('publicada = ?');
    params.push(publicada);
  }
  if (tipo) { where.push('tipo = ?'); params.push(tipo); }
  if (nivel) { where.push('nivel_cefr = ?'); params.push(nivel); }
  if (tema) { where.push('tema = ?'); params.push(tema); }
  if (genero) { where.push('genero_textual = ?'); params.push(genero); }
  if (instituicao) { where.push('instituicao = ?'); params.push(instituicao); }
  if (ano) { where.push('ano = ?'); params.push(ano); }
  if (busca) {
    where.push('(titulo LIKE ? OR enunciado LIKE ? OR texto_base LIKE ?)');
    const t = `%${busca}%`;
    params.push(t, t, t);
  }

  let sql = 'SELECT * FROM questoes';
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY criada_em DESC, id DESC';
  if (limite) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limite, offset);
  }

  return db.prepare(sql).all(...params);
}

function contar(filtros = {}) {
  return listar({ ...filtros, limite: null }).length;
}

function facetas() {
  const q = (col) =>
    db
      .prepare(`SELECT ${col} AS valor, COUNT(*) AS total FROM questoes WHERE publicada = 1
                GROUP BY ${col} ORDER BY ${col}`)
      .all();
  return {
    tipos: q('tipo'),
    niveis: q('nivel_cefr'),
    temas: q('tema'),
    generos: q('genero_textual'),
    instituicoes: db
      .prepare(`SELECT instituicao AS valor, COUNT(*) AS total FROM questoes
                WHERE publicada = 1 AND instituicao != ''
                GROUP BY instituicao ORDER BY total DESC`)
      .all(),
    anos: db
      .prepare(`SELECT ano AS valor, COUNT(*) AS total FROM questoes
                WHERE publicada = 1 AND ano IS NOT NULL
                GROUP BY ano ORDER BY ano DESC`)
      .all(),
  };
}

function relacionadas(questao, limite = 3) {
  return db
    .prepare(
      `SELECT * FROM questoes
       WHERE publicada = 1 AND id != ?
       ORDER BY (tema = ?) DESC, (nivel_cefr = ?) DESC, (tipo = ?) DESC, id DESC
       LIMIT ?`
    )
    .all(questao.id, questao.tema, questao.nivel_cefr, questao.tipo, limite);
}

// ------------------------------------------------------------- escrita

const salvarAlternativas = db.transaction((questaoId, alternativas) => {
  db.prepare('DELETE FROM alternativas WHERE questao_id = ?').run(questaoId);
  const ins = db.prepare(
    'INSERT INTO alternativas (questao_id, letra, texto) VALUES (?, ?, ?)'
  );
  LETRAS.forEach((letra, i) => ins.run(questaoId, letra, alternativas[i] ?? ''));
});

const criar = db.transaction((dados, alternativas) => {
  const info = db
    .prepare(
      `INSERT INTO questoes
       (slug, titulo, meta_description, tipo, genero_textual, tema, nivel_cefr,
        texto_base, imagem, imagem_alt, fonte_veiculo, fonte_url, fonte_data,
        enunciado, gabarito, comentario, publicada)
       VALUES
       (@slug, @titulo, @meta_description, @tipo, @genero_textual, @tema, @nivel_cefr,
        @texto_base, @imagem, @imagem_alt, @fonte_veiculo, @fonte_url, @fonte_data,
        @enunciado, @gabarito, @comentario, @publicada)`
    )
    .run(dados);
  salvarAlternativas(info.lastInsertRowid, alternativas);
  return info.lastInsertRowid;
});

const atualizar = db.transaction((id, dados, alternativas) => {
  db.prepare(
    `UPDATE questoes SET
       slug = @slug, titulo = @titulo, meta_description = @meta_description,
       tipo = @tipo, genero_textual = @genero_textual, tema = @tema,
       nivel_cefr = @nivel_cefr, texto_base = @texto_base,
       imagem = @imagem, imagem_alt = @imagem_alt,
       fonte_veiculo = @fonte_veiculo, fonte_url = @fonte_url,
       fonte_data = @fonte_data, enunciado = @enunciado, gabarito = @gabarito,
       comentario = @comentario, publicada = @publicada,
       atualizada_em = datetime('now')
     WHERE id = @id`
  ).run({ ...dados, id });
  salvarAlternativas(id, alternativas);
});

function remover(id) {
  db.prepare('DELETE FROM questoes WHERE id = ?').run(id);
}

function slugLivre(base, ignorarId = null) {
  let slug = base;
  let n = 2;
  const busca = db.prepare('SELECT id FROM questoes WHERE slug = ?');
  while (true) {
    const achou = busca.get(slug);
    if (!achou || achou.id === ignorarId) return slug;
    slug = `${base}-${n++}`;
  }
}

function salvarAssinante(email, origem) {
  db.prepare(
    'INSERT OR IGNORE INTO assinantes (email, origem) VALUES (?, ?)'
  ).run(email.trim().toLowerCase(), origem);
}

function assinantes() {
  return db.prepare('SELECT * FROM assinantes ORDER BY criado_em DESC').all();
}

// ------------------------------------------------------------- usuários

function criarUsuario(nome, email, senhaHash) {
  const info = db
    .prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)')
    .run(nome.trim(), email.trim().toLowerCase(), senhaHash);
  return info.lastInsertRowid;
}

function usuarioPorEmail(email) {
  return db
    .prepare('SELECT * FROM usuarios WHERE email = ?')
    .get(email.trim().toLowerCase());
}

function usuarioPorId(id) {
  return db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
}

function usuarios() {
  return db
    .prepare('SELECT id, nome, email, criado_em FROM usuarios ORDER BY criado_em DESC')
    .all();
}

function porIds(ids) {
  if (!ids.length) return [];
  const marcas = ids.map(() => '?').join(',');
  const linhas = db
    .prepare(`SELECT * FROM questoes WHERE id IN (${marcas})`)
    .all(...ids);
  // Preserva a ordem escolhida pelo professor, não a ordem do banco.
  const mapa = new Map(linhas.map((l) => [l.id, comAlternativas(l)]));
  return ids.map((id) => mapa.get(Number(id))).filter(Boolean);
}

module.exports = {
  db,
  LETRAS,
  porSlug,
  porId,
  porIds,
  listar,
  contar,
  facetas,
  relacionadas,
  criar,
  atualizar,
  remover,
  slugLivre,
  salvarAssinante,
  assinantes,
  criarUsuario,
  usuarioPorEmail,
  usuarioPorId,
  usuarios,
};
