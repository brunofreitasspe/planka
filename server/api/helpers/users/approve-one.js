/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    activeLimitReached: {},
  },

  async fn(inputs) {
    let user;
    try {
      ({ user } = await User.qm.updateOne(inputs.record.id, {
        isPendingApproval: false,
        isDeactivated: false,
        approvedAt: new Date().toISOString(),
        approvedByUserId: inputs.actorUser.id,
      }));
    } catch (error) {
      if (error.message === 'activeLimitReached') {
        throw 'activeLimitReached';
      }

      throw error;
    }

    if (user) {
      const webhooks = await Webhook.qm.getAll();

      sails.helpers.utils.sendWebhooks.with({
        webhooks,
        event: Webhook.Events.USER_REGISTRATION_APPROVED,
        buildData: () => ({
          item: sails.helpers.users.presentOne(user),
        }),
        user: inputs.actorUser,
      });

      const admins = await User.qm.getAll({
        roleOrRoles: User.Roles.ADMIN,
        isDeactivated: false,
      });

      admins.forEach((admin) => {
        sails.sockets.broadcast(
          `user:${admin.id}`,
          'userUpdate',
          {
            item: sails.helpers.users.presentOne(user, admin),
          },
          inputs.request,
        );
      });
    }

    return user;
  },
};
