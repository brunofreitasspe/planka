/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { CardPriorityBands, compareCardPriorities, isCardPriorityInBands } from './CardPriorities';

describe('isCardPriorityInBands', () => {
  test('no filter shows everything including no priority', () => {
    expect(isCardPriorityInBands(0, [])).toBe(true);
    expect(isCardPriorityInBands(5, [])).toBe(true);
  });

  test('single band matches its exact range', () => {
    expect(isCardPriorityInBands(1, [CardPriorityBands.URGENT])).toBe(true);
    expect(isCardPriorityInBands(2, [CardPriorityBands.URGENT])).toBe(true);
    expect(isCardPriorityInBands(3, [CardPriorityBands.URGENT])).toBe(false);
    expect(isCardPriorityInBands(10, [CardPriorityBands.LOW])).toBe(true);
    expect(isCardPriorityInBands(9, [CardPriorityBands.LOW])).toBe(true);
    expect(isCardPriorityInBands(8, [CardPriorityBands.LOW])).toBe(false);
  });

  test('multiple contiguous bands form a range', () => {
    const bands = [CardPriorityBands.URGENT, CardPriorityBands.VERY_HIGH];
    expect(isCardPriorityInBands(1, bands)).toBe(true);
    expect(isCardPriorityInBands(4, bands)).toBe(true);
    expect(isCardPriorityInBands(5, bands)).toBe(false);
  });

  test('disjoint bands match any of them', () => {
    const bands = [CardPriorityBands.URGENT, CardPriorityBands.LOW];
    expect(isCardPriorityInBands(1, bands)).toBe(true);
    expect(isCardPriorityInBands(10, bands)).toBe(true);
    expect(isCardPriorityInBands(5, bands)).toBe(false);
  });

  test('no-priority cards are hidden when a filter is active', () => {
    expect(isCardPriorityInBands(0, [CardPriorityBands.URGENT])).toBe(false);
  });
});

describe('compareCardPriorities', () => {
  test('lower value (more urgent) comes first', () => {
    expect(compareCardPriorities(1, 5)).toBeLessThan(0);
    expect(compareCardPriorities(5, 1)).toBeGreaterThan(0);
  });

  test('no priority always sorts last', () => {
    expect(compareCardPriorities(0, 1)).toBeGreaterThan(0);
    expect(compareCardPriorities(1, 0)).toBeLessThan(0);
  });

  test('equal priorities compare equal', () => {
    expect(compareCardPriorities(0, 0)).toBe(0);
    expect(compareCardPriorities(3, 3)).toBe(0);
  });
});
