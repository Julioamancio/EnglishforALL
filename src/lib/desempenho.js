/**
 * Desempenho pessoal nos simulados oficiais.
 *
 * O recorte é sempre o mesmo: só entram simulados concluídos do próprio usuário.
 * Questão respondida na navegação livre não conta aqui — treinamento e simulado
 * oficial são coisas separadas, e misturar os dois tiraria o sentido da média.
 *
 * A comparação é do aluno com ele mesmo ao longo do tempo, não com os colegas.
 */
const { db } = require('../db');
const { ROTULOS_TIPO } = require('../rotulos');

/**
 * Piso para qualquer recorte (tema, nível, tipo).
 *
 * Com uma ou duas respostas, "100%" e "0%" descrevem o sorteio, não o aluno: um
 * único item de nível C1 que caiu no simulado viraria "C1: 0%", o que sugere uma
 * dificuldade que o dado não sustenta. Abaixo deste número o recorte não aparece.
 */
const MINIMO_POR_RECORTE = 3;

/** Um resumo por simulado, do mais antigo para o mais novo (é como o gráfico lê). */
function porSimulado(usuarioId) {
  return db
    .prepare(
      `SELECT s.id, s.semana, s.concluido_em, s.iniciado_em, s.acertos, s.total
         FROM simulados s
        WHERE s.usuario_id = ? AND s.concluido_em IS NOT NULL
        ORDER BY s.concluido_em ASC`
    )
    .all(usuarioId)
    .map((s, i) => ({
      ...s,
      numero: i + 1,
      erros: s.total - s.acertos,
      percentual: s.total ? Math.round((s.acertos / s.total) * 100) : 0,
      minutos: minutosEntre(s.iniciado_em, s.concluido_em),
    }));
}

function minutosEntre(inicio, fim) {
  if (!inicio || !fim) return null;
  const linha = db
    .prepare("SELECT CAST((julianday(?) - julianday(?)) * 1440 AS INTEGER) m")
    .get(fim, inicio);
  return Math.max(0, linha.m);
}

/** Quantos simulados seguidos vêm melhorando (ou piorando) no fim da série. */
function sequencia(lista) {
  if (lista.length < 2) return { tipo: 'estável', tamanho: 0 };
  let tipo = null;
  let n = 0;
  for (let i = lista.length - 1; i > 0; i--) {
    const d = lista[i].percentual - lista[i - 1].percentual;
    const atual = d > 0 ? 'melhora' : d < 0 ? 'queda' : 'estável';
    if (atual === 'estável') break;
    if (tipo === null) tipo = atual;
    if (atual !== tipo) break;
    n++;
  }
  return { tipo: tipo || 'estável', tamanho: n };
}

/** Acertos e erros agrupados por um campo da questão (tema, nível, tipo…). */
function porCampo(usuarioId, campo) {
  const permitidos = ['tema', 'nivel_cefr', 'tipo', 'genero_textual', 'instituicao'];
  if (!permitidos.includes(campo)) throw new Error(`campo não permitido: ${campo}`);
  return db
    .prepare(
      `SELECT q.${campo} AS valor,
              COUNT(*) AS total,
              COALESCE(SUM(sq.correta), 0) AS acertos
         FROM simulado_questoes sq
         JOIN simulados s ON s.id = sq.simulado_id
         JOIN questoes q  ON q.id = sq.questao_id
        WHERE s.usuario_id = ? AND s.concluido_em IS NOT NULL AND sq.resposta IS NOT NULL
        GROUP BY q.${campo}
        HAVING total > 0
        ORDER BY total DESC, valor ASC`
    )
    .all(usuarioId)
    .map((r) => ({
      ...r,
      // no banco o tipo é minúsculo e sem acento; na tela vai o rótulo de leitura
      valor: campo === 'tipo' ? ROTULOS_TIPO[r.valor] || r.valor : r.valor,
      erros: r.total - r.acertos,
      percentual: Math.round((r.acertos / r.total) * 100),
    }));
}

const comVolume = (lista) => lista.filter((r) => r.total >= MINIMO_POR_RECORTE);

function resumo(usuarioId) {
  const lista = porSimulado(usuarioId);
  if (!lista.length) {
    return {
      vazio: true,
      simulados: [],
      concluidos: 0,
      questoes: 0,
      acertos: 0,
      erros: 0,
      media: 0,
      melhor: null,
      pior: null,
      ultimo: null,
      variacao: null,
      sequencia: { tipo: 'estável', tamanho: 0 },
      porTema: [],
      porNivel: [],
      porTipo: [],
    };
  }

  const questoes = lista.reduce((s, x) => s + x.total, 0);
  const acertos = lista.reduce((s, x) => s + x.acertos, 0);
  const percentuais = lista.map((x) => x.percentual);
  const media = Math.round(percentuais.reduce((a, b) => a + b, 0) / lista.length);
  const melhor = lista.reduce((a, b) => (b.percentual > a.percentual ? b : a));
  const pior = lista.reduce((a, b) => (b.percentual < a.percentual ? b : a));
  const ultimo = lista[lista.length - 1];

  return {
    vazio: false,
    simulados: lista,
    concluidos: lista.length,
    questoes,
    acertos,
    erros: questoes - acertos,
    media,
    melhor,
    pior,
    ultimo,
    // quanto o último variou em relação ao anterior
    variacao: lista.length > 1 ? ultimo.percentual - lista[lista.length - 2].percentual : null,
    sequencia: sequencia(lista),
    porTema: comVolume(porCampo(usuarioId, 'tema')).slice(0, 8),
    porNivel: comVolume(porCampo(usuarioId, 'nivel_cefr')),
    porTipo: comVolume(porCampo(usuarioId, 'tipo')),
  };
}

module.exports = { resumo, porSimulado, porCampo };
