# Design: Lote de correções — datas, busca, clipboard e export PDF

**Data:** 11 de Setembro de 2026
**Status:** Validado (aguardando mockup do item 5)
**Branch de destino:** `fixes` → remoto
**Escopo:** 5 correções independentes, aplicadas na ordem 1 → 5

---

## Contexto

Cinco problemas relatados pelo usuário. A investigação mostrou que **não são cinco bugs
isolados**: os itens 1 e 2 compartilham a mesma origem (formato de data), e o item 3 tem
duas implementações paralelas (client e server) que precisam da mesma correção.

| # | Sintoma | Causa-raiz |
|---|---------|-----------|
| 1 | Datas em MM/DD/YYYY | `FALLBACK_LANGUAGE = 'en-US'` em `client/src/i18n.js:23` |
| 2 | Digitação manual de data quebra | `react-datepicker` v9 fixa `dateFormat: "MM/dd/yyyy"` em `defaultProps` |
| 3 | Busca não acha custom fields | `Board.js:341` e `Card.js:75` buscam só `name`/`description` |
| 4 | Botão copiar não copia | `navigator.clipboard` é `undefined` fora de contexto seguro |
| 5 | PDF corta conteúdo | 3 defeitos de layout + cor de label ignorada |

---

## 1. Formato de data DD/MM/YYYY

### Causa-raiz

`client/src/i18n.js:23` define `FALLBACK_LANGUAGE = 'en-US'`. Apenas `en-US` é embarcado
no bundle (`locales/en-US/index.js` faz `merge(login, core)`); os demais são lazy-loaded
via `i18n.loadCoreLocale()`.

Consequência: usuário sem idioma definido resolve para `en-US`, cujo
`format.date` é `MM/dd/yyyy`.

**O locale `pt-BR` já está correto** — `client/src/locales/pt-BR/core.js:12` define
`date: 'dd/MM/yyyy'`. Nada precisa ser alterado exceto qual locale é o padrão.

Todo o resto do sistema já roteia por i18n e se corrige sozinho uma vez que o locale mude:
`DueDateChip` (`t('format:...', { postProcess: 'formatDate' })`), activity log,
comentários, `TimeAgo`.

### Alteração

- `client/src/i18n.js:23` → `FALLBACK_LANGUAGE = 'pt-BR'`
- Trocar qual locale é embarcado: `pt-BR/index.js` passa a fazer `merge(login, core)`;
  `en-US/index.js` embarca só `login` e passa a ser lazy-loaded
- `loadCoreLocale()` em `i18n.js:133` já retorna cedo quando
  `language === FALLBACK_LANGUAGE` — passa a valer para pt-BR automaticamente, sem mudança

### Migração de usuários existentes

Por decisão do usuário, definir `user.language = 'pt-BR'` para **todos** os usuários
existentes, inclusive quem escolheu outro idioma.

- Migration Sails em `server/db/migrations/`
- Operação: `UPDATE "user" SET language = 'pt-BR'` (mais um `UPDATE` em registros com
  `language IS NULL` para uniformizar)
- É um **reset pontual do padrão**, não uma remoção da funcionalidade: a troca de idioma
  continua disponível no perfil e quem quiser voltar ao idioma anterior pode fazê-lo. A
  preferência anterior à migration é que se perde.
- Ainda assim, **backup do banco antes do deploy** — recomendação padrão para qualquer
  migration que escreve em massa.

### Fora de escopo

`formatDateForReport()` em `server/utils/export-formatters.js:8` já usa
`toLocaleDateString('pt-BR')` e está correto — permanece inalterado.

---

## 2. Input manual de data

### Causa-raiz

`react-datepicker` v9 declara em `defaultProps`:

```
dateFormat: "MM/dd/yyyy",
```

O componente usa `props.dateFormat ?? DatePicker.defaultProps.dateFormat`. Como
`DateValueField.jsx` não passa `dateFormat`, o input espera e renderiza `MM/dd/yyyy`
**independentemente do locale** (o `dateFormat` do defaultProps não deriva da locale
registrada via `registerLocale`).

Digitar `25/12/2026` faz o parser ler mês `25` → `Invalid Date` →
`formatIsoDate()` em `DateValueField.jsx:22` monta `NaN-NaN-NaN` → valor corrompido
enviado ao servidor.

