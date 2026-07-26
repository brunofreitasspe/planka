/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const path = require('path');
const dotenv = require('dotenv');
const _ = require('lodash');

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  quiet: true,
});

function buildSSLConfig() {
  if (process.env.KNEX_REJECT_UNAUTHORIZED_SSL_CERTIFICATE === 'false') {
    return {
      rejectUnauthorized: false,
    };
  }

  return false;
}

function parseEnvInt(value, fallback) {
  const number = parseInt(value, 10);
  return Number.isNaN(number) ? fallback : number;
}

module.exports = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: buildSSLConfig(),
    // These are forwarded directly to `pg` by knex (no adapter whitelist in the way,
    // unlike the Waterline datastore — see docs/backend.md finding #1).
    statement_timeout: parseEnvInt(process.env.DB_STATEMENT_TIMEOUT_MILLIS, 30000),
    query_timeout: parseEnvInt(process.env.DB_QUERY_TIMEOUT_MILLIS, 30000),
    idle_in_transaction_session_timeout: parseEnvInt(
      process.env.DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MILLIS,
      60000,
    ),
  },
  pool: {
    min: parseEnvInt(process.env.DB_POOL_MIN, 2),
    max: parseEnvInt(process.env.DB_POOL_MAX, 10),
  },
  migrations: {
    tableName: 'migration',
    directory: path.join(__dirname, 'migrations'),
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
  },
  wrapIdentifier: (value, origImpl) => origImpl(_.snakeCase(value)),
};
