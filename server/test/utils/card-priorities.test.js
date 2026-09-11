const { expect } = require('chai');

const {
  getCardPriorityName,
  isCardPriorityInBands,
  isValidPriorityBands,
} = require('../../utils/card-priorities');

describe('card-priorities', () => {
  describe('#getCardPriorityName', () => {
    it('returns empty string for no priority', () => {
      expect(getCardPriorityName(0)).to.equal('');
      expect(getCardPriorityName(null)).to.equal('');
      expect(getCardPriorityName(undefined)).to.equal('');
    });

    it('maps band ranges to pt-BR names', () => {
      expect(getCardPriorityName(1)).to.equal('Urgente');
      expect(getCardPriorityName(2)).to.equal('Urgente');
      expect(getCardPriorityName(3)).to.equal('Muito Alta');
      expect(getCardPriorityName(6)).to.equal('Alta');
      expect(getCardPriorityName(7)).to.equal('Média');
      expect(getCardPriorityName(10)).to.equal('Baixa');
    });
  });

  describe('#isCardPriorityInBands', () => {
    it('matches a priority inside a band', () => {
      expect(isCardPriorityInBands(5, ['high'])).to.equal(true);
      expect(isCardPriorityInBands(6, ['high'])).to.equal(true);
    });

    it('rejects a priority outside the band', () => {
      expect(isCardPriorityInBands(7, ['high'])).to.equal(false);
      expect(isCardPriorityInBands(4, ['high'])).to.equal(false);
    });

    it('treats no priority (0) as not in any band', () => {
      expect(isCardPriorityInBands(0, ['high'])).to.equal(false);
    });

    it('returns true when no bands are given (no filter)', () => {
      expect(isCardPriorityInBands(5, [])).to.equal(true);
      expect(isCardPriorityInBands(0, [])).to.equal(true);
      expect(isCardPriorityInBands(5, undefined)).to.equal(true);
    });
  });

  describe('#isValidPriorityBands', () => {
    it('accepts valid band arrays', () => {
      expect(isValidPriorityBands(['high', 'medium'])).to.equal(true);
      expect(isValidPriorityBands([])).to.equal(true);
    });

    it('rejects unknown bands and non-arrays', () => {
      expect(isValidPriorityBands(['nope'])).to.equal(false);
      expect(isValidPriorityBands('high')).to.equal(false);
      expect(isValidPriorityBands(undefined)).to.equal(false);
    });
  });
});
