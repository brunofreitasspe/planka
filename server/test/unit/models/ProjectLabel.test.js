const assert = require('assert');

describe('ProjectLabel Model', () => {
  it('creates a new ProjectLabel with default canBeUsedByMembers = true', async () => {
    const projectLabel = await ProjectLabel.create({
      projectId: 'test-project-1',
      name: 'Bug',
      color: 'berry-red',
      position: 65536,
    });

    assert(projectLabel.id);
    assert.strictEqual(projectLabel.canBeUsedByMembers, true);
    assert.strictEqual(projectLabel.name, 'Bug');
    assert.strictEqual(projectLabel.color, 'berry-red');
  });

  it('enforces unique constraint on (projectId, name)', async () => {
    const projectId = 'test-project-1';

    await ProjectLabel.create({
      projectId,
      name: 'Bug',
      color: 'berry-red',
      position: 65536,
    });

    try {
      await ProjectLabel.create({
        projectId,
        name: 'Bug', // duplicate name in same project
        color: 'apricot-red',
        position: 65537,
      });
      assert.fail('Should have thrown unique constraint error');
    } catch (error) {
      assert(error.message.includes('unique'));
    }
  });

  it('allows same name in different projects', async () => {
    await ProjectLabel.create({
      projectId: 'project-1',
      name: 'Bug',
      color: 'berry-red',
      position: 65536,
    });

    const label2 = await ProjectLabel.create({
      projectId: 'project-2',
      name: 'Bug', // same name, different project - OK
      color: 'apricot-red',
      position: 65536,
    });

    assert(label2.id);
  });
});
