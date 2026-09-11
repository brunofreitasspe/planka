/**
 * Consolidate duplicate local labels within a project
 * Groups by (name, color) and creates ProjectLabels for duplicates
 */

module.exports = {
  inputs: {
    projectId: {
      type: 'string',
      required: true,
      description: 'Project ID to consolidate labels for',
    },
  },

  outputs: {
    consolidatedGroups: 'ref',
    totalConsolidated: 'number',
  },

  exits: {
    success: {
      description: 'Labels successfully consolidated',
    },
  },

  fn: async function consolidateDuplicates(inputs) {
    const { projectId } = inputs;

    // Get all boards in project
    const boards = await Board.find({ projectId });
    const boardIds = boards.map((b) => b.id);

    if (boardIds.length === 0) {
      return {
        consolidatedGroups: [],
        totalConsolidated: 0,
      };
    }

    // Get all local labels in these boards
    const localLabels = await Label.find({
      boardId: { in: boardIds },
      projectLabelId: null,
    });

    // Group by (name, color)
    const groups = {};
    localLabels.forEach((label) => {
      const key = `${label.name}|${label.color}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(label);
    });

    const consolidatedGroups = [];

    // Process groups with duplicates (count > 1)
    // eslint-disable-next-line no-restricted-syntax, guard-for-in -- groups is a plain literal built above; must run sequentially so position lookups below don't race
    for (const key in groups) {
      const labelGroup = groups[key];

      if (labelGroup.length > 1) {
        const [name, color] = key.split('|');

        // Check if ProjectLabel already exists
        // eslint-disable-next-line no-await-in-loop -- must run sequentially, each iteration's position lookup depends on the previous iteration's insert
        let projectLabel = await ProjectLabel.findOne({
          projectId,
          name,
          color,
        });

        if (!projectLabel) {
          // Get max position
          // eslint-disable-next-line no-await-in-loop -- see above
          const maxLabel = await ProjectLabel.find({ projectId }).sort('position DESC').limit(1);
          const maxPosition = maxLabel.length > 0 ? maxLabel[0].position + 65536 : 65536;

          // Create new ProjectLabel
          // eslint-disable-next-line no-await-in-loop -- see above
          projectLabel = await ProjectLabel.create({
            projectId,
            name,
            color,
            position: maxPosition,
            canBeUsedByMembers: true,
          }).fetch();
        }

        // Link all labels to this ProjectLabel
        // eslint-disable-next-line no-restricted-syntax -- sequential update, order doesn't affect correctness but keeps this loop simple to reason about alongside the outer one
        for (const label of labelGroup) {
          // eslint-disable-next-line no-await-in-loop -- see above
          await Label.updateOne(label.id).set({
            projectLabelId: projectLabel.id,
          });
        }

        consolidatedGroups.push({
          name,
          color,
          count: labelGroup.length,
          projectLabelId: projectLabel.id,
        });
      }
    }

    return {
      consolidatedGroups,
      totalConsolidated: consolidatedGroups.length,
    };
  },
};
