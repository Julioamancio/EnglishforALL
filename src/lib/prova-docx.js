const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  BorderStyle,
} = require('docx');
const fs = require('fs');
const { semMarcacao } = require('./realce');
const path = require('path');
const sizeOf = null; // sem dependência extra: usamos tamanho fixo proporcional

const PASTA_UPLOADS = path.join(__dirname, '../../public/uploads');

/** O comentário aceita HTML simples no site; no Word ele vira texto puro. */
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

function p(texto, opcoes = {}) {
  // No docx, um "\n" dentro de um TextRun não quebra linha nenhuma — some.
  // Cada linha vira um run próprio, e do segundo em diante com break: 1.
  // É isso que preserva verso de poema, manchete e assinatura no Word.
  const linhas = String(texto ?? '').split('\n');
  return new Paragraph({
    children: linhas.map((linha, i) =>
      i === 0
        ? new TextRun({ text: linha, ...opcoes.run })
        : new TextRun({ text: linha, break: 1, ...opcoes.run })
    ),
    ...opcoes.par,
  });
}

async function gerarDOCX({ titulo, escola, turma, questoes, comGabarito }) {
  const filhos = [];

  if (escola) {
    filhos.push(
      p(escola, {
        run: { bold: true, size: 26 },
        par: { alignment: AlignmentType.CENTER },
      })
    );
  }

  filhos.push(
    p(titulo, {
      run: { bold: true, size: 30 },
      par: { alignment: AlignmentType.CENTER, spacing: { after: 120 } },
    })
  );

  if (turma) {
    filhos.push(
      p(turma, { par: { alignment: AlignmentType.CENTER, spacing: { after: 200 } } })
    );
  }

  filhos.push(p('Nome: ______________________________________________'));
  filhos.push(
    p('Turma: ____________     Data: ____ / ____ / ______', {
      par: {
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '222222' } },
      },
    })
  );

  questoes.forEach((q, i) => {
    filhos.push(
      new Paragraph({
        spacing: { before: 300, after: 80 },
        children: [
          new TextRun({ text: `Questão ${i + 1}`, bold: true, size: 24 }),
          new TextRun({
            text: `    ${q.nivel_cefr} · ${ROTULOS_TIPO[q.tipo] || q.tipo} · ${q.genero_textual}`,
            size: 18,
            color: '555555',
          }),
        ],
      })
    );

    if (q.imagem) {
      const arquivo = path.join(PASTA_UPLOADS, path.basename(q.imagem));
      if (fs.existsSync(arquivo)) {
        try {
          filhos.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new ImageRun({
                  data: fs.readFileSync(arquivo),
                  transformation: { width: 430, height: 240 },
                }),
              ],
            })
          );
        } catch {
          /* imagem inválida: a prova sai sem ela */
        }
      }
    }

    if (semMarcacao(q.texto_base) && semMarcacao(q.texto_base).trim()) {
      semMarcacao(q.texto_base)
        .trim()
        .split(/\n\s*\n/)
        .forEach((par) =>
          filhos.push(
            p(par.trim(), {
              run: { font: 'Times New Roman', size: 21 },
              par: { alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 } },
            })
          )
        );
    }

    if (q.fonte_veiculo) {
      const data = q.fonte_data ? `, ${q.fonte_data}` : '';
      filhos.push(
        p(`Fonte: ${q.fonte_veiculo}${data}. Disponível em: ${q.fonte_url}`, {
          run: { italics: true, size: 16, color: '555555' },
          par: { alignment: AlignmentType.RIGHT, spacing: { after: 120 } },
        })
      );
    }

    filhos.push(
      p(semMarcacao(q.enunciado), {
        par: { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } },
      })
    );

    q.alternativas.forEach((a) =>
      filhos.push(
        p(`(${a.letra})  ${semMarcacao(a.texto)}`, { par: { indent: { left: 280 } } })
      )
    );
  });

  if (comGabarito) {
    filhos.push(new Paragraph({ children: [new PageBreak()] }));
    filhos.push(
      p('Gabarito', {
        run: { bold: true, size: 28 },
        par: { alignment: AlignmentType.CENTER, spacing: { after: 200 } },
      })
    );

    questoes.forEach((q, i) => {
      filhos.push(
        p(`${i + 1}. ${q.gabarito}`, {
          run: { bold: true },
          par: { spacing: { before: 120 } },
        })
      );
      if (q.comentario && q.comentario.trim()) {
        filhos.push(
          p(semHTML(q.comentario), {
            run: { size: 19, color: '333333' },
            par: { indent: { left: 280 }, alignment: AlignmentType.JUSTIFIED },
          })
        );
      }
    });
  }

  const doc = new Document({ sections: [{ children: filhos }] });
  return Packer.toBuffer(doc);
}

module.exports = { gerarDOCX };
