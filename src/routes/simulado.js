/**
 * Simulado oficial semanal — rotas.
 *
 * Tudo aqui é pessoal, então tudo exige login e tudo confere o dono antes de
 * responder. O conteúdo público do site (questões, coleções, gramática) segue
 * aberto como sempre: quem protege são estas rotas, não o site inteiro.
 */
const express = require('express');
const sim = require('../lib/simulado');
const desempenho = require('../lib/desempenho');
const { realce } = require('../lib/realce');

const router = express.Router();

function exigirLogin(req, res, next) {
  if (req.session.usuario) return next();
  const voltar = encodeURIComponent(req.originalUrl);
  return res.redirect(`/entrar?voltar=${voltar}`);
}

router.use(exigirLogin);

// as views usam realce() como o resto do site
router.use((req, res, next) => {
  res.locals.realce = realce;
  next();
});

const base = (req) => ({ usuario: req.session.usuario });

// ------------------------------------------------------------ o simulado da vez

router.get('/', (req, res, next) => {
  const { simulado, erro } = sim.atual(req.session.usuario.id);

  if (erro || !simulado) {
    return res.render('publico/simulado-vazio', {
      title: 'Simulado oficial',
      description: 'Simulado oficial semanal de inglês.',
      motivo: erro || 'indisponível',
      ...base(req),
    });
  }

  // concluído: mostra a espera das 24 h ou manda para a correção
  if (simulado.concluido_em) {
    const g = sim.gabaritoLiberado(simulado);
    return res.render('publico/simulado-concluido', {
      title: 'Simulado concluído',
      description: 'Resultado do seu simulado oficial.',
      simulado,
      gabarito: g,
      proxima: sim.semanaAtual(),
      ...base(req),
    });
  }

  const questoes = sim.questoesDo(simulado.id);
  const respondidas = questoes.filter((q) => q.resposta).length;
  res.render('publico/simulado', {
    title: 'Simulado oficial da semana',
    description: 'Cinco questões de ENEM e vestibulares de medicina, sem consulta.',
    simulado,
    questoes,
    respondidas,
    atualIndice: questoes.findIndex((q) => !q.resposta),
    ...base(req),
  });
});

// ------------------------------------------------------------------- responder

router.post('/responder', (req, res, next) => {
  const simuladoId = Number(req.body.simulado_id);
  const questaoId = Number(req.body.questao_id);
  const letra = String(req.body.resposta || '').trim().toUpperCase();

  const simulado = sim.doUsuario(simuladoId, req.session.usuario.id);
  if (!simulado) return res.status(404).redirect('/simulado');
  if (simulado.concluido_em) return res.redirect('/simulado');
  if (!['A', 'B', 'C', 'D', 'E'].includes(letra)) return res.redirect('/simulado');

  // Resposta já gravada não muda: recarregar a página ou reenviar o formulário
  // não sobrescreve nada. Quem garante isso é o lib, não o navegador.
  sim.responder(simuladoId, questaoId, letra);
  res.redirect('/simulado');
});

// -------------------------------------------------------------------- histórico

router.get('/historico', (req, res) => {
  res.render('publico/simulado-historico', {
    title: 'Meus simulados',
    description: 'Histórico dos seus simulados oficiais.',
    lista: sim.historico(req.session.usuario.id),
    ...base(req),
  });
});

// um simulado do histórico, com ou sem gabarito conforme o prazo
router.get('/historico/:id', (req, res, next) => {
  const simulado = sim.doUsuario(Number(req.params.id), req.session.usuario.id);
  if (!simulado || !simulado.concluido_em) return next();

  const g = sim.gabaritoLiberado(simulado);
  // Antes das 24 h o gabarito nem é carregado do banco: o que o servidor não
  // manda, a página não tem como mostrar.
  const questoes = sim.questoesDo(simulado.id, { comRespostas: g.liberado });

  res.render('publico/simulado-revisao', {
    title: `Simulado de ${simulado.concluido_em.slice(0, 10).split('-').reverse().join('/')}`,
    description: 'Revisão do seu simulado oficial.',
    simulado,
    questoes,
    gabarito: g,
    ...base(req),
  });
});

// ------------------------------------------------------------------ desempenho

router.get('/desempenho', (req, res) => {
  res.render('publico/simulado-desempenho', {
    title: 'Meu desempenho',
    description: 'Sua evolução nos simulados oficiais.',
    d: desempenho.resumo(req.session.usuario.id),
    ...base(req),
  });
});

module.exports = router;
