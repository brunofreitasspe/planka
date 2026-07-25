/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /users/{id}/approve:
 *   post:
 *     summary: Approve a pending registration
 *     description: Approves a self-registered user, activating their account. Requires admin privileges.
 *     tags:
 *       - Users
 *     operationId: approveUser
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the pending user to approve
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     responses:
 *       200:
 *         description: User approved successfully
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
  ACTIVE_LIMIT_REACHED: {
    activeLimitReached: 'Active limit reached',
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
    activeLimitReached: {
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

    const approvedUser = await sails.helpers.users.approveOne
      .with({
        record: user,
        actorUser: currentUser,
        request: this.req,
      })
      .intercept('activeLimitReached', () => Errors.ACTIVE_LIMIT_REACHED);

    return {
      item: sails.helpers.users.presentOne(approvedUser, currentUser),
    };
  },
};
