/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const bcrypt = require('bcrypt');
const escapeHtml = require('escape-html');

const buildAndSendEmail = async (transporter, user, admin, t) => {
  const html = `<p>${t(
    '%s (%s) requested an account and is awaiting your approval.',
    escapeHtml(user.name),
    escapeHtml(user.email),
  )}</p><p>${t(
    'Review pending registrations in the admin panel: %s',
    `<a href="${sails.config.custom.baseUrl}">${sails.config.custom.baseUrl}</a>`,
  )}</p>`;

  await sails.helpers.utils.sendEmail.with({
    transporter,
    html,
    to: admin.email,
    subject: t('New Account Pending Approval'),
  });
};

module.exports = {
  inputs: {
    values: {
      type: 'json',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    emailAlreadyInUse: {},
    usernameAlreadyInUse: {},
    activeLimitReached: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    values.password = await bcrypt.hash(values.password, 10);

    if (values.username) {
      values.username = values.username.toLowerCase();
    }

    let user;
    try {
      user = await User.qm.createOne({
        ...values,
        email: values.email.toLowerCase(),
        role: User.Roles.BOARD_USER,
        isPendingApproval: true,
        isDeactivated: true,
      });
    } catch (error) {
      if (error.code === 'E_UNIQUE') {
        throw 'emailAlreadyInUse';
      }

      if (
        error.name === 'AdapterError' &&
        error.raw.constraint === 'user_account_username_unique'
      ) {
        throw 'usernameAlreadyInUse';
      }

      if (error.message === 'activeLimitReached') {
        throw 'activeLimitReached';
      }

      throw error;
    }

    const webhooks = await Webhook.qm.getAll();

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.USER_REGISTRATION_REQUESTED,
      buildData: () => ({
        item: sails.helpers.users.presentOne(user),
      }),
      user: null,
    });

    const admins = await User.qm.getAll({
      roleOrRoles: User.Roles.ADMIN,
      isDeactivated: false,
    });

    admins.forEach((admin) => {
      sails.sockets.broadcast(
        `user:${admin.id}`,
        'userCreate',
        {
          item: sails.helpers.users.presentOne(user, admin),
        },
        inputs.request,
      );
    });

    if (admins.length > 0) {
      const { transporter } = await sails.helpers.utils.makeSmtpTransporter();

      if (transporter) {
        await Promise.all(
          admins.map((admin) => {
            const t = sails.helpers.utils.makeTranslator(admin.language);
            return buildAndSendEmail(transporter, user, admin, t);
          }),
        );

        transporter.close();
      }
    }

    return user;
  },
};
