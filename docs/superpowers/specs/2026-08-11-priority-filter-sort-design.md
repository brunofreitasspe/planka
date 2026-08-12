# Filtro e Ordenação por Prioridade nos Cards

**Data:** 2026-08-11
**Status:** Aprovado (design validado com o usuário)
**Escopo:** Cliente (Planka client) + Servidor (Planka server)

## Contexto

Os cards do Planka possuem um campo `priority` numérico persistido (servidor e
cliente), já implementado anteriormente:

- **Valor 1–10**, onde **1 = máxima prioridade (urgente)** e **10 = mínima**.
- **0 = sem prioridade** (padrão).
- **Faixas por cor** (definidas em `client/src/constants/CardPriorities.js`):

| Faixa      | Intervalo | Cor      |
|------------|-----------|----------|
| `urgent`   | 1–2       | `#cd2626`|
| `veryHigh` | 3–4       | `#e65100`|
| `high`     | 5–6       | `#f57f17`|
| `medium`   | 7–8       | `#1976d2`|
| `low`      | 9–10      | `#9e9e9e`|

O board já possui filtros **client-side** por membros, labels e busca
(`filterUsers`, `filterLabels`, `search` no model `Board` do Redux-ORM),
aplicados em `getFilteredCardsModelArray` — nunca persistidos no servidor.
Também já existe um **sort persistente por lista** (menu Sort), que reescreve a
`position` de cada card no servidor (`sort-one.js`).

## Decisões (acordadas com o usuário)

1. **Ordenação por prioridade**: por lista, **persistente** (reescreve
   posições), adicionada ao menu Sort existente — mesmo padrão de
   nome/vencimento/data.
2. **Sem prioridade no sort**: último no asc; no desc, tudo inverte
   (comportamento idêntico ao sort por vencimento atual).
3. **Filtro por prioridade**: em **dois níveis** — no **quadro inteiro** (junto
   de Membros/Labels) e **por lista** (menu de ações da lista). Esconde cards
   fora das faixas selecionadas.
4. **UI do filtro**: **faixas por cor** (checkboxes), compartilhada entre
   quadro e lista.

## Feature 1 — Filtro por prioridade (faixas)

### Estado client-side

**`client/src/models/Board.js`**
- Novo attr: `filterPriorityBands: attr({ getDefault: () => [] })` (array de
  strings, ex.: `['urgent', 'high']`).
- Reducer:
  - `BOARD_PRIORITY_FILTER_UPDATE` → `Board.withId(payload.boardId).update({ filterPriorityBands: payload.bands })`
  - `BOARD_PRIORITY_FILTER_CLEAR` → `filterPriorityBands: []`

**`client/src/models/List.js`**
- Mesmo attr `filterPriorityBands` (para o filtro por lista).
- Reducer:
  - `LIST_PRIORITY_FILTER_UPDATE` → atualiza na lista do `payload.listId`
  - `LIST_PRIORITY_FILTER_CLEAR` → `[]`

### Lógica de inclusão

**`client/src/constants/CardPriorities.js`** — nova constante + utilitário:

```js
export const CardPriorityBandRanges = {
  [CardPriorityBands.URGENT]: { min: 1, max: 2 },
  [CardPriorityBands.VERY_HIGH]: { min: 3, max: 4 },
  [CardPriorityBands.HIGH]: { min: 5, max: 6 },
  [CardPriorityBands.MEDIUM]: { min: 7, max: 8 },
  [CardPriorityBands.LOW]: { min: 9, max: 10 },
};

export const isCardPriorityInBands = (priority, bands) => {
  if (bands.length === 0) return true; // sem filtro → mostra tudo
  if (!priority) return false; // prioridade 0 escondida quando há filtro
  return bands.some((band) => {
    const { min, max } = CardPriorityBandRanges[band];
    return priority >= min && priority <= max;
  });
};
```

> Nota: `getCardPriorityBand(0)` retorna `urgent` (porque `0 <= 2`), então a
> prioridade 0 é tratada explicitamente: **só aparece quando não há filtro**.

### Onde aplica o filtro

- **`client/src/models/List.js` `getFilteredCardsModelArray`** — aplica
  `isCardPriorityInBands(card.priority, this.board.filterPriorityBands)` **e**
  `isCardPriorityInBands(card.priority, this.filterPriorityBands)`. Cobre o
  kanban por lista e o contexto de lista.
- **`client/src/models/Board.js` `getFilteredCardsModelArray`** — aplica
  `isCardPriorityInBands(card.priority, this.filterPriorityBands)`. Cobre as
  views Grid/List do quadro.

### Ações e selectors

- **`entry-actions/boards.js`**: `updatePriorityFilterInCurrentBoard(bands)` /
  `clearPriorityFilterInCurrentBoard()`
- **`entry-actions/lists.js`**: `updatePriorityFilterInList(id, bands)` /
  `clearPriorityFilterInList(id)`
