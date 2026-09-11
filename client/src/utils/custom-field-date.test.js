/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import {
  formatCustomFieldDate,
  isValidCustomFieldDate,
  parseCustomFieldDate,
} from './custom-field-date';

describe('parseCustomFieldDate', () => {
  test('parses an ISO date as a local date, not UTC', () => {
    const date = parseCustomFieldDate('2026-09-10');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(10);
  });

  test('returns null for empty input', () => {
    expect(parseCustomFieldDate(null)).toBeNull();
    expect(parseCustomFieldDate('')).toBeNull();
    expect(parseCustomFieldDate(undefined)).toBeNull();
  });

  test('returns null for a non-date string', () => {
    expect(parseCustomFieldDate('not-a-date')).toBeNull();
  });
});

describe('formatCustomFieldDate', () => {
  test('formats as YYYY-MM-DD with zero padding', () => {
    expect(formatCustomFieldDate(new Date(2026, 8, 10))).toBe('2026-09-10');
    expect(formatCustomFieldDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('returns null for an invalid date instead of NaN-NaN-NaN', () => {
    expect(formatCustomFieldDate(new Date('nope'))).toBeNull();
    expect(formatCustomFieldDate(null)).toBeNull();
    expect(formatCustomFieldDate(undefined)).toBeNull();
  });
});

describe('isValidCustomFieldDate', () => {
  test('accepts a real date', () => {
    expect(isValidCustomFieldDate(new Date(2026, 8, 10))).toBe(true);
  });

  test('rejects an invalid date and non-dates', () => {
    expect(isValidCustomFieldDate(new Date('nope'))).toBe(false);
    expect(isValidCustomFieldDate(null)).toBe(false);
    expect(isValidCustomFieldDate(undefined)).toBe(false);
    expect(isValidCustomFieldDate('2026-09-10')).toBe(false);
  });
});
