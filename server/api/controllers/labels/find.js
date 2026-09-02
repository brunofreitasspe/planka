/**
 * GET /boards/:boardId/labels
 * List labels of board (local + global project labels)
 */

module.exports = {
  inputs: {
    boardId: {
      type: 'string',
      required: true,
    },
  },

  fn: async function find(inputs) {
    const { boardId } = inputs;

    // Get board
    const board = await Board.findOne(boardId);
    if (!board) {
      throw { statusCode: 404, message: 'Board not found' };
    }

    const projectId = board.projectId;

    // Get local labels
    const localLabels = await Label.find({ boardId, projectLabelId: null }).sort('position ASC');

    // Get global labels of project
    let globalLabels = await ProjectLabel.find({ projectId }).sort('position ASC');

    // Filter globals by permission if user is not manager
    const isManager = await ProjectManager.findOne({
      projectId,
      userId: this.req.currentUser.id,
    });

    if (!isManager) {
      globalLabels = globalLabels.filter((l) => l.canBeUsedByMembers);
    }

    // Combine: local labels + linked labels (via projectLabelId)
    const linkedLocalLabels = await Label.find({
      boardId,
      projectLabelId: { '!=': null },
    }).sort('position ASC');

    const allLabels = [
      ...localLabels.map((l) => ({ ...l, isGlobal: false })),
      ...linkedLocalLabels.map((l) => ({ ...l, isGlobal: true })),
      ...globalLabels.map((l) => ({
        id: l.id,
        projectLabelId: l.id,
        name: l.name,
        color: l.color,
        position: l.position,
        isGlobal: true,
        canBeUsedByMembers: l.canBeUsedByMembers,
      })),
    ];

    return { labels: allLabels };
  },
};
