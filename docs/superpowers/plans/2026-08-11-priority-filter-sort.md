# Filtro e Ordenação por Prioridade nos Cards — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir filtrar cards por faixas de prioridade (quadro e por lista) e ordenar os cards de uma lista por prioridade (asc/desc, persistente), com cards sem prioridade por último no asc.

**Architecture:** Prioridade é um número 1–10 (1 = urgente, 10 = baixa, 0 = sem prioridade) já persistido em `Card.priority`. O filtro é **client-side** (estado no Redux-ORM, igual `filterUsers`/`filterLabels`/`search`), seguindo o fluxo entry-action → saga → action → model-reducer, e é aplicado em `getFilteredCardsModelArray` (models `Board` e `List`). O sort por prioridade reutiliza o pipeline existente do menu Sort: comparação no cliente e no servidor, reescrevendo `position` de cada card (`sort-one.js`).

**Tech Stack:** React 18 + Redux-ORM + redux-saga + semantic-ui-react (cliente); Sails/Node (servidor); Jest (testes do cliente).

## Global Constraints

- Prioridade é **1–10**, onde **1 = máxima (urgente)** e **10 = mínima**; **0 = sem prioridade** (default). Valores fora disso não existem.
- Faixas por cor (definidas em `client/src/constants/CardPriorities.js`): `urgent` 1–2, `veryHigh` 3–4, `high` 5–6, `medium` 7–8, `low` 9–10.
- Sem prioridade no sort: **último no asc**; no desc, o `reverse()` do código existente inverte tudo (igual ao sort por vencimento). **Não alterar** essa semântica.
- Sem prioridade no filtro: **só aparece quando nenhuma faixa está selecionada**.
- Filtros são client-side; **não** persistir no servidor nem na URL.
- Fluxo de ações: componentes disparam apenas **entry actions** (`entry-actions/*`); sagas mapeiam para **ações internas** (`actions/*`); models tratam as ações internas (`ActionTypes`).
- i18n: novas chaves só em `en-US` e `pt-BR` `core.js`; demais locais caem no fallback para en-US.
- Rodar comandos a partir de `/c/planka/client` (testes/lint/build) ou `/c/planka` (git).

---

## Mapa de arquivos

**Novos:**
- `client/src/constants/CardPriorities.test.js` — testes unitários das utilidades puras
- `client/src/components/priorities/PriorityFilterStep/index.js`
- `client/src/components/priorities/PriorityFilterStep/PriorityFilterStep.jsx`
- `client/src/components/priorities/PriorityFilterStep/PriorityFilterStep.module.scss`

**Modificados (cliente):**
- `client/src/constants/CardPriorities.js` — utilidades puras
- `client/src/constants/Enums.js` — `ListSortFieldNames.PRIORITY`
- `client/src/constants/ActionTypes.js` — 4 tipos internos
- `client/src/constants/EntryActionTypes.js` — 4 tipos de entrada
- `client/src/actions/boards.js` — creators internos do filtro do board
- `client/src/actions/lists.js` — creators internos do filtro da lista
- `client/src/entry-actions/boards.js` — entry actions do filtro do board
- `client/src/entry-actions/lists.js` — entry actions do filtro da lista
- `client/src/selectors/boards.js` — `selectFilterPriorityBandsForCurrentBoard`
- `client/src/selectors/lists.js` — `selectFilterPriorityBandsByListId`
- `client/src/sagas/core/services/boards.js` — services do filtro do board
- `client/src/sagas/core/services/lists.js` — services do filtro da lista
- `client/src/sagas/core/watchers/boards.js` — watchers do filtro do board
- `client/src/sagas/core/watchers/lists.js` — watchers do filtro da lista
- `client/src/models/Board.js` — attr `filterPriorityBands` + reducer + filtro
- `client/src/models/List.js` — attr `filterPriorityBands` + reducer + filtro + sort
- `client/src/components/lists/List/SortStep.jsx` — itens de menu por prioridade
- `client/src/components/lists/List/ActionsStep.jsx` — item de menu do filtro
- `client/src/components/boards/BoardActions/Filters.jsx` — controle de filtro
- `client/src/components/boards/BoardActions/Filters.module.scss` — chip de banda
- `client/src/locales/en-US/core.js` — chaves i18n
- `client/src/locales/pt-BR/core.js` — chaves i18n

**Modificados (servidor):**
- `server/api/models/List.js` — `List.SortFieldNames.PRIORITY`
- `server/api/helpers/lists/sort-one.js` — caso `PRIORITY`

---

### Task 1: Utilidades puras de prioridade + testes (TDD)

**Files:**
- Modify: `client/src/constants/CardPriorities.js`
- Create: `client/src/constants/CardPriorities.test.js`

**Interfaces:**
- Produces: `CardPriorityBandRanges` (objeto `{ [band]: { min, max } }`), `isCardPriorityInBands(priority: number, bands: string[]): boolean`, `compareCardPriorities(priority1: number, priority2: number): number`

- [ ] **Step 1: Escrever o teste que falha**

Criar `client/src/constants/CardPriorities.test.js`:

