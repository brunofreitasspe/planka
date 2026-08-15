/**
 * DELETE /projects/:projectId/labels/:projectLabelId
 * Delete a project-level label and reconvert linked labels to local
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
  },

  exits: {
    notFound: {
      responseType: 'notFound',
    },
    forbidden: {
      responseType: 'forbidden',
    },
  },

  fn: async function delete_(inputs) {
    const { projectId, projectLabelId } = inputs;

    // Check permission
    try {
      await sails.helpers.projectLabels.requireProjectManager(this.req.user.id, projectId);
    } catch (error) {
      throw { statusCode: 403, message: error.message };
    }

    // Verify label belongs to project
    const projectLabel = await ProjectLabel.findOne({
      id: projectLabelId,
      projectId,
    });
    if (!projectLabel) {
      throw { statusCode: 404, message: 'Label not found' };
    }

    // Reconvert all linked labels (set projectLabelId = NULL)
    await Label.update({ projectLabelId }).set({ projectLabelId: null });

    // Delete global label
    await ProjectLabel.destroyOne(projectLabelId);

    return { statusCode: 204 };
  },
};
