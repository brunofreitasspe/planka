const assert = require('assert');

describe('Consolidate Duplicates Helper', () => {
  it('consolidates duplicate labels by name and color', async () => {
    const projectId = 'project-1';
    const boardId1 = 'board-1';
    const boardId2 = 'board-2';

    // Create boards
    const board1 = await Board.create({ projectId, name: 'Board 1', position: 65536 }).fetch();
    const board2 = await Board.create({ projectId, name: 'Board 2', position: 65537 }).fetch();

    // Create 2 identical local labels in different boards
    const label1 = await Label.create({
      boardId: board1.id,
      name: 'Bug',
      color: 'berry-red',
      position: 65536,
    }).fetch();

    const label2 = await Label.create({
      boardId: board2.id,
      name: 'Bug',
      color: 'berry-red',
      position: 65536,
    }).fetch();

    // Run consolidation
    const result = await sails.helpers.labels.consolidateDuplicates(projectId);

    assert.strictEqual(result.totalConsolidated, 1); // 1 group consolidated
    assert.strictEqual(result.consolidatedGroups[0].name, 'Bug');
    assert.strictEqual(result.consolidatedGroups[0].count, 2);

    // Verify both labels now link to same ProjectLabel
    const updatedLabel1 = await Label.findOne(label1.id);
    const updatedLabel2 = await Label.findOne(label2.id);

    assert(updatedLabel1.projectLabelId);
    assert.strictEqual(updatedLabel1.projectLabelId, updatedLabel2.projectLabelId);
  });

  it('leaves unique labels as local (projectLabelId = NULL)', async () => {
    const projectId = 'project-2';
    const board = await Board.create({ projectId, name: 'Board', position: 65536 }).fetch();

    const label = await Label.create({
      boardId: board.id,
      name: 'Unique Label',
      color: 'berry-red',
      position: 65536,
    }).fetch();

    const result = await sails.helpers.labels.consolidateDuplicates(projectId);

    assert.strictEqual(result.totalConsolidated, 0); // no consolidation

    const updatedLabel = await Label.findOne(label.id);
    assert.strictEqual(updatedLabel.projectLabelId, null); // still local
  });

  it('respects existing ProjectLabels (does not recreate)', async () => {
    const projectId = 'project-3';
    const board = await Board.create({ projectId, name: 'Board', position: 65536 }).fetch();

    // Create global label
    const projectLabel = await ProjectLabel.create({
      projectId,
      name: 'Bug',
      color: 'berry-red',
      position: 65536,
    }).fetch();

    // Create local label with same name/color
    const label = await Label.create({
      boardId: board.id,
      name: 'Bug',
      color: 'berry-red',
      position: 65536,
      projectLabelId: null,
    }).fetch();

    const result = await sails.helpers.labels.consolidateDuplicates(projectId);

    // Should find no duplicates (only one local label)
    assert.strictEqual(result.totalConsolidated, 0);

    // Label should still be local (no consolidation happened)
    const updatedLabel = await Label.findOne(label.id);
    assert.strictEqual(updatedLabel.projectLabelId, null);
  });
});
