/**
 * Redistribui a posição da alternativa correta nos arquivos de conteudo/reading/.
 *
 * Questões escritas em série tendem a nascer todas com o gabarito na letra A, o que
 * entrega a resposta e estraga o exercício. Este script rotaciona as alternativas de
 * cada questão para que o gabarito circule por A, B, C, D e E de forma equilibrada.
 *
 *   node scripts/distribuir-gabaritos.js          # todos os arquivos
 *   node scripts/distribuir-gabaritos.js b1.json  # só um
 *
 * É idempotente: o alvo depende só da posição do item no arquivo, então rodar duas
 * vezes não embaralha de novo.
 */
const fs = require('fs');
const path = require('path');

const PASTA = path.join(__dirname, '../conteudo/reading');
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

const args = process.argv.slice(2).filter((a) => a.endsWith('.json'));
const arquivos = args.length ? args : fs.readdirSync(PASTA).filter((f) => f.endsWith('.json'));

for (const arquivo of arquivos) {
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
  const resumo = LETRAS.map((l) => `${l}:${dist[l] || 0}`).join('  ');
  console.log(`  ${arquivo}: ${itens.length} itens — ${resumo}`);
}
