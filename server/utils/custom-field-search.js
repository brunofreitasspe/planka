/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Values stored in custom_field_value.content are free text, so the date cast has to
// be guarded by a format check — a bare `content::date` throws on any non-date row.
const DATE_FORMAT_REGEX = String.raw`^\d{4}-\d{2}-\d{2}$`;

// Matches cards that have a custom field value matching the search term. CHECKBOX is
// excluded: its content is only ever 'true' or 'false'. The fragment uses exactly one
// placeholder, $startIndex — the caller must push the term into queryValues.
const buildCustomFieldSearchClause = ({ startIndex }) => {
  const part = `$${startIndex}`;

  const sql = `EXISTS (
    SELECT 1
      FROM custom_field_value cfv
      JOIN custom_field cf ON cf.id = cfv.custom_field_id
     WHERE cfv.card_id = card.id
       AND cf.type <> 'checkbox'
       AND (
         cfv.content ILIKE '%' || ${part} || '%'
         OR (cf.type = 'date'
             AND cfv.content ~ '${DATE_FORMAT_REGEX}'
             AND to_char(cfv.content::date, 'DD/MM/YYYY') ILIKE '%' || ${part} || '%')
         OR (cf.type = 'dropdown'
             AND EXISTS (
               SELECT 1
                 FROM jsonb_array_elements(cf.config -> 'options') AS option
                WHERE option ->> 'id' = cfv.content
                  AND option ->> 'name' ILIKE '%' || ${part} || '%'
             ))
       )
  )`;

  return { sql };
};

module.exports = {
  buildCustomFieldSearchClause,
};
