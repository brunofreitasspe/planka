/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const CARD_PRIORITY_MIN = 10;
export const CARD_PRIORITY_MAX = 1;

export const CardPriorityBands = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'veryHigh',
  URGENT: 'urgent',
};

const BANDS_BY_MAX_VALUE = [
  {
    maxValue: 2,
    band: CardPriorityBands.URGENT,
    color: '#cd2626',
  },
  {
    maxValue: 4,
    band: CardPriorityBands.VERY_HIGH,
    color: '#e65100',
  },
  {
    maxValue: 6,
    band: CardPriorityBands.HIGH,
    color: '#f57f17',
  },
  {
    maxValue: 8,
    band: CardPriorityBands.MEDIUM,
    color: '#1976d2',
  },
  {
    maxValue: 10,
    band: CardPriorityBands.LOW,
    color: '#9e9e9e',
  },
];

export const CardPriorityBandRanges = {
  [CardPriorityBands.URGENT]: { min: 1, max: 2 },
  [CardPriorityBands.VERY_HIGH]: { min: 3, max: 4 },
  [CardPriorityBands.HIGH]: { min: 5, max: 6 },
  [CardPriorityBands.MEDIUM]: { min: 7, max: 8 },
  [CardPriorityBands.LOW]: { min: 9, max: 10 },
};

export const isCardPriorityInBands = (priority, bands) => {
  if (bands.length === 0) {
    return true;
  }

  if (!priority) {
    return false;
  }

  return bands.some((band) => {
    const { min, max } = CardPriorityBandRanges[band];
    return priority >= min && priority <= max;
  });
};

export const compareCardPriorities = (priority1, priority2) => {
  if (priority1 === 0) {
    return priority2 === 0 ? 0 : 1;
  }

  if (priority2 === 0) {
    return -1;
  }

  return priority1 - priority2;
};

export const getCardPriorityBand = (value) =>
  (BANDS_BY_MAX_VALUE.find(({ maxValue }) => value <= maxValue) || BANDS_BY_MAX_VALUE.at(-1)).band;

export const getCardPriorityColor = (value) =>
  (BANDS_BY_MAX_VALUE.find(({ maxValue }) => value <= maxValue) || BANDS_BY_MAX_VALUE.at(-1)).color;
