#!/usr/bin/env node
/* Aviso semanal: lembra quem ainda não fez o simulado da semana.
 *
 *   node20 scripts/aviso-semanal.js                 # simula: lista e não envia
 *   node20 scripts/aviso-semanal.js --enviar        # envia de verdade
 *   node20 scripts/aviso-semanal.js --para=eu@x.com # manda um só, de teste
 *
 * Por que este aviso existe: dos 103 alunos, 75 fizeram exatamente um simulado
 * e pararam — todos na aula em que se cadastraram. Ninguém voltou sozinho. A
 * nota exige 12 de 17, e sem alguma coisa que alcance o aluno FORA do site a
 * turma inteira fecha o bimestre com zero.
 *
 * Três cuidados que o script encarna:
 *
 * 1. **Simula por padrão.** Enviar é que precisa de bandeira. Um script que
 *    dispara e-mail para cem menores por engano não tem desfazer.
 * 2. **Não repete.** A tabela `avisos` guarda (usuario, semana, tipo), e só
 *    depois do envio dar certo. Rodar duas vezes no mesmo dia não manda dois.
 * 3. **Fala diferente com quem parou no meio.** Quem respondeu 3 de 5 acha que
 *    já fez a semana; o e-mail dele diz quantas faltam e que começado não conta.
 * 4. **Não avisa quem já fez.** Quem concluiu o simulado da semana não recebe
 *    nada: aviso que chega a quem já cumpriu vira ruído e ensina a ignorar.
 */
'use strict';

require('dotenv').config({ quiet: true });

const { db } = require('../src/db');
const email = require('../src/lib/email');
const notas = require('../src/lib/notas');

const SITE = (process.env.SITE_URL || 'https://ingles.destruitor.com.br').replace(/\/$/, '');
const TIPO = 'simulado-semanal';
const PAUSA_MS = 400; // gentileza com o limite do Gmail; 100 envios ≈ 40 s

const enviar = process.argv.includes('--enviar');
const teste = (process.argv.find((a) => a.startsWith('--para=')) || '').slice(7);

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || 'aluno';

/* ------------------------------------------------------------------ texto */

const plural = (n, um, muitos) => (n === 1 ? `1 ${um}` : `${n} ${muitos}`);

/**
 * Tres situacoes, tres mensagens.
 *
 * Quem parou faltando uma questao e quem nem abriu a pagina estao a distancias
 * muito diferentes de terminar, e o mesmo texto desperdica o caso facil. Na
 * semana 2026-W32, dos 13 que comecaram e nao terminaram, oito abriram sem
 * responder nada e um estava em 4 de 5 — para esse o e-mail certo e "falta
 * uma", nao "faca o simulado".
 *
 * O que muda o comportamento aqui e a frase de que simulado comecado NAO conta:
 * um aluno que parou na questao 3 costuma achar que ja fez a semana.
 */
