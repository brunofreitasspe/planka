/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { embeddedLocales } from './index';

describe('embeddedLocales', () => {
  test('pt-BR is embedded with the core bundle available offline', () => {
    expect(embeddedLocales['pt-BR'].translation).toBeDefined();
    expect(embeddedLocales['pt-BR'].translation.common.language).toBeDefined();
  });

  test('pt-BR formats dates as DD/MM/YYYY', () => {
    expect(embeddedLocales['pt-BR'].format.date).toBe('dd/MM/yyyy');
  });

  test('en-US no longer carries the core bundle', () => {
    expect(embeddedLocales['en-US'].format).toBeUndefined();
  });
});
