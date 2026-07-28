/**
 * Redistribui a posição da alternativa correta nos JSON de uma coleção.
 *
 * Questões escritas em série nascem todas com o gabarito na letra A, o que
 * entrega a resposta e estraga o exercício. Este script rotaciona as
 * alternativas para que o gabarito circule por A, B, C, D e E.
 *
 *   node scripts/distribuir-gabaritos.js reading
 *   node scripts/distribuir-gabaritos.js use-of-english b1.json
 *
 * É idempotente: o alvo depende só da posição do item no arquivo, então
 * rodar duas vezes não embaralha de novo.
 */
const fs = require('fs');
const path = require('path');
const { COLECOES } = require('../src/lib/colecoes');

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

const args = process.argv.slice(2);
const chave = args.find((a) => COLECOES[a]);
const arquivos = args.filter((a) => a.endsWith('.json'));

if (!chave) {
  console.error(`Informe a coleção. Disponíveis: ${Object.keys(COLECOES).join(', ')}`);
  process.exit(1);
}

const PASTA = path.join(__dirname, '../conteudo', chave);
const lista = (arquivos.length ? arquivos : fs.readdirSync(PASTA).filter((f) => f.endsWith('.json'))).sort();

for (const arquivo of lista) {
  const caminho = path.join(PASTA, arquivo);
  const itens = JSON.parse(fs.readFileSync(caminho, 'utf8'));

  itens.forEach((q, i) => {
    const atual = LETRAS.indexOf(q.gabarito);
    // Alvo varia com a posição: distribui as cinco letras ao longo do arquivo.
    const alvo = (i * 2 + 1) % 5;
    if (atual < 0 || atual === alvo) return;

    const correta = q.alternativas[atual];
    const resto = q.alternativas.filter((_, k) => k !== atual);
    resto.splice(alvo, 0, correta);

    q.alternativas = resto;
    q.gabarito = LETRAS[alvo];
  });

  fs.writeFileSync(caminho, JSON.stringify(itens, null, 2) + '\n');

  const dist = {};
  itens.forEach((q) => (dist[q.gabarito] = (dist[q.gabarito] || 0) + 1));
  console.log(`  ${arquivo}: ${itens.length} itens — ${LETRAS.map((l) => `${l}:${dist[l] || 0}`).join('  ')}`);
}
