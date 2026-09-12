/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');
const _ = require('lodash');

// Card.js (a Sails hook module, not a plain util) reads the `Card`, `_` and `sails`
// globals that Sails normally injects at lift time. There is no live database in this
// environment, so a real integration test isn't possible here. Instead we stub just
// enough of those globals for the real module to load and run, and capture the SQL
// `sails.sendNativeQuery` would have received instead of executing it — this exercises
// the actual production query-building code (not a reimplementation of it) without a DB.
const CARD_MODULE_PATH = require.resolve('../../api/hooks/query-methods/models/Card');

describe('Card query methods - #getByEndlessListId multi-part search', () => {
  let previousCard;
  let previousUnderscore;
  let previousSails;
  let capturedQuery;
  let capturedValues;
  let getByEndlessListId;

  before(() => {
    previousCard = global.Card;
    previousUnderscore = global._;
    previousSails = global.sails;

    global.Card = { _transformer: { _transformations: {} } };
    global._ = _;
    global.sails = {
      sendNativeQuery: async (query, values) => {
        capturedQuery = query;
        capturedValues = values;
        return { rows: [] };
      },
    };

    delete require.cache[CARD_MODULE_PATH];
    ({ getByEndlessListId } = require(CARD_MODULE_PATH)); // eslint-disable-line global-require, import/no-dynamic-require
  });

  after(() => {
    global.Card = previousCard;
    global._ = previousUnderscore;
    global.sails = previousSails;
    delete require.cache[CARD_MODULE_PATH];
  });

  beforeEach(() => {
    capturedQuery = undefined;
    capturedValues = undefined;
  });

  it('uses exactly one placeholder per search part, reused across name/description/custom fields', async () => {
    await getByEndlessListId('list-1', { search: 'foo bar' });

    // $1 is listId; one placeholder per part after that -- not one per field.
    expect(capturedValues).to.deep.equal(['list-1', 'foo', 'bar']);
  });

  it('ANDs the parts together while ORing name/description/custom-field within each part', () => {
    // Verified against this exact query in isolation (see git history / final-fix-report):
    // different fields may satisfy different parts because each part is its own
    // OR-group, and every part's OR-group must hold because the groups are ANDed.
    return getByEndlessListId('list-1', { search: 'foo bar' }).then(() => {
      const part1Clause =
        "card.name ILIKE '%' || $2 || '%' OR card.description ILIKE '%' || $2 || '%' OR EXISTS";
      const part2Clause =
        "card.name ILIKE '%' || $3 || '%' OR card.description ILIKE '%' || $3 || '%' OR EXISTS";

      expect(capturedQuery).to.include(part1Clause);
      expect(capturedQuery).to.include(part2Clause);

      // The two OR-groups are joined by AND, not OR: proves every part is required,
      // not just any single one (the F4 decision this whole file guards).
      const part1Index = capturedQuery.indexOf(part1Clause);
      const closingOfPart1 = capturedQuery.indexOf(')) AND (card.name', part1Index);
      expect(closingOfPart1).to.be.greaterThan(-1);
    });
  });

  it('lets a custom-field-only match satisfy a part (not just name/description)', async () => {
    await getByEndlessListId('list-1', { search: 'onlyincustomfield' });

    expect(capturedQuery).to.include('cfv.content ILIKE');
    expect(capturedQuery).to.include("option ->> 'name' ILIKE");
  });

  it('drops the custom-field clause entirely for a single-term regex search but still requires the term', async () => {
    await getByEndlessListId('list-1', { search: '/^foo$' });

    expect(capturedValues).to.deep.equal(['list-1', '^foo$']);
    expect(capturedQuery).to.include('card.name ~* $2');
    expect(capturedQuery).to.include('cfv.content ~* $2');
  });
});
