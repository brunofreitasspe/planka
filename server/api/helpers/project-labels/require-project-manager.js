/**
 * Verify user is project manager
 */

module.exports = {
  inputs: {
    userId: {
      type: 'string',
      required: true,
    },
    projectId: {
      type: 'string',
      required: true,
    },
  },

  fn: async function requireProjectManager(inputs) {
    const { userId, projectId } = inputs;

    const projectManager = await ProjectManager.findOne({
      projectId,
      userId,
    });

    if (!projectManager) {
      throw new Error(`User ${userId} is not manager of project ${projectId}`);
    }

    return true;
  },
};