```js
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import {
  CardPriorityBands,
  compareCardPriorities,
  isCardPriorityInBands,
} from './CardPriorities';

describe('isCardPriorityInBands', () => {
  test('no filter shows everything including no priority', () => {
    expect(isCardPriorityInBands(0, [])).toBe(true);
    expect(isCardPriorityInBands(5, [])).toBe(true);
  });

  test('single band matches its exact range', () => {
    expect(isCardPriorityInBands(1, [CardPriorityBands.URGENT])).toBe(true);
    expect(isCardPriorityInBands(2, [CardPriorityBands.URGENT])).toBe(true);
    expect(isCardPriorityInBands(3, [CardPriorityBands.URGENT])).toBe(false);
    expect(isCardPriorityInBands(10, [CardPriorityBands.LOW])).toBe(true);
    expect(isCardPriorityInBands(9, [CardPriorityBands.LOW])).toBe(true);
    expect(isCardPriorityInBands(8, [CardPriorityBands.LOW])).toBe(false);
  });

  test('multiple contiguous bands form a range', () => {
    const bands = [CardPriorityBands.URGENT, CardPriorityBands.VERY_HIGH];
    expect(isCardPriorityInBands(1, bands)).toBe(true);
    expect(isCardPriorityInBands(4, bands)).toBe(true);
    expect(isCardPriorityInBands(5, bands)).toBe(false);
  });

  test('disjoint bands match any of them', () => {
    const bands = [CardPriorityBands.URGENT, CardPriorityBands.LOW];
    expect(isCardPriorityInBands(1, bands)).toBe(true);
    expect(isCardPriorityInBands(10, bands)).toBe(true);
    expect(isCardPriorityInBands(5, bands)).toBe(false);
  });

  test('no-priority cards are hidden when a filter is active', () => {
    expect(isCardPriorityInBands(0, [CardPriorityBands.URGENT])).toBe(false);
  });
});

describe('compareCardPriorities', () => {
  test('lower value (more urgent) comes first', () => {
    expect(compareCardPriorities(1, 5)).toBeLessThan(0);
    expect(compareCardPriorities(5, 1)).toBeGreaterThan(0);
  });

  test('no priority always sorts last', () => {
    expect(compareCardPriorities(0, 1)).toBeGreaterThan(0);
    expect(compareCardPriorities(1, 0)).toBeLessThan(0);
  });

  test('equal priorities compare equal', () => {
    expect(compareCardPriorities(0, 0)).toBe(0);
    expect(compareCardPriorities(3, 3)).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx jest src/constants/CardPriorities.test.js`
Expected: FAIL — `isCardPriorityInBands`/`compareCardPriorities` não são exportados (`Cannot find module` / `is not a function`).

- [ ] **Step 3: Implementar as utilidades**

Em `client/src/constants/CardPriorities.js`, após a constante `BANDS_BY_MAX_VALUE` e antes de `getCardPriorityBand`, adicionar:

```js
export const CardPriorityBandRanges = {
  [CardPriorityBands.URGENT]: { min: 1, max: 2 },
  [CardPriorityBands.VERY_HIGH]: { min: 3, max: 4 },
  [CardPriorityBands.HIGH]: { min: 5, max: 6 },
  [CardPriorityBands.MEDIUM]: { min: 7, max: 8 },
  [CardPriorityBands.LOW]: { min: 9, max: 10 },
};

export const isCardPriorityInBands = (priority, bands) => {
  if (bands.length === 0) {
    return true;
  }

  if (!priority) {
    return false;
  }

  return bands.some((band) => {
    const { min, max } = CardPriorityBandRanges[band];
    return priority >= min && priority <= max;
  });
};

export const compareCardPriorities = (priority1, priority2) => {
  if (priority1 === 0) {
    return 1;
  }

  if (priority2 === 0) {
    return -1;
  }

  return priority1 - priority2;
};
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx jest src/constants/CardPriorities.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/constants/CardPriorities.js client/src/constants/CardPriorities.test.js
git commit -m "feat: utilitários puros de prioridade (faixas, filtro, comparador)"
```

---

### Task 2: Sort por prioridade no cliente (Enums + `List.sortCards`)

**Files:**
- Modify: `client/src/constants/Enums.js:79-83`
- Modify: `client/src/models/List.js` (sortCards + import)

**Interfaces:**
- Consumes: `compareCardPriorities` (Task 1), `ListSortFieldNames.PRIORITY` (esta task)
- Produces: `ListSortFieldNames.PRIORITY = 'priority'`; caso `PRIORITY` em `List#sortCards`

- [ ] **Step 1: Adicionar `PRIORITY` a `ListSortFieldNames`**

Em `client/src/constants/Enums.js`:

```js
export const ListSortFieldNames = {
  NAME: 'name',
  DUE_DATE: 'dueDate',
  CREATED_AT: 'createdAt',
  PRIORITY: 'priority',
};
```

- [ ] **Step 2: Adicionar o caso `PRIORITY` em `sortCards`**

Em `client/src/models/List.js`:
1. Adicionar import (após o import de `Enums`):

```js
import { compareCardPriorities } from '../constants/CardPriorities';
```

2. No método `sortCards(options)`, adicionar caso no `switch` (entre `CREATED_AT` e `default`):

```js
      case ListSortFieldNames.PRIORITY:
        cardModels.sort((card1, card2) =>
          compareCardPriorities(card1.priority, card2.priority),
        );

        break;
```

- [ ] **Step 3: Rodar testes existentes**

Run: `npx jest`
Expected: PASS (sem regressão).

- [ ] **Step 4: Commit**

```bash
git add client/src/constants/Enums.js client/src/models/List.js
git commit -m "feat: sort por prioridade no model de lista do cliente"
```

---

### Task 3: Sort por prioridade no servidor

**Files:**
- Modify: `server/api/models/List.js`
- Modify: `server/api/helpers/lists/sort-one.js`

