const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');
const db = require('../db');

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

router.get('/usuarios', (req, res) => {
  res.render('admin/usuarios', {
    title: 'Usuários cadastrados',
    description: '',
    usuarios: db.usuarios(),
    layoutAdmin: true,
  });
});

module.exports = router;
