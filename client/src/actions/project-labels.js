/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const fetchProjectLabels = (projectId) => ({
  type: ActionTypes.PROJECT_LABELS_FETCH,
  payload: {
    projectId,
  },
});

fetchProjectLabels.success = (labels) => ({
  type: ActionTypes.PROJECT_LABELS_FETCH__SUCCESS,
  payload: {
    labels,
  },
});

fetchProjectLabels.failure = (projectId, error) => ({
  type: ActionTypes.PROJECT_LABELS_FETCH__FAILURE,
  payload: {
    projectId,
    error,
  },
});

const createProjectLabel = (projectLabel) => ({
  type: ActionTypes.PROJECT_LABEL_CREATE,
  payload: {
    projectLabel,
  },
});

createProjectLabel.success = (localId, projectLabel) => ({
  type: ActionTypes.PROJECT_LABEL_CREATE__SUCCESS,
  payload: {
    localId,
    projectLabel,
  },
});

createProjectLabel.failure = (localId, error) => ({
  type: ActionTypes.PROJECT_LABEL_CREATE__FAILURE,
  payload: {
    localId,
    error,
  },
});

const handleProjectLabelCreate = (projectLabel) => ({
  type: ActionTypes.PROJECT_LABEL_CREATE_HANDLE,
  payload: {
    projectLabel,
  },
});

const updateProjectLabel = (id, data) => ({
  type: ActionTypes.PROJECT_LABEL_UPDATE,
  payload: {
    id,
    data,
  },
});

updateProjectLabel.success = (projectLabel) => ({
  type: ActionTypes.PROJECT_LABEL_UPDATE__SUCCESS,
  payload: {
    projectLabel,
  },
});

updateProjectLabel.failure = (id, error) => ({
  type: ActionTypes.PROJECT_LABEL_UPDATE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleProjectLabelUpdate = (projectLabel) => ({
  type: ActionTypes.PROJECT_LABEL_UPDATE_HANDLE,
  payload: {
    projectLabel,
  },
});

const deleteProjectLabel = (id) => ({
  type: ActionTypes.PROJECT_LABEL_DELETE,
  payload: {
    id,
  },
});

deleteProjectLabel.success = (projectLabel) => ({
  type: ActionTypes.PROJECT_LABEL_DELETE__SUCCESS,
  payload: {
    projectLabel,
  },
});

deleteProjectLabel.failure = (id, error) => ({
  type: ActionTypes.PROJECT_LABEL_DELETE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleProjectLabelDelete = (projectLabel) => ({
  type: ActionTypes.PROJECT_LABEL_DELETE_HANDLE,
  payload: {
    projectLabel,
  },
});

export default {
  fetchProjectLabels,
  createProjectLabel,
  handleProjectLabelCreate,
  updateProjectLabel,
  handleProjectLabelUpdate,
  deleteProjectLabel,
  handleProjectLabelDelete,
};