**Interfaces:**
- Consumes: contrato `fieldName: 'priority'` + `order: 'asc'|'desc'` (o controller `lists/sort.js` já valida `isIn: Object.values(List.SortFieldNames)` e repassa `{ fieldName, order }`).
- Produces: endpoint `POST /lists/:id/sort` aceita `fieldName: 'priority'`.

- [ ] **Step 1: Localizar e estender `SortFieldNames` no servidor**

Run: `grep -n "SortFieldNames" /c/planka/server/api/models/List.js`
Encontrar o objeto (ex.: `const SortFieldNames = { NAME: 'name', DUE_DATE: 'dueDate', CREATED_AT: 'createdAt' };` ou `SortFieldNames: Object.freeze({ ... })`) e adicionar `PRIORITY: 'priority'` (manter o formato do arquivo — se for `module.exports` com propriedade, adicionar `PRIORITY: 'priority',` na lista).

- [ ] **Step 2: Adicionar caso `PRIORITY` em `sort-one.js`**

Em `server/api/helpers/lists/sort-one.js`, no `switch (options.fieldName)`, entre `CREATED_AT` e `default`:

```js
      case List.SortFieldNames.PRIORITY:
        cards.sort((card1, card2) => {
          if (card1.priority === 0) {
            return 1;
          }

          if (card2.priority === 0) {
            return -1;
          }

          return card1.priority - card2.priority;
        });

        break;
```

Nota: o bloco `if (options.order === List.SortOrders.DESC) { cards.reverse(); }` já existe e NÃO deve ser alterado — é ele que produz o desc (invertendo tudo, incluindo sem prioridade), igual ao vencimento.

- [ ] **Step 3: Verificação manual (API)**

Com o servidor rodando (`npm start` em `/c/planka/server`), chamar:
```bash
curl -X POST http://localhost:1337/lists/<LIST_ID>/sort \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"fieldName":"priority","order":"asc"}'
```
Expected: 200 e as `position` dos cards reordenadas (1..10, sem-prioridade por último).
Com `"order":"desc"` → invertido (sem-prioridade primeiro).

- [ ] **Step 4: Commit**

```bash
git add server/api/models/List.js server/api/helpers/lists/sort-one.js
git commit -m "feat: sort por prioridade no servidor"
```

---

### Task 4: Chaves i18n (en-US e pt-BR)

**Files:**
- Modify: `client/src/locales/en-US/core.js`
- Modify: `client/src/locales/pt-BR/core.js`

**Interfaces:**
- Produces: chaves usadas por SortStep (`common.byPriorityAsc/Desc`), PriorityFilterStep (`common.filterByPriority_title`, `common.priorityLevels.*`, `common.clear`, `common.all` já existe) e Filters.jsx (`common.priority` já existe).

- [ ] **Step 1: Adicionar chaves em `en-US/core.js`**

Dentro do objeto `common` (agrupadas perto de `byDueDate`/`filterByMembers`; o objeto `priorityLevels` pode ir ao lado de `priority`):

```js
      byPriority: 'By priority',
      byPriorityAsc: 'Priority: high to low',
      byPriorityDesc: 'Priority: low to high',
      clear: 'Clear',
      filterByPriority: {
        title: 'Filter by priority',
      },
      priorityLevels: {
        urgent: 'Urgent',
        veryHigh: 'Very high',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      },
```

- [ ] **Step 2: Adicionar chaves em `pt-BR/core.js`**

```js
      byPriority: 'Por prioridade',
      byPriorityAsc: 'Prioridade: alta → baixa',
      byPriorityDesc: 'Prioridade: baixa → alta',
      clear: 'Limpar',
      filterByPriority: {
        title: 'Filtrar por prioridade',
      },
      priorityLevels: {
        urgent: 'Urgente',
        veryHigh: 'Muito alta',
        high: 'Alta',
        medium: 'Média',
        low: 'Baixa',
      },
```

- [ ] **Step 3: Rodar testes e lint**

Run: `npx jest && npx eslint --ext js,jsx src/locales/en-US/core.js src/locales/pt-BR/core.js`
Expected: PASS / sem erros.

- [ ] **Step 4: Commit**

```bash
git add client/src/locales/en-US/core.js client/src/locales/pt-BR/core.js
git commit -m "feat(i18n): chaves de prioridade (en-US, pt-BR)"
```

---

### Task 5: Itens de menu no SortStep

**Files:**
- Modify: `client/src/components/lists/List/SortStep.jsx`

**Interfaces:**
- Consumes: `ListSortFieldNames.PRIORITY`, `SortOrders` (Task 2), chaves `common.byPriorityAsc/Desc` (Task 4).

- [ ] **Step 1: Adicionar tipos e dados**

Em `client/src/components/lists/List/SortStep.jsx`, no objeto `Types` e em `DATA_BY_TYPE` (seguindo o padrão `OLDEST_FIRST`/`NEWEST_FIRST`):

```js
const Types = {
  ALPHABETICALLY: 'alphabetically',
  BY_DUE_DATE: 'byDueDate',
  OLDEST_FIRST: 'oldestFirst',
  NEWEST_FIRST: 'newestFirst',
  BY_PRIORITY_ASC: 'byPriorityAsc',
  BY_PRIORITY_DESC: 'byPriorityDesc',
};

const DATA_BY_TYPE = {
  [Types.ALPHABETICALLY]: {
    fieldName: ListSortFieldNames.NAME,
  },
  [Types.BY_DUE_DATE]: {
    fieldName: ListSortFieldNames.DUE_DATE,
  },
  [Types.OLDEST_FIRST]: {
    fieldName: ListSortFieldNames.CREATED_AT,
  },
  [Types.NEWEST_FIRST]: {
    fieldName: ListSortFieldNames.CREATED_AT,
    order: SortOrders.DESC,
  },
  [Types.BY_PRIORITY_ASC]: {
    fieldName: ListSortFieldNames.PRIORITY,
    order: SortOrders.ASC,
  },
  [Types.BY_PRIORITY_DESC]: {
    fieldName: ListSortFieldNames.PRIORITY,
    order: SortOrders.DESC,
  },
};
```

