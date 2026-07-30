const express = require('express');
const db = require('../db');

const router = express.Router();

const { ROTULOS_TIPO, rotuloGenero } = require('../rotulos');
const { realce, semMarcacao } = require('../lib/realce');

router.use((req, res, next) => {
  res.locals.rotuloGenero = rotuloGenero;
  res.locals.realce = realce;
  next();
});

function tituloFiltro({ tipo, nivel, tema, genero, instituicao, banca, ano }) {
  const artigoInst = /^(enem|simulado)/i.test(instituicao || '') ? 'do' : 'da';
  if (banca && ano) return `Questões de inglês do ${banca} de ${ano}`;
  if (banca) return `Questões de inglês do ${banca} com gabarito comentado`;
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
    banca: req.query.banca || null,
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

// ------------------------------------------- vestibulares de medicina

const MED = require('../lib/medicina');

router.get('/medicina', (req, res) => {
  const filtros = {
    colecao: '',
    instituicoes: MED.INSTITUICOES,
    instituicao: req.query.instituicao || null,
    ano: req.query.ano ? Number(req.query.ano) || null : null,
    nivel: req.query.nivel || null,
    busca: req.query.q || null,
  };

  const todas = db.listar(filtros);

  // Facetas calculadas sobre o recorte, para não oferecer filtro que dá zero.
  const doRecorte = db.listar({ colecao: '', instituicoes: MED.INSTITUICOES });
  const contar = (campo) => {
    const m = new Map();
    doRecorte.forEach((q) => {
      const v = q[campo];
      if (v === null || v === undefined || v === '') return;
      m.set(v, (m.get(v) || 0) + 1);
    });
    return [...m.entries()].map(([valor, total]) => ({ valor, total }));
  };

  const porInstituicao = contar('instituicao')
    .map((i) => ({ ...i, nome: MED.nomeAmigavel(i.valor) }))
    .sort((a, b) => b.total - a.total);
  const porAno = contar('ano').sort((a, b) => b.valor - a.valor);
  const porNivel = contar('nivel_cefr').sort((a, b) => String(a.valor).localeCompare(String(b.valor)));

  const POR_PAGINA = 24;
  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, parseInt(req.query.pagina, 10) || 1), paginas);
  const questoes = todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const qsBase = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'pagina' && v) qsBase.append(k, v);
  });

  const inst = req.query.instituicao;
  res.render('publico/medicina', {
    title: inst
      ? `Questões de inglês do vestibular ${MED.nomeAmigavel(inst)} com gabarito`
      : 'Questões de inglês dos vestibulares de Medicina com gabarito',
    description: inst
      ? `Questões de inglês do vestibular de medicina ${MED.nomeAmigavel(inst)}, com texto original, cinco alternativas e gabarito comentado em português.`
      : 'Banco de questões de inglês dos vestibulares de Medicina — Albert Einstein, Famerp, Famema, Santa Casa e outros — com gabarito comentado em português.',
    questoes,
    encontradas: todas.length,
    total: doRecorte.length,
    porInstituicao,
    porAno,
    porNivel,
    filtros,
    pagina,
    paginas,
    qsBase: qsBase.toString(),
    nomeAmigavel: MED.nomeAmigavel,
    ROTULOS_TIPO,
  });
});

// --------------------------------------- coleções autorais (reading, use of english)

const { NIVEIS, COLECOES } = require('../lib/colecoes');

const POR_PAGINA_COLECAO = 24;

