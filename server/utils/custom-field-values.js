/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

// Custom field dates are stored as date-only strings (YYYY-MM-DD). Going through
// new Date() would read them as UTC midnight and shift the day back in any
// negative-offset timezone (UTC-3 renders 2026-09-12 as 11/09/2026), so reformat
// by splitting the string instead.
const formatDateOnly = (content) => {
  const match = DATE_ONLY_REGEX.exec(content);

  if (!match) {
    return content;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
};

// Returns null for a field that should not appear in the report: no content, an
// unchecked checkbox, or a dropdown whose stored option id is not in the config.
const renderValue = (customField, content) => {
  switch (customField.type) {
    case 'date':
      return formatDateOnly(content);

    case 'checkbox':
      return content === 'true' ? '☑' : null;

    case 'dropdown': {
      const options = (customField.config && customField.config.options) || [];
      const option = options.find((candidate) => candidate.id === content);

      if (!option) {
        return null;
      }

      return { value: option.name, color: option.color || null };
    }

    default:
      return content;
  }
};

// Builds the custom field list of one card, ordered by the field's position so the
// report matches the board. Fields without a value are omitted entirely.
const buildCardCustomFields = (customFieldValues, customFieldById) =>
  customFieldValues
    .map((customFieldValue) => ({
      customFieldValue,
      customField: customFieldById.get(customFieldValue.customFieldId),
    }))
    .filter(({ customField }) => customField)
    .sort((a, b) => {
      const positionA = a.customField.position || 0;
      const positionB = b.customField.position || 0;

      return positionA - positionB;
    })
    .map(({ customFieldValue, customField }) => {
      const content = (customFieldValue.content || '').trim();

      if (!content) {
        return null;
      }

      const rendered = renderValue(customField, content);

      if (rendered === null) {
        return null;
      }

      if (typeof rendered === 'string') {
        return { name: customField.name, type: customField.type, value: rendered, color: null };
      }

      return { name: customField.name, type: customField.type, ...rendered };
    })
    .filter(Boolean);

module.exports = {
  formatDateOnly,
  buildCardCustomFields,
};
