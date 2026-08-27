/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /boards/{id}/export:
 *   post:
 *     summary: Export board cards as PDF or CSV
 *     description: Generates a report of the board's open cards (excluding archive/trash lists and closed cards), optionally filtered by priority, assignee, labels and lists.
 *     tags:
 *       - Boards
 *     operationId: exportBoard
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the board to export
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [pdf, csv]
 *                 default: pdf
 *               priority:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [urgent, veryHigh, high, medium, low]
 *               assigneeId:
 *                 type: string
 *               labelIds:
 *                 type: string
 *                 description: Comma-separated label IDs
 *               listIds:
 *                 type: string
 *                 description: Comma-separated list IDs
 *     responses:
 *       200:
 *         description: Exported file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */

const { idInput, idsInput } = require('../../../utils/inputs');
const {
  isValidPriorityBands,
  isCardPriorityInBands,
  getCardPriorityName,
} = require('../../../utils/card-priorities');
const { formatDateForReport, toCSV, toPDF } = require('../../../utils/export-formatters');

const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  NO_CARDS: {
    noCards: 'No cards to export',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    format: {
      type: 'string',
      isIn: ['pdf', 'csv'],
      defaultsTo: 'pdf',
    },
    priority: {
      type: 'json',
      custom: isValidPriorityBands,
    },
    assigneeId: {
      ...idInput,
    },
    labelIds: idsInput,
    listIds: idsInput,
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
    noCards: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board, project } = await sails.helpers.boards
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    if (currentUser.role !== User.Roles.ADMIN || project.ownerProjectManagerId) {
      const isProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        project.id,
      );

      if (!isProjectManager) {
        const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
          board.id,
          currentUser.id,
        );

        if (!boardMembership) {
          throw Errors.BOARD_NOT_FOUND; // Forbidden
        }
      }
    }

    let lists = await List.qm.getByBoardId(board.id);
    lists = lists.filter((list) => sails.helpers.lists.isFinite(list));

    if (inputs.listIds) {
      const requestedListIds = inputs.listIds.split(',');
      lists = lists.filter((list) => requestedListIds.includes(list.id));
    }

    const listIds = sails.helpers.utils.mapRecords(lists);

    let cards = await Card.qm.getByListIds(listIds);
    cards = cards.filter((card) => !card.isClosed);

    if (inputs.priority) {
      cards = cards.filter((card) => isCardPriorityInBands(card.priority, inputs.priority));
    }

    let cardIds = sails.helpers.utils.mapRecords(cards);

    if (inputs.labelIds) {
      const filterLabelIds = inputs.labelIds.split(',');
      const cardLabels = await CardLabel.qm.getByCardIds(cardIds);
      const cardIdsWithLabels = new Set(
        cardLabels
          .filter((cardLabel) => filterLabelIds.includes(cardLabel.labelId))
          .map((cl) => cl.cardId),
      );
      cards = cards.filter((card) => cardIdsWithLabels.has(card.id));
      cardIds = sails.helpers.utils.mapRecords(cards);
    }

    if (inputs.assigneeId) {
      const values = [inputs.assigneeId];
      const placeholders = cardIds.map((cardId) => {
        values.push(cardId);
        return `$${values.length}`;
      });

      // Matches the client board filter: card members OR task-level assignees.
      const queryResult = await sails.sendNativeQuery(
        `SELECT DISTINCT card.id FROM card
          LEFT JOIN card_membership ON card.id = card_membership.card_id
          LEFT JOIN task_list ON card.id = task_list.card_id
          LEFT JOIN task ON task_list.id = task.task_list_id
          WHERE card.id IN (${placeholders.join(', ')}) AND (card_membership.user_id = $1 OR task.assignee_user_id = $1)`,
        values,
      );

      const cardIdsWithAssignee = new Set(queryResult.rows.map((row) => row.id));
      cards = cards.filter((card) => cardIdsWithAssignee.has(card.id));
      cardIds = sails.helpers.utils.mapRecords(cards);
    }

    if (cards.length === 0) {
      throw Errors.NO_CARDS;
    }

    const cardLabels = await CardLabel.qm.getByCardIds(cardIds);
    const labelIds = _.uniq(sails.helpers.utils.mapRecords(cardLabels, 'labelId'));
    const labels = await Label.qm.getByIds(labelIds);
    const labelById = new Map(labels.map((label) => [label.id, label]));

    const labelIdsByCardId = {};
    cardLabels.forEach((cardLabel) => {
      if (!labelIdsByCardId[cardLabel.cardId]) {
        labelIdsByCardId[cardLabel.cardId] = [];
      }

      labelIdsByCardId[cardLabel.cardId].push(cardLabel.labelId);
    });

    const comments = await Comment.qm.getLatestByCardIds(cardIds);
    const commentByCardId = new Map(comments.map((comment) => [comment.cardId, comment]));
    const commentUserIds = sails.helpers.utils.mapRecords(comments, 'userId', true, true);
    const commentUsers = await User.qm.getByIds(commentUserIds);
    const userById = new Map(commentUsers.map((user) => [user.id, user]));

    const summary = lists.map((list) => {
      const listCards = cards.filter((card) => card.listId === list.id);

      return {
        listName: list.name,
        cards: listCards.map((card) => ({ id: card.id, name: card.name })),
        total: listCards.length,
      };
    });

    // Grouped by list order (card positions are per-list, so a global sort would
    // interleave lists); matches the summary ordering.
    const details = lists.flatMap((list) =>
      cards
        .filter((card) => card.listId === list.id)
        .map((card) => {
          const comment = commentByCardId.get(card.id);
          const cardLabelIds = labelIdsByCardId[card.id] || [];

          return {
            listName: list.name,
            card: {
              id: card.id,
              name: card.name,
              priority: getCardPriorityName(card.priority),
              description: card.description || '',
              dueDate: formatDateForReport(card.dueDate),
              labels: cardLabelIds.map((labelId) => labelById.get(labelId)).filter(Boolean),
              lastComment: comment
                ? {
                    authorName: (userById.get(comment.userId) || {}).name || '',
                    createdAt: formatDateForReport(comment.createdAt),
                    text: comment.text || '',
                  }
                : null,
            },
          };
        }),
    );

    const data = {
      boardName: board.name,
      generatedAt: new Date(),
      summary,
      details,
    };

    const dateStamp = new Date().toISOString().slice(0, 10);
    if (inputs.format === 'csv') {
      const csv = toCSV(data);
      this.res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="board-export-${dateStamp}.csv"`,
      });
      return exits.success(Buffer.from(csv, 'utf8'));
    }

    const pdf = await toPDF(data);
    this.res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="board-export-${dateStamp}.pdf"`,
    });
    return exits.success(pdf);
  },
};
