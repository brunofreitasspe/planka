/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const register = (data) => ({
  type: EntryActionTypes.REGISTER,
  payload: {
    data,
  },
});

const clearRegisterError = () => ({
  type: EntryActionTypes.REGISTER_ERROR_CLEAR,
  payload: {},
});

export default {
  register,
  clearRegisterError,
};
