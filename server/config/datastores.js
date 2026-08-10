/**
 * Datastores
 * (sails.config.datastores)
 *
 * A set of datastore configurations which tell Sails where to fetch or save
 * data when you execute built-in model methods like `.find()` and `.create()`.
 *
 *  > This file is mainly useful for configuring your development database,
 *  > as well as any additional one-off databases used by individual models.
 *  > Ready to go live?  Head towards `config/env/production.js`.
 *
 * For more information on configuring datastores, check out:
 * https://sailsjs.com/config/datastores
 */

const pg = require('pg');

pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (value) => new Date(`${value}Z`));

const parseEnvInt = (value, fallback) => {
  const number = parseInt(value, 10);
  return Number.isNaN(number) ? fallback : number;
};

// Pool sizing, shared by all environments (see docs/backend.md finding #1 — the `pg`
// driver otherwise falls back to an implicit max of 10 connections with no floor).
// `statement_timeout`/`query_timeout`/`idle_in_transaction_session_timeout` are NOT set
// here: the pinned sails-postgresql/machinepack-postgresql adapter silently drops those
// keys before they reach `pg.Pool`, so they are enforced instead via a `pool.on('connect', ...)`
// hook in `config/bootstrap.js`.
const poolConfig = {
  min: parseEnvInt(process.env.DB_POOL_MIN, 2),
  max: parseEnvInt(process.env.DB_POOL_MAX, 10),
  idleTimeoutMillis: parseEnvInt(process.env.DB_POOL_IDLE_TIMEOUT_MILLIS, 30000),
};

module.exports.datastores = {
  /**
   *
   * Your app's default datastore.
   *
   * Sails apps read and write to local disk by default, using a built-in
   * database adapter called `sails-disk`.  This feature is purely for
   * convenience during development; since `sails-disk` is not designed for
   * use in a production environment.
   *
   * To use a different db _in development_, follow the directions below.
   * Otherwise, just leave the default datastore as-is, with no `adapter`.
   *
   * (For production configuration, see `config/env/production.js`.)
   *
   */

  default: {
    /**
     *
     * Want to use a different database during development?
     *
     * 1. Choose an adapter:
     *    https://sailsjs.com/plugins/databases
     *
     * 2. Install it as a dependency of your Sails app.
     *    (For example:  npm install sails-mysql --save)
     *
     * 3. Then pass it in, along with a connection URL.
     *    (See https://sailsjs.com/config/datastores for help.)
     *
     */

    adapter: 'sails-postgresql',
    url: process.env.DATABASE_URL,
    ...poolConfig,
  },
};
