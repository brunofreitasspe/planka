/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';

export function* fetchProjectLabelsInCurrentProject() {
  const { projectId } = yield select(selectors.selectPath);

  let labels;
  try {
    ({ labels } = yield call(request, api.fetchProjectLabels, projectId));
  } catch (error) {
    yield put(actions.fetchProjectLabels.failure(projectId, error));
    return;
  }

  yield put(actions.fetchProjectLabels.success(labels));
}

export function* createProjectLabel(projectId, data) {
  const localId = yield call(createLocalId);

  yield put(
    actions.createProjectLabel({
      ...data,
      projectId,
      id: localId,
    }),
  );

  let projectLabel;
  try {
    ({ item: projectLabel } = yield call(request, api.createProjectLabel, projectId, data));
  } catch (error) {
    yield put(actions.createProjectLabel.failure(localId, error));
    return;
  }

  yield put(actions.createProjectLabel.success(localId, projectLabel));
}

export function* createProjectLabelInCurrentProject(data) {
  const { projectId } = yield select(selectors.selectPath);

  yield call(createProjectLabel, projectId, data);
}

export function* handleProjectLabelCreate(projectLabel) {
  yield put(actions.handleProjectLabelCreate(projectLabel));
}

export function* updateProjectLabel(id, data) {
  yield put(actions.updateProjectLabel(id, data));

  let projectLabel;
  try {
    const { projectId } = yield select(selectors.selectPath);

    ({ item: projectLabel } = yield call(request, api.updateProjectLabel, projectId, id, data));
  } catch (error) {
    yield put(actions.updateProjectLabel.failure(id, error));
    return;
  }

  yield put(actions.updateProjectLabel.success(projectLabel));
}

export function* handleProjectLabelUpdate(projectLabel) {
  yield put(actions.handleProjectLabelUpdate(projectLabel));
}

export function* deleteProjectLabel(id) {
  yield put(actions.deleteProjectLabel(id));

  let projectLabel;
  try {
    const { projectId } = yield select(selectors.selectPath);

    ({ item: projectLabel } = yield call(request, api.deleteProjectLabel, projectId, id));
  } catch (error) {
    yield put(actions.deleteProjectLabel.failure(id, error));
    return;
  }

  yield put(actions.deleteProjectLabel.success(projectLabel));
}

export function* handleProjectLabelDelete(projectLabel) {
  yield put(actions.handleProjectLabelDelete(projectLabel));
}

export default {
  fetchProjectLabelsInCurrentProject,
  createProjectLabel,
  createProjectLabelInCurrentProject,
  handleProjectLabelCreate,
  updateProjectLabel,
  handleProjectLabelUpdate,
  deleteProjectLabel,
  handleProjectLabelDelete,
};
