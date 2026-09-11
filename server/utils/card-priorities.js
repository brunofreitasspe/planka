/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Mirrors client/src/constants/CardPriorities.js. Card.priority is a number 0-10
// (0 = no priority); these maps translate to named bands and pt-BR labels for the export.

const CardPriorityBands = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'veryHigh',
  URGENT: 'urgent',
};

const CARD_PRIORITY_BANDS = Object.values(CardPriorityBands);

const CARD_PRIORITY_BAND_RANGES = {
  [CardPriorityBands.URGENT]: { min: 1, max: 2 },
  [CardPriorityBands.VERY_HIGH]: { min: 3, max: 4 },
  [CardPriorityBands.HIGH]: { min: 5, max: 6 },
  [CardPriorityBands.MEDIUM]: { min: 7, max: 8 },
  [CardPriorityBands.LOW]: { min: 9, max: 10 },
};

// pt-BR names shown in the export (matches the approved mockup).
const CARD_PRIORITY_BAND_NAMES = {
  [CardPriorityBands.URGENT]: 'Urgente',
  [CardPriorityBands.VERY_HIGH]: 'Muito Alta',
  [CardPriorityBands.HIGH]: 'Alta',
  [CardPriorityBands.MEDIUM]: 'Média',
  [CardPriorityBands.LOW]: 'Baixa',
};

const BANDS_BY_MAX_VALUE = [
  { maxValue: 2, band: CardPriorityBands.URGENT },
  { maxValue: 4, band: CardPriorityBands.VERY_HIGH },
  { maxValue: 6, band: CardPriorityBands.HIGH },
  { maxValue: 8, band: CardPriorityBands.MEDIUM },
  { maxValue: 10, band: CardPriorityBands.LOW },
];

const isValidPriorityBands = (value) =>
  Array.isArray(value) && value.every((band) => CARD_PRIORITY_BANDS.includes(band));

// Empty/absent bands = no priority filter (matches client isCardPriorityInBands).
const isCardPriorityInBands = (priority, bands) => {
  if (!Array.isArray(bands) || bands.length === 0) {
    return true;
  }

  if (!priority) {
    return false;
  }

  return bands.some((band) => {
    const { min, max } = CARD_PRIORITY_BAND_RANGES[band];
    return priority >= min && priority <= max;
  });
};

const getCardPriorityBand = (value) =>
  (BANDS_BY_MAX_VALUE.find(({ maxValue }) => value <= maxValue) || BANDS_BY_MAX_VALUE.at(-1)).band;

// '' for 0/no priority, else the pt-BR band name.
const getCardPriorityName = (value) =>
  value ? CARD_PRIORITY_BAND_NAMES[getCardPriorityBand(value)] : '';

module.exports = {
  CardPriorityBands,
  CARD_PRIORITY_BANDS,
  CARD_PRIORITY_BAND_RANGES,
  CARD_PRIORITY_BAND_NAMES,
  isValidPriorityBands,
  isCardPriorityInBands,
  getCardPriorityBand,
  getCardPriorityName,
};
