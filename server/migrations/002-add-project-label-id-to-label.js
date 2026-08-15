/**
 * Migration to add project_label_id foreign key to label table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('label', 'project_label_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      references: { model: 'project_label', key: 'id' },
    });

    // Index for performance
    await queryInterface.addIndex('label', ['project_label_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('label', 'project_label_id');
  },
};
