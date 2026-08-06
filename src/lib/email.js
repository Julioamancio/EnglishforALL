/**
 * Envio de e-mail. Um lugar só, para o resto do projeto não saber de SMTP.
 *
 * A credencial vive no `.env` do servidor e **nunca** no repositório — este é
 * público. Sem `SMTP_USER` e `SMTP_SENHA` o módulo se declara desconfigurado e
 * quem chama decide o que fazer; nada aqui tenta enviar às cegas.
 *
 * Gmail com senha de app: o endereço é o de sempre, mas a senha é um código de
 * 16 letras gerado em myaccount.google.com/apppasswords, que só serve para
 * SMTP e pode ser revogado sozinho, sem trocar a senha da conta.
 */
const nodemailer = require('nodemailer');

const REMETENTE_PADRAO = 'English for ALL';

function configurado() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_SENHA);
}

function transporte() {
  if (!configurado()) {
    throw new Error(
      'SMTP não configurado. Defina SMTP_USER e SMTP_SENHA no .env do servidor.'
    );
  }
  const porta = Number(process.env.SMTP_PORTA || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: porta,
    // 465 é TLS direto; 587 começa em claro e sobe para TLS com STARTTLS
    secure: porta === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_SENHA },
  });
}

/** Confere a credencial sem enviar nada. Devolve {ok} ou {ok:false, erro}. */
async function testar() {
  try {
    await transporte().verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

/**
 * Envia um e-mail. Devolve {ok} ou {ok:false, erro} — nunca lança, para que uma
 * falha num destinatário não derrube o lote inteiro.
 */
async function enviar({ para, assunto, texto, html }) {
  try {
    const info = await transporte().sendMail({
      from: `"${process.env.SMTP_NOME || REMETENTE_PADRAO}" <${process.env.SMTP_USER}>`,
      to: para,
      subject: assunto,
      text: texto,
      html,
    });
    return { ok: true, id: info.messageId };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

module.exports = { configurado, testar, enviar };
