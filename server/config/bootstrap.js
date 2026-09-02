/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

const parseEnvInt = (value, fallback) => {
  const number = parseInt(value, 10);
  return Number.isNaN(number) ? fallback : number;
};

module.exports.bootstrap = async () => {
  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return;
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

  // The pinned sails-postgresql/machinepack-postgresql adapter does not forward
  // `statement_timeout`/`idle_in_transaction_session_timeout` from datastore config
  // to `pg` (it whitelists which keys reach `pg.Pool` — see docs/backend.md finding #1),
  // so they are enforced here directly on every new pooled connection instead.
  const statementTimeoutMillis = parseEnvInt(process.env.DB_STATEMENT_TIMEOUT_MILLIS, 30000);
  const idleInTransactionSessionTimeoutMillis = parseEnvInt(
    process.env.DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MILLIS,
    60000,
  );

  const { pool } = sails.getDatastore().manager;

  pool.on('connect', (client) => {
    client
      .query(
        `SET statement_timeout = ${statementTimeoutMillis}; SET idle_in_transaction_session_timeout = ${idleInTransactionSessionTimeoutMillis};`,
      )
      .catch((error) => {
        sails.log.error('Failed to set PostgreSQL session timeouts on new pool connection:', error);
      });
  });

  // One-time consolidation for global labels (spec 3.2): on deploy, group
  // duplicate local labels (same name + color across boards) into project
  // globals. This is idempotent — after a run the grouped labels are linked to
  // a ProjectLabel, so they are no longer local duplicates and later lifts no-op.
  try {
    const projects = await Project.find();

    for (const project of projects) {
      const result = await sails.helpers.labels.consolidateDuplicates(project.id);

      if (result.totalConsolidated > 0) {
        const groups = result.consolidatedGroups
          .map((group) => `"${group.name}" (${group.count})`)
          .join(', ');

        sails.log.info(
          `[project-labels] consolidated ${result.totalConsolidated} duplicate group(s) in project ${project.id}: ${groups}`,
        );
      }
    }
  } catch (error) {
    sails.log.warn('[project-labels] automatic consolidation skipped:', error.message);
  }
};