// Uma única rota serve todas as coleções: a configuração vem de lib/colecoes.js.
Object.values(COLECOES).forEach((col) => {
  router.get(col.caminho, (req, res) => {
    const nivel = NIVEIS.includes(req.query.nivel) ? req.query.nivel : null;
    const filtros = {
      colecao: col.chave,
      nivel,
      genero: req.query.genero || null,
      busca: req.query.q || null,
    };

    const facetas = db.facetas(col.chave);
    const porNivel = NIVEIS.map((n) => ({
      nivel: n,
      total: facetas.niveis.find((f) => f.valor === n)?.total || 0,
      descricao: col.niveis[n],
    }));

    const todas = db.listar(filtros);
    const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA_COLECAO));
    const pagina = Math.min(Math.max(1, parseInt(req.query.pagina, 10) || 1), paginas);
    const questoes = todas.slice((pagina - 1) * POR_PAGINA_COLECAO, pagina * POR_PAGINA_COLECAO);

    const qsBase = new URLSearchParams();
    Object.entries(req.query).forEach(([k, v]) => {
      if (k !== 'pagina' && v) qsBase.append(k, v);
    });

    // ?nivel= não é filtro descartável nesta rota: cada nível tem título, meta
    // description e H1 próprios, e é uma página de destino de verdade. Só ela
    // se autocanoniza; qualquer outro filtro (gênero, busca, paginação) volta
    // a ser recorte e sai do índice pela regra geral.
    const soNivel = nivel && Object.keys(req.query).every((k) => k === 'nivel');
    if (soNivel && todas.length) {
      res.locals.canonical = `${res.locals.SITE_URL.replace(/\/$/, '')}${col.caminho}?nivel=${nivel}`;
      res.locals.comFiltro = false;
    }

    res.render('publico/colecao', {
      title: nivel ? col.tituloNivel(nivel, todas.length) : col.tituloBase,
      description: nivel ? col.descricaoNivel(nivel, todas.length) : col.descricaoBase,
      col,
      questoes,
      encontradas: todas.length,
      pagina,
      paginas,
      qsBase: qsBase.toString(),
      filtros,
      nivel,
      porNivel,
      facetas,
      total: db.contar({ colecao: col.chave }),
      ROTULOS_TIPO,
    });
  });
});

const REDIRECIONAMENTOS = require('../lib/redirecionamentos');

router.get('/questoes/:slug', (req, res, next) => {
  // Duplicata despublicada: manda para a versão que ficou, em vez de 404.
  const destino = REDIRECIONAMENTOS[req.params.slug];
  if (destino) return res.redirect(301, `/questoes/${destino}`);

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
        text: semMarcacao(questao.enunciado),
        suggestedAnswer: questao.alternativas
          .filter((a) => a.letra !== questao.gabarito)
          .map((a, i) => ({ '@type': 'Answer', position: i, text: `${a.letra}) ${semMarcacao(a.texto)}` })),
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${questao.gabarito}) ${
            semMarcacao(questao.alternativas.find((a) => a.letra === questao.gabarito)?.texto)
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

// Um <loc> precisa ser uma URL válida e com as entidades XML escapadas.
// encodeURI cobre espaço e acento; o resto é o que a spec do sitemap exige.
const paraLoc = (url) =>
  encodeURI(url)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

router.get('/sitemap.xml', (req, res) => {
  const base = res.locals.SITE_URL.replace(/\/$/, '');
  const questoes = db.listar();

  // Só páginas canônicas. As listagens filtradas de /questoes são recortes
  // finos do mesmo acervo e ficaram de fora; os níveis das coleções entram
  // porque têm título, descrição e conteúdo próprios — e só os que têm
  // questões, para não anunciar página vazia.
  const urls = [
    { loc: `${base}/`, prio: '1.0' },
    { loc: `${base}/questoes`, prio: '0.9' },
    ...Object.values(COLECOES).flatMap((c) => [
      { loc: `${base}${c.caminho}`, prio: '0.9' },
      ...(() => {
        const porNivel = db.facetas(c.chave).niveis;
        return NIVEIS.filter((n) => (porNivel.find((f) => f.valor === n)?.total || 0) > 0).map(
          (n) => ({ loc: `${base}${c.caminho}?nivel=${n}`, prio: '0.7' })
        );
      })(),
    ]),
    { loc: `${base}/montar-prova`, prio: '0.7' },
    { loc: `${base}/gramatica`, prio: '0.9' },
    ...require('../lib/gramatica')
      .niveis()
      .flatMap((n) => n.topicos.map((t) => ({ loc: `${base}/gramatica/${t.slug}`, prio: '0.8' }))),
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
            `  <url><loc>${paraLoc(u.loc)}</loc>${
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
