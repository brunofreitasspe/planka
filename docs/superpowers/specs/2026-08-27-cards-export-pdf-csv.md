# Design: Exportação de Cards em PDF e CSV + Contagem Otimizada

**Data:** 27 de Agosto de 2026  
**Status:** Validado com mockup  
**Escopo:** 2 features independentes

---

## 1. Feature 1: Contagem Otimizada de Cards por Board

### Objetivo
Modificar a contagem de cards no board para **excluir automaticamente**:
- Listas tipo `ARCHIVE` e `TRASH`
- Cards com `is_closed === true` (mesmo em listas ativas)

### Impacto
- **Frontend**: Selector `selectFilteredCardsTotalByBoardId` em `client/src/selectors/boards.js`
- **Exibição**: Contadores que usam esse selector (header do board, breadcrumb, etc)
- **Backend**: Nenhuma alteração (apenas validação em `is_closed` já existe)

### Implementação
1. Modificar `Board.getFilteredCardsModelArray()` para filtrar cards fechados
2. Atual: `getKanbanListsQuerySet()` → retorna apenas listas Kanban ✓
3. Novo: Adicionar filtro `card.is_closed === false` após obter cards

### Checklist
- [ ] Atualizar `client/src/models/Board.js` → método `getFilteredCardsModelArray()`
- [ ] Verificar selectors que dependem disso
- [ ] Testar com boards que têm cards fechados

---

## 2. Feature 2: Exportação de Cards (PDF + CSV)

### Objetivo
Criar endpoint que gera PDF e CSV com:
- **Página 1:** Resumo de listas com total de cards
- **Páginas 2+:** Detalhes individuais de cada card
- **Suporte a filtros:** Prioridade, Assignee, Labels, Lists

### Estrutura do Relatório

#### Página 1: Resumo
```
┌─────────────────────────────────┐
│ Relatório - Board "Nome"        │
│ Gerado em DD/MM/YYYY            │
├─────────────────────────────────┤
│                                 │
│ 📌 List Name 1                  │
│   → Card 1                      │
│   → Card 2                      │
│   → Card 3                      │
│   Total: 3 cards                │
│                                 │
│ 🔄 List Name 2                  │
│   → Card 4                      │
│   Total: 1 card                 │
│                                 │
│ ✅ List Name 3                  │
│   → Card 5                      │
│   Total: 1 card                 │
│                                 │
│ Nota: Excluídos cards fechados  │
│       e listas Archive/Trash    │
└─────────────────────────────────┘
```

#### Páginas 2+: Detalhes por Card
```
┌─────────────────────────────────┐
│ Card Title                      │
├─────────────────────────────────┤
│ Descrição:                      │
│ [Texto completo da descrição]   │
│                                 │
│ Vencimento:                     │
│ DD/MM/YYYY                      │
│                                 │
│ Labels:                         │
│ 🏷️ Label 1  🏷️ Label 2         │
│                                 │
│ Último Comentário:              │
│ ┌─────────────────────────────┐ │
│ │ Nome Autor - DD/MM/YYYY     │ │
│ │ Texto completo do comentário│ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

#### CSV: Formato Plano
```
List | Card | Prioridade | Descrição | Vencimento | Labels | Último Comentário
Backlog | Card 1 | Alta | ... | 10/09/2026 | Label 1, Label 2 | Autor: Texto...
```

### Escopo de Cards
- **Incluídos:** Apenas cards com `is_closed === false`
- **Excluídos:** Cards em ARCHIVE, TRASH, ou com `is_closed === true`
- **Ordenação:** Ordem conforme a lista (respeita position), se houver prioridade no card usar essa ordem

### Filtros Opcionais
- `format`: `pdf` | `csv` | `both` (default: `pdf`)
- `priority`: Array de prioridades (ex: `["high", "medium"]`)
- `assigneeId`: ID do usuário (ex: `"user-123"`)
- `labelIds`: Array de label IDs (ex: `["label-1", "label-2"]`)
- `listIds`: Array de list IDs (ex: `["list-1", "list-2"]`)

### Endpoint
```
POST /api/v1/boards/:boardId/export

Body:
{
  "format": "pdf",  // "pdf", "csv", "both"
  "priority": ["high"],
  "assigneeId": null,
  "labelIds": [],
  "listIds": null  // null = todas
}

Response:
- Content-Type: application/pdf ou text/csv
- Content-Disposition: attachment; filename="board-export-2026-08-27.pdf"
```

### Arquitetura

#### Backend (Node.js)
```
server/
├── services/
│   └── export.js                 // NEW: Gera PDF/CSV
├── api/v1/
│   └── boards.js                 // ADD: POST /:id/export
└── utils/
    └── export-formatters.js      // NEW: Formata dados
