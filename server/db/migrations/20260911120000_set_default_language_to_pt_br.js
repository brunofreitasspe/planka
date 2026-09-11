/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// One-time reset of the stored language preference to the new system default.
// Deliberately not reversible: the previous per-user values are not recoverable,
// and every user can pick a different language again in User Settings → Account.
exports.up = (knex) =>
  knex('user_account').update({
    language: 'pt-BR',
  });

exports.down = () => {};
