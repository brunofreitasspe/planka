# Board Cards Export (PDF/CSV)

Export the open cards of a board as a PDF report or a flat CSV table, optionally
filtered by priority, assignee, labels and lists. Closed cards and cards in
archive/trash lists are never exported.

## Endpoint

```
POST /api/boards/:id/export
Authorization: Bearer <access token>
Content-Type: application/json
```

### Request body

| Field        | Type            | Default | Description                                            |
| ------------ | --------------- | ------- | ------------------------------------------------------ |
| `format`     | `string`        | `pdf`   | `pdf` or `csv`                                         |
| `priority`   | `string[]`      | —       | Priority bands: `urgent`, `veryHigh`, `high`, `medium`, `low` |
| `assigneeId` | `string`        | —       | Card member or task-level assignee (matches the board filter) |
| `labelIds`   | `string`        | —       | Comma-separated label IDs                              |
| `listIds`    | `string`        | —       | Comma-separated list IDs                               |

### Response

`200` — the exported file, `Content-Disposition: attachment` with filename
`board-export-YYYY-MM-DD.{csv,pdf}`.

`404` — board not found (or no access). `422` — no cards match the filters.

### Example

```bash
curl -X POST http://localhost:1337/api/boards/<boardId>/export \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv","priority":["high","medium"],"assigneeId":"<userId>"}' \
  --output board-export.csv
```

## Output

**PDF** — first page is a summary: board name, generation date, and per-list
sections with card names and totals. Following pages hold the details of each
card: priority, description, due date, labels and last comment (full text).
Cards are grouped by list order; a card with a priority shows its band name
(e.g. "Alta"), others show "Sem prioridade".

**CSV** — flat table, UTF-8 with BOM and CRLF line endings so Excel/Google
Sheets open accents correctly:

```
List,Card,Prioridade,Descrição,Vencimento,Labels,Último Comentário
```

## Rules

- Archive and trash lists are excluded (`sails.helpers.lists.isFinite`).
- Cards with `isClosed` are excluded.
- Filters combine with AND. An empty/absent `priority` array means "no
  priority filter" (all cards pass).
- The `assigneeId` filter matches both card members and task-level assignees,
  mirroring the client board filter.

## Frontend

The board actions menu (⋮ on the board header) shows **Export**. The modal
lets you pick the format (PDF, CSV or Both), then filter by priority band,
assignee, labels and lists. "Both" runs the PDF and CSV requests and downloads
both files. Exports are downloaded client-side through the access token.

## Card count badge

The board header count badge now excludes cards whose `isClosed` is true (and,
by extension, archive/trash lists). Closed cards remain visible in all views —
only the badge count changes.