- [ ] **Step 2: Adicionar os dois itens ao menu**

No array do `.map` que renderiza o `Menu`:

```js
          {[
            Types.ALPHABETICALLY,
            Types.BY_DUE_DATE,
            Types.OLDEST_FIRST,
            Types.NEWEST_FIRST,
            Types.BY_PRIORITY_ASC,
            Types.BY_PRIORITY_DESC,
          ].map((type) => (
```

- [ ] **Step 3: Verificação manual**

Com o dev server rodando, abrir uma lista → menu de ações → "Sort" → conferir os itens "Priority: high to low" e "Priority: low to high". Clicar em cada um e conferir a reordenação dos cards.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/lists/List/SortStep.jsx
git commit -m "feat: menu de sort por prioridade na lista"
```

---

### Task 6: Estado do filtro do board (camada de dados)

**Files:**
- Modify: `client/src/constants/ActionTypes.js`
- Modify: `client/src/constants/EntryActionTypes.js`
- Modify: `client/src/actions/boards.js`
- Modify: `client/src/entry-actions/boards.js`
- Modify: `client/src/selectors/boards.js`
- Modify: `client/src/models/Board.js`
- Modify: `client/src/models/List.js` (reset de paginação)

**Interfaces:**
- Consumes: `ActionTypes`/`EntryActionTypes` (definidos aqui).
- Produces: `entryActions.updatePriorityFilterInCurrentBoard(bands)`, `entryActions.clearPriorityFilterInCurrentBoard()`; `actions.updateBoardPriorityFilter(id, bands, currentListId)`, `actions.clearBoardPriorityFilter(id, currentListId)`; `selectors.selectFilterPriorityBandsForCurrentBoard(state)`; attr `Board.filterPriorityBands`.

- [ ] **Step 1: Tipos internos**

Em `client/src/constants/ActionTypes.js`, junto aos tipos de filtro existentes (ex.: após `LABEL_FROM_BOARD_FILTER_REMOVE`):

```js
  BOARD_PRIORITY_FILTER_UPDATE: 'BOARD_PRIORITY_FILTER_UPDATE',
  BOARD_PRIORITY_FILTER_CLEAR: 'BOARD_PRIORITY_FILTER_CLEAR',
```

- [ ] **Step 2: Tipos de entrada**

Em `client/src/constants/EntryActionTypes.js`, junto a `IN_CURRENT_BOARD_SEARCH`:

```js
  IN_CURRENT_BOARD_PRIORITY_FILTER_UPDATE: `${PREFIX}/IN_CURRENT_BOARD_PRIORITY_FILTER_UPDATE`,
  IN_CURRENT_BOARD_PRIORITY_FILTER_CLEAR: `${PREFIX}/IN_CURRENT_BOARD_PRIORITY_FILTER_CLEAR`,
```

- [ ] **Step 3: Creators internos**

Em `client/src/actions/boards.js` (perto de `searchInBoard`), adicionar e exportar:

```js
const updateBoardPriorityFilter = (id, bands, currentListId) => ({
  type: ActionTypes.BOARD_PRIORITY_FILTER_UPDATE,
  payload: {
    id,
    bands,
    currentListId,
  },
});

const clearBoardPriorityFilter = (id, currentListId) => ({
  type: ActionTypes.BOARD_PRIORITY_FILTER_CLEAR,
  payload: {
    id,
    currentListId,
  },
});
```

- [ ] **Step 4: Entry actions**

Em `client/src/entry-actions/boards.js`, adicionar e exportar:

```js
const updatePriorityFilterInCurrentBoard = (bands) => ({
  type: EntryActionTypes.IN_CURRENT_BOARD_PRIORITY_FILTER_UPDATE,
  payload: {
    bands,
  },
});

const clearPriorityFilterInCurrentBoard = () => ({
  type: EntryActionTypes.IN_CURRENT_BOARD_PRIORITY_FILTER_CLEAR,
  payload: {},
});
```

- [ ] **Step 5: Selector**

Em `client/src/selectors/boards.js`, adicionar e exportar (padrão de `selectFilterUserIdsForCurrentBoard`):

```js
export const selectFilterPriorityBandsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel.filterPriorityBands;
  },
);
```

- [ ] **Step 6: Attr e reducer no Board**

Em `client/src/models/Board.js`:
1. No `static fields`, após `filterLabels` (linha ~65):

```js
    filterPriorityBands: attr({
      getDefault: () => [],
    }),
```

2. No `static reducer`, após o caso `USER_FROM_BOARD_FILTER_REMOVE`:

```js
      case ActionTypes.BOARD_PRIORITY_FILTER_UPDATE:
        Board.withId(payload.id).update({
          filterPriorityBands: payload.bands,
        });

        break;
      case ActionTypes.BOARD_PRIORITY_FILTER_CLEAR:
        Board.withId(payload.id).update({
          filterPriorityBands: [],
        });

        break;
```

- [ ] **Step 7: Reset de paginação no List**

Em `client/src/models/List.js`, no grupo de casos que reseta a paginação (linhas ~97-110, que já inclui `IN_BOARD_SEARCH` e os filtros de usuário/label), adicionar:

```js
      case ActionTypes.BOARD_PRIORITY_FILTER_UPDATE:
      case ActionTypes.BOARD_PRIORITY_FILTER_CLEAR:
