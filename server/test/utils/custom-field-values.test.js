/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');

const { formatDateOnly, buildCardCustomFields } = require('../../utils/custom-field-values');

const buildField = (overrides = {}) => ({
  id: 'cf-1',
  name: 'Nº Processo',
  type: 'text',
  position: 1,
  config: {},
  ...overrides,
});

const buildMap = (fields) => new Map(fields.map((field) => [field.id, field]));

describe('custom-field-values', () => {
  describe('#formatDateOnly', () => {
    it('formats an ISO date-only string as DD/MM/YYYY', () => {
      expect(formatDateOnly('2026-09-12')).to.equal('12/09/2026');
    });

    it('does not shift the day back in a negative-offset timezone', () => {
      // new Date('2026-09-12').toLocaleDateString('pt-BR') yields 11/09/2026 in UTC-3.
      expect(formatDateOnly('2026-09-12')).to.not.equal('11/09/2026');
    });

    it('leaves a malformed value untouched', () => {
      expect(formatDateOnly('not-a-date')).to.equal('not-a-date');
    });
  });

  describe('#buildCardCustomFields', () => {
    it('renders a text value with the field name', () => {
      const result = buildCardCustomFields(
        [{ customFieldId: 'cf-1', content: 'HMMG.2026.00000705-83' }],
        buildMap([buildField()]),
      );

      expect(result).to.deep.equal([
        { name: 'Nº Processo', type: 'text', value: 'HMMG.2026.00000705-83', color: null },
      ]);
    });

    it('renders a date value as DD/MM/YYYY', () => {
      const result = buildCardCustomFields(
        [{ customFieldId: 'cf-1', content: '2026-09-12' }],
        buildMap([buildField({ type: 'date' })]),
      );

      expect(result[0].value).to.equal('12/09/2026');
    });

    it('renders the selected dropdown option name and its color', () => {
      const field = buildField({
        type: 'dropdown',
        name: 'Status',
        config: {
          options: [
            { id: 'opt-1', name: 'Em Análise', color: 'berry-red' },
            { id: 'opt-2', name: 'Concluído', color: 'tank-green' },
          ],
        },
      });

      const result = buildCardCustomFields(
        [{ customFieldId: 'cf-1', content: 'opt-1' }],
        buildMap([field]),
      );

      expect(result).to.deep.equal([
        { name: 'Status', type: 'dropdown', value: 'Em Análise', color: 'berry-red' },
      ]);
    });

    it('omits a dropdown whose content matches no option', () => {
      const field = buildField({ type: 'dropdown', config: { options: [] } });

      expect(
        buildCardCustomFields([{ customFieldId: 'cf-1', content: 'opt-9' }], buildMap([field])),
      ).to.deep.equal([]);
    });

    it('renders a checked checkbox and omits an unchecked one', () => {
      const field = buildField({ type: 'checkbox', name: 'Aprovado' });

      expect(
        buildCardCustomFields([{ customFieldId: 'cf-1', content: 'true' }], buildMap([field])),
      ).to.deep.equal([{ name: 'Aprovado', type: 'checkbox', value: '☑', color: null }]);

      expect(
        buildCardCustomFields([{ customFieldId: 'cf-1', content: 'false' }], buildMap([field])),
      ).to.deep.equal([]);
    });

    it('omits a field with empty or whitespace-only content', () => {
      const map = buildMap([buildField()]);

      expect(buildCardCustomFields([{ customFieldId: 'cf-1', content: '' }], map)).to.deep.equal(
        [],
      );
      expect(buildCardCustomFields([{ customFieldId: 'cf-1', content: '   ' }], map)).to.deep.equal(
        [],
      );
    });

    it('omits a value whose custom field no longer exists', () => {
      expect(
        buildCardCustomFields([{ customFieldId: 'cf-gone', content: 'x' }], buildMap([])),
      ).to.deep.equal([]);
    });

    it('orders the fields by position, not by the order of the values', () => {
      const map = buildMap([
        buildField({ id: 'cf-1', name: 'Segundo', position: 2 }),
        buildField({ id: 'cf-2', name: 'Primeiro', position: 1 }),
      ]);

      const result = buildCardCustomFields(
        [
          { customFieldId: 'cf-1', content: 'b' },
          { customFieldId: 'cf-2', content: 'a' },
        ],
        map,
      );

      expect(result.map((field) => field.name)).to.deep.equal(['Primeiro', 'Segundo']);
    });

    it('tolerates an empty value list', () => {
      expect(buildCardCustomFields([], buildMap([buildField()]))).to.deep.equal([]);
    });
  });
});
