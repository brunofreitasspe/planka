/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put } from 'redux-saga/effects';

import actions from '../../../actions';
import api from '../../../api';

export function* register(data) {
  yield put(actions.register(data));

  try {
    yield call(api.registerUser, data);
  } catch (error) {
    yield put(actions.register.failure(error));
    return;
  }

  yield put(actions.register.success());
}

export function* clearRegisterError() {
  yield put(actions.clearRegisterError());
}

export default {
  register,
  clearRegisterError,
};
