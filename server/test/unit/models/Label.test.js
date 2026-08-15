const assert = require('assert');

describe('Label Model - Global Scope', () => {
  it('can be local (projectLabelId = NULL)', async () => {
    const label = await Label.create({
      boardId: 'test-board-1',
      name: 'Local Only',
      color: 'berry-red',
      position: 65536,
      projectLabelId: null,
    });

    assert.strictEqual(label.projectLabelId, null);
  });

  it('can be global (projectLabelId preenchido)', async () => {
    // Create project label first
    const projectLabel = await ProjectLabel.create({
      projectId: 'project-1',
      name: 'Global Bug',
      color: 'berry-red',
      position: 65536,
    });

    // Create local label linked to global
    const label = await Label.create({
      boardId: 'board-1',
      name: 'Global Bug',
      color: 'berry-red',
      position: 65536,
      projectLabelId: projectLabel.id,
    });

    assert.strictEqual(label.projectLabelId, projectLabel.id);
  });

  it('allows multiple labels linked to same ProjectLabel', async () => {
    const projectLabel = await ProjectLabel.create({
      projectId: 'project-1',
      name: 'Shared Bug',
      color: 'berry-red',
      position: 65536,
    });

    const label1 = await Label.create({
      boardId: 'board-1',
      name: 'Shared Bug',
      color: 'berry-red',
      position: 65536,
      projectLabelId: projectLabel.id,
    });

    const label2 = await Label.create({
      boardId: 'board-2',
      name: 'Shared Bug',
      color: 'berry-red',
      position: 65536,
      projectLabelId: projectLabel.id,
    });

    assert.strictEqual(label1.projectLabelId, projectLabel.id);
    assert.strictEqual(label2.projectLabelId, projectLabel.id);
  });
});