- **`selectors/boards.js`**: `selectFilterPriorityBandsForCurrentBoard`
- **`selectors/lists.js`**: `selectFilterPriorityBandsByListId(id)`
- Novos `EntryActionTypes`:
  `BOARD_PRIORITY_FILTER_UPDATE`, `BOARD_PRIORITY_FILTER_CLEAR`,
  `LIST_PRIORITY_FILTER_UPDATE`, `LIST_PRIORITY_FILTER_CLEAR`

## Feature 2 — Ordenação por prioridade (persistente, por lista)

### Servidor

**`server/api/models/List.js`** — adicionar à constante de campos ordenáveis:

```js
PRIORITY: 'priority'
```

**`server/api/helpers/lists/sort-one.js`** — novo caso no `switch` (mesmo
padrão do `DUE_DATE` — sem prioridade para o fim no asc; o `reverse()` do desc
inverte tudo):

```js
case List.SortFieldNames.PRIORITY:
  cards.sort((card1, card2) => {
    if (card1.priority === 0) return 1;
    if (card2.priority === 0) return -1;
    return card1.priority - card2.priority;
  });
  break;
```

Resultado: asc = 1,2,…,10,sem-prioridade; desc = sem-prioridade,10,…,1.

### Cliente

- **`constants/Enums.js`** — `ListSortFieldNames.PRIORITY = 'priority'`.
- **`models/List.js` `sortCards(options)`** — caso `PRIORITY` com a mesma
  comparação (paridade cliente/servidor).
- **`components/lists/List/SortStep.jsx`** — dois novos itens, no padrão de
  `OLDEST_FIRST`/`NEWEST_FIRST` (mesmo campo, ordens opostas):
  - `BY_PRIORITY_ASC` → `{ fieldName: PRIORITY, order: ASC }`
  - `BY_PRIORITY_DESC` → `{ fieldName: PRIORITY, order: DESC }`

## Feature 3 — Componentes de UI

### Novo: `client/src/components/priorities/PriorityFilterStep/`

`PriorityFilterStep.jsx` + `.module.scss` — popup compartilhado (quadro +
lista). Props: `value` (bands), `onSelect(bands)`, `onClear()`.

- Radio **"Sem filtro (todos)"**
- 5 checkboxes de faixa com bolinha colorida (`getCardPriorityColor`) e
  intervalo (`CardPriorityBandRanges`)
- Botão **"Limpar filtro"**

### Toolbar do quadro — `client/src/components/boards/BoardActions/Filters.jsx`

- Nova `<span className={styles.filter}>` (entre Labels e Busca) com botão
  **"Priority: All"** abrindo o `PriorityFilterStep`.
- Chips coloridos das faixas selecionadas (clicáveis para remover).

### Menu da lista — `client/src/components/lists/List/ActionsStep.jsx`

- Novo `StepTypes.FILTER_PRIORITY` + item de menu **"Filter by priority"**.
- Renderiza o mesmo `PriorityFilterStep`, com os bands da lista.

## i18n (novas chaves em `common`, 33 arquivos `core.js`)

| Chave | EN | PT-BR |
|---|---|---|
| `filterByPriority_title` | Filter By Priority | Filtrar por prioridade |
| `priorityLevels.urgent` | Urgent | Urgente |
| `priorityLevels.veryHigh` | Very high | Muito alta |
| `priorityLevels.high` | High | Alta |
| `priorityLevels.medium` | Medium | Média |
| `priorityLevels.low` | Low | Baixa |
| `byPriority` | By priority | Por prioridade |
| `byPriorityAsc` | Priority: high to low | Prioridade: alta → baixa |
| `byPriorityDesc` | Priority: low to high | Prioridade: baixa → alta |
| `clear` | Clear | Limpar |

> en-US e pt-BR traduzidas; demais locais caem no fallback pro inglês
> (consistente com o comportamento do projeto).

## Fora de escopo

- Persistir filtros no servidor ou na URL (filtros de membros/labels também não
  persistem).
- Filtro por valor exato/range arbitrário (a escolha foi por faixas de cor).
- Ordenação visual/ephemeral do quadro inteiro (a escolha foi sort persistente
  por lista).
- Traduções manuais para todos os 33 locais além de en-US/pt-BR (fallback).

## Testes

- **Cliente**: `isCardPriorityInBands` com casos: sem filtro, banda única,
  múltiplas faixas contíguas, faixas disjuntas, prioridade 0 com filtro ativo.
  `sortCards` com asc/desc e sem-prioridade.
- **Servidor**: `sort-one.js` PRIORITY asc/desc; lista não-finita continua
  bloqueada (`cannotBeSortedAsEndlessList`).
- **Manual**: filtro no quadro (kanban/grid/list), filtro por lista, sort por
  prioridade na lista, interação filtro x busca x membros x labels (AND).
