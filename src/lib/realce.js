/**
 * Sublinhado dentro do texto da questão.
 *
 * Provas de vestibular pedem com frequência "o item sublinhado" ou "a expressão em
 * negrito". A extração do PDF perde essa marcação, e sem ela a questão fica sem
 * resposta possível — o aluno lê o enunciado e não sabe a que trecho ele se refere.
 *
 * A marcação é gravada no banco como [[trecho]], em texto puro, para não depender de
 * HTML no conteúdo. Aqui ela vira <u> na hora de renderizar; nas exportações para PDF
 * e DOCX, que não têm como sublinhar no meio de um parágrafo corrido, os marcadores
 * são simplesmente removidos.
 */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa o texto e converte [[trecho]] em <u>trecho</u>. Devolve HTML seguro. */
function realce(texto) {
  if (!texto) return '';
  const escapado = String(texto).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
  // o escape roda ANTES, então nada que venha do banco pode injetar marcação
  return escapado.replace(/\[\[(.+?)\]\]/gs, '<u>$1</u>');
}

/** Remove os marcadores, para saída em texto puro (PDF, DOCX, meta tags). */
function semMarcacao(texto) {
  return texto ? String(texto).replace(/\[\[(.+?)\]\]/gs, '$1') : '';
}

module.exports = { realce, semMarcacao };
