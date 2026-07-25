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

module.exports = function defineDueDateWatcherHook(sails) {
  const checkExpiredDueDates = async () => {
    let cards;
    let webhooks;
    try {
      cards = await Card.qm.getWithExpiredDueDate();

      if (cards.length === 0) {
        return;
      }

      webhooks = await Webhook.qm.getAll();
    } catch (error) {
      sails.log.error(`Error checking expired due dates: ${error}`);
      return;
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const card of cards) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await sails.helpers.cards.notifyDueDateExpiration(card.id, webhooks);
      } catch (error) {
        sails.log.error(`Error notifying due date expiration for card ${card.id}: ${error}`);
      }
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
