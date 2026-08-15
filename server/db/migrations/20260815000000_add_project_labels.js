/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Adds the `project_label` table (global, project-wide labels) and links the
// `label` table to it through a nullable `project_label_id` (NULL = board-local).

exports.up = (knex) =>
  knex.schema
    .createTable('project_label', (table) => {
      /* Columns */

      table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));

      table.bigInteger('project_id').notNullable();

      table.specificType('position', 'double precision').notNullable();
      table.text('name').notNullable();
      table.text('color').notNullable();
      table.boolean('can_be_used_by_members').notNullable().defaultTo(true);

      table.timestamp('created_at', true);
      table.timestamp('updated_at', true);

      /* Indexes */

      table.index('project_id');
    })
    .then(() =>
      knex.schema.alterTable('label', (table) => {
        table.bigInteger('project_label_id');

        table.index('project_label_id');
      }),
    );

exports.down = (knex) =>
  knex.schema
    .alterTable('label', (table) => {
      table.dropIndex('project_label_id');
      table.dropColumn('project_label_id');
    })
    .then(() => knex.schema.dropTable('project_label'));
