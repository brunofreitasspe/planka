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

  async fn(inputs) {
    const { user } = await User.qm.updateOne(inputs.record.id, {
      isPendingApproval: false,
      rejectedAt: new Date().toISOString(),
      rejectedByUserId: inputs.actorUser.id,
    });

    if (user) {
      const webhooks = await Webhook.qm.getAll();

      sails.helpers.utils.sendWebhooks.with({
        webhooks,
        event: Webhook.Events.USER_REGISTRATION_REJECTED,
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
