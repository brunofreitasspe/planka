/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const PDFDocument = require('pdfkit');

const formatDateForReport = (date) => {
  if (!date) {
    return null;
  }

  return new Date(date).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value).replace(/"/g, '""');

  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str}"`;
  }

  return str;
};

const truncate = (value, maxLength) => {
  if (!value || value.length <= maxLength) {
    return value || '';
  }

  return `${value.substring(0, maxLength)}...`;
};

const toCSV = (data) => {
  const rows = [];

  rows.push(
    ['List', 'Card', 'Prioridade', 'Descrição', 'Vencimento', 'Labels', 'Último Comentário']
      .map(escapeCsvValue)
      .join(','),
  );

  data.details.forEach(({ listName, card }) => {
    const labels = card.labels.map((label) => label.name).join('; ');
    const comment = card.lastComment
      ? `${card.lastComment.authorName}: ${truncate(card.lastComment.text, 80)}`
      : '';

    rows.push(
      [
        listName,
        card.name,
        card.priority || '',
        truncate(card.description, 100),
        card.dueDate || '',
        labels,
        comment,
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  });

  // BOM so Excel/Google Sheets open accents correctly; CRLF per RFC 4180.
  return `\uFEFF${rows.join('\r\n')}`;
};

const COLORS = {
  ink: '#1A1A18',
  secondary: '#5F5E5A',
  muted: '#888780',
  hairline: '#E4E2DA',
  cardBg: '#F5F4EF',
  labelBg: '#E1F5EE',
  labelInk: '#04342C',
};

const toPDF = (data) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Draw helpers live here so `doc` is a closure variable, not a parameter
    // (the linter forbids assigning to a parameter's properties).
    const drawRule = (y) => {
      doc
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .strokeColor(COLORS.hairline)
        .lineWidth(1)
        .stroke();
    };

    const drawHeader = (headerData) => {
      const { left, right } = doc.page.margins;
      const width = doc.page.width - left - right;
      const topY = doc.y;

      const title = `Relatório de cards — ${headerData.boardName}`;
      doc.font('Helvetica-Bold').fontSize(19).fillColor(COLORS.ink);
      const titleH = doc.heightOfString(title, { width });
      doc.text(title, left, topY, { width });

      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text('Excluídos cards fechados e listas de arquivo/lixeira', left, topY + 5, {
          width,
          align: 'right',
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.secondary)
        .text(`Gerado em ${formatDateForReport(headerData.generatedAt)}`, left, topY + titleH + 3, {
          width,
        });

      doc.y = topY + titleH + 3 + 12 + 8;
      drawRule(doc.y);
      doc.moveDown(1);
    };

    const drawSummaryGrid = (summary) => {
      const { left, right } = doc.page.margins;
      const width = doc.page.width - left - right;
      const gutter = 8;
      const columns = Math.max(1, Math.min(4, Math.floor((width - gutter) / 124)));
      const cardW = (width - gutter * (columns - 1)) / columns;
      const cardH = 46;
      const startY = doc.y;

      summary.forEach((section, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = left + col * (cardW + gutter);
        const y = startY + row * (cardH + gutter);

        doc.roundedRect(x, y, cardW, cardH, 6).fill(COLORS.cardBg);

        doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary);
        doc.text(section.listName, x + 4, y + 6, {
          width: cardW - 8,
          align: 'center',
          ellipsis: true,
        });

        doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.ink);
        doc.text(String(section.total), x + 4, y + 17, { width: cardW - 8, align: 'center' });
      });

      doc.y = startY + Math.ceil(summary.length / columns) * (cardH + gutter) + 8;
    };

    const drawDetailCard = (detail) => {
      const { left, right } = doc.page.margins;
      const width = doc.page.width - left - right;
      const padX = 10;
      const padY = 8;
      const innerX = left + padX;
      const innerW = width - padX * 2;
      const { card } = detail;

      // Measure the full card height first so the whole card stays on one page.
      doc.font('Helvetica-Bold').fontSize(11);
      const titleH = doc.heightOfString(card.name, { width: innerW - 90 });
      const titleRowH = Math.max(titleH, 14);

      doc.font('Helvetica').fontSize(9);
      const descH = doc.heightOfString(card.description || 'Sem descrição', {
        width: innerW,
        lineGap: 2,
      });

      const commentTextH = card.lastComment
        ? doc.heightOfString(card.lastComment.text, { width: innerW, lineGap: 2 })
        : 0;
      const commentH = (card.lastComment ? 10 : 0) + commentTextH + 10;

      doc.font('Helvetica').fontSize(8);
      const pillWidths = card.labels.map((label) => doc.widthOfString(label.name) + 14);
      let labelRows = 1;
      let used = 0;
      pillWidths.forEach((pillW) => {
        if (used + pillW > innerW) {
          labelRows += 1;
          used = pillW + 4;
        } else {
          used += pillW + 4;
        }
      });
      const labelsH = card.labels.length > 0 ? labelRows * 18 : 10;

      const cardH =
        padY * 2 +
        titleRowH +
        8 +
        22 +
        8 +
        (9 + 4 + descH) +
        8 +
        (9 + 4 + labelsH) +
        8 +
        (9 + 4 + commentH);

      if (doc.y + cardH + 14 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }

      const boxTop = doc.y;
      doc.roundedRect(left, boxTop, width, cardH, 6).fillAndStroke('#FFFFFF', COLORS.hairline);
      doc.lineWidth(1);

      // Title row: card name left, origin list as a discreet tag right.
      let y = boxTop + padY;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink);
      doc.text(card.name, innerX, y, { width: innerW - 90 });

      const tag = detail.listName;
      const tagW = Math.min(doc.widthOfString(tag) + 12, 120);
      doc.roundedRect(left + width - padX - tagW, boxTop + padY, tagW, 14, 7).fill(COLORS.cardBg);
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary);
      doc.text(tag, left + width - padX - tagW + 5, boxTop + padY + 3, {
        width: tagW - 10,
        align: 'center',
        ellipsis: true,
      });
      y = boxTop + padY + titleRowH + 8;

      // Two columns: Prioridade | Vencimento.
      const halfW = (innerW - 8) / 2;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted);
      doc.text('Prioridade', innerX, y);
      doc.text('Vencimento', innerX + halfW + 8, y);
      doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.secondary);
      doc.text(card.priority || 'Sem prioridade', innerX, y + 9, { width: halfW });
      doc.text(card.dueDate || 'Sem data', innerX + halfW + 8, y + 9, { width: halfW });
      y += 22;

      // Description block.
      y += 8;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted);
      doc.text('Descrição', innerX, y);
      doc.font('Helvetica').fontSize(9);
      if (card.description) {
        doc.fillColor(COLORS.ink);
        doc.text(card.description, innerX, y + 4, { width: innerW, lineGap: 2 });
      } else {
        doc.font('Helvetica-Oblique').fillColor(COLORS.muted);
        doc.text('Sem descrição', innerX, y + 4, { width: innerW });
      }
      y += 9 + 4 + descH;

      // Labels as pills (or placeholder).
      y += 8;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted);
      doc.text('Labels', innerX, y);
      y += 4;
      if (card.labels.length > 0) {
        let pillX = innerX;
        let pillRowY = y;
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.labelInk);
        card.labels.forEach((label) => {
          const pillW = doc.widthOfString(label.name) + 14;
          if (pillX + pillW > innerX + innerW) {
            pillX = innerX;
            pillRowY += 18;
          }
          doc.roundedRect(pillX, pillRowY, pillW, 14, 7).fill(COLORS.labelBg);
          doc.text(label.name, pillX + 7, pillRowY + 3, { width: pillW - 14, align: 'center' });
          pillX += pillW + 4;
        });
        y += labelsH;
      } else {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.muted);
        doc.text('Sem labels', innerX, y);
        y += 10;
      }

      // Last comment (author — date + text, or placeholder).
      y += 8;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted);
      doc.text('Último comentário', innerX, y);
      y += 4;
      if (card.lastComment) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.secondary);
        doc.text(`${card.lastComment.authorName} — ${card.lastComment.createdAt}`, innerX, y);
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.ink);
        doc.text(card.lastComment.text, innerX, y + 10, { width: innerW, lineGap: 2 });
      } else {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.muted);
        doc.text('Sem comentários', innerX, y);
      }

      doc.y = boxTop + cardH + 14;
    };

    // Page 1: header + summary mini-dashboard (totals may be zero).
    drawHeader(data);

    if (data.summary.length > 0) {
      drawSummaryGrid(data.summary);
    } else {
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text('Nenhuma lista ativa neste board.', doc.page.margins.left, doc.y);
      doc.moveDown(1);
    }

    const totalCards = data.summary.reduce((sum, section) => sum + section.total, 0);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.secondary)
      .text(`Total de cards: ${totalCards}`, doc.page.margins.left, doc.y);
    doc.moveDown(1);

    // Pages 2+: card details, one card box per card, kept whole per page.
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.ink).text('Detalhes dos cards');
    doc.moveDown(0.6);

    if (data.details.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text('Nenhum card para exportar com os filtros aplicados.');
    } else {
      data.details.forEach((detail) => drawDetailCard(detail));
    }

    doc.end();
  });

module.exports = {
  formatDateForReport,
  toCSV,
  toPDF,
};
