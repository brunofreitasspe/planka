/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const fetchProjectLabelsInCurrentProject = () => ({
  type: EntryActionTypes.PROJECT_LABELS_IN_CURRENT_PROJECT_FETCH,
  payload: {},
});

const createProjectLabelInCurrentProject = (data) => ({
  type: EntryActionTypes.PROJECT_LABEL_IN_CURRENT_PROJECT_CREATE,
  payload: {
    data,
  },
});

const handleProjectLabelCreate = (projectLabel) => ({
  type: EntryActionTypes.PROJECT_LABEL_CREATE_HANDLE,
  payload: {
    projectLabel,
  },
});

const updateProjectLabel = (id, data) => ({
  type: EntryActionTypes.PROJECT_LABEL_UPDATE,
  payload: {
    id,
    data,
  },
});

const handleProjectLabelUpdate = (projectLabel) => ({
  type: EntryActionTypes.PROJECT_LABEL_UPDATE_HANDLE,
  payload: {
    projectLabel,
  },
});

const deleteProjectLabel = (id) => ({
  type: EntryActionTypes.PROJECT_LABEL_DELETE,
  payload: {
    id,
  },
});

const handleProjectLabelDelete = (projectLabel) => ({
  type: EntryActionTypes.PROJECT_LABEL_DELETE_HANDLE,
  payload: {
    projectLabel,
  },
});

export default {
  fetchProjectLabelsInCurrentProject,
  createProjectLabelInCurrentProject,
  handleProjectLabelCreate,
  updateProjectLabel,
  handleProjectLabelUpdate,
  deleteProjectLabel,
  handleProjectLabelDelete,
};
