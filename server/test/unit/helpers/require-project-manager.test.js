const assert = require('assert');

describe('Require Project Manager Helper', () => {
  it('allows request if user is project manager', async () => {
    const user = await User.create({ email: 'manager@test.com' }).fetch();
    const project = await Project.create({ name: 'Test Project' }).fetch();

    await ProjectManager.create({
      projectId: project.id,
      userId: user.id,
    });

    const result = await sails.helpers.projectLabels.requireProjectManager(
      user.id,
      project.id
    );

    assert.strictEqual(result, true);
  });

  it('throws error if user is not project manager', async () => {
    const user = await User.create({ email: 'member@test.com' }).fetch();
    const project = await Project.create({ name: 'Test Project' }).fetch();

    try {
      await sails.helpers.projectLabels.requireProjectManager(user.id, project.id);
      assert.fail('Should have thrown error');
    } catch (error) {
      assert(error.message.includes('not manager'));
    }
  });
});
