/**
 * POST /boards/:boardId/labels/:labelId/promote
 * Promote a local label to project-level (global)
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
    name: {
      type: 'string',
      required: true,
    },
    canBeUsedByMembers: {
      type: 'boolean',
      defaultsTo: true,
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

  fn: async function promote(inputs) {
    const { boardId, labelId, name, canBeUsedByMembers } = inputs;

    // Get label
    const label = await Label.findOne(labelId);
    if (!label || label.boardId !== boardId) {
      throw { statusCode: 404, message: 'Label not found' };
    }

    if (label.projectLabelId) {
      throw { statusCode: 400, message: 'Label is already global' };
    }

    // Get board and project
    const board = await Board.findOne(boardId);
    const projectId = board.projectId;

    // Check permission
    try {
      await sails.helpers.projectLabels.requireProjectManager(this.req.currentUser.id, projectId);
    } catch (error) {
      throw { statusCode: 403, message: error.message };
    }

    // Check if ProjectLabel with same name exists
    let projectLabel = await ProjectLabel.findOne({ projectId, name });

    if (!projectLabel) {
      // Create new ProjectLabel
      const maxPosLabel = await ProjectLabel.find({ projectId })
        .sort('position DESC')
        .limit(1);
      const position = maxPosLabel.length > 0 ? maxPosLabel[0].position + 65536 : 65536;

      projectLabel = await ProjectLabel.create({
        projectId,
        name,
        color: label.color,
        position,
        canBeUsedByMembers,
      }).fetch();
    }

    // Update label to link to ProjectLabel
    const updatedLabel = await Label.updateOne(labelId).set({
      projectLabelId: projectLabel.id,
    });

    // Consolidate other duplicate local labels (same name+color in same project)
    const boards2 = await Board.find({ projectId });
    const boardIds = boards2.map((b) => b.id);

    const duplicates = await Label.find({
      boardId: { in: boardIds },
      name: label.name,
      color: label.color,
      projectLabelId: null,
    });

    for (const dup of duplicates) {
      if (dup.id !== labelId) {
        await Label.updateOne(dup.id).set({ projectLabelId: projectLabel.id });
      }
    }

    return {
      label: updatedLabel,
      projectLabel,
    };
  },
};
