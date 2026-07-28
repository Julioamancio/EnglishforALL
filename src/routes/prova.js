const express = require('express');
const db = require('../db');
const { gerarPDF } = require('../lib/prova-pdf');
const { gerarDOCX } = require('../lib/prova-docx');

const router = express.Router();

function exigirLogin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
}

router.use(exigirLogin);

const { ROTULOS_TIPO, rotuloGenero } = require('../rotulos');

router.use((req, res, next) => {
  res.locals.rotuloGenero = rotuloGenero;
  next();
});

router.get('/', (req, res) => {
  const filtros = {
    tipo: req.query.tipo || null,
    nivel: req.query.nivel || null,
    tema: req.query.tema || null,
    genero: req.query.genero || null,
    busca: req.query.q || null,
    publicada: null,
  };

  res.render('admin/montar', {
    title: 'Montar prova',
    description: '',
    questoes: db.listar(filtros),
    filtros,
    facetas: db.facetas(),
    ROTULOS_TIPO,
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

  const questoes = db.porIds(ids);

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
    const questoes = db.porIds(ids);
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
