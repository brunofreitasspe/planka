/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { getRemoteAddress } = require('../../utils/remote-address');

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_PER_EMAIL = 3;

const attemptsByKey = new Map();

const isAllowed = (key, maxAttempts) => {
  const now = Date.now();
  const entry = attemptsByKey.get(key);

  if (!entry || now - entry.windowStartedAt >= WINDOW_MS) {
    attemptsByKey.set(key, {
      windowStartedAt: now,
      count: 1,
    });

    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count += 1;
  return true;
};

module.exports = async function isRateLimitedRegistration(req, res, proceed) {
  const remoteAddress = getRemoteAddress(req);
  const email = _.isString(req.body.email) ? req.body.email.toLowerCase() : undefined;

  if (!isAllowed(`ip:${remoteAddress}`, MAX_ATTEMPTS_PER_IP)) {
    return res.tooManyRequests('Too many registration attempts, please try again later');
  }

  if (email && !isAllowed(`email:${email}`, MAX_ATTEMPTS_PER_EMAIL)) {
    return res.tooManyRequests('Too many registration attempts, please try again later');
  }

  return proceed();
};