```

- [ ] **Step 8: Verificação (Redux + lint)**

Run: `npx eslint --ext js,jsx src/constants/ActionTypes.js src/constants/EntryActionTypes.js src/actions/boards.js src/entry-actions/boards.js src/selectors/boards.js src/models/Board.js src/models/List.js`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add client/src/constants/ActionTypes.js client/src/constants/EntryActionTypes.js client/src/actions/boards.js client/src/entry-actions/boards.js client/src/selectors/boards.js client/src/models/Board.js client/src/models/List.js
git commit -m "feat: estado client-side do filtro de prioridade do board"
```

---

### Task 7: Saga do filtro do board

**Files:**
- Modify: `client/src/sagas/core/services/boards.js`
- Modify: `client/src/sagas/core/watchers/boards.js`

**Interfaces:**
- Consumes: `entryActions` do board (Task 6), `selectors.selectPath`/`selectCurrentListId`, `actions.updateBoardPriorityFilter`/`clearBoardPriorityFilter` (Task 6).
- Produces: mapeia `IN_CURRENT_BOARD_PRIORITY_FILTER_UPDATE/CLEAR` → ação interna.

- [ ] **Step 1: Services**

Em `client/src/sagas/core/services/boards.js` (perto de `searchInCurrentBoard`), adicionar e exportar:

```js
export function* updateBoardPriorityFilter(bands) {
  const { boardId } = yield select(selectors.selectPath);
  const currentListId = yield select(selectors.selectCurrentListId);

  yield put(actions.updateBoardPriorityFilter(boardId, bands, currentListId));
}

export function* clearBoardPriorityFilter() {
  const { boardId } = yield select(selectors.selectPath);
  const currentListId = yield select(selectors.selectCurrentListId);

  yield put(actions.clearBoardPriorityFilter(boardId, currentListId));
}
```

- [ ] **Step 2: Watchers**

Em `client/src/sagas/core/watchers/boards.js`, dentro do `yield all([...])` (após o `takeEvery` de `IN_CURRENT_BOARD_SEARCH`):

```js
    takeEvery(
      EntryActionTypes.IN_CURRENT_BOARD_PRIORITY_FILTER_UPDATE,
      ({ payload: { bands } }) => services.updateBoardPriorityFilter(bands),
    ),
    takeEvery(EntryActionTypes.IN_CURRENT_BOARD_PRIORITY_FILTER_CLEAR, () =>
      services.clearBoardPriorityFilter(),
    ),
```

- [ ] **Step 3: Lint**

Run: `npx eslint --ext js,jsx src/sagas/core/services/boards.js src/sagas/core/watchers/boards.js`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add client/src/sagas/core/services/boards.js client/src/sagas/core/watchers/boards.js
git commit -m "feat: saga do filtro de prioridade do board"
```

---

### Task 8: Estado do filtro da lista (attr + reducer + ações + saga + selector)

**Files:**
- Modify: `client/src/constants/ActionTypes.js`
- Modify: `client/src/constants/EntryActionTypes.js`
- Modify: `client/src/actions/lists.js`
- Modify: `client/src/entry-actions/lists.js`
- Modify: `client/src/selectors/lists.js`
- Modify: `client/src/sagas/core/services/lists.js`
- Modify: `client/src/sagas/core/watchers/lists.js`
- Modify: `client/src/models/List.js`

**Interfaces:**
- Produces: `entryActions.updatePriorityFilterInList(id, bands)`, `entryActions.clearPriorityFilterInList(id)`; `actions.updateListPriorityFilter(id, bands)`, `actions.clearListPriorityFilter(id)`; `selectors.selectFilterPriorityBandsByListId(state, id)`; attr `List.filterPriorityBands`.

- [ ] **Step 1: Tipos**

Em `client/src/constants/ActionTypes.js` (após `BOARD_PRIORITY_FILTER_CLEAR`):

```js
  LIST_PRIORITY_FILTER_UPDATE: 'LIST_PRIORITY_FILTER_UPDATE',
  LIST_PRIORITY_FILTER_CLEAR: 'LIST_PRIORITY_FILTER_CLEAR',
```

Em `client/src/constants/EntryActionTypes.js`:

```js
  LIST_PRIORITY_FILTER_UPDATE: `${PREFIX}/LIST_PRIORITY_FILTER_UPDATE`,
  LIST_PRIORITY_FILTER_CLEAR: `${PREFIX}/LIST_PRIORITY_FILTER_CLEAR`,
```

- [ ] **Step 2: Creators internos + entry actions**

Em `client/src/actions/lists.js`, adicionar e exportar:

```js
const updateListPriorityFilter = (id, bands) => ({
  type: ActionTypes.LIST_PRIORITY_FILTER_UPDATE,
  payload: {
    id,
    bands,
  },
});

const clearListPriorityFilter = (id) => ({
  type: ActionTypes.LIST_PRIORITY_FILTER_CLEAR,
  payload: {
    id,
  },
});
```

Em `client/src/entry-actions/lists.js`, adicionar e exportar:

```js
const updatePriorityFilterInList = (id, bands) => ({
  type: EntryActionTypes.LIST_PRIORITY_FILTER_UPDATE,
  payload: {
    id,
    bands,
  },
});

const clearPriorityFilterInList = (id) => ({
  type: EntryActionTypes.LIST_PRIORITY_FILTER_CLEAR,
  payload: {
    id,
  },
});
```

- [ ] **Step 3: Services + watchers**

Em `client/src/sagas/core/services/lists.js`, adicionar e exportar:

```js
export function* updateListPriorityFilter(id, bands) {
  yield put(actions.updateListPriorityFilter(id, bands));
}

