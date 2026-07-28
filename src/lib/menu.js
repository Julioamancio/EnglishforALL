const db = require('../db');

/**
 * Números mostrados ao lado de cada item do menu.
 *
 * São seis COUNTs num SQLite pequeno, mas o menu aparece em toda página —
 * um cache curto evita repetir a conta a cada requisição. Publicar uma
 * questão leva no máximo cinco minutos para refletir no menu.
 */
const VALIDADE = 5 * 60 * 1000;

let cache = null;
let expiraEm = 0;

function contagens(agora) {
  if (cache && agora < expiraEm) return cache;

  const exercicios = require('./gramatica')
    .niveis()
    .reduce((soma, n) => soma + n.topicos.reduce((s, t) => s + (t.exercicios || []).length, 0), 0);

  cache = {
    todas: db.contar({ colecao: '' }),
    enem: db.contar({ colecao: '', banca: 'ENEM' }),
    useOfEnglish: db.contar({ colecao: 'use-of-english' }),
    useOfEnglishProvas: db.contar({ colecao: '', tipo: 'gramatica' }),
    reading: db.contar({ colecao: 'reading' }),
    readingProvas: db.contar({ colecao: '', tipo: 'interpretacao' }),
    exercicios,
  };
  expiraEm = agora + VALIDADE;
  return cache;
}

/** Middleware: deixa res.locals.menu disponível para o cabeçalho. */
function middleware(req, res, next) {
  res.locals.menu = contagens(Date.now());
  next();
}

module.exports = { middleware, contagens };
