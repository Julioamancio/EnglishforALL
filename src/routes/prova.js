const express = require('express');
const db = require('../db');
const { gerarPDF } = require('../lib/prova-pdf');
const { gerarDOCX } = require('../lib/prova-docx');

const router = express.Router();

function exigirLogin(req, res, next) {
  if (req.session.admin || req.session.usuario) return next();
  res.redirect('/entrar?voltar=' + encodeURIComponent(req.originalUrl));
}

router.use(exigirLogin);

const { ROTULOS_TIPO, rotuloGenero } = require('../rotulos');

router.use((req, res, next) => {
  res.locals.rotuloGenero = rotuloGenero;
  next();
});

const POR_PAGINA = 25;

router.get('/', (req, res) => {
  const filtros = {
    tipo: req.query.tipo || null,
    nivel: req.query.nivel || null,
    tema: req.query.tema || null,
    genero: req.query.genero || null,
    instituicao: req.query.instituicao || null,
    ano: req.query.ano || null,
    busca: req.query.q || null,
    // Rascunhos só aparecem para o admin.
    publicada: req.session.admin ? null : 1,
  };

  const todas = db.listar(filtros);
  const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas);
  const questoes = todas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  // Query string sem "pagina", para os links de paginação remontarem o filtro.
  const base = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'pagina' && v) base.append(k, v);
  });
  const qsBase = base.toString();

  res.render('admin/montar', {
    title: 'Montar prova',
    description: '',
    questoes,
    total: todas.length,
    pagina: atual,
    paginas,
    qsBase,
    filtros,
    facetas: db.facetas(),
    ROTULOS_TIPO,
    erro: req.query.erro || null,
    layoutAdmin: true,
  });
});

function coletar(req) {
  let ids = req.body.questoes || [];
  if (!Array.isArray(ids)) ids = [ids];
  ids = ids.map(Number).filter(Boolean);

  return {
    ids,
    titulo: (req.body.titulo_prova || 'Prova de Língua Inglesa').trim(),
    escola: (req.body.escola || '').trim(),
    turma: (req.body.turma || '').trim(),
    comGabarito: req.body.com_gabarito === '1',
  };
}

function nomeArquivo(titulo, ext) {
  const limpo = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${limpo || 'prova'}.${ext}`;
}

router.post('/pdf', (req, res, next) => {
  const { ids, titulo, escola, turma, comGabarito } = coletar(req);
  if (!ids.length) return res.redirect('/prova?erro=vazio');

  let questoes = db.porIds(ids);
  if (!req.session.admin) questoes = questoes.filter((q) => q.publicada);
  if (!questoes.length) return res.redirect('/prova?erro=vazio');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${nomeArquivo(titulo, 'pdf')}"`
  );

  try {
    gerarPDF(res, { titulo, escola, turma, questoes, comGabarito });
  } catch (e) {
    next(e);
  }
});

router.post('/docx', async (req, res, next) => {
  const { ids, titulo, escola, turma, comGabarito } = coletar(req);
  if (!ids.length) return res.redirect('/prova?erro=vazio');

  try {
    let questoes = db.porIds(ids);
    if (!req.session.admin) questoes = questoes.filter((q) => q.publicada);
    if (!questoes.length) return res.redirect('/prova?erro=vazio');
    const buffer = await gerarDOCX({ titulo, escola, turma, questoes, comGabarito });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomeArquivo(titulo, 'docx')}"`
    );
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