export function* clearListPriorityFilter(id) {
  yield put(actions.clearListPriorityFilter(id));
}
```

Em `client/src/sagas/core/watchers/lists.js`, dentro do `yield all([...])`:

```js
    takeEvery(EntryActionTypes.LIST_PRIORITY_FILTER_UPDATE, ({ payload: { id, bands } }) =>
      services.updateListPriorityFilter(id, bands),
    ),
    takeEvery(EntryActionTypes.LIST_PRIORITY_FILTER_CLEAR, ({ payload: { id } }) =>
      services.clearListPriorityFilter(id),
    ),
```

- [ ] **Step 4: Selector**

Em `client/src/selectors/lists.js`, adicionar e exportar (padrão de `selectCardIdsByListId`):

```js
export const selectFilterPriorityBandsByListId = createSelector(
  orm,
  (_, id) => id,
  ({ List }, id) => {
    const listModel = List.withId(id);

    if (!listModel) {
      return listModel;
    }

    return listModel.filterPriorityBands;
  },
);
```

- [ ] **Step 5: Attr + reducer no List**

Em `client/src/models/List.js`:
1. No `static fields`, após `boardId`:

```js
    filterPriorityBands: attr({
      getDefault: () => [],
    }),
```

2. No `static reducer`, adicionar casos (após o grupo de reset de paginação):

```js
      case ActionTypes.LIST_PRIORITY_FILTER_UPDATE:
        List.withId(payload.id).update({
          filterPriorityBands: payload.bands,
        });

        break;
      case ActionTypes.LIST_PRIORITY_FILTER_CLEAR:
        List.withId(payload.id).update({
          filterPriorityBands: [],
        });

        break;
```

- [ ] **Step 6: Lint + testes**

Run: `npx eslint --ext js,jsx src/constants/ActionTypes.js src/constants/EntryActionTypes.js src/actions/lists.js src/entry-actions/lists.js src/selectors/lists.js src/sagas/core/services/lists.js src/sagas/core/watchers/lists.js src/models/List.js && npx jest`
Expected: sem erros; testes PASS.

- [ ] **Step 7: Commit**

```bash
git add client/src/constants/ActionTypes.js client/src/constants/EntryActionTypes.js client/src/actions/lists.js client/src/entry-actions/lists.js client/src/selectors/lists.js client/src/sagas/core/services/lists.js client/src/sagas/core/watchers/lists.js client/src/models/List.js
git commit -m "feat: estado client-side do filtro de prioridade da lista"
```

---

### Task 9: Aplicar o filtro em `getFilteredCardsModelArray`

**Files:**
- Modify: `client/src/models/List.js`
- Modify: `client/src/models/Board.js`

**Interfaces:**
- Consumes: `isCardPriorityInBands` (Task 1), attrs `Board.filterPriorityBands` / `List.filterPriorityBands` (Tasks 6/8).

- [ ] **Step 1: Filtro no `List`**

Em `client/src/models/List.js`:
1. Adicionar ao import de `CardPriorities` (que já tem `compareCardPriorities`):
```js
import { compareCardPriorities, isCardPriorityInBands } from '../constants/CardPriorities';
```
2. Em `getFilteredCardsModelArray`, após o bloco de `filterLabelIds` e antes de `return cardModels;` (linha ~390), adicionar (AND com os filtros existentes — board E lista):

```js
    const boardPriorityBands = this.board.filterPriorityBands;

    if (boardPriorityBands.length > 0) {
      cardModels = cardModels.filter((cardModel) =>
        isCardPriorityInBands(cardModel.priority, boardPriorityBands),
      );
    }

    const listPriorityBands = this.filterPriorityBands;

    if (listPriorityBands.length > 0) {
      cardModels = cardModels.filter((cardModel) =>
        isCardPriorityInBands(cardModel.priority, listPriorityBands),
      );
    }
```

- [ ] **Step 2: Filtro no `Board`**

Em `client/src/models/Board.js`:
1. Adicionar import:
```js
import { isCardPriorityInBands } from '../constants/CardPriorities';
```
2. Em `getFilteredCardsModelArray`, após o bloco de `filterLabelIds` e antes de `return cardModels;` (linha ~392), adicionar:

```js
    const filterPriorityBands = this.filterPriorityBands;

    if (filterPriorityBands.length > 0) {
      cardModels = cardModels.filter((cardModel) =>
        isCardPriorityInBands(cardModel.priority, filterPriorityBands),
      );
    }
```

- [ ] **Step 3: Lint + testes**

Run: `npx eslint --ext js,jsx src/models/List.js src/models/Board.js && npx jest`
Expected: sem erros; testes PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/models/List.js client/src/models/Board.js
git commit -m "feat: aplica filtro de prioridade na listagem de cards"
```

---

### Task 10: Componente `PriorityFilterStep`

**Files:**
- Create: `client/src/components/priorities/PriorityFilterStep/index.js`
- Create: `client/src/components/priorities/PriorityFilterStep/PriorityFilterStep.jsx`
- Create: `client/src/components/priorities/PriorityFilterStep/PriorityFilterStep.module.scss`

**Interfaces:**
- Produces: `PriorityFilterStep` — props `value: string[]`, `onSelect(bands: string[]): void`, `onClose(): void` (auto-injetado pelo `usePopup`). "Sem filtro" = `onSelect([])`.

- [ ] **Step 1: `index.js`**

