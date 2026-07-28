const express = require('express');
const db = require('../db');

const router = express.Router();

const { ROTULOS_TIPO, rotuloGenero } = require('../rotulos');

router.use((req, res, next) => {
  res.locals.rotuloGenero = rotuloGenero;
  next();
});

function tituloFiltro({ tipo, nivel, tema, genero, instituicao, ano }) {
  const artigoInst = /^(enem|simulado)/i.test(instituicao || '') ? 'do' : 'da';
  if (instituicao && ano) return `Questões de inglês ${artigoInst} ${instituicao} de ${ano}`;
  if (instituicao) return `Questões de inglês ${artigoInst} ${instituicao}`;
  if (ano) return `Questões de inglês de ${ano}`;
  if (tipo) return `Questões de inglês do ENEM: ${ROTULOS_TIPO[tipo] || tipo}`;
  if (nivel) return `Questões de inglês nível ${nivel} com gabarito`;
  if (tema) return `Questões de inglês do ENEM sobre ${tema.replace(/-/g, ' ')}`;
  if (genero) return `Questões de inglês do ENEM com ${genero}`;
  return 'Todas as questões de inglês estilo ENEM';
}

router.get('/', (req, res) => {
  const recentes = db.listar({ limite: 12, colecao: '' });
  res.render('publico/home', {
    title: 'Questões de inglês do ENEM com gabarito comentado',
    description:
      'Banco gratuito de questões de inglês no estilo ENEM: texto autêntico com fonte citada, cinco alternativas e gabarito comentado. Filtre por tipo, nível CEFR e gênero textual.',
    recentes,
    facetas: db.facetas(''),
    total: db.contar({ colecao: '' }),
    totalReading: db.contar({ colecao: 'reading' }),
    ROTULOS_TIPO,
  });
});

router.get('/questoes', (req, res) => {
  const filtros = {
    tipo: req.query.tipo || null,
    nivel: req.query.nivel || null,
    tema: req.query.tema || null,
    genero: req.query.genero || null,
    instituicao: req.query.instituicao || null,
    ano: req.query.ano ? Number(req.query.ano) || null : null,
    busca: req.query.q || null,
    // O acervo de provas não se mistura com a coleção autoral de reading.
    colecao: '',
  };

  const questoes = db.listar(filtros);

  res.render('publico/lista', {
    title: tituloFiltro(filtros),
    description: `${questoes.length} questões de inglês no estilo ENEM com gabarito comentado, texto autêntico e fonte citada.`,
    questoes,
    filtros,
    facetas: db.facetas(''),
    ROTULOS_TIPO,
  });
});

// ------------------------------------------------- coleção de reading (A1–C2)

const NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const DESCRICAO_NIVEL = {
  A1: 'Frases curtas no presente, vocabulário do dia a dia. Primeiro contato com leitura em inglês.',
  A2: 'Textos com passado simples e conectores básicos. Situações concretas e familiares.',
  B1: 'Textos de opinião e reportagem. Já exigem inferência e leitura de conectores.',
  B2: 'Argumentação com nuance e ironia leve. Nível típico das provas do ENEM.',
  C1: 'Ensaio e crítica: metáfora, ambiguidade e tese implícita.',
  C2: 'Prosa densa de proficiência. Paradoxo, mudança de registro e leitura nas entrelinhas.',
};

router.get('/reading', (req, res) => {
  const nivel = NIVEIS.includes(req.query.nivel) ? req.query.nivel : null;
  const filtros = {
    colecao: 'reading',
    nivel,
    genero: req.query.genero || null,
    busca: req.query.q || null,
  };

  const facetas = db.facetas('reading');
  const porNivel = NIVEIS.map((n) => ({
    nivel: n,
    total: facetas.niveis.find((f) => f.valor === n)?.total || 0,
    descricao: DESCRICAO_NIVEL[n],
  }));

  const todas = db.listar(filtros);
  const POR_PAGINA = 24;
  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, parseInt(req.query.pagina, 10) || 1), paginas);
  const questoes = todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const qsBase = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'pagina' && v) qsBase.append(k, v);
  });

  res.render('publico/reading', {
    title: nivel
      ? `Reading em inglês nível ${nivel}: ${todas.length} textos com gabarito`
      : 'Reading em inglês do A1 ao C2 com gabarito comentado',
    description: nivel
      ? `${todas.length} textos originais de reading nível ${nivel} com questão de interpretação, cinco alternativas e gabarito comentado em português.`
      : 'Coleção de textos originais de reading em inglês, organizados do A1 ao C2, cada um com questão de interpretação e gabarito comentado em português.',
    questoes,
    encontradas: todas.length,
    pagina,
    paginas,
    qsBase: qsBase.toString(),
    filtros,
    nivel,
    porNivel,
    facetas,
    total: db.contar({ colecao: 'reading' }),
    ROTULOS_TIPO,
  });
});

