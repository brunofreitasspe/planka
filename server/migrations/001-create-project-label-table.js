/**
 * Migration to create project_label table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('project_label', {
      id: {
        type: Sequelize.STRING(255),
        primaryKey: true,
      },
      project_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        references: { model: 'project', key: 'id' },
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      color: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      can_be_used_by_members: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Unique constraint on (project_id, name)
    await queryInterface.addConstraint('project_label', {
      fields: ['project_id', 'name'],
      type: 'unique',
      name: 'project_label_project_id_name_unique',
    });

    // Indices
    await queryInterface.addIndex('project_label', ['project_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('project_label');
  },
};
