// Carrega o conteúdo de gramática de conteudo/gramatica/*.json (um arquivo
// por nível CEFR). Leitura única no boot — conteúdo é estático.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'conteudo', 'gramatica');
const ORDEM = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

let _niveis = [];
let _porSlug = new Map();

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
    const topicos = (dados.topicos || []).map((t) => ({ ...t, nivel }));
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
