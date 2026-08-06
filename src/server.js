require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');
const fs = require('fs');
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

// Sessão em arquivo próprio, e não em memória: reiniciar o serviço (todo deploy
// reinicia) não desloga mais ninguém nem interrompe um simulado em andamento.
// Banco separado do acervo para que uma limpeza de sessões nunca encoste nas
// questões.
const CAMINHO_SESSOES = process.env.SESSIONS_PATH
  || path.join(__dirname, '../dados/sessoes.db');
fs.mkdirSync(path.dirname(CAMINHO_SESSOES), { recursive: true });

/* O segredo da sessão sem valor fixo de reserva.
 *
 * Em 06/08/2026 o `.env` teve o dono trocado por engano e a aplicação, que roda
 * como www-data, deixou de conseguir lê-lo. O site continuou de pé porque quase
 * tudo tem padrão — e o padrão do segredo era uma constante escrita aqui, num
 * repositório PÚBLICO. Por uns cinquenta minutos qualquer pessoa que conhecesse
 * o código podia assinar um cookie de sessão válido.
 *
 * Reserva aleatória em vez de fixa: continua subindo (derrubar o site por causa
 * de configuração é pior), mas ninguém consegue forjar sessão, e o sintoma —
 * todo mundo deslogado a cada reinício — aparece rápido em vez de ficar mudo.
 */
const SEGREDO_SESSAO = process.env.SESSION_SECRET
  || require('crypto').randomBytes(32).toString('hex');

if (!process.env.SESSION_SECRET) {
  console.error(
    '[ATENCAO] SESSION_SECRET nao chegou ao processo. Usando um segredo '
      + 'aleatorio: todo reinicio vai deslogar todo mundo. Confira se o .env '
      + 'existe E se o usuario do servico consegue le-lo (ls -l .env).'
  );
}
if (!process.env.ADMIN_SENHA_HASH) {
  console.error('[ATENCAO] ADMIN_SENHA_HASH nao chegou ao processo: o painel nao abre.');
}

app.use(
  session({
    store: new SqliteStore({
      client: new Database(CAMINHO_SESSOES),
      expired: { clear: true, intervalMs: 15 * 60 * 1000 },
    }),
    secret: SEGREDO_SESSAO,
    resave: false,
    saveUninitialized: false,
    // renova o prazo a cada requisição: quem está usando o site não é
    // desconectado no meio de um simulado
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 30,
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
// Área pessoal do aluno: exige login dentro do próprio router. O conteúdo
// público do site continua aberto, como sempre foi.
app.use('/simulado', require('./routes/simulado'));

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
