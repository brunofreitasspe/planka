/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.boolean('is_pending_approval').notNullable().defaultTo(false);
    table.timestamp('approved_at', true);
    table.bigInteger('approved_by_user_id');
    table.timestamp('rejected_at', true);
    table.bigInteger('rejected_by_user_id');

    table.index('is_pending_approval');
  });

  await knex.schema.alterTable('config', (table) => {
    table.boolean('registration_enabled').notNullable().defaultTo(false);
    table.jsonb('registration_allowed_domains').notNullable().defaultTo('[]');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.dropColumn('is_pending_approval');
    table.dropColumn('approved_at');
    table.dropColumn('approved_by_user_id');
    table.dropColumn('rejected_at');
    table.dropColumn('rejected_by_user_id');
  });

  await knex.schema.alterTable('config', (table) => {
    table.dropColumn('registration_enabled');
    table.dropColumn('registration_allowed_domains');
  });
};
