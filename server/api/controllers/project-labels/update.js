/**
 * PATCH /projects/:projectId/labels/:projectLabelId
 * Update a project-level label
 */

module.exports = {
  inputs: {
    projectId: {
      type: 'string',
      required: true,
    },
    projectLabelId: {
      type: 'string',
      required: true,
    },
    name: {
      type: 'string',
    },
    color: {
      type: 'string',
      isIn: require('../../models/Label').COLORS,
    },
    canBeUsedByMembers: {
      type: 'boolean',
    },
  },

  exits: {
    notFound: {
      responseType: 'notFound',
    },
    forbidden: {
      responseType: 'forbidden',
    },
  },

  fn: async function update(inputs) {
    const { projectId, projectLabelId, name, color, canBeUsedByMembers } = inputs;

    // Check permission
    try {
      await sails.helpers.projectLabels.requireProjectManager(this.req.user.id, projectId);
    } catch (error) {
      throw { statusCode: 403, message: error.message };
    }

    // Verify label belongs to project
    const projectLabel = await ProjectLabel.findOne({ id: projectLabelId, projectId });
    if (!projectLabel) {
      throw { statusCode: 404, message: 'Label not found' };
    }

    // Check name uniqueness if changing name
    if (name && name !== projectLabel.name) {
      const duplicate = await ProjectLabel.findOne({ projectId, name });
      if (duplicate) {
        throw { statusCode: 400, message: 'Label name already exists in this project' };
      }
    }

    // Update
    const updated = await ProjectLabel.updateOne(projectLabelId).set({
      ...(name && { name }),
      ...(color && { color }),
      ...(canBeUsedByMembers !== undefined && { canBeUsedByMembers }),
    });

    return updated;
  },
};
