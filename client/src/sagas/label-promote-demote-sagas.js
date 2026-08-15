import { put, call, takeEvery } from 'redux-saga/effects';
import * as api from '../api/project-labels-api';
import * as labelActions from '../actions/labels-actions'; // existing labels actions
import * as projectLabelActions from '../actions/project-label-actions';

export function* promotelabelSaga(action) {
  const { boardId, labelId, data, onSuccess } = action.payload;
  try {
    const result = yield call(api.promoteLabel, boardId, labelId, data);
    // Update local label (mark as global)
    yield put(labelActions.updateLabel(result.label));
    // Add new project label to store
    yield put(projectLabelActions.addProjectLabel(result.projectLabel.projectId, result.projectLabel));
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Failed to promote label:', error);
  }
}

export function* demoteabelSaga(action) {
  const { boardId, labelId, onSuccess } = action.payload;
  try {
    const result = yield call(api.demoteLabel, boardId, labelId);
    // Update label (mark as local)
    yield put(labelActions.updateLabel(result.label));
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Failed to demote label:', error);
  }
}

export function* labelPromoteDemoteSagaWatcher() {
  yield takeEvery('LABEL_PROMOTE_REQUEST', promoteabelSaga);
  yield takeEvery('LABEL_DEMOTE_REQUEST', demoteabelSaga);
}