```js
export { default } from './PriorityFilterStep';
```

- [ ] **Step 2: `PriorityFilterStep.jsx`**

```jsx
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Form, Radio } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import {
  CardPriorityBandRanges,
  CardPriorityBands,
  getCardPriorityColor,
} from '../../../constants/CardPriorities';

import styles from './PriorityFilterStep.module.scss';

const BANDS = [
  CardPriorityBands.URGENT,
  CardPriorityBands.VERY_HIGH,
  CardPriorityBands.HIGH,
  CardPriorityBands.MEDIUM,
  CardPriorityBands.LOW,
];

const PriorityFilterStep = React.memo(({ value, onSelect, onClose }) => {
  const [t] = useTranslation();

  const handleAllClick = useCallback(() => {
    onSelect([]);
  }, [onSelect]);

  const handleBandChange = useCallback(
    (_, { value: band, checked }) => {
      const bands = checked
        ? [...value, band]
        : value.filter((item) => item !== band);

      onSelect(bands);
    },
    [onSelect, value],
  );

  const handleClearClick = useCallback(() => {
    onSelect([]);
    onClose();
  }, [onClose, onSelect]);

  return (
    <>
      <Popup.Header>{t('common.filterByPriority', { context: 'title' })}</Popup.Header>
      <Popup.Content>
        <Form>
          <Form.Field>
            <Radio
              label={t('common.all')}
              name="priorityFilter"
              checked={value.length === 0}
              onChange={handleAllClick}
            />
          </Form.Field>
          {BANDS.map((band) => {
            const { min, max } = CardPriorityBandRanges[band];

            return (
              <Form.Field key={band}>
                <Checkbox
                  label={
                    <span className={styles.bandLabel}>
                      <span
                        className={styles.bandDot}
                        style={{ '--priority-color': getCardPriorityColor(min) }}
                      />
                      {t(`common.priorityLevels.${band}`)} ({min}–{max})
                    </span>
                  }
                  checked={value.includes(band)}
                  value={band}
                  onChange={handleBandChange}
                />
              </Form.Field>
            );
          })}
          <Button
            negative
            content={t('common.clear')}
            className={styles.clearButton}
            onClick={handleClearClick}
          />
        </Form>
      </Popup.Content>
    </>
  );
});

PriorityFilterStep.propTypes = {
  value: PropTypes.arrayOf(PropTypes.oneOf(BANDS)).isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PriorityFilterStep;
```

- [ ] **Step 3: `PriorityFilterStep.module.scss`**

```scss
:global(#app) {
  .bandLabel {
    align-items: center;
    display: inline-flex;
    gap: 8px;
  }

  .bandDot {
    background: var(--priority-color);
    border-radius: 50%;
    display: inline-block;
    height: 10px;
    width: 10px;
  }

  .clearButton {
    margin-top: 16px;
  }
}
```

- [ ] **Step 4: Lint**

Run: `npx eslint --ext js,jsx src/components/priorities`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/priorities
git commit -m "feat: componente de filtro de prioridade (faixas)"
```

---

### Task 11: Filtro no toolbar do quadro (`Filters.jsx`)

**Files:**
- Modify: `client/src/components/boards/BoardActions/Filters.jsx`
- Modify: `client/src/components/boards/BoardActions/Filters.module.scss`

**Interfaces:**
- Consumes: `PriorityFilterStep` (Task 10), `entryActions.updatePriorityFilterInCurrentBoard`/`clear...` (Task 6), `selectFilterPriorityBandsForCurrentBoard` (Task 6), `getCardPriorityColor`/`CardPriorityBandRanges` (Task 1), chaves `common.priority`, `common.all`, `common.priorityLevels.*` (Task 4).

- [ ] **Step 1: Imports**

Em `client/src/components/boards/BoardActions/Filters.jsx`, adicionar imports:

```js
import PriorityFilterStep from '../../priorities/PriorityFilterStep';
import {
  CardPriorityBandRanges,
  getCardPriorityColor,
} from '../../../constants/CardPriorities';
```

- [ ] **Step 2: Estado e handlers**

Dentro do componente, adicionar (junto aos demais `useSelector`/`useCallback`):

```js
  const priorityBands = useSelector(selectors.selectFilterPriorityBandsForCurrentBoard);
```

```js
  const handlePriorityBandSelect = useCallback(
    (bands) => {
      dispatch(entryActions.updatePriorityFilterInCurrentBoard(bands));
    },
    [dispatch],
  );

  const handlePriorityBandRemove = useCallback(
    ({ currentTarget: { dataset: { band } } }) => {
      const bands = priorityBands.filter((item) => item !== band);
      dispatch(entryActions.updatePriorityFilterInCurrentBoard(bands));
    },
    [dispatch, priorityBands],
  );
```

E, junto aos demais `usePopup`:

```js
  const PriorityPopup = usePopup(PriorityFilterStep);
```

- [ ] **Step 3: JSX**

Entre o `<span className={styles.filter}>` das labels e o da busca, adicionar:

```jsx
      <span className={styles.filter}>
        <PriorityPopup
          value={priorityBands}
          onSelect={handlePriorityBandSelect}
        >
          <button type="button" className={styles.filterButton}>
            <span className={styles.filterTitle}>{`${t('common.priority')}:`}</span>
            {priorityBands.length === 0 && (
              <span className={styles.filterLabel}>{t('common.all')}</span>
            )}
          </button>
        </PriorityPopup>
        {priorityBands.map((band) => (
          <span key={band} className={styles.filterItem}>
            <button
              type="button"
              className={styles.priorityBandChip}
              data-band={band}
              style={{ '--priority-color': getCardPriorityColor(CardPriorityBandRanges[band].min) }}
              onClick={handlePriorityBandRemove}
            >
              {t(`common.priorityLevels.${band}`)}
            </button>
          </span>
        ))}
      </span>
