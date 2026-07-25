/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const register = (data) => ({
  type: ActionTypes.REGISTER,
  payload: {
    data,
  },
});

register.success = () => ({
  type: ActionTypes.REGISTER__SUCCESS,
  payload: {},
});

register.failure = (error) => ({
  type: ActionTypes.REGISTER__FAILURE,
  payload: {
    error,
  },
});

const clearRegisterError = () => ({
  type: ActionTypes.REGISTER_ERROR_CLEAR,
  payload: {},
});

export default {
  register,
  clearRegisterError,
};
