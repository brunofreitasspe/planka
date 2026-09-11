/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import merge from 'lodash/merge';

import login from './login';
import core from './core';

export default {
  language: 'pt-BR',
  country: 'br',
  name: 'Português',
  embeddedLocale: merge(login, core),
};