```

- [ ] **Step 4: CSS do chip**

Em `client/src/components/boards/BoardActions/Filters.module.scss`, adicionar:

```scss
  .priorityBandChip {
    background: var(--priority-color);
    border: none;
    border-radius: 12px;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 10px;

    &:hover {
      opacity: 0.85;
    }
  }
```

- [ ] **Step 5: Verificação manual + lint**

Run: `npx eslint --ext js,jsx src/components/boards/BoardActions`
Expected: sem erros. Manual: abrir um board → toolbar mostra "Priority: All"; selecionar faixas esconde cards fora delas em todas as listas (kanban/grid/list); chips removem ao clicar.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/boards/BoardActions/Filters.jsx client/src/components/boards/BoardActions/Filters.module.scss
git commit -m "feat: filtro de prioridade no toolbar do quadro"
```

---

### Task 12: Filtro no menu da lista (`ActionsStep.jsx`)

**Files:**
- Modify: `client/src/components/lists/List/ActionsStep.jsx`

**Interfaces:**
- Consumes: `PriorityFilterStep` (Task 10), `entryActions.updatePriorityFilterInList` (Task 8), `selectFilterPriorityBandsByListId` (Task 8), chave `common.filterByPriority_title` (Task 4).

- [ ] **Step 1: Imports**

Em `client/src/components/lists/List/ActionsStep.jsx`, adicionar:

```js
import PriorityFilterStep from '../../priorities/PriorityFilterStep';
```

- [ ] **Step 2: Estado**

Dentro do componente (junto aos demais `useSelector`):

```js
  const priorityBands = useSelector((state) =>
    selectors.selectFilterPriorityBandsByListId(state, listId),
  );
```

- [ ] **Step 3: Tipo de step e handler**

Em `StepTypes`, adicionar:

```js
  FILTER_PRIORITY: 'FILTER_PRIORITY',
```

Handlers:

```js
  const handleFilterPriorityClick = useCallback(() => {
    openStep(StepTypes.FILTER_PRIORITY);
  }, [openStep]);

  const handlePriorityFilterSelect = useCallback(
    (bands) => {
      dispatch(entryActions.updatePriorityFilterInList(listId, bands));
    },
    [dispatch, listId],
  );
```

- [ ] **Step 4: Caso no switch**

No `switch (step.type)`, adicionar (após o caso `SORT`):

```js
      case StepTypes.FILTER_PRIORITY:
        return (
          <PriorityFilterStep
            value={priorityBands}
            onSelect={handlePriorityFilterSelect}
            onClose={onClose}
          />
        );
```

- [ ] **Step 5: Item de menu**

No `Menu`, após o item de `sortList`, adicionar:

```jsx
          <Menu.Item className={styles.menuItem} onClick={handleFilterPriorityClick}>
            <Icon name="filter" className={styles.menuItemIcon} />
            {t('common.filterByPriority', {
              context: 'title',
            })}
          </Menu.Item>
```

- [ ] **Step 6: Verificação manual + lint**

Run: `npx eslint --ext js,jsx src/components/lists/List/ActionsStep.jsx`
Expected: sem erros. Manual: lista → ações → "Filtrar por prioridade" → marcar faixas esconde cards daquela lista; "Limpar" restaura.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/lists/List/ActionsStep.jsx
git commit -m "feat: filtro de prioridade no menu da lista"
```

---

### Task 13: Verificação final

**Files:** nenhum novo.

- [x] **Step 1: Testes completos**

Run: `npx jest`
Expected: todos PASS (incluindo `CardPriorities.test.js`).

- [x] **Step 2: Lint completo**

Run: `npx eslint --ext js,jsx src`
Expected: sem erros (sem `--fix` a menos que o usuário peça).

- [x] **Step 3: Build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Teste manual fim-a-fim**

Com `npm start` (cliente) + servidor:
1. Sort: lista → Sort → "Priority: high to low" reordena persistente; "low to high" inverte.
2. Filtro do quadro: toolbar → Priority → selecionar faixas esconde cards em kanban/grid/list; sem-prioridade some quando há filtro; "All"/"Limpar" restaura.
3. Filtro por lista: lista → ações → "Filtrar por prioridade" esconde só os cards da lista.
4. Interação AND: combinar com busca/membros/labels.
5. Viewers: filtro do quadro disponível; filtro por lista limitado ao menu de ações (editor-only, igual ao sort).

- [x] **Step 5: Status final**

Run: `git status --short`
Expected: apenas mudanças da branch; sem arquivos órfãos.

---

## Notas de implementação

- **Sem prioridade no filtro:** `isCardPriorityInBands(0, bands)` retorna `false` quando `bands.length > 0` — é a regra "só aparece sem filtro". Não usar `getCardPriorityBand(0)` (retornaria `urgent`).
- **Cores:** `getCardPriorityColor` recebe um valor 1–10, não uma banda — nos chips do toolbar e no componente usa-se `getCardPriorityColor(CardPriorityBandRanges[band].min)`.
- **`onClear` da spec foi dobrado em `onSelect([])`** — o componente não precisa de prop redundante; o botão "Limpar" chama `onSelect([])` + `onClose()`.
- **Servidor:** o `reverse()` do `order: DESC` já existente produz o desc "sem prioridade primeiro" — comportamento aprovado (igual vencimento).
