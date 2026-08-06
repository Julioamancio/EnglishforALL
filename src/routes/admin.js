const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');
const db = require('../db');
const desempenho = require('../lib/desempenho');
const sim = require('../lib/simulado');
const instituicoes = require('../lib/instituicoes');
const series = require('../lib/series');
const turmasLib = require('../lib/turmas');
const notas = require('../lib/notas');

const router = express.Router();

const PASTA_UPLOADS = path.join(__dirname, '../../public/uploads');
fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PASTA_UPLOADS),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_IMAGEM.includes(file.mimetype)) {
      return cb(new Error('Formato de imagem não aceito. Use JPG, PNG, WEBP ou GIF.'));
    }
    cb(null, true);
  },
});

// ------------------------------------------------------------------ auth

function exigirLogin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
}

router.get('/login', (req, res) => {
  res.render('admin/login', {
    title: 'Entrar no painel',
    description: '',
    erro: null,
    layoutAdmin: true,
  });
});

router.post('/login', (req, res) => {
  const hash = process.env.ADMIN_SENHA_HASH || '';
  const senha = req.body.senha || '';

  const ok = hash ? bcrypt.compareSync(senha, hash) : false;

  if (!ok) {
    return res.status(401).render('admin/login', {
      title: 'Entrar no painel',
      description: '',
      erro: hash
        ? 'Senha incorreta.'
        : 'ADMIN_SENHA_HASH não configurado no .env — rode: npm run senha',
      layoutAdmin: true,
    });
  }

  req.session.admin = true;
  res.redirect('/admin');
});

