/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Self-register a user
 *     description: Creates a pending user account that requires admin approval before it can be used to log in. Must be enabled in the configuration.
 *     tags:
 *       - Users
 *     operationId: registerUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 256
 *                 description: Email address for login and notifications
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 maxLength: 256
 *                 description: Password for user authentication (must meet password requirements)
 *                 example: SecurePassword123!
 *               name:
 *                 type: string
 *                 maxLength: 128
 *                 description: Full display name of the user
 *                 example: John Doe
 *     responses:
 *       200:
 *         description: Registration request created successfully and is pending admin approval
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         description: Too many registration attempts
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */

const { isPassword } = require('../../../utils/validators');

const Errors = {
  REGISTRATION_DISABLED: {
    registrationDisabled: 'Registration is disabled',
  },
  EMAIL_DOMAIN_NOT_ALLOWED: {
    emailDomainNotAllowed: 'Email domain is not allowed to register',
  },
  EMAIL_ALREADY_IN_USE: {
    emailAlreadyInUse: 'Email already in use',
  },
  REGISTRATION_REJECTED: {
    registrationRejected: 'A previous registration request with this email was rejected',
  },
  ACTIVE_LIMIT_REACHED: {
    activeLimitReached: 'Active limit reached',
  },
};

module.exports = {
  inputs: {
    email: {
      type: 'string',
      maxLength: 256,
      isEmail: true,
      required: true,
    },
    password: {
      type: 'string',
      maxLength: 256,
      custom: isPassword,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
  },

  exits: {
    registrationDisabled: {
      responseType: 'forbidden',
    },
    emailDomainNotAllowed: {
      responseType: 'forbidden',
    },
    emailAlreadyInUse: {
      responseType: 'conflict',
    },
    registrationRejected: {
      responseType: 'conflict',
    },
    activeLimitReached: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const config = await Config.qm.getOneMain();

    if (!config.registrationEnabled) {
      throw Errors.REGISTRATION_DISABLED;
    }

    const email = inputs.email.toLowerCase();

    if (config.registrationAllowedDomains.length > 0) {
      const domain = email.split('@')[1];

      if (!config.registrationAllowedDomains.includes(domain)) {
        throw Errors.EMAIL_DOMAIN_NOT_ALLOWED;
      }
    }

    const existingUser = await User.qm.getOneByEmail(email);

    if (existingUser) {
      if (existingUser.rejectedAt) {
        throw Errors.REGISTRATION_REJECTED;
      }

      throw Errors.EMAIL_ALREADY_IN_USE;
    }

    const user = await sails.helpers.users.registerOne
      .with({
        values: {
          email,
          password: inputs.password,
          name: inputs.name,
        },
        request: this.req,
      })
      .intercept('emailAlreadyInUse', () => Errors.EMAIL_ALREADY_IN_USE)
      .intercept('activeLimitReached', () => Errors.ACTIVE_LIMIT_REACHED);

    return {
      item: sails.helpers.users.presentOne(user, user),
    };
  },
};
