/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import CustomFieldTypes from '../constants/CustomFieldTypes';

const appendIfPresent = (result, value) => {
  if (value) {
    result.push(value.toLowerCase());
  }
};

const appendCustomFieldValue = (result, customFieldValueModel) => {
  const { content, customField } = customFieldValueModel;

  if (!content || !customField) {
    return;
  }

  switch (customField.type) {
    case CustomFieldTypes.DATE: {
      appendIfPresent(result, content);

      // Stored as ISO, but users search for what they see: DD/MM/YYYY.
      const parts = content.split('-');
      if (parts.length === 3) {
        result.push(`${parts[2]}/${parts[1]}/${parts[0]}`);
      }

      break;
    }
    case CustomFieldTypes.DROPDOWN: {
      const options = (customField.config && customField.config.options) || [];
      const selectedOption = options.find((option) => option.id === content);

      if (selectedOption) {
        appendIfPresent(result, selectedOption.name);
      }

      break;
    }
    case CustomFieldTypes.CHECKBOX:
      break;
    default:
      appendIfPresent(result, content);
  }
};

// Returns every searchable string of a card, lowercased. Used by the board search
// so custom field values are matched alongside name and description.
export default (cardModel) => {
  const result = [];

  appendIfPresent(result, cardModel.name);
  appendIfPresent(result, cardModel.description);

  if (cardModel.customFieldValues) {
    cardModel.customFieldValues.toModelArray().forEach((customFieldValueModel) => {
      appendCustomFieldValue(result, customFieldValueModel);
    });
  }

  return result;
};
