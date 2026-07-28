const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const PASTA_UPLOADS = path.join(__dirname, '../../public/uploads');

/** O comentário aceita HTML simples no site; no papel ele vira texto puro. */
function semHTML(texto) {
  return (texto || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const ROTULOS_TIPO = {
  interpretacao: 'Interpretação de texto',
  gramatica: 'Gramática',
  vocabulario: 'Vocabulário',
};

/**
 * Escreve a prova em PDF direto no stream de resposta.
 * questoes já vem com .alternativas carregadas.
 */
function gerarPDF(res, { titulo, escola, turma, questoes, comGabarito }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  doc.pipe(res);

  // ---------------------------------------------------------- cabeçalho
  if (escola) {
    doc.font('Helvetica-Bold').fontSize(13).text(escola, { align: 'center' });
  }
  doc.font('Helvetica-Bold').fontSize(15).text(titulo, { align: 'center' });
  if (turma) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).text(turma, { align: 'center' });
  }

  doc.moveDown(1);
  const y = doc.y;
  doc.font('Helvetica').fontSize(10);
  doc.text('Nome: ______________________________________________', 50, y);
  doc.text('Turma: ____________     Data: ____ / ____ / ______', 50, doc.y + 4);

  doc.moveDown(0.8);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#222222');
  doc.moveDown(1);

  // ---------------------------------------------------------- questões
  questoes.forEach((q, i) => {
    // Quebra de página se não couber um bloco mínimo.
    if (doc.y > 660) doc.addPage();

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#000000')
      .text(`Questão ${i + 1}`, { continued: true })
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#555555')
      .text(`    ${q.nivel_cefr} · ${ROTULOS_TIPO[q.tipo] || q.tipo} · ${q.genero_textual}`);

    doc.fillColor('#000000').moveDown(0.4);

    // Imagem (tirinha, charge, anúncio)
    if (q.imagem) {
      const arquivo = path.join(PASTA_UPLOADS, path.basename(q.imagem));
      if (fs.existsSync(arquivo)) {
        try {
          if (doc.y > 520) doc.addPage();
          doc.image(arquivo, { fit: [430, 230], align: 'center' });
          doc.moveDown(0.6);
        } catch {
          /* imagem corrompida: segue sem ela em vez de quebrar a prova */
        }
      }
    }

    if (q.texto_base && q.texto_base.trim()) {
      doc.font('Times-Roman').fontSize(10.5).text(q.texto_base.trim(), {
        align: 'justify',
        indent: 12,
      });
      doc.moveDown(0.3);
    }

    if (q.fonte_veiculo) {
      const data = q.fonte_data ? `, ${q.fonte_data}` : '';
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#555555')
        .text(`Fonte: ${q.fonte_veiculo}${data}. Disponível em: ${q.fonte_url}`, {
          align: 'right',
        });
      doc.fillColor('#000000');
    }

    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10.5).text(q.enunciado, { align: 'justify' });
    doc.moveDown(0.4);

    q.alternativas.forEach((a) => {
      doc.font('Helvetica').fontSize(10.5).text(`(${a.letra})  ${a.texto}`, {
        indent: 14,
      });
    });

    doc.moveDown(1.2);
  });

  // ---------------------------------------------------------- gabarito
  if (comGabarito) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text('Gabarito', { align: 'center' });
    doc.moveDown(1);

    questoes.forEach((q, i) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .text(`${i + 1}. ${q.gabarito}`, { continued: false });

      if (q.comentario && q.comentario.trim()) {
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#333333')
          .text(semHTML(q.comentario), { indent: 14, align: 'justify' })
          .fillColor('#000000');
      }
      doc.moveDown(0.6);
    });
  }

  // ---------------------------------------------------------- rodapé
  const intervalo = doc.bufferedPageRange();
  for (let i = 0; i < intervalo.count; i++) {
    doc.switchToPage(intervalo.start + i);
    // Zerar a margem inferior antes de escrever no rodapé: sem isso o pdfkit
    // entende que o texto não cabe e cria uma página em branco por rodapé.
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#777777')
      .text(`Página ${i + 1} de ${intervalo.count}`, 50, doc.page.height - 38, {
        align: 'center',
        width: doc.page.width - 100,
        lineBreak: false,
      });
  }

  doc.end();
}

module.exports = { gerarPDF };
