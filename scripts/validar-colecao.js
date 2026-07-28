/**
 * Confere os JSON de uma coleção antes de importar.
 *
 *   node scripts/validar-colecao.js use-of-english
 *   node scripts/validar-colecao.js reading --lacuna
 *
 * --lacuna exige exatamente uma lacuna ___ por texto (formato Use of English).
 *
 * Verifica o que o importador também checa, mais três coisas que só fazem
 * sentido no lote: texto repetido dentro do arquivo, português sem acento
 * (um agente já entregou 24 itens assim) e distribuição dos gabaritos.
 */
const fs = require('fs');
const path = require('path');
const { COLECOES, NIVEIS } = require('../src/lib/colecoes');

const args = process.argv.slice(2);
const chave = args.find((a) => COLECOES[a]);
const exigirLacuna = args.includes('--lacuna');

if (!chave) {
  console.error(`Informe a coleção. Disponíveis: ${Object.keys(COLECOES).join(', ')}`);
  process.exit(1);
}

const PASTA = path.join(__dirname, '../conteudo', chave);
const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const ACENTOS = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/;

// Palavras que em português brasileiro praticamente sempre levam acento.
// Fora da lista de propósito: "so" e "ja", porque os comentários citam estruturas
// em inglês ("So complete is the hold…") e disparavam falso positivo.
const SEM_ACENTO = /\b(nao|sao|entao|tambem|porem|alem|voce|portugues|ingles|apos|atraves|proprio|necessario|possivel|dificil|facil|especifico|generico|ultimo|proximo|questao|inversao|colocacao|oracao|opcao|construcao|expressao|funcao|posicao|frequencia|paragrafo|vocabulario|unica|negacao|precisao|analise|enfase|hipotese|adverbio|semantica|conotacao|substituicao|sequencia|consequencia|evidencia|experiencia|memoria|logica|seculo)\b/gi;

let total = 0;
let problemas = 0;

for (const arquivo of fs.readdirSync(PASTA).filter((f) => f.endsWith('.json')).sort()) {
  const caminho = path.join(PASTA, arquivo);
  let itens;
  try {
    itens = JSON.parse(fs.readFileSync(caminho, 'utf8'));
  } catch (e) {
    console.log(`${arquivo}: JSON INVÁLIDO — ${e.message}`);
    problemas++;
    continue;
  }

  const erros = [];
  const textos = new Set();
  const dist = {};
  let comAcento = 0;
  let semAcento = 0;

  itens.forEach((q, i) => {
    const md = q.meta_description || '';
    if (md.length < 50 || md.length > 160) erros.push(`${i} meta=${md.length}`);

    if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) {
      erros.push(`${i} alternativas=${q.alternativas?.length ?? 0}`);
    } else {
      if (q.alternativas.some((a) => !a || !a.trim())) erros.push(`${i} alternativa vazia`);
      const unicas = new Set(q.alternativas.map((a) => (a || '').trim().toLowerCase()));
      if (unicas.size !== 5) erros.push(`${i} alternativa repetida`);
    }

    if (!LETRAS.includes(q.gabarito)) erros.push(`${i} gabarito=${q.gabarito}`);
    else dist[q.gabarito] = (dist[q.gabarito] || 0) + 1;

    ['titulo', 'tema', 'nivel', 'texto_base', 'enunciado', 'comentario'].forEach((k) => {
      if (!q[k] || !String(q[k]).trim()) erros.push(`${i} sem ${k}`);
    });

    if (!NIVEIS.includes(q.nivel)) erros.push(`${i} nivel=${q.nivel}`);
    else if (q.nivel !== arquivo.slice(0, 2).toUpperCase()) erros.push(`${i} nivel fora do arquivo`);

    if (exigirLacuna) {
      const n = ((q.texto_base || '').match(/___/g) || []).length;
      if (n !== 1) erros.push(`${i} lacunas=${n}`);
    }

    textos.add((q.texto_base || '').trim());

    const pt = `${q.titulo} ${q.tema} ${q.comentario} ${q.meta_description}`;
    if (ACENTOS.test(pt)) comAcento++;
    semAcento += (pt.match(SEM_ACENTO) || []).length;
  });

  if (textos.size !== itens.length) {
    erros.push(`textos repetidos (${textos.size}/${itens.length})`);
  }
  if (comAcento === 0 && itens.length) {
    erros.push('português sem nenhum acento no arquivo inteiro');
  } else if (semAcento > 5) {
    erros.push(`${semAcento} palavras sem acento (nao/sao/tambem…)`);
  }

  const wc = itens.map((q) => (q.texto_base || '').trim().split(/\s+/).length);
  const resumoGab = LETRAS.map((l) => `${l}:${dist[l] || 0}`).join(' ');

  total += itens.length;
  problemas += erros.length;

  console.log(
    `${arquivo}: ${itens.length} itens | ${Math.min(...wc)}–${Math.max(...wc)} palavras | ${resumoGab}` +
      (erros.length ? `\n   PROBLEMAS: ${erros.slice(0, 10).join('; ')}` : '  ✓')
  );
}

console.log(`\n${total} itens, ${problemas} problema(s).`);
process.exit(problemas ? 1 : 0);
