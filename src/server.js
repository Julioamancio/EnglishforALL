require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

const PORTA = process.env.PORT || 8098;
const SITE_URL = process.env.SITE_URL || 'https://ingles.destruitor.com.br';

// Atrás do nginx: necessário para cookie secure e req.protocol corretos.
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));

app.use(
  '/uploads',
  express.static(path.join(__dirname, '../public/uploads'), {
    maxAge: '30d',
    immutable: true,
  })
);
app.use(express.static(path.join(__dirname, '../public'), { maxAge: '7d' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'troque-isto-no-env',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 12,
    },
  })
);

// Disponível em todas as views.
app.use((req, res, next) => {
  res.locals.SITE_URL = SITE_URL;
  res.locals.caminho = req.path;
  res.locals.logado = Boolean(req.session.admin);
  res.locals.usuario = req.session.usuario || null;
  res.locals.canonical = SITE_URL.replace(/\/$/, '') + req.path;
  // Listagem filtrada (?tema=, ?nivel=, ...) é recorte do acervo: o canonical
  // já aponta para a página sem filtro, e a versão com query sai do índice.
  res.locals.comFiltro = Object.keys(req.query).length > 0;
  next();
});

app.use(require('./lib/menu').middleware);

app.use('/', require('./routes/conta'));
app.use('/', require('./routes/publico'));
app.use('/', require('./routes/exercicios'));
app.use('/admin', require('./routes/admin'));
app.use('/prova', require('./routes/prova'));

app.use((req, res) => {
  res.status(404).render('publico/404', {
    title: 'Página não encontrada',
    description: 'A página que você procurou não existe neste banco de questões.',
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  const codigo = err.status || 500;
  res.status(codigo).render('publico/erro', {
    title: 'Algo deu errado',
    description: 'Ocorreu um erro ao processar esta página.',
    mensagem: process.env.NODE_ENV === 'production' ? '' : err.message,
  });
});

app.listen(PORTA, () => {
  console.log(`Banco de questões rodando em http://127.0.0.1:${PORTA}`);
});
