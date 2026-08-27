const { expect } = require('chai');

const { toCSV, toPDF, formatDateForReport } = require('../../utils/export-formatters');

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
  });

  describe('#toPDF', () => {
    it('returns a Buffer starting with the PDF header', async () => {
      const buffer = await toPDF(mockData);

      expect(buffer).to.be.instanceOf(Buffer);
      expect(buffer.length).to.be.greaterThan(0);
      expect(buffer.toString('utf8', 0, 5)).to.contain('%PDF');
    });
  });
});
