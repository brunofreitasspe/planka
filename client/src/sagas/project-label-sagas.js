import { put, call, takeEvery } from 'redux-saga/effects';
import * as api from '../api/project-labels-api';
import * as actions from '../actions/project-label-actions';

export function* fetchProjectLabelsSaga(action) {
  const { projectId } = action.payload;
  try {
    yield put(actions.fetchProjectLabelsRequest());
    const response = yield call(api.getProjectLabels, projectId);
    yield put(actions.setProjectLabels(projectId, response.labels));
    yield put(actions.fetchProjectLabelsSuccess());
  } catch (error) {
    yield put(actions.fetchProjectLabelsError(error.message));
  }
}

export function* createProjectLabelSaga(action) {
  const { projectId, data } = action.payload;
  try {
    yield put(actions.createProjectLabelRequest());
    const label = yield call(api.createProjectLabel, projectId, data);
    yield put(actions.addProjectLabel(projectId, label));
    yield put(actions.createProjectLabelSuccess());
  } catch (error) {
    console.error('Failed to create project label:', error);
  }
}

export function* updateProjectLabelSaga(action) {
  const { projectId, labelId, data } = action.payload;
  try {
    yield put(actions.updateProjectLabelRequest());
    const label = yield call(api.updateProjectLabel, projectId, labelId, data);
    yield put(actions.updateProjectLabel(projectId, label));
    yield put(actions.updateProjectLabelSuccess());
  } catch (error) {
    console.error('Failed to update project label:', error);
  }
}

export function* deleteProjectLabelSaga(action) {
  const { projectId, labelId } = action.payload;
  try {
    yield put(actions.deleteProjectLabelRequest());
    yield call(api.deleteProjectLabel, projectId, labelId);
    yield put(actions.deleteProjectLabel(projectId, labelId));
    yield put(actions.deleteProjectLabelSuccess());
  } catch (error) {
    console.error('Failed to delete project label:', error);
  }
}

export function* projectLabelSagaWatcher() {
  yield takeEvery('PROJECT_LABELS_FETCH_REQUEST', fetchProjectLabelsSaga);
  yield takeEvery('PROJECT_LABEL_CREATE_REQUEST', createProjectLabelSaga);
  yield takeEvery('PROJECT_LABEL_UPDATE_REQUEST', updateProjectLabelSaga);
  yield takeEvery('PROJECT_LABEL_DELETE_REQUEST', deleteProjectLabelSaga);
}
