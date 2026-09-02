/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { isLocalId } from '../utils/local-id';

export const makeSelectProjectLabelById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ ProjectLabel }, id) => {
      const projectLabelModel = ProjectLabel.withId(id);

      if (!projectLabelModel) {
        return projectLabelModel;
      }

      return {
        ...projectLabelModel.ref,
        isPersisted: !isLocalId(projectLabelModel.id),
      };
    },
  );

export const selectProjectLabelById = makeSelectProjectLabelById();

export default {
  makeSelectProjectLabelById,
  selectProjectLabelById,
};
