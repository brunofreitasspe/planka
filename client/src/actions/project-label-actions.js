import { createAction } from '@reduxjs/toolkit';

// Fetch
export const fetchProjectLabelsRequest = createAction('PROJECT_LABELS_FETCH_REQUEST');
export const fetchProjectLabelsSuccess = createAction('PROJECT_LABELS_FETCH_SUCCESS');
export const fetchProjectLabelsError = createAction('PROJECT_LABELS_FETCH_ERROR');

// CRUD
export const createProjectLabelRequest = createAction('PROJECT_LABEL_CREATE_REQUEST');
export const createProjectLabelSuccess = createAction('PROJECT_LABEL_CREATE_SUCCESS');

export const updateProjectLabelRequest = createAction('PROJECT_LABEL_UPDATE_REQUEST');
export const updateProjectLabelSuccess = createAction('PROJECT_LABEL_UPDATE_SUCCESS');

export const deleteProjectLabelRequest = createAction('PROJECT_LABEL_DELETE_REQUEST');
export const deleteProjectLabelSuccess = createAction('PROJECT_LABEL_DELETE_SUCCESS');

// Sync
export const setProjectLabels = createAction('PROJECT_LABELS_SET', (projectId, labels) => ({
  payload: {
    projectId,
    labels: labels.reduce((acc, label) => {
      acc[label.id] = label;
      return acc;
    }, {}),
  },
}));

export const addProjectLabel = createAction('PROJECT_LABEL_ADD', (projectId, label) => ({
  payload: { projectId, label },
}));

export const updateProjectLabel = createAction('PROJECT_LABEL_UPDATE', (projectId, label) => ({
  payload: { projectId, label },
}));

export const deleteProjectLabel = createAction('PROJECT_LABEL_DELETE', (projectId, labelId) => ({
  payload: { projectId, labelId },
}));
