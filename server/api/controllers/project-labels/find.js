/**
 * GET /projects/:projectId/labels
 * List all project-level labels
 */

module.exports = {
  inputs: {
    projectId: {
      type: 'string',
      required: true,
    },
    includeUsageStats: {
      type: 'boolean',
      defaultsTo: false,
    },
  },

  fn: async function find(inputs) {
    const { projectId, includeUsageStats } = inputs;

    let labels = await ProjectLabel.find({ projectId }).sort('position ASC');

    if (includeUsageStats) {
      labels = await Promise.all(
        labels.map(async (label) => {
          const linkedCount = await Label.count({
            projectLabelId: label.id,
          });

          const linkedLabels = await Label.find({
            projectLabelId: label.id,
          });
          const usedInBoardIds = new Set(linkedLabels.map((l) => l.boardId));

          return {
            ...label,
            linkedLabelCount: linkedCount,
            usedInBoardCount: usedInBoardIds.size,
          };
        })
      );
    }

    return { labels };
  },
};
