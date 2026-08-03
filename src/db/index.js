const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const CAMINHO = process.env.DB_PATH || path.join(__dirname, '../../dados/banco.db');

fs.mkdirSync(path.dirname(CAMINHO), { recursive: true });

const db = new Database(CAMINHO);

// Colunas acrescentadas depois da primeira versão do schema.
const colunas = () => db.prepare('PRAGMA table_info(questoes)').all().map((c) => c.name);
if (colunas().length && !colunas().includes('colecao')) {
  db.exec("ALTER TABLE questoes ADD COLUMN colecao TEXT NOT NULL DEFAULT ''");
}

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// Onde a pessoa estuda ou trabalha. Entrou depois que já havia contas criadas,
// por isso o DEFAULT '': quem se cadastrou antes continua entrando normalmente e
// o campo fica em branco até ser preenchido.
const colunasUsuarios = () => db.prepare('PRAGMA table_info(usuarios)').all().map((c) => c.name);
if (!colunasUsuarios().includes('instituicao')) {
  db.exec("ALTER TABLE usuarios ADD COLUMN instituicao TEXT NOT NULL DEFAULT ''");
}
// Série escolar, do 6º ano à 3ª do médio. Também entrou depois: quem se
// cadastrou antes fica em branco e o painel mostra como "não informada".
if (!colunasUsuarios().includes('serie')) {
  db.exec("ALTER TABLE usuarios ADD COLUMN serie TEXT NOT NULL DEFAULT ''");
}

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
function listar({ tipo, nivel, tema, genero, instituicao, instituicoes, banca, ano, busca, colecao, publicada = 1, limite, offset = 0 } = {}) {
  const where = [];
  const params = [];

  if (publicada !== null) {
    where.push('publicada = ?');
    params.push(publicada);
  }
  // colecao: undefined = tudo; string = só aquela coleção ('' é o banco principal).
  if (colecao !== undefined && colecao !== null) {
    where.push('colecao = ?');
    params.push(colecao);
  }
  if (tipo) { where.push('tipo = ?'); params.push(tipo); }
  if (nivel) { where.push('nivel_cefr = ?'); params.push(nivel); }
  if (tema) { where.push('tema = ?'); params.push(tema); }
  if (genero) { where.push('genero_textual = ?'); params.push(genero); }
  if (instituicao) { where.push('instituicao = ?'); params.push(instituicao); }
  // banca agrupa as variantes de uma mesma prova: ENEM, ENEM PPL, ENEM Reaplicação.
  if (banca) { where.push('instituicao LIKE ?'); params.push(`${banca}%`); }
  // instituicoes: recorte por um conjunto (usado pela página de medicina).
  if (Array.isArray(instituicoes) && instituicoes.length) {
    where.push(`instituicao IN (${instituicoes.map(() => '?').join(',')})`);
    params.push(...instituicoes);
  }
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

function facetas(colecao) {
  // Sem argumento, conta o acervo inteiro; com string, só aquela coleção.
  const filtro = colecao === undefined || colecao === null ? '' : ' AND colecao = @colecao';
  const p = { colecao };

  const q = (col) =>
    db
      .prepare(`SELECT ${col} AS valor, COUNT(*) AS total FROM questoes
                WHERE publicada = 1${filtro}
                GROUP BY ${col} ORDER BY ${col}`)
      .all(p);

  return {
    tipos: q('tipo'),
    niveis: q('nivel_cefr'),
    temas: q('tema'),
    generos: q('genero_textual'),
    instituicoes: db
      .prepare(`SELECT instituicao AS valor, COUNT(*) AS total FROM questoes
                WHERE publicada = 1 AND instituicao != ''${filtro}
                GROUP BY instituicao ORDER BY total DESC`)
      .all(p),
    anos: db
      .prepare(`SELECT ano AS valor, COUNT(*) AS total FROM questoes
                WHERE publicada = 1 AND ano IS NOT NULL${filtro}
                GROUP BY ano ORDER BY ano DESC`)
      .all(p),
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
        enunciado, gabarito, comentario, colecao, publicada)
       VALUES
       (@slug, @titulo, @meta_description, @tipo, @genero_textual, @tema, @nivel_cefr,
        @texto_base, @imagem, @imagem_alt, @fonte_veiculo, @fonte_url, @fonte_data,
        @enunciado, @gabarito, @comentario, @colecao, @publicada)`
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
       comentario = @comentario, colecao = @colecao, publicada = @publicada,
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

function criarUsuario(nome, email, senhaHash, instituicao = '', serie = '') {
  const info = db
    .prepare('INSERT INTO usuarios (nome, email, senha_hash, instituicao, serie) VALUES (?, ?, ?, ?, ?)')
    .run(nome.trim(), email.trim().toLowerCase(), senhaHash, instituicao.trim(), (serie || '').trim());
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
    .prepare('SELECT id, nome, email, instituicao, serie, criado_em FROM usuarios ORDER BY criado_em DESC')
    .all();
}

/** Chave para agrupar instituições escritas de formas diferentes. */
function chaveInstituicao(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Instituições cadastradas, agrupadas por escrita equivalente.
 *
 * O campo é texto livre no cadastro, então a mesma escola chega de vários
 * jeitos: "Colégio São José Escolápias", "Colegio Sao Jose Escolapias",
 * "Colégio São José". Sem agrupar, o filtro viraria uma lista de quase-duplicatas
 * e não serviria para nada. A grafia mostrada é a mais frequente do grupo.
 */
function instituicoes() {
  const grupos = new Map();
  db.prepare("SELECT instituicao FROM usuarios WHERE TRIM(COALESCE(instituicao,'')) <> ''")
    .all()
    .forEach(({ instituicao }) => {
      const k = chaveInstituicao(instituicao);
      if (!grupos.has(k)) grupos.set(k, { chave: k, total: 0, grafias: new Map() });
      const g = grupos.get(k);
      g.total++;
      g.grafias.set(instituicao, (g.grafias.get(instituicao) || 0) + 1);
    });
  return [...grupos.values()]
    .map((g) => {
      const ordenadas = [...g.grafias.entries()].sort((a, b) => b[1] - a[1]);
      return {
        chave: g.chave,
        nome: ordenadas[0][0],
        total: g.total,
        variacoes: ordenadas.length,
        grafias: ordenadas.map(([texto, n]) => ({ texto, n })),
      };
    })
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Edita os dados de cadastro. Não mexe em senha — isso tem função própria. */
const atualizarUsuario = db.transaction((id, { nome, email, instituicao, serie }) => {
  db.prepare(
    'UPDATE usuarios SET nome = ?, email = ?, instituicao = ?, serie = ? WHERE id = ?'
  ).run(nome.trim(), email.trim().toLowerCase(), (instituicao || '').trim(), (serie || '').trim(), id);
});

function trocarSenhaUsuario(id, senhaHash) {
  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(senhaHash, id);
}

/**
 * Apaga a conta e tudo o que veio com ela.
 *
 * Os simulados e as respostas saem junto pelo ON DELETE CASCADE do schema — é
 * irreversível, e o histórico daquele aluno não volta. A confirmação fica na
 * interface; aqui só se executa.
 */
const removerUsuario = db.transaction((id) => {
  const u = db.prepare('SELECT email FROM usuarios WHERE id = ?').get(id);
  if (!u) return { removido: false };
  const simulados = db.prepare('SELECT COUNT(*) c FROM simulados WHERE usuario_id = ?').get(id).c;
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  return { removido: true, email: u.email, simulados };
});

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
  instituicoes,
  chaveInstituicao,
  atualizarUsuario,
  trocarSenhaUsuario,
  removerUsuario,
};
