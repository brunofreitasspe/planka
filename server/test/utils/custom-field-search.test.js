const { expect } = require('chai');

const { buildCustomFieldSearchClause } = require('../../utils/custom-field-search');

describe('custom-field-search', () => {
  describe('#buildCustomFieldSearchClause', () => {
    it('starts the placeholders at the provided index', () => {
      const { sql } = buildCustomFieldSearchClause({ startIndex: 3 });

      expect(sql).to.include('$3');
      expect(sql).not.to.include('$2');
    });

    it('matches the card being filtered and excludes checkbox fields', () => {
      const { sql } = buildCustomFieldSearchClause({ startIndex: 1 });

      expect(sql).to.include('cfv.card_id = card.id');
      expect(sql).to.include("cf.type <> 'checkbox'");
    });

    it('guards the date cast with a format regex', () => {
      const { sql } = buildCustomFieldSearchClause({ startIndex: 1 });

      expect(sql).to.include("content ~ '^\\d{4}-\\d{2}-\\d{2}$'");
    });

    it('resolves dropdown option names through the custom field config', () => {
      const { sql } = buildCustomFieldSearchClause({ startIndex: 1 });

      expect(sql).to.include("jsonb_array_elements(cf.config -> 'options')");
      expect(sql).to.include("option ->> 'name' ILIKE");
    });

    it('scopes the dropdown match to the selected option id', () => {
      const { sql } = buildCustomFieldSearchClause({ startIndex: 1 });

      expect(sql).to.include("option ->> 'id' = cfv.content");
    });

    it('uses exactly one placeholder, at the provided index', () => {
      const { sql } = buildCustomFieldSearchClause({ startIndex: 4 });

      const used = [...new Set((sql.match(/\$(\d+)/g) || []).map((p) => Number(p.slice(1))))];

      expect(used).to.deep.equal([4]);
    });
  });
});
