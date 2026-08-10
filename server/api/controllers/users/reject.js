/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /users/{id}/reject:
 *   post:
 *     summary: Reject a pending registration
 *     description: Rejects a self-registered user. The account is kept (not deleted) and its email is blocked from re-registering. Requires admin privileges.
 *     tags:
 *       - Users
 *     operationId: rejectUser
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the pending user to reject
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     responses:
 *       200:
 *         description: User rejected successfully
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
  },
  USER_NOT_PENDING_APPROVAL: {
    userNotPendingApproval: 'User is not pending approval',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    userNotFound: {
      responseType: 'notFound',
    },
    userNotPendingApproval: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const user = await User.qm.getOneById(inputs.id);

    if (!user) {
      throw Errors.USER_NOT_FOUND;
    }

    if (!user.isPendingApproval) {
      throw Errors.USER_NOT_PENDING_APPROVAL;
    }

    const rejectedUser = await sails.helpers.users.rejectOne.with({
      record: user,
      actorUser: currentUser,
      request: this.req,
    });

    return {
      item: sails.helpers.users.presentOne(rejectedUser, currentUser),
    };
  },
};