function montar(a) {
  const nome = primeiroNome(a.nome);
  const faltam = a.faltam;
  const restam = a.semanasRestantes;

  const linhaSituacao = a.atingiuMinimo
    ? `Você já cumpriu os ${notas.CALENDARIO.minimo} simulados obrigatórios — este aqui é só para manter a média subindo.`
    : !a.aindaDaTempo
      ? `Atenção: faltam ${faltam} simulados e restam ${restam} semanas. Já não é possível fechar o mínimo — procure o professor.`
      : `Você fez ${a.concluidos} dos ${notas.CALENDARIO.minimo} obrigatórios. Faltam ${faltam}, e ainda há ${restam} semanas.`;

  /* `parou` vem preenchido quando existe simulado da semana sem conclusão. Zero
     respondidas é caso à parte: a pessoa abriu e fechou, não desistiu no meio. */
  const parou = a.parou;
  const respondidas = parou ? parou.respondidas : 0;
  const totalQ = parou ? parou.total : 5;
  const restantes = Math.max(0, totalQ - respondidas);

  let assunto;
  let chamada;
  let convite;
  let botao;

  if (parou && respondidas > 0) {
    assunto = `Falta ${plural(restantes, 'questão', 'questões')} para o seu simulado contar`;
    chamada = `Você começou o simulado desta semana e parou na questão ${respondidas + 1} de ${totalQ}.`;
    convite =
      `O que você já respondeu está guardado: a página volta exatamente onde você parou. ` +
      `Mas simulado começado não conta — só vale depois das ${totalQ} respondidas.`;
    botao = 'Terminar o simulado';
  } else if (parou) {
    assunto = 'Seu simulado da semana ficou esperando';
    chamada = 'Você abriu o simulado desta semana, mas não chegou a responder nenhuma questão.';
    convite = `São ${totalQ} questões, uns 10 minutos. Ele só conta depois de terminado.`;
    botao = 'Fazer o simulado';
  } else {
    assunto = `Seu simulado da semana está aberto — faltam ${faltam}`;
    chamada = `O simulado desta semana está aberto: ${totalQ} questões, uns 10 minutos.`;
    convite = '';
    botao = 'Fazer o simulado';
  }
  if (!a.aindaDaTempo) assunto = 'Simulado da semana — procure o professor';

  const texto = [
    `Oi, ${nome}!`,
    ``,
    chamada,
    ...(convite ? [``, convite] : []),
    ``,
    linhaSituacao,
    ...(linhaSeguidas ? [``, linhaSeguidas] : []),
    ``,
    `${botao}: ${SITE}/simulado`,
    ``,
    `---`,
    `Você recebe este aviso porque é aluno do professor Julio no English for ALL.`,
    `São ${notas.CALENDARIO.total} simulados no bimestre, um por semana, e é obrigatório fazer ${notas.CALENDARIO.exigencia}% deles.`,
  ].join('\n');

  /* A sequência entra só quando existe e está em jogo.
   *
   * Quem recebe este e-mail é, por definição, quem ainda não fez a semana — e
   * quem tem sequência viva está a um simulado de perdê-la. É a única frase da
   * mensagem que fala de algo que a pessoa já construiu, e não de dívida. Para
   * quem tem zero, ela some: "sua sequência é de 0 semanas" é uma cobrança
   * disfarçada de incentivo.
   */
  const q = a.semanasSeguidas || { atual: 0, melhor: 0 };
  const linhaSeguidas =
    q.atual > 0
      ? `Você está em ${q.atual} ${q.atual === 1 ? 'semana seguida' : 'semanas seguidas'}. Fazendo o desta semana, chega a ${q.atual + 1}.`
      : q.melhor > 1
        ? `Sua melhor sequência foi de ${q.melhor} semanas seguidas. Dá para começar outra hoje.`
        : '';

  const cor = a.aindaDaTempo ? '#2f3ab2' : '#e0324b';

  /* Barra de progresso só para quem parou no meio: ver "3 de 5" desenhado é o
     que faz a distância parecer curta. Feita com divs e largura em %, porque
     cliente de e-mail não roda CSS de verdade. */
  const barra =
    parou && respondidas > 0
      ? `<div style="margin:0 0 22px">
    <div style="font-size:12px;color:#5b6382;margin-bottom:6px">${respondidas} de ${totalQ} respondidas</div>
    <div style="height:10px;background:#e6e8f4;border-radius:100px;overflow:hidden">
      <div style="height:10px;width:${Math.round((respondidas / totalQ) * 100)}%;background:#2f3ab2;border-radius:100px"></div>
    </div>
  </div>`
      : '';

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f2f3fa;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#191e38">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #dfe2f0;border-radius:12px;padding:28px">
  <p style="margin:0 0 18px;font-size:18px;font-weight:700">Oi, ${nome}!</p>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6">${chamada}</p>
  ${barra}
  ${convite ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.6">${convite}</p>` : ''}
  <p style="margin:0 0 22px;padding:12px 14px;background:#f2f3fa;border-left:4px solid ${cor};border-radius:8px;font-size:14px;line-height:1.6">
    ${linhaSituacao}
  </p>
  ${linhaSeguidas ? `<p style="margin:0 0 22px;font-size:14px;line-height:1.6"><span style="font-size:17px">\u{1F525}</span> ${linhaSeguidas}</p>` : ''}
  <p style="margin:0 0 24px">
    <a href="${SITE}/simulado" style="display:inline-block;background:#2f3ab2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:100px">${botao}</a>
  </p>
  <p style="margin:0;padding-top:18px;border-top:1px solid #dfe2f0;font-size:12px;line-height:1.6;color:#5b6382">
    Você recebe este aviso porque é aluno do professor Julio no English for ALL.
    São ${notas.CALENDARIO.total} simulados no bimestre, um por semana, e é obrigatório fazer ${notas.CALENDARIO.exigencia}% deles.
  </p>
</div></body></html>`;

  return { assunto, texto, html };
}

/* ------------------------------------------------------- quem vai receber */

/**
 * Quem tem simulado da semana aberto e nao concluido, e ate onde chegou.
 *
 * `respondidas` conta as questoes ja marcadas — e o que separa "abriu e fechou"
 * de "parou faltando uma". Sem isso os dois recebem o mesmo texto.
 */
function emAberto(semana) {
  const linhas = db
    .prepare(
      `SELECT s.usuario_id,
              s.total,
              (SELECT COUNT(*) FROM simulado_questoes q
                WHERE q.simulado_id = s.id AND q.resposta IS NOT NULL) AS respondidas
         FROM simulados s
        WHERE s.semana = ? AND s.concluido_em IS NULL`
    )
    .all(semana);
  return new Map(linhas.map((r) => [r.usuario_id, r]));
}

function destinatarios(semana) {
  const jaAvisados = new Set(
    db.prepare('SELECT usuario_id FROM avisos WHERE semana = ? AND tipo = ?')
      .all(semana, TIPO)
      .map((r) => r.usuario_id)
  );
  const jaFizeram = new Set(
    db.prepare('SELECT usuario_id FROM simulados WHERE semana = ? AND concluido_em IS NOT NULL')
      .all(semana)
      .map((r) => r.usuario_id)
  );
  const parados = emAberto(semana);

  return notas
    .todos()
    .filter((a) => a.email && !jaFizeram.has(a.id) && !jaAvisados.has(a.id))
    .map((a) => ({ ...a, parou: parados.get(a.id) || null }));
}

/* ------------------------------------------------------------------ main */

(async () => {
  const semana = notas.semanaISO(new Date());
  const naTemporada = notas.CALENDARIO.semanas.includes(semana);

  console.log(`semana atual: ${semana}`);
  if (!naTemporada) {
    console.log(
      `fora da temporada (${notas.CALENDARIO.primeira} a ${notas.CALENDARIO.ultima}) — nada a enviar.`
    );
    process.exit(0);
  }

  /* --para= manda uma amostra de CADA situação para o professor conferir antes
     de disparar para a turma. Uma só não serve mais: são três textos diferentes,
     e o que ele precisa aprovar é o conjunto. Nada disso grava em `avisos`. */
  if (teste) {
    if (!email.configurado()) {
      console.log('SMTP não configurado: defina SMTP_USER e SMTP_SENHA no .env.');
      process.exit(1);
    }
    const conf = await email.testar();
    if (!conf.ok) {
      console.log('credencial recusada pelo servidor de e-mail:', conf.erro);
      process.exit(1);
    }

    // alunos de verdade, para os números do e-mail serem os reais
    const parados = emAberto(semana);
    const alunos = notas.todos();
    const acha = (f) => alunos.find(f);
    const com = (a) => a && { ...a, parou: parados.get(a.id) || null };
    const amostras = [
      ['parou no meio', com(acha((a) => (parados.get(a.id) || {}).respondidas > 0))],
      ['abriu e nao respondeu', com(acha((a) => parados.get(a.id) && !parados.get(a.id).respondidas))],
      ['nao abriu', com(acha((a) => !parados.get(a.id)))],
    ].filter(([, a]) => a);

    if (!amostras.length) {
      console.log('nenhum aluno em situação de aviso nesta semana — nada a mostrar.');
      process.exit(0);
    }
    for (const [rotulo, a] of amostras) {
      const m = montar(a);
      const r = await email.enviar({ para: teste, ...m, assunto: `[${rotulo}] ${m.assunto}` });
      console.log(r.ok ? `  enviado: ${rotulo}` : `  falhou (${rotulo}): ${r.erro}`);
      await espera(PAUSA_MS);
    }
    console.log(`\n${amostras.length} amostras enviadas para ${teste}`);
    process.exit(0);
  }

  const lista = destinatarios(semana);
  const total = notas.todos().length;
  console.log(`alunos: ${total} | já fizeram ou já foram avisados: ${total - lista.length}`);
  console.log(`a avisar: ${lista.length}`);

  if (!enviar) {
    console.log('\n--- SIMULAÇÃO (nada foi enviado) ---');
    const situacao = (a) =>
      !a.parou ? 'nao abriu' : a.parou.respondidas ? `parou em ${a.parou.respondidas}/${a.parou.total}` : 'abriu e nao respondeu';
    const quantos = (f) => lista.filter(f).length;
    console.log(
      `  nao abriram: ${quantos((a) => !a.parou)} | ` +
        `abriram sem responder: ${quantos((a) => a.parou && !a.parou.respondidas)} | ` +
        `pararam no meio: ${quantos((a) => a.parou && a.parou.respondidas)}`
    );
    console.log('');
    lista.slice(0, 10).forEach((a) =>
      console.log(
        `  ${a.nome.charAt(0)}·  ${situacao(a).padEnd(22)} fez ${a.concluidos}/${notas.CALENDARIO.minimo} no bimestre`
      )
    );
    if (lista.length > 10) console.log(`  ... e mais ${lista.length - 10}`);
    console.log('\nPara enviar de verdade, repita com --enviar.');
    process.exit(0);
  }

  if (!email.configurado()) {
    console.log('SMTP não configurado: defina SMTP_USER e SMTP_SENHA no .env.');
    process.exit(1);
  }
  const conf = await email.testar();
  if (!conf.ok) {
    console.log('credencial recusada pelo servidor de e-mail:', conf.erro);
    process.exit(1);
  }

  const marcar = db.prepare(
    'INSERT OR IGNORE INTO avisos (usuario_id, semana, tipo) VALUES (?, ?, ?)'
  );
  let ok = 0;
  const falhas = [];

  for (const a of lista) {
    const r = await email.enviar({ para: a.email, ...montar(a) });
    if (r.ok) {
      marcar.run(a.id, semana, TIPO);
      ok++;
    } else {
      // não marca: a próxima execução tenta de novo
      falhas.push(`${a.email}: ${r.erro}`);
    }
    await espera(PAUSA_MS);
  }

  console.log(`\nenviados: ${ok} | falharam: ${falhas.length}`);
  falhas.slice(0, 10).forEach((f) => console.log('  !!', f));
  process.exit(falhas.length ? 1 : 0);
})();