### Escopo real

Apenas **custom field do tipo DATE** (`DateValueField.jsx`). O due date do card
(`EditDueDateStep.jsx`) usa `<DatePicker inline>` só para o calendário, com input de texto
próprio que já faz parse via i18n (`t('format:date', { postProcess: 'parseDate' })`) e está
correto.

### Alteração

`client/src/components/custom-fields/CustomField/DateValueField.jsx`:

- Passar `dateFormat={t('format:date')}` ao `<DatePicker>` — usa o locale resolvido
- Guardar `onUpdate` com validação: só chamar quando a data for válida
  (`isValid` do `date-fns`), evitando gravar valor inválido
- `formatIsoDate()` ganha guarda para data inválida (retorna `null` em vez de `NaN-NaN-NaN`)

---

## 3. Busca incluindo custom fields

### Causa-raiz

Duas implementações independentes, ambas restritas a `name` e `description`:

- **Client:** `client/src/models/Board.js:341` — `getFilteredCardsModelArray()`, branch
  regex (`search.startsWith('/')`) e branch por partes (`buildSearchParts`)
- **Server:** `server/api/hooks/query-methods/models/Card.js:75` — `getByEndlessListId()`,
  usado por `server/api/controllers/cards/index.js`

O modelo `CustomFieldValue` (`client/src/models/CustomFieldValue.js`) tem relação `fk` com
`Card` via `relatedName: 'customFieldValues'`, e com `CustomField` (que carrega `type` e
`config`). No banco, a tabela `custom_field_value` tem `card_id`, `custom_field_id`,
`content`.

### Semântica por tipo

| Tipo | `content` armazena | Como buscar |
|------|-------------------|-------------|
| TEXT | texto livre | `ILIKE %termo%` direto |
| NUMBER | número como string | `ILIKE %termo%` direto |
| DATE | ISO `YYYY-MM-DD` | match no ISO **e** na forma `DD/MM/YYYY` |
| DROPDOWN | id da opção | match no **nome** da opção (resolvido de `custom_field.config.options`) |
| CHECKBOX | `'true'` / `'false'` | **fora do escopo** — ruído |

DATE precisa do match duplo porque o usuário digita `10/09/2026`, que nunca casa com o ISO
`2026-09-10`.

### Alteração — client

Criar `client/src/utils/build-card-search-strings.js` exportando uma função que recebe um
`cardModel` e devolve `string[]` com nome, descrição e os valores de custom field já
normalizados por tipo (DATE em ISO e DD/MM/YYYY, DROPDOWN com o **nome** da opção além do
id). `Board.js` passa a usar essa lista nos dois branches (regex e por partes), mantendo a
semântica atual de `searchParts.every(...)`.

### Alteração — server

Em `getByEndlessListId()`, adicionar um `EXISTS` na `custom_field_value` com join em
`custom_field` para resolver tipo e, no caso de DROPDOWN, os nomes das opções via
`jsonb_array_elements(custom_field.config->'options')`.

A cláusula entra como **OR** em relação a `name`/`description`, e o `ALL(ARRAY[...])`
existente para as partes da busca mantém a semântica "todas as partes devem casar em algum
lugar".

**Guarda obrigatória no match de DATE:** `content` é coluna de texto livre — um
`content::date` direto lança exceção se algum valor não for data válida. Usar regex de
formato antes do cast (ex.: `content ~ '^\d{4}-\d{2}-\d{2}$'`) para o cast só rodar sobre
valores seguros.

---

## 4. Botão de copiar em custom field

### Causa-raiz

`client/src/components/custom-fields/CustomField/CustomField.jsx:78-89`:

```js
navigator.clipboard.writeText(customFieldValue.content);
setIsCopied(true);
```

`navigator.clipboard` só existe em **contexto seguro** (HTTPS ou `localhost`). Acesso por
`http://<IP-da-LAN>:1337` — o cenário normal de uso interno — deixa a API `undefined`.
A chamada lança `TypeError`, que não é tratado.

Agravantes:
- a promise de `writeText` não tem `.catch()` — em rejeição o erro é engolido
- `setIsCopied(true)` roda de forma síncrona, **antes** da cópia concluir — o ícone vira ✓
  mesmo quando falhou, mascarando o problema

### Alteração

