/**
 * SOMENTE LEITURA — texto em portugues digitado sem acentuacao.
 *
 * Nasceu no lote 30, com quatro descricoes de imagem sem um acento sequer, e
 * ganhou esta forma no lote 31, quando a 994 ("um copo descartavel", "uma
 * composicao que remete ao quadro") escapou da primeira versao: aquela procurava
 * uma LISTA de palavras, e lista sempre deixa passar a proxima palavra. Aqui a
 * busca e por SUFIXO — em portugues "-cao", "-coes", "-avel", "-ivel", "-encia"
 * e "-ancia" sempre levam acento, e nenhum e terminacao inglesa, o que importa
 * porque estes campos misturam os dois idiomas.
 *
 * Tres cuidados, todos aprendidos com falso positivo:
 *
 *  1. A classe e [A-Za-zÀ-ÿ], nunca \w. O \w exclui os acentuados, entao em
 *     "Referenciação" ele para antes do "ç" e inventa um "Referencia" sem acento.
 *  2. Varre so os campos que sao redacao nossa: `tema`, `meta_description`,
 *     `titulo` e as descricoes entre colchetes do `texto_base`. Fora ficam
 *     `comentario` e `imagem_alt`, que citam o texto original em ingles e a
 *     grafia do autor ("video evidence", "Musica Popular Brasileira" como a
 *     Economist grafou) — ali a falta de acento nao e defeito nosso.
 *  3. VERBOS existem. "o que a expressao evidencia", "como o espaco influencia"
 *     e "ele providencia que" estao certos sem acento; so os substantivos
 *     homografos levam. Por isso a lista de excecoes abaixo.
 *
 * Uso: NODE_PATH=/var/www/banco-questoes/node_modules node20 scripts/audita-acentos.js
 */
const Database = require('better-sqlite3');
const db = new Database('dados/banco.db', { readonly: true });

const L = '[A-Za-zÀ-ÿ]';
const SUF = `${L}{3,}(?:cao|coes|avel|ivel|encia|ancia)`;
const AVULSAS = '(?:tres|graficos?|robo|robos|bracos?|movel|moveis|credito|creditos|passaros?|cenario|cenarios|cerebro|portugues|tambem|pagina|numero|titulo|periodo|proprio|propria|publico|unico|ultimo|proximo|musica|agua|nivel|facil|dificil|logico|tragico|comico|pratico|tecnico|fisico|quimico|basico|classico|solido|liquido|rapido|maximo|minimo|balao|baloes|cabeca|oculos|relogio|arvore|serie|especie|memoria|historia|familia|comercio|silencio|edificio|premio|estudio|automovel|justica|cidada|indigenas|cientifica|exercicio|vocabulario|criterios)';
const RE_G = new RegExp(`(?<!${L})(?:${SUF}|${AVULSAS})(?!${L})`, 'gi');

// formas verbais que sao homografas de substantivo acentuado: sem acento estao certas
const VERBOS = new Set(['influencia', 'evidencia', 'providencia', 'diferencia', 'financia',
  'licencia', 'presencia', 'silencia', 'sentencia', 'reverencia', 'potencia', 'distancia',
  'agencia', 'anuncia', 'renuncia', 'denuncia', 'pronuncia', 'comercia', 'principia']);

const suspeitas = (txt) => [...new Set((txt.match(RE_G) || []).map((x) => x.toLowerCase()))]
  .filter((p) => !VERBOS.has(p));

const achados = new Map();
const guarda = (id, campo, txt, palavras) => {
  const k = `${campo}||${txt}||${palavras.join(',')}`;
  if (!achados.has(k)) achados.set(k, []);
  achados.get(k).push(id);
};

['tema', 'meta_description', 'titulo'].forEach((campo) => {
  db.prepare(`SELECT id, ${campo} v FROM questoes WHERE TRIM(COALESCE(${campo},'')) <> ''`).all().forEach((q) => {
    const p = suspeitas(q.v);
    if (p.length) guarda(q.id, campo, q.v, p);
  });
});
db.prepare("SELECT id, texto_base FROM questoes WHERE texto_base LIKE '%[%'").all().forEach((q) => {
  (q.texto_base.match(/\[[^\]]{20,}\]/g) || []).forEach((b) => {
    const p = suspeitas(b);
    if (p.length) guarda(q.id, 'texto_base', b, p);
  });
});

console.log(`campos com palavra portuguesa sem acento: ${achados.size}`);
if (!achados.size) console.log('  (nenhum)');
[...achados.entries()].forEach(([k, ids], i) => {
  const [campo, txt, palavras] = k.split('||');
  console.log(`\n--- ${i + 1}. ${campo} | questoes ${ids.join(',')} | ${palavras}`);
  console.log(`    ${txt.replace(/\s+/g, ' ').slice(0, 200)}`);
});