router.post('/sair', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.use(exigirLogin);

// --------------------------------------------------------------- listagem

router.get('/', (req, res) => {
  const questoes = db.listar({
    publicada: null,
    busca: req.query.q || null,
    tipo: req.query.tipo || null,
    nivel: req.query.nivel || null,
  });

  res.render('admin/lista', {
    title: 'Painel — questões',
    description: '',
    questoes,
    filtros: { q: req.query.q || '', tipo: req.query.tipo || '', nivel: req.query.nivel || '' },
    assinantes: db.assinantes().length,
    usuarios: db.usuarios().length,
    layoutAdmin: true,
  });
});

// ------------------------------------------------------------ formulário

function formVazio() {
  return {
    id: null,
    slug: '',
    titulo: '',
    meta_description: '',
    tipo: 'interpretacao',
    genero_textual: '',
    tema: '',
    nivel_cefr: 'B1',
    texto_base: '',
    imagem: null,
    imagem_alt: '',
    fonte_veiculo: '',
    fonte_url: '',
    fonte_data: '',
    enunciado: '',
    gabarito: 'A',
    comentario: '',
    publicada: 0,
    alternativas: db.LETRAS.map((letra) => ({ letra, texto: '' })),
  };
}

router.get('/nova', (req, res) => {
  res.render('admin/form', {
    title: 'Nova questão',
    description: '',
    questao: formVazio(),
    erro: null,
    layoutAdmin: true,
  });
});

router.get('/editar/:id', (req, res, next) => {
  const questao = db.porId(req.params.id);
  if (!questao) return next();
  res.render('admin/form', {
    title: `Editar: ${questao.titulo}`,
    description: '',
    questao,
    erro: null,
    layoutAdmin: true,
  });
});

function extrairDados(req, imagemAtual) {
  const b = req.body;

  const base = slugify(b.titulo || 'questao', { lower: true, strict: true, locale: 'pt' });

  let imagem = imagemAtual || null;
  if (req.file) imagem = `/uploads/${req.file.filename}`;
  if (b.remover_imagem === '1') imagem = null;

  return {
    dados: {
      slug: b.slug ? slugify(b.slug, { lower: true, strict: true }) : base,
      titulo: (b.titulo || '').trim(),
      meta_description: (b.meta_description || '').trim(),
      tipo: b.tipo,
      genero_textual: (b.genero_textual || '').trim(),
      tema: slugify(b.tema || 'geral', { lower: true, strict: true }),
      nivel_cefr: b.nivel_cefr,
      texto_base: b.texto_base || '',
      imagem,
      imagem_alt: (b.imagem_alt || '').trim(),
      fonte_veiculo: (b.fonte_veiculo || '').trim(),
      fonte_url: (b.fonte_url || '').trim(),
      fonte_data: (b.fonte_data || '').trim(),
      enunciado: (b.enunciado || '').trim(),
      gabarito: b.gabarito,
      comentario: b.comentario || '',
      colecao: (b.colecao || '').trim(),
      publicada: b.publicada === '1' ? 1 : 0,
    },
    alternativas: db.LETRAS.map((l) => (b[`alt_${l}`] || '').trim()),
  };
}

function validar(dados, alternativas) {
  if (!dados.titulo) return 'O título é obrigatório.';
  if (dados.titulo.length > 70) return 'O título deve ter no máximo 70 caracteres (limite do Google).';
  if (!dados.enunciado) return 'O enunciado é obrigatório.';
  if (alternativas.some((a) => !a)) return 'As cinco alternativas (A–E) precisam estar preenchidas.';
  if (!db.LETRAS.includes(dados.gabarito)) return 'Gabarito inválido.';
  if (dados.publicada === 1) {
    if (!dados.fonte_veiculo || !dados.fonte_url) {
      return 'Para publicar, o veículo e a URL da fonte são obrigatórios.';
    }
    if (!dados.texto_base.trim() && !dados.imagem) {
      return 'Para publicar, a questão precisa de texto-base ou de imagem.';
    }
    if (dados.imagem && !dados.imagem_alt) {
      return 'Para publicar com imagem, a descrição da imagem é obrigatória (acessibilidade e SEO).';
    }
    if (dados.meta_description.length < 50 || dados.meta_description.length > 160) {
      return 'Para publicar, a meta description precisa ter entre 50 e 160 caracteres.';
    }
  }
  return null;
}

router.post('/salvar', upload.single('imagem'), (req, res) => {
  const id = req.body.id ? Number(req.body.id) : null;
  const atual = id ? db.porId(id) : null;

  const { dados, alternativas } = extrairDados(req, atual?.imagem);
  const erro = validar(dados, alternativas);

  if (erro) {
    return res.status(400).render('admin/form', {
      title: id ? 'Editar questão' : 'Nova questão',
      description: '',
      questao: {
        ...dados,
        id,
        alternativas: db.LETRAS.map((l, i) => ({ letra: l, texto: alternativas[i] })),
      },
      erro,
      layoutAdmin: true,
    });
  }

  dados.slug = db.slugLivre(dados.slug, id);

  if (id) {
    db.atualizar(id, dados, alternativas);
  } else {
    db.criar(dados, alternativas);
  }

  res.redirect('/admin');
});

router.post('/excluir/:id', (req, res) => {
  const questao = db.porId(req.params.id);
  if (questao?.imagem) {
    const arquivo = path.join(PASTA_UPLOADS, path.basename(questao.imagem));
    fs.existsSync(arquivo) && fs.unlinkSync(arquivo);
  }
  db.remover(req.params.id);
  res.redirect('/admin');
});

router.get('/assinantes', (req, res) => {
  res.render('admin/assinantes', {
    title: 'E-mails capturados',
    description: '',
    assinantes: db.assinantes(),
    layoutAdmin: true,
  });
});

// ------------------------------------------------------------------ alunos

router.get('/usuarios', (req, res) => {
  const todos = desempenho.porAluno();
  const escolas = db.instituicoes();

  // O filtro compara pela chave normalizada, senão "Colégio São José Escolápias"
  // e "Colegio Sao Jose Escolapias" seriam duas escolas diferentes.
  const filtro = (req.query.escola || '').trim();
  const turma = (req.query.serie || '').trim();
  const busca = (req.query.q || '').trim().toLowerCase();
  /* Duas notas diferentes, e o professor escolhe por qual ordenar:
       media       — junta todos os simulados concluídos do aluno;
       ultima_nota — só o último que ele entregou.
     Servem a perguntas distintas: a média diz como o aluno vem indo, a última
     nota diz como ele está agora. Um aluno que caiu nas últimas semanas some
     dentro de uma média boa, e é justamente ele que o professor procura. */
  const ORDENS = {
    'media-maior': { campo: 'media', sinal: -1, rotulo: 'média' },
    'media-menor': { campo: 'media', sinal: 1, rotulo: 'média' },
    'ultima-maior': { campo: 'ultima_nota', sinal: -1, rotulo: 'última nota' },
    'ultima-menor': { campo: 'ultima_nota', sinal: 1, rotulo: 'última nota' },
  };
  // 'maior'/'menor' eram os valores da primeira versão, quando só havia média;
  // seguem valendo para não quebrar link já salvo.
  const APELIDOS = { maior: 'media-maior', menor: 'media-menor' };
  let ordem = (req.query.ordem || '').trim();
  if (APELIDOS[ordem]) ordem = APELIDOS[ordem];
  // valor que não existe volta ao padrão em vez de ficar num limbo em que a
  // lista sai numa ordem e o campo da tela não mostra nenhuma escolhida
  if (ordem !== 'az' && !ORDENS[ordem]) ordem = '';
  let alunos = todos;
  if (filtro === 'sem') {
    alunos = alunos.filter((a) => !(a.instituicao || '').trim());
  } else if (filtro) {
    alunos = alunos.filter((a) => db.chaveInstituicao(a.instituicao) === filtro);
  }
  if (turma === 'sem') {
    alunos = alunos.filter((a) => !(a.serie || '').trim());
  } else if (turma) {
    alunos = alunos.filter((a) => a.serie === turma);
  }
  if (busca) {
    alunos = alunos.filter((a) =>
      `${a.nome} ${a.email}`.toLowerCase().includes(busca));
  }

  /* Ordenação. Sem parâmetro fica como sempre foi, do cadastro mais recente para
     o mais antigo, para não mudar o que o professor já espera ver ao abrir.

     Por nome: localeCompare em pt-BR, senão "Álvaro" cai depois de "Zeca" —
     comparação por código de caractere joga todo acentuado para o fim, e os
     nomes cadastrados em minúscula junto.

     Por nota: quem nunca concluiu um simulado não tem nota nenhuma, e "sem nota"
     não é nota baixa. Esses alunos vão para o FIM nas duas direções; do
     contrário, "menor" abriria com quem sequer fez prova, escondendo justamente
     os alunos que o professor quer encontrar. Empate desempata por nome, para a
     lista não trocar de ordem sozinha entre um carregamento e outro. */
  const porNome = (a, b) =>
    // o `|| ''` não é adorno: um cadastro sem nome derrubaria a página inteira
    // com "cannot read properties of null", e é a página que o professor usa
    // para achar exatamente esse tipo de cadastro torto.
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
  if (ordem === 'az') {
    alunos = [...alunos].sort(porNome);
  } else if (ORDENS[ordem]) {
    const { campo, sinal } = ORDENS[ordem];
    alunos = [...alunos].sort((a, b) => {
      const x = a[campo];
      const y = b[campo];
      if (x == null && y == null) return porNome(a, b);
      if (x == null) return 1;
      if (y == null) return -1;
      if (x !== y) return (x - y) * sinal;
      return porNome(a, b);
    });
  }

  res.render('admin/usuarios', {
    title: 'Alunos e desempenho',
    description: '',
    alunos,
    escolas,
    semEscola: todos.filter((a) => !(a.instituicao || '').trim()).length,
    // só as turmas que de fato têm aluno, na ordem escolar
    turmas: series.SERIES
      .map((s) => ({ ...s, total: todos.filter((a) => a.serie === s.valor).length }))
      .filter((s) => s.total)
      .sort((a, b) => series.ordem(a.valor) - series.ordem(b.valor)),
    semTurma: todos.filter((a) => !(a.serie || '').trim()).length,
    rotuloSerie: series.rotulo,
    totalGeral: todos.length,
    filtro,
    turma,
    ordem,
    // o aviso de "sem nota" conta a coluna que está ordenando, não a média sempre
    rotuloOrdem: ORDENS[ordem] ? ORDENS[ordem].rotulo : '',
    semNota: ORDENS[ordem]
      ? alunos.filter((a) => a[ORDENS[ordem].campo] == null).length
      : 0,
    busca: req.query.q || '',
    recado: req.query.ok || '',
    layoutAdmin: true,
  });
});

/**
 * Nota do bimestre: provisória (o desempenho até aqui) e final (a mesma nota,
 * ou 0 para quem não fizer o mínimo de simulados). A regra vive em lib/notas.js;
 * aqui só se filtra e se ordena.
 */
router.get('/notas', (req, res) => {
  const todos = notas.todos();
  const calendario = notas.CALENDARIO;

  const filtro = (req.query.escola || '').trim();
  const turma = (req.query.serie || '').trim();
  const ordem = (req.query.ordem || 'risco').trim();

  let alunos = todos;
  if (filtro === 'sem') alunos = alunos.filter((a) => !(a.instituicao || '').trim());
  else if (filtro) alunos = alunos.filter((a) => db.chaveInstituicao(a.instituicao) === filtro);
  if (turma === 'sem') alunos = alunos.filter((a) => !(a.serie || '').trim());
  else if (turma) alunos = alunos.filter((a) => a.serie === turma);

  const porNome = (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
  /* O padrão é "risco": quem fez menos simulados primeiro. É a ordem que serve
     para agir — a lista alfabética só serve para procurar um aluno específico. */
  if (ordem === 'az') alunos = [...alunos].sort(porNome);
  else if (ordem === 'nota') {
    alunos = [...alunos].sort((a, b) => {
      if (a.notaProvisoria == null && b.notaProvisoria == null) return porNome(a, b);
      if (a.notaProvisoria == null) return 1;
      if (b.notaProvisoria == null) return -1;
      return b.notaProvisoria - a.notaProvisoria || porNome(a, b);
    });
  } else {
    alunos = [...alunos].sort((a, b) => a.concluidos - b.concluidos || porNome(a, b));
  }

  res.render('admin/notas', {
    title: 'Nota do bimestre',
    description: '',
    alunos,
    calendario,
    encerrada: notas.encerrada(),
    resumo: {
      alunos: alunos.length,
      atingiram: alunos.filter((a) => a.atingiuMinimo).length,
      semNenhum: alunos.filter((a) => a.concluidos === 0).length,
      semTempo: alunos.filter((a) => !a.aindaDaTempo).length,
    },
    escolas: db.instituicoes(),
    semEscola: todos.filter((a) => !(a.instituicao || '').trim()).length,
    turmas: series.SERIES
      .map((s) => ({ ...s, total: todos.filter((a) => a.serie === s.valor).length }))
      .filter((s) => s.total)
      .sort((a, b) => series.ordem(a.valor) - series.ordem(b.valor)),
    semTurma: todos.filter((a) => !(a.serie || '').trim()).length,
    rotuloSerie: series.rotulo,
    totalGeral: todos.length,
    filtro,
    turma,
    ordem,
    layoutAdmin: true,
  });
});

/**
 * Ficha de um aluno: os mesmos números que ele vê, mais o que ele marcou em
 * cada questão. Aqui a correção aparece sem esperar as 24 horas — o prazo existe
 * para o aluno não conferir o gabarito na hora, não para escondê-lo de quem
 * corrige.
 */
router.get('/usuarios/:id', (req, res, next) => {
  const aluno = db.usuarioPorId(Number(req.params.id));
  if (!aluno) return next();

  const lista = sim.historico(aluno.id).map((s) => ({
    ...s,
    itens: sim.questoesDo(s.id, { comRespostas: true }),
  }));

  res.render('admin/aluno', {
    title: `Desempenho de ${aluno.nome}`,
    description: '',
    aluno,
    d: desempenho.resumo(aluno.id),
    lista,
    emAberto: sim.emAberto(aluno.id),
    escolas: instituicoes.INSTITUICOES,
    etapas: series.porEtapa(),
    rotuloSerie: series.rotulo,
    erro: req.query.erro || '',
    recado: req.query.ok || '',
    layoutAdmin: true,
  });
});

/** Edita nome, e-mail e instituição. Senha tem rota própria. */
router.post('/usuarios/:id', (req, res, next) => {
  const id = Number(req.params.id);
  const aluno = db.usuarioPorId(id);
  if (!aluno) return next();

  const nome = (req.body.nome || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const instituicao = (req.body.instituicao || '').trim();
  const serie = (req.body.serie || '').trim();
  const volta = (msg) => res.redirect(`/admin/usuarios/${id}?erro=${encodeURIComponent(msg)}`);

  if (nome.length < 2) return volta('Informe o nome do aluno.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return volta('E-mail inválido.');

  // o e-mail é a chave de login: não pode colidir com outra conta
  const outro = db.usuarioPorEmail(email);
  if (outro && outro.id !== id) return volta('Já existe outra conta com esse e-mail.');

  db.atualizarUsuario(id, { nome, email, instituicao, serie });
  res.redirect(`/admin/usuarios/${id}?ok=${encodeURIComponent('Dados atualizados.')}`);
});

/**
 * Define uma senha nova para o aluno — para quando ele perde a dele.
 * A senha antiga é um hash e não se recupera; só se substitui.
 */
router.post('/usuarios/:id/senha', (req, res, next) => {
  const id = Number(req.params.id);
  const aluno = db.usuarioPorId(id);
  if (!aluno) return next();

  const senha = req.body.senha || '';
  if (senha.length < 8) {
    return res.redirect(`/admin/usuarios/${id}?erro=${encodeURIComponent('A senha precisa de pelo menos 8 caracteres.')}`);
  }
  db.trocarSenhaUsuario(id, bcrypt.hashSync(senha, 12));
  res.redirect(`/admin/usuarios/${id}?ok=${encodeURIComponent('Senha redefinida. Avise o aluno.')}`);
});

/**
 * Exclui a conta. Leva junto os simulados e as respostas, pelo CASCADE do
 * schema — não tem volta.
 *
 * Exige que o e-mail seja digitado no formulário e confere no servidor: a
 * confirmação do navegador sozinha não bastaria, e um clique errado numa lista
 * de vinte alunos apagaria o histórico de quem não devia.
 */
router.post('/usuarios/:id/excluir', (req, res, next) => {
  const id = Number(req.params.id);
  const aluno = db.usuarioPorId(id);
  if (!aluno) return next();

  const confirmacao = (req.body.confirmacao || '').trim().toLowerCase();
  if (confirmacao !== aluno.email.toLowerCase()) {
    return res.redirect(`/admin/usuarios/${id}?erro=${encodeURIComponent('Para excluir, digite o e-mail do aluno exatamente como está no cadastro.')}`);
  }

  const r = db.removerUsuario(id);
  const recado = `Conta de ${aluno.nome} excluída` + (r.simulados ? `, com ${r.simulados} simulado(s).` : '.');
  res.redirect(`/admin/usuarios?ok=${encodeURIComponent(recado)}`);
});

// ------------------------------------------------------------------ turmas

/**
 * Rendimento por turma. Sem `?turma=`, compara todas; com, abre o detalhe.
 * A pergunta aqui não é "como vai este aluno" — é "como vai esta turma, e quem
 * dentro dela precisa de atenção".
 */
router.get('/turmas', (req, res) => {
  const lista = turmasLib.turmas();
  const escolhida = (req.query.turma || '').trim();
  const alvo = lista.find((t) => t.chave === escolhida);

  res.render('admin/turmas', {
    title: alvo ? `Turma ${alvo.rotulo}` : 'Rendimento por turma',
    description: '',
    turmas: lista,
    escolhida,
    d: alvo ? turmasLib.detalhe(alvo.instituicao, alvo.serie) : null,
    layoutAdmin: true,
  });
});

module.exports = router;
