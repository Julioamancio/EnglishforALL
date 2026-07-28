// Grammar Exercises: testes de consolidação por tópico, usando o campo
// "exercicios" carregado junto com o conteúdo de gramática.
const express = require('express');
const gramatica = require('../lib/gramatica');

const router = express.Router();

router.get('/exercicios', (req, res) => {
  const niveis = gramatica
    .niveis()
    .map((n) => ({ ...n, topicos: n.topicos.filter((t) => (t.exercicios || []).length) }))
    .filter((n) => n.topicos.length);
  res.render('publico/exercicios', {
    title: 'Grammar Exercises: testes de inglês por tópico, do A1 ao C2',
    description:
      'Testes de gramática inglesa com correção na hora e explicação em português: 10 questões por tópico, do A1 ao C2.',
    niveis,
  });
});

router.get('/exercicios/:slug', (req, res, next) => {
  const topico = gramatica.porSlug(req.params.slug);
  if (!topico || !(topico.exercicios || []).length) return next();

  res.render('publico/exercicios-teste', {
    title: `Teste: ${topico.titulo} — ${topico.exercicios.length} questões (${topico.nivel})`,
    description: `Teste de ${topico.titulo} nível ${topico.nivel}: ${topico.exercicios.length} questões de múltipla escolha com gabarito explicado em português.`,
    topico,
    vizinhos: gramatica.vizinhos(topico),
  });
});

module.exports = router;
