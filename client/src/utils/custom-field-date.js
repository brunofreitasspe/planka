/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { isValid } from 'date-fns';

// A custom field DATE is stored as a plain 'YYYY-MM-DD' string. Building the Date
// with an explicit time avoids the UTC shift `new Date('2026-09-10')` would apply.
export const parseCustomFieldDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return isValid(date) ? date : null;
};

export const isValidCustomFieldDate = (date) => !!date && date instanceof Date && isValid(date);

export const formatCustomFieldDate = (date) => {
  if (!isValidCustomFieldDate(date)) {
    return null;
  }

  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, '0'),
    `${date.getDate()}`.padStart(2, '0'),
  ].join('-');
};
