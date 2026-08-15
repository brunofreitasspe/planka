/**
 * POST /boards/:boardId/labels/:labelId/demote
 * Demote a global label back to local (board-level)
 */

module.exports = {
  inputs: {
    boardId: {
      type: 'string',
      required: true,
    },
    labelId: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    badRequest: {
      responseType: 'badRequest',
    },
    forbidden: {
      responseType: 'forbidden',
    },
  },

  fn: async function demote(inputs) {
    const { boardId, labelId } = inputs;

    // Get label
    const label = await Label.findOne(labelId);
    if (!label || label.boardId !== boardId) {
      throw { statusCode: 404, message: 'Label not found' };
    }

    if (!label.projectLabelId) {
      throw { statusCode: 400, message: 'Label is already local' };
    }

    // Get board and project
    const board = await Board.findOne(boardId);
    const projectId = board.projectId;

    // Check permission
    try {
      await sails.helpers.projectLabels.requireProjectManager(this.req.user.id, projectId);
    } catch (error) {
      throw { statusCode: 403, message: error.message };
    }

    // Demote: set projectLabelId to NULL
    const updatedLabel = await Label.updateOne(labelId).set({
      projectLabelId: null,
    });

    return { label: updatedLabel };
  },
};
