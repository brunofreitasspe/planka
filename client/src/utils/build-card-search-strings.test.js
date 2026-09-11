/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import buildCardSearchStrings from './build-card-search-strings';

const buildCard = ({ name = '', description = '', values = [] } = {}) => ({
  name,
  description,
  customFieldValues: {
    toModelArray: () =>
      values.map(([type, content, options]) => ({
        content,
        customField: {
          type,
          config: options ? { options } : undefined,
        },
      })),
  },
});

describe('buildCardSearchStrings', () => {
  test('includes name and description lowercased', () => {
    const result = buildCardSearchStrings(
      buildCard({ name: 'Falha no Login', description: 'Erro 500' }),
    );

    expect(result).toContain('falha no login');
    expect(result).toContain('erro 500');
  });

  test('includes text custom field values', () => {
    const result = buildCardSearchStrings(buildCard({ values: [['text', 'HMMG-2026-001']] }));

    expect(result).toContain('hmmg-2026-001');
  });

  test('includes number custom field values', () => {
    const result = buildCardSearchStrings(buildCard({ values: [['number', '42500']] }));

    expect(result).toContain('42500');
  });

  test('includes a date custom field in both ISO and DD/MM/YYYY', () => {
    const result = buildCardSearchStrings(buildCard({ values: [['date', '2026-09-10']] }));

    expect(result).toContain('2026-09-10');
    expect(result).toContain('10/09/2026');
  });

  test('includes a dropdown custom field by the selected option name, not the other options', () => {
    const options = [
      { id: 'opt-1', name: 'Em andamento' },
      { id: 'opt-2', name: 'Concluído' },
    ];

    const result = buildCardSearchStrings(buildCard({ values: [['dropdown', 'opt-1', options]] }));

    expect(result).toContain('em andamento');
    expect(result).not.toContain('concluído');
  });

  test('excludes checkbox values', () => {
    const result = buildCardSearchStrings(buildCard({ values: [['checkbox', 'true']] }));

    expect(result).not.toContain('true');
  });

  test('tolerates a card with no custom field values', () => {
    expect(() => buildCardSearchStrings({ name: 'a', description: null })).not.toThrow();
  });

  test('tolerates a malformed date value', () => {
    const result = buildCardSearchStrings(buildCard({ values: [['date', 'not-a-date']] }));

    expect(result).toContain('not-a-date');
  });
});