`CustomField.jsx`:

- Guarda de disponibilidade: usar `navigator.clipboard.writeText` quando existir;
  caso contrário, fallback com `textarea` temporário + `document.execCommand('copy')`
- `.catch()` em ambos os caminhos
- `setIsCopied(true)` somente após sucesso confirmado

---

## 5. Export PDF cortando dados

### Causa-raiz

A investigação leu os streams de conteúdo do PDF de referência
(`docs/board-export-2026-09-10.pdf`) e encontrou quatro defeitos:

**(a) Pill de label estoura a própria caixa.**
`server/utils/export-formatters.js` mede `pillW = widthOfString(name) + 14` e depois
renderiza o texto com `width: pillW - 14` — exatamente a largura da string, sem folga de
padding real. Qualquer arredondamento faz o pdfkit quebrar a linha. Evidência no PDF: o
label `INEX` renderiza como `INE` / `X` em duas linhas, com a segunda **fora** do fundo.

**(b) Token longo sem espaço quebra o layout.**
Descrições contendo URLs (ex.: links do SEI com ~400 caracteres) não têm ponto de quebra.
O pdfkit quebra o token, mas a altura medida por `heightOfString` não acompanha o
arredondamento, e o bloco invade a seção seguinte.

**(c) Markdown renderizado cru.**
`card.description` é escrito no PDF como veio do banco: `**negrito**` e
`[texto](url)` aparecem literalmente.

**(d) Cor de label ignorada.**
O export usa **uma única cor** para todos os labels (`COLORS.labelBg = '#E1F5EE'`, verde).
O campo `label.color` — uma das 42 cores de `client/src/constants/LabelColors.js` — nunca
é lido. Duas dessas cores são gradientes no SCSS (`pirate-gold`, e variantes `*Soft`) e
precisam de um hex sólido equivalente.

### Correção desenhada

| Defeito | Correção |
|---------|----------|
| (a) | Medir o pill com a folga real de padding e **truncar** com ellipsis o nome que exceda `innerW` |
| (b) | Quebrar tokens longos em chunks e limitar o nº de linhas da descrição com ellipsis |
| (c) | Converter markdown para texto plano antes de escrever (`**x**` → `x`, `[t](u)` → `t (u)`), com link quebrado em chunks |
| (d) | Mapear `label.color` → hex e usar de verdade, com cor de texto legível sobre cada fundo |

### Processo — mockup primeiro

**Decisão do usuário:** um mockup HTML é produzido e validado **antes** de qualquer
alteração em `export-formatters.js`.

- Arquivo local: `docs/mockup-pdf-export.html`
- Deve cobrir os 4 defeitos acima lado a lado (antes/depois)
- **As labels devem exibir o texto sobre a cor de fundo real de cada label** — não um
  bloco de cor sem texto

Nenhuma linha de `export-formatters.js` é alterada até o mockup ser aprovado.

---

## Ordem de implementação

1 → 2 → 3 → 4 → 5. Um commit por item na branch `fixes`.

O item 5 tem um gate: mockup aprovado antes da implementação.

## Testes

O projeto **não tem** cobertura de testes para selectors de board. O que existe hoje:

- `server/test/utils/export-formatters.test.js` — cobre os formatters (item 5)
- `e2e/tests/board-export.e2e.js` — e2e do export

Cada item deixa pelo menos uma checagem executável:

| Item | Checagem |
|------|----------|
| 1 | Asserção de que `i18n.resolvedLanguage` cai em `pt-BR` sem idioma definido |
| 2 | Teste de `formatIsoDate` / parse com entrada `25/12/2026` e com entrada inválida |
| 3 | Extensão de `export-formatters.test.js`; no client, teste do helper de busca com card que só casa por custom field |
| 4 | Teste do caminho de fallback com `navigator.clipboard` indefinido |
| 5 | Casos novos em `export-formatters.test.js` para pill truncado e token longo |

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Migração de `user.language` apaga preferência | Backup do banco antes do deploy |
| Passar `pt-BR` a embedded aumenta o bundle (core.js é grande; `en-US` sai do embedded) | Troca, não soma — o tamanho fica equivalente |
| Busca em custom fields pode ficar lenta em boards grandes | `EXISTS` com índice em `custom_field_value.card_id`; validar com board real |
