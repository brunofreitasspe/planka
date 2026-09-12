/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import buildCardSearchStrings from './build-card-search-strings';
import buildSearchParts from './build-search-parts';

// Filters cards by the board search box. Searches every string of a card (name,
// description and custom field values -- see buildCardSearchStrings), so a term
// stored in a custom field is found the same way a term in the name is.
//
// Shared by Board and List, which each render their own filtered card list: two
// copies of this drifted apart once already, leaving List unable to match custom
// fields at all.
export default (cardModels, search) => {
  const searchStringsByCardId = cardModels.map((cardModel) => ({
    cardModel,
    searchStrings: buildCardSearchStrings(cardModel),
  }));

  if (search.startsWith('/')) {
    let searchRegex;
    try {
      searchRegex = new RegExp(search.substring(1), 'i');
    } catch {
      return [];
    }

    return searchStringsByCardId
      .filter(({ searchStrings }) => searchStrings.some((str) => searchRegex.test(str)))
      .map(({ cardModel }) => cardModel);
  }

  const searchParts = buildSearchParts(search);

  return searchStringsByCardId
    .filter(({ searchStrings }) =>
      searchParts.every((searchPart) => searchStrings.some((str) => str.includes(searchPart))),
    )
    .map(({ cardModel }) => cardModel);
};
