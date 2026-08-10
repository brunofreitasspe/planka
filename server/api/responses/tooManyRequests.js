/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * tooManyRequests.js
 *
 * A custom response.
 *
 * Example usage:
 * ```
 *     return res.tooManyRequests();
 *     // -or-
 *     return res.tooManyRequests(optionalData);
 * ```
 *
 * Or with actions2:
 * ```
 *     exits: {
 *       somethingHappened: {
 *         responseType: 'tooManyRequests'
 *       }
 *     }
 * ```
 *
 * ```
 *     throw 'somethingHappened';
 *     // -or-
 *     throw { somethingHappened: optionalData }
 * ```
 */

/**
 * @swagger
 * components:
 *   responses:
 *     TooManyRequests:
 *       description: Too many requests, please try again later
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - message
 *             properties:
 *               code:
 *                 type: string
 *                 description: Error code
 *                 example: E_TOO_MANY_REQUESTS
 *               message:
 *                 type: string
 *                 description: Error message
 *                 example: Too many requests
 */

module.exports = function tooManyRequests(message) {
  const { res } = this;

  return res.status(429).json({
    code: 'E_TOO_MANY_REQUESTS',
    message,
  });
};
