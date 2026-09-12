const { expect } = require('chai');
const PDFDocument = require('pdfkit');

const {
  toCSV,
  toPDF,
  formatDateForReport,
  LABEL_VALUE_OFFSET,
  toPlainText,
  measurePillWidth,
} = require('../../utils/export-formatters');
const { SERVER_LABEL_COLORS, textColorFor } = require('../../utils/label-colors');

const mockData = {
  boardName: 'Test Board',
  generatedAt: new Date('2026-08-27T12:00:00Z'),
  summary: [{ listName: 'Backlog', cards: [{ id: 'c1', name: 'Card 1' }], total: 1 }],
  details: [
    {
      listName: 'Backlog',
      card: {
        id: 'c1',
        name: 'Test Card',
        priority: 'high',
        description: 'Test desc',
        dueDate: '27/08/2026',
        labels: [{ id: 'l1', name: 'Bug', color: '#f00' }],
        lastComment: { authorName: 'João', createdAt: '27/08/2026', text: 'Comentário de teste' },
      },
    },
  ],
};

describe('export-formatters', () => {
  describe('#formatDateForReport', () => {
    it('formats a date as dd/mm/yyyy', () => {
      expect(formatDateForReport(new Date('2026-08-27T12:00:00Z'))).to.equal('27/08/2026');
    });

    it('returns null for falsy input', () => {
      expect(formatDateForReport(null)).to.equal(null);
      expect(formatDateForReport(undefined)).to.equal(null);
    });
  });

  describe('#toCSV', () => {
    it('returns a string with header and data rows', () => {
      const csv = toCSV(mockData);
      const lines = csv.split('\r\n');

      expect(csv).to.be.a('string');
      expect(lines[0]).to.contain('List');
      expect(lines[1]).to.contain('Test Card');
    });

    it('escapes commas and quotes in values', () => {
      const data = {
        ...mockData,
        details: [
          {
            ...mockData.details[0],
            card: {
              ...mockData.details[0].card,
              description: 'Has, comma and "quotes"',
            },
          },
        ],
      };

      const csv = toCSV(data);
      expect(csv).to.contain('"Has, comma and ""quotes"""');
    });

    it('prefixes with UTF-8 BOM', () => {
      const csv = toCSV(mockData);
      expect(csv.charCodeAt(0)).to.equal(0xfeff);
    });

    it('returns header-only CSV when there are no cards', () => {
      const csv = toCSV({
        ...mockData,
        summary: [{ listName: 'Backlog', cards: [], total: 0 }],
        details: [],
      });
      const lines = csv.replace(/^\uFEFF/, '').split('\r\n');

      expect(lines).to.have.length(1);
      expect(lines[0]).to.contain('List');
    });

    it('includes a Custom Fields column with name and value', () => {
      const csv = toCSV({
        ...mockData,
        details: [
          {
            listName: 'Backlog',
            card: {
              ...mockData.details[0].card,
              customFields: [
                { name: 'N\u00BA Processo', type: 'text', value: 'HMMG.2026-1', color: null },
              ],
            },
          },
        ],
      });

      expect(csv).to.include('Custom Fields');
      expect(csv).to.include('N\u00BA Processo: HMMG.2026-1');
    });
  });

  describe('#measurePillWidth', () => {
    // Regression test for the Task 6 fix: without Math.ceil(), pillW - pad*2 can land a
    // hair below the real glyph width (float round-trip), and pdfkit's own line-wrapper
    // then wraps the pill text onto a second line ("INEX" -> "INE" / "X"). Comparing
    // against a numeric width alone is not enough to catch this (adding pad and
    // subtracting it back rarely changes the float value) — the only real proof is that
    // pdfkit does not wrap the text when drawn at the reserved inner width.
    it('reserves enough width that the pill text does not wrap onto a second line', () => {
      const doc = new PDFDocument({ size: 'A4' });
      doc.font('Helvetica').fontSize(8);

      const text = 'INEX';
      const pad = 8;
      const innerWidth = measurePillWidth(doc, text, pad) - pad * 2;

      const oneLineHeight = doc.heightOfString('X', { width: 1000 });

      expect(doc.heightOfString(text, { width: innerWidth })).to.equal(oneLineHeight);
    });
  });

  describe('#toPDF', () => {
    it('returns a Buffer starting with the PDF header', async () => {
      const buffer = await toPDF(mockData);

      expect(buffer).to.be.instanceOf(Buffer);
      expect(buffer.length).to.be.greaterThan(0);
      expect(buffer.toString('utf8', 0, 5)).to.contain('%PDF');
    });

    it('returns a valid PDF when there are no cards (zero totals)', async () => {
      const buffer = await toPDF({
        ...mockData,
        summary: [{ listName: 'Backlog', cards: [], total: 0 }],
        details: [],
      });

      expect(buffer).to.be.instanceOf(Buffer);
      expect(buffer.length).to.be.greaterThan(0);
      expect(buffer.toString('utf8', 0, 5)).to.contain('%PDF');
    });

    it('does not throw on a description with a very long unbroken token', async () => {
      const longUrl = `https://sei.exemplo.test/controlador.php?${'a'.repeat(400)}`;
      const pdf = await toPDF({
        ...mockData,
        details: [
          {
            listName: 'Backlog',
            card: { ...mockData.details[0].card, description: `Veja ${longUrl}` },
          },
        ],
      });

      expect(pdf.slice(0, 4).toString()).to.equal('%PDF');
    });

    it('does not throw on a label name longer than the card width', async () => {
      const pdf = await toPDF({
        ...mockData,
        details: [
          {
            listName: 'Backlog',
            card: {
              ...mockData.details[0].card,
              labels: [{ id: 'l1', name: 'L'.repeat(200), color: 'berry-red' }],
            },
          },
        ],
      });

      expect(pdf.slice(0, 4).toString()).to.equal('%PDF');
    });

    it('does not throw on a card carrying custom fields of every type', async () => {
      const pdf = await toPDF({
        ...mockData,
        details: [
          {
            listName: 'Backlog',
            card: {
              ...mockData.details[0].card,
              customFields: [
                { name: 'Nº Processo', type: 'text', value: 'HMMG.2026.00000705-83', color: null },
                { name: 'Valor', type: 'number', value: '45230', color: null },
                { name: 'Início', type: 'date', value: '12/09/2026', color: null },
                { name: 'Status', type: 'dropdown', value: 'Em Análise', color: 'berry-red' },
                { name: 'Aprovado', type: 'checkbox', value: '☑', color: null },
              ],
            },
          },
        ],
      });

      expect(pdf.slice(0, 4).toString()).to.equal('%PDF');
    });
  });
});

