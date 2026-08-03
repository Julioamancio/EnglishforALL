// Carrega o conteúdo de gramática de conteudo/gramatica/*.json (um arquivo
// por nível CEFR). Leitura única no boot — conteúdo é estático.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'conteudo', 'gramatica');
const ORDEM = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

let _niveis = [];
let _porSlug = new Map();

/**
 * Normaliza para busca: sem acento, minúsculo, sem pontuação.
 *
 * Sem acento porque quem procura "negacao" ou "condicoes" com o teclado
 * apressado tem que achar. Sem pontuação porque "Verb to be (am, is, are)"
 * precisa casar com quem digita "verb to be am".
 */
function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * O texto pelo qual um tópico pode ser encontrado.
 *
 * Título, subtítulo e resumo — a identidade do tópico. O corpo (diálogo,
 * exercícios) fica de fora de propósito: "past" aparece no meio de dezenas de
 * explicações, e uma busca que devolve tudo não ajuda ninguém a decidir se o
 * tópico existe. Entra também o nível, para dar certo procurar por "B1".
 */
function indexar(t, nivel) {
  return normalizar([nivel, t.titulo, t.subtitulo, t.resumo].join(' '));
}

/**
 * Marca quais tópicos casam com o termo, sem tirar nenhum da lista.
 *
 * Marcar em vez de filtrar é o que faz a busca servir aos dois mundos: a view
 * esconde os que não casam com o atributo `hidden`, que o navegador respeita
 * sem JS nenhum, e o filtro instantâneo continua com os 60 tópicos no DOM — daí
 * apagar o campo devolver todos, mesmo para quem chegou por um link com ?q=.
 * Se o servidor omitisse os não-casados, limpar a busca não teria o que mostrar.
 *
 * Todas as palavras precisam aparecer, em qualquer ordem: quem digita "past
 * simple" acha "Past Simple" e também "Present Perfect vs Past Simple", mas não
 * todo tópico que por acaso fala de passado.
 */
function buscar(termo) {
  const palavras = normalizar(termo).split(' ').filter(Boolean);
  const niveis = _niveis.map((n) => {
    const topicos = n.topicos.map((t) => ({
      ...t,
      casa: palavras.every((p) => t.busca.includes(p)),
    }));
    return { ...n, topicos, casam: topicos.filter((t) => t.casa).length };
  });
  return { niveis, encontrados: niveis.reduce((s, n) => s + n.casam, 0) };
}

function carregar() {
  _niveis = [];
  _porSlug = new Map();
  if (!fs.existsSync(DIR)) return;

  for (const nivel of ORDEM) {
    const arq = path.join(DIR, nivel.toLowerCase() + '.json');
    if (!fs.existsSync(arq)) continue;
    let dados;
    try {
      dados = JSON.parse(fs.readFileSync(arq, 'utf8'));
    } catch (e) {
      console.error(`gramatica: erro ao ler ${arq}:`, e.message);
      continue;
    }
    const topicos = (dados.topicos || []).map((t) => ({ ...t, nivel, busca: indexar(t, nivel) }));
    _niveis.push({
      nivel,
      titulo: dados.titulo || nivel,
      descricao: dados.descricao || '',
      topicos,
    });
    for (const t of topicos) _porSlug.set(t.slug, t);
  }
}

carregar();

module.exports = {
  recarregar: carregar,
  niveis: () => _niveis,
  buscar,
  normalizar,
  total: () => _porSlug.size,
  porSlug: (slug) => _porSlug.get(slug) || null,
  vizinhos(topico) {
    const grupo = _niveis.find((n) => n.nivel === topico.nivel);
    if (!grupo) return { anterior: null, proximo: null };
    const i = grupo.topicos.findIndex((t) => t.slug === topico.slug);
    return {
      anterior: i > 0 ? grupo.topicos[i - 1] : null,
      proximo: i >= 0 && i < grupo.topicos.length - 1 ? grupo.topicos[i + 1] : null,
    };
  },
};
