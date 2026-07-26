/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * due-date-watcher hook
 *
 * @description :: A hook definition. Extends Sails by adding shadow routes, implicit actions,
 *                 and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const pLimit = require('p-limit');

module.exports = function defineDueDateWatcherHook(sails) {
  // Prevents a slow/large tick (big backlog) from overlapping with the next
  // scheduled tick, which would otherwise stack concurrent runs on the same
  // small connection pool.
  let isRunning = false;

  const processBatch = async (cards, webhooks) => {
    const limit = pLimit(sails.config.custom.dueDateExpirationCheckConcurrency);

    await Promise.all(
      cards.map((card) =>
        limit(async () => {
          try {
            await sails.helpers.cards.notifyDueDateExpiration(card.id, webhooks);
          } catch (error) {
            sails.log.error(`Error notifying due date expiration for card ${card.id}: ${error}`);
          }
        }),
      ),
    );
  };

  const checkExpiredDueDates = async () => {
    if (isRunning) {
      sails.log.warn(
        'Skipping due date expiration check: the previous run is still in progress',
      );
      return;
    }

    isRunning = true;

    try {
      const { dueDateExpirationCheckBatchSize: batchSize } = sails.config.custom;

      let webhooks;
      let afterId;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        let cards;
        try {
          // eslint-disable-next-line no-await-in-loop
          cards = await Card.qm.getWithExpiredDueDate({ afterId, limit: batchSize });
        } catch (error) {
          sails.log.error(`Error checking expired due dates: ${error}`);
          return;
        }

        if (cards.length === 0) {
          return;
        }

        if (!webhooks) {
          try {
            // eslint-disable-next-line no-await-in-loop
            webhooks = await Webhook.qm.getAll();
          } catch (error) {
            sails.log.error(`Error checking expired due dates: ${error}`);
            return;
          }
        }

        // eslint-disable-next-line no-await-in-loop
        await processBatch(cards, webhooks);

        if (cards.length < batchSize) {
          return;
        }

        afterId = cards[cards.length - 1].id;
      }
    } finally {
      isRunning = false;
    }
  };

  return {
    /**
     * Runs when this Sails app loads/lifts.
     */

    async initialize() {
      sails.log.info('Initializing custom hook (`due-date-watcher`)');

      setInterval(checkExpiredDueDates, sails.config.custom.dueDateExpirationCheckInterval * 1000);
    },
  };
};