```

**Libs:**
- `pdfkit` (PDF nativo)
- `papaparse` (CSV parsing, se necessário)

**Fluxo:**
1. POST `/api/v1/boards/:id/export` recebe filtros
2. Service busca board + lists + cards (com filtros aplicados)
3. Agrupa por list, respeita ordenação
4. Formata dados (summary + details)
5. Renderiza PDF ou CSV conforme `format`
6. Retorna arquivo download

#### Frontend (React)
```
client/
├── components/
│   └── boards/
│       └── ExportModal.jsx       // NEW: Modal de exportação
├── hooks/
│   └── useExport.js              // NEW: Hook para export
└── constants/
    └── ExportDefaults.js         // NEW: Defaults de filtros
```

**Fluxo:**
1. Botão "Exportar" no board header
2. Abre modal com filtros
3. User seleciona formato + filtros opcionais
4. Clica "Exportar Agora"
5. Faz POST para backend
6. Download automático do arquivo

### Dados Coletados por Card

**Obrigatórios:**
- `card.id`, `card.name`, `card.position`, `card.priority`
- `card.description` (ou vazio)
- `card.dueDate` (ou vazio)
- `card.labels[]` → `{id, name, color}`
- Último comentário: `{author, createdAt, text}` (ou vazio)

**Não incluídos:**
- Comentários completos (apenas último)
- Attachments
- Task lists/checklist
- Custom fields
- Histórico de atividades

### Validações
- ✅ Board existe + user tem acesso
- ✅ Pelo menos 1 card após filtros
- ✅ Formato válido (pdf|csv|both)
- ✅ Prioridades/labels/assignees existem

---

## 3. Mudanças Técnicas

### Frontend
**Arquivo: `client/src/models/Board.js`**
```javascript
// ANTES:
getFilteredCardsModelArray() {
  let cardModels = this.getCardsModelArray(); // inclui ALL cards
  // ... filtros ...
  return cardModels;
}

// DEPOIS:
getFilteredCardsModelArray() {
  let cardModels = this.getCardsModelArray();
  // NOVO: Filtrar cards fechados
  cardModels = cardModels.filter(card => !card.is_closed);
  // ... filtros ...
  return cardModels;
}
```

### Backend
**Novo arquivo: `server/services/export.js`**
- Função `generateBoardExport(boardId, filters)`
  - Busca board com permissão do usuário
  - Coleta lists/cards com filtros
  - Retorna objeto estruturado

**Novo arquivo: `server/utils/export-formatters.js`**
- `formatToPDF(data)` → Buffer PDF
- `formatToCSV(data)` → String CSV

**Modificação: `server/api/v1/boards.js`**
- ADD: `router.post('/:id/export', ...)`

---

## 4. Testes

### Feature 1: Contagem
- [ ] Board com cards fechados → contagem exclui is_closed
- [ ] Board com ARCHIVE/TRASH → contagem exclui essas lists
- [ ] Contador atualiza ao fechar card
- [ ] Combinação: ARCHIVE + is_closed → ambos excluídos

### Feature 2: Exportação
- [ ] PDF gera sem erros (estrutura correta)
- [ ] CSV gera sem erros (encoding UTF-8)
- [ ] Filtros funcionam (prioridade, assignee, labels, lists)
- [ ] Cards ordenados corretamente (position → priority)
- [ ] Permissões validadas (user não-membro → 403)
- [ ] Board sem cards após filtros → handled gracefully
- [ ] Descrições longas → não quebram layout PDF
- [ ] Comentários vazios → mostram "Sem comentários"
- [ ] Último comentário é realmente o último

---

## 5. Considerações de Performance

- **PDF com muitos cards** (500+): Pode levar alguns segundos
  - Usar chunking se necessário
  - Mostrar loader na UI
- **CSV é rápido** mesmo com muitos registros
- **Banco:** Queries precisam ser eficientes
  - Usar `left join` para último comentário
  - Índices em `card.is_closed`, `list.type`, `board_id`

---

## 6. Escalabilidade Futura

- [ ] Agendador: Exportar automaticamente (diário/semanal)
- [ ] Email: Enviar PDF/CSV por email
- [ ] Filtros avançados: Data range, regex no nome
- [ ] Histórico de exports: Guardar últimas 10 exportações

---

## Resumo de Implementação

| Item | Esforço | Tempo Est. |
|------|---------|-----------|
| Feature 1: Contagem otimizada | Baixo | 30 min |
| Feature 2: Endpoint export | Médio | 2-3 h |
| Feature 2: Modal de filtros | Médio | 1-2 h |
| Testes | Médio | 1-2 h |
| **Total** | **Médio-Alto** | **4-6h** |