router.get('/questoes/:slug', (req, res, next) => {
  const questao = db.porSlug(req.params.slug);
  if (!questao) return next();

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: questao.titulo,
    educationalLevel: `CEFR ${questao.nivel_cefr}`,
    inLanguage: 'pt-BR',
    learningResourceType: 'Practice problem',
    hasPart: [
      {
        '@type': 'Question',
        eduQuestionType: 'Multiple choice',
        name: questao.titulo,
        text: questao.enunciado,
        suggestedAnswer: questao.alternativas
          .filter((a) => a.letra !== questao.gabarito)
          .map((a, i) => ({ '@type': 'Answer', position: i, text: `${a.letra}) ${a.texto}` })),
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${questao.gabarito}) ${
            questao.alternativas.find((a) => a.letra === questao.gabarito)?.texto || ''
          }`,
          explanation: questao.comentario,
        },
      },
    ],
  };

  res.render('publico/questao', {
    title: questao.titulo,
    description: questao.meta_description || questao.enunciado.slice(0, 155),
    questao,
    relacionadas: db.relacionadas(questao),
    jsonld,
    ROTULOS_TIPO,
  });
});

// -------------------------------------------------------------- gramática

const gramatica = require('../lib/gramatica');

router.get('/gramatica', (req, res) => {
  res.render('publico/gramatica', {
    title: 'Grammar: gramática de inglês do A1 ao C2, explicada em português',
    description:
      'Guia completo de gramática inglesa por nível CEFR (A1 ao C2): explicações em português, diálogos com personagens, erros comuns e mini-testes.',
    niveis: gramatica.niveis(),
    totalTopicos: gramatica.total(),
  });
});

router.get('/gramatica/:slug', (req, res, next) => {
  const topico = gramatica.porSlug(req.params.slug);
  if (!topico) return next();

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${topico.titulo} — gramática de inglês nível ${topico.nivel}`,
    inLanguage: 'pt-BR',
    about: 'English grammar',
    educationalLevel: `CEFR ${topico.nivel}`,
    learningResourceType: 'Reading material',
  };

  res.render('publico/gramatica-topico', {
    title: `${topico.titulo} — gramática ${topico.nivel} explicada`,
    description: (topico.resumo || '').slice(0, 155),
    topico,
    vizinhos: gramatica.vizinhos(topico),
    jsonld,
  });
});

router.get('/montar-prova', (req, res) => {
  // Quem já tem sessão vai direto para o montador.
  if (req.session.usuario || req.session.admin) return res.redirect('/prova');
  res.render('publico/montar-prova', {
    title: 'Monte uma prova de inglês em PDF e Word',
    description:
      'Escolha questões do banco e gere uma prova formatada com cabeçalho e gabarito, pronta para imprimir, em PDF ou Word.',
  });
});

router.post('/montar-prova', (req, res) => {
  const email = (req.body.email || '').trim();
  if (email && email.includes('@')) {
    db.salvarAssinante(email, 'montar-prova');
  }
  res.redirect('/montar-prova?ok=1');
});

// -------------------------------------------------------------- SEO

router.get('/sitemap.xml', (req, res) => {
  const base = res.locals.SITE_URL.replace(/\/$/, '');
  const questoes = db.listar();
  const f = db.facetas();

  const urls = [
    { loc: `${base}/`, prio: '1.0' },
    { loc: `${base}/questoes`, prio: '0.9' },
    { loc: `${base}/reading`, prio: '0.9' },
    ...NIVEIS.map((n) => ({ loc: `${base}/reading?nivel=${n}`, prio: '0.7' })),
    { loc: `${base}/montar-prova`, prio: '0.7' },
    { loc: `${base}/gramatica`, prio: '0.9' },
    ...require('../lib/gramatica')
      .niveis()
      .flatMap((n) => n.topicos.map((t) => ({ loc: `${base}/gramatica/${t.slug}`, prio: '0.8' }))),
    ...f.tipos.map((t) => ({ loc: `${base}/questoes?tipo=${t.valor}`, prio: '0.6' })),
    ...f.niveis.map((n) => ({ loc: `${base}/questoes?nivel=${n.valor}`, prio: '0.6' })),
    ...f.temas.map((t) => ({ loc: `${base}/questoes?tema=${t.valor}`, prio: '0.6' })),
    ...f.instituicoes.map((i) => ({
      loc: `${base}/questoes?instituicao=${encodeURIComponent(i.valor)}`,
      prio: '0.6',
    })),
    ...questoes.map((q) => ({
      loc: `${base}/questoes/${q.slug}`,
      prio: '0.8',
      lastmod: (q.atualizada_em || '').slice(0, 10),
    })),
  ];

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url><loc>${u.loc}</loc>${
              u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''
            }<priority>${u.prio}</priority></url>`
        )
        .join('\n') +
      `\n</urlset>\n`
  );
});

router.get('/robots.txt', (req, res) => {
  const base = res.locals.SITE_URL.replace(/\/$/, '');
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /prova\n\nSitemap: ${base}/sitemap.xml\n`
  );
});

module.exports = router;
