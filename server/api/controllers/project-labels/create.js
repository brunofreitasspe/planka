/**
 * POST /projects/:projectId/labels
 * Create a new project-level label (global)
 */

module.exports = {
  inputs: {
    projectId: {
      type: 'string',
      required: true,
      columnName: 'project_id',
    },
    name: {
      type: 'string',
      required: true,
    },
    color: {
      type: 'string',
      required: true,
      isIn: require('../../models/Label').COLORS,
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

  fn: async function create(inputs) {
    const { projectId, name, color, canBeUsedByMembers } = inputs;

    // Check permission
    try {
      await sails.helpers.projectLabels.requireProjectManager(this.req.user.id, projectId);
    } catch (error) {
      throw { statusCode: 403, message: error.message };
    }

    // Check if name already exists in project
    const existing = await ProjectLabel.findOne({ projectId, name });
    if (existing) {
      throw { statusCode: 400, message: 'Label name already exists in this project' };
    }

    // Get max position
    const maxPosLabel = await ProjectLabel.find({ projectId })
      .sort('position DESC')
      .limit(1);
    const position = maxPosLabel.length > 0 ? maxPosLabel[0].position + 65536 : 65536;

    // Create
    const projectLabel = await ProjectLabel.create({
      projectId,
      name,
      color,
      position,
      canBeUsedByMembers,
    }).fetch();

    return {
      item: projectLabel,
    };
  },
};
