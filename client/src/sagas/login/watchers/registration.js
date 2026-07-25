/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeEvery } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* registrationWatchers() {
  yield all([
    takeEvery(EntryActionTypes.REGISTER, ({ payload: { data } }) => services.register(data)),
    takeEvery(EntryActionTypes.REGISTER_ERROR_CLEAR, () => services.clearRegisterError()),
  ]);
}
