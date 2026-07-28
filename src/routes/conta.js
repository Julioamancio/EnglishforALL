const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// Só aceita caminhos internos ("/prova"), nunca URLs externas.
function destinoSeguro(valor) {
  if (typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//')) {
    return valor;
  }
  return '/prova';
}

function jaLogado(req, res, next) {
  if (req.session.usuario || req.session.admin) return res.redirect('/prova');
  next();
}

// ------------------------------------------------------------- cadastro

router.get('/cadastro', jaLogado, (req, res) => {
  res.render('publico/cadastro', {
    title: 'Criar conta grátis',
    description:
      'Crie sua conta gratuita para montar provas de inglês em PDF e Word com as questões do banco.',
    erro: null,
    valores: { nome: '', email: '' },
    voltar: destinoSeguro(req.query.voltar),
  });
});

router.post('/cadastro', jaLogado, (req, res) => {
  const nome = (req.body.nome || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const senha = req.body.senha || '';
  const voltar = destinoSeguro(req.body.voltar);

  const reRender = (erro, status = 400) =>
    res.status(status).render('publico/cadastro', {
      title: 'Criar conta grátis',
      description: '',
      erro,
      valores: { nome, email },
      voltar,
    });

  if (nome.length < 2) return reRender('Informe seu nome.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reRender('Informe um e-mail válido.');
  if (senha.length < 8) return reRender('A senha precisa ter pelo menos 8 caracteres.');
  if (db.usuarioPorEmail(email)) {
    return reRender('Já existe uma conta com esse e-mail. Tente entrar.', 409);
  }

  const id = db.criarUsuario(nome, email, bcrypt.hashSync(senha, 12));
  db.salvarAssinante(email, 'cadastro');

  req.session.usuario = { id, nome, email };
  res.redirect(voltar);
});

// -------------------------------------------------------------- entrar

router.get('/entrar', jaLogado, (req, res) => {
  res.render('publico/entrar', {
    title: 'Entrar na sua conta',
    description: 'Entre na sua conta para montar provas de inglês em PDF e Word.',
    erro: null,
    email: '',
    voltar: destinoSeguro(req.query.voltar),
  });
});

router.post('/entrar', jaLogado, (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const senha = req.body.senha || '';
  const voltar = destinoSeguro(req.body.voltar);

  const usuario = db.usuarioPorEmail(email);
  const ok = usuario && bcrypt.compareSync(senha, usuario.senha_hash);

  if (!ok) {
    return res.status(401).render('publico/entrar', {
      title: 'Entrar na sua conta',
      description: '',
      erro: 'E-mail ou senha incorretos.',
      email,
      voltar,
    });
  }

  req.session.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email };
  res.redirect(voltar);
});

// ---------------------------------------------------------------- sair

router.post('/sair', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
