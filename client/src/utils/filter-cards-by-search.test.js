/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import filterCardsBySearch from './filter-cards-by-search';

const buildCard = (id, { name = '', description = '', values = [] } = {}) => ({
  id,
  name,
  description,
  customFieldValues: {
    toModelArray: () =>
      values.map(([type, content]) => ({
        content,
        customField: { type },
      })),
  },
});

describe('filterCardsBySearch', () => {
  test('matches a term stored only in a custom field', () => {
    const match = buildCard('1', { values: [['text', 'HMMG.2026.00011-11']] });
    const other = buildCard('2', { name: 'Outro cartão' });

    const result = filterCardsBySearch([match, other], 'HMMG.2026.00011-11');

    expect(result.map((card) => card.id)).toEqual(['1']);
  });

  test('matches a fragment of a custom field value', () => {
    const match = buildCard('1', { values: [['text', 'HMMG.2026.00011-11']] });

    expect(filterCardsBySearch([match], '00011').map((card) => card.id)).toEqual(['1']);
  });

  test('still matches name and description', () => {
    const cards = [
      buildCard('1', { name: 'Falha no Login' }),
      buildCard('2', { description: 'Erro 500' }),
      buildCard('3', { name: 'Nada aqui' }),
    ];

    expect(filterCardsBySearch(cards, 'falha').map((card) => card.id)).toEqual(['1']);
    expect(filterCardsBySearch(cards, 'erro').map((card) => card.id)).toEqual(['2']);
  });

  test('requires every part to match, possibly across different fields', () => {
    const cards = [
      buildCard('1', { name: 'Falha no Login', values: [['text', 'SEI 12345']] }),
      buildCard('2', { name: 'Falha no Logout' }),
    ];

    expect(filterCardsBySearch(cards, 'falha 12345').map((card) => card.id)).toEqual(['1']);
  });

  test('applies a /regex to custom fields too', () => {
    const match = buildCard('1', { values: [['text', 'HMMG.2026.00011-11']] });
    const other = buildCard('2', { values: [['text', 'ABC.2026.00099-99']] });

    const result = filterCardsBySearch([match, other], '/^hmmg\\.2026');

    expect(result.map((card) => card.id)).toEqual(['1']);
  });

  test('returns an empty array for an invalid regex instead of throwing', () => {
    const cards = [buildCard('1', { name: 'Falha' })];

    expect(filterCardsBySearch(cards, '/[unclosed')).toEqual([]);
  });
});
