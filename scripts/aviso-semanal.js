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
 * 3. **Não avisa quem já fez.** Quem concluiu o simulado da semana não recebe
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

function montar(a) {
  const nome = primeiroNome(a.nome);
  const faltam = a.faltam;
  const restam = a.semanasRestantes;

  const linhaSituacao = a.atingiuMinimo
    ? `Você já cumpriu os ${notas.CALENDARIO.minimo} simulados obrigatórios — este aqui é só para manter a média subindo.`
    : !a.aindaDaTempo
      ? `Atenção: faltam ${faltam} simulados e restam ${restam} semanas. Já não é possível fechar o mínimo — procure o professor.`
      : `Você fez ${a.concluidos} dos ${notas.CALENDARIO.minimo} obrigatórios. Faltam ${faltam}, e ainda há ${restam} semanas.`;

  const texto = [
    `Oi, ${nome}!`,
    ``,
    `O simulado desta semana está aberto: 5 questões, uns 10 minutos.`,
    ``,
    linhaSituacao,
    ``,
    `Fazer agora: ${SITE}/simulado`,
    ``,
    `---`,
    `Você recebe este aviso porque é aluno do professor Julio no English for ALL.`,
    `São ${notas.CALENDARIO.total} simulados no bimestre, um por semana, e é obrigatório fazer ${notas.CALENDARIO.exigencia}% deles.`,
  ].join('\n');

  const cor = a.aindaDaTempo ? '#2f3ab2' : '#e0324b';
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f2f3fa;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#191e38">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #dfe2f0;border-radius:12px;padding:28px">
  <p style="margin:0 0 18px;font-size:18px;font-weight:700">Oi, ${nome}!</p>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6">
    O <strong>simulado desta semana</strong> está aberto: 5 questões, uns 10 minutos.
  </p>
  <p style="margin:0 0 22px;padding:12px 14px;background:#f2f3fa;border-left:4px solid ${cor};border-radius:8px;font-size:14px;line-height:1.6">
    ${linhaSituacao}
  </p>
  <p style="margin:0 0 24px">
    <a href="${SITE}/simulado" style="display:inline-block;background:#2f3ab2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:100px">Fazer o simulado</a>
  </p>
  <p style="margin:0;padding-top:18px;border-top:1px solid #dfe2f0;font-size:12px;line-height:1.6;color:#5b6382">
    Você recebe este aviso porque é aluno do professor Julio no English for ALL.
    São ${notas.CALENDARIO.total} simulados no bimestre, um por semana, e é obrigatório fazer ${notas.CALENDARIO.exigencia}% deles.
  </p>
</div></body></html>`;

  return {
    assunto: a.aindaDaTempo
      ? `Seu simulado da semana está aberto — faltam ${faltam}`
      : `Simulado da semana — procure o professor`,
    texto,
    html,
  };
}

/* ------------------------------------------------------- quem vai receber */

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
  return notas
    .todos()
    .filter((a) => a.email && !jaFizeram.has(a.id) && !jaAvisados.has(a.id));
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

  /* --para= manda um só, para o professor ver como chega antes de disparar
     para a turma. Não grava em `avisos`: é teste, não é o aviso do aluno. */
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
    const exemplo = notas.todos()[0] || {
      nome: 'Professor', concluidos: 0, faltam: notas.CALENDARIO.minimo,
      semanasRestantes: 15, atingiuMinimo: false, aindaDaTempo: true,
    };
    const m = montar(exemplo);
    const r = await email.enviar({ para: teste, ...m });
    console.log(r.ok ? `teste enviado para ${teste}` : `falhou: ${r.erro}`);
    process.exit(r.ok ? 0 : 1);
  }

  const lista = destinatarios(semana);
  const total = notas.todos().length;
  console.log(`alunos: ${total} | já fizeram ou já foram avisados: ${total - lista.length}`);
  console.log(`a avisar: ${lista.length}`);

  if (!enviar) {
    console.log('\n--- SIMULAÇÃO (nada foi enviado) ---');
    lista.slice(0, 10).forEach((a) =>
      console.log(`  ${a.nome.charAt(0)}·  fez ${a.concluidos}/${notas.CALENDARIO.minimo}  faltam ${a.faltam}`)
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