describe('label-colors', () => {
  it('maps the label color name to a solid hex', () => {
    expect(SERVER_LABEL_COLORS['berry-red']).to.equal('#e83855');
  });

  it('maps the gradient colors to a solid fallback', () => {
    expect(SERVER_LABEL_COLORS['pirate-gold']).to.equal('#b47e11');
    expect(SERVER_LABEL_COLORS['silver-glint']).to.equal('#adadad');
  });

  it('picks a dark text color on a light background', () => {
    expect(textColorFor('#f9c423')).to.equal('#1A1A18');
  });

  it('picks a light text color on a dark background', () => {
    expect(textColorFor('#004c70')).to.equal('#FFFFFF');
  });
});

describe('#toPlainText', () => {
  it('strips bold and italic markers', () => {
    expect(toPlainText('**Processo anterior:** nada')).to.equal('Processo anterior: nada');
    expect(toPlainText('*itálico* aqui')).to.equal('itálico aqui');
  });

  it('leaves underscores inside identifiers alone', () => {
    expect(toPlainText('HMMG_2026_001')).to.equal('HMMG_2026_001');
  });

  it('turns a markdown link into text plus its url', () => {
    expect(toPlainText('[Protocolo](https://exemplo.test/a)')).to.equal(
      'Protocolo (https://exemplo.test/a)',
    );
  });

  it('leaves plain text untouched', () => {
    expect(toPlainText('HMMG.2026.00001721-57')).to.equal('HMMG.2026.00001721-57');
  });

  it('tolerates an empty value', () => {
    expect(toPlainText('')).to.equal('');
    expect(toPlainText(null)).to.equal('');
  });
});

describe('LABEL_VALUE_OFFSET', () => {
  it('clears a 7pt label line (Helvetica-Bold measures 8.33pt)', () => {
    const doc = new PDFDocument({ size: 'A4' });
    doc.font('Helvetica-Bold').fontSize(7);
    const labelHeight = doc.heightOfString('Descrição');
    const minOffset = Math.ceil(labelHeight);
    expect(LABEL_VALUE_OFFSET).to.be.at.least(minOffset);
  });
});
