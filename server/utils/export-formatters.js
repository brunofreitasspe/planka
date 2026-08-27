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

const drawDetail = (doc, label, value) => {
  doc.font('Helvetica-Bold').fontSize(9).text(`${label}:`);

  if (label === 'Vencimento' && value === 'Sem data') {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#999').text(value);
    doc.fillColor('#000');
  } else {
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(value, { width: doc.page.width - 80 });
  }

  doc.moveDown(0.3);
};

const drawRule = (doc) => {
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#ccc')
    .lineWidth(0.5)
    .stroke();
};

const toPDF = (data) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Page 1: summary
    doc.font('Helvetica-Bold').fontSize(18).text(`Relatório de Cards - ${data.boardName}`, {
      align: 'center',
    });
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(`Gerado em ${formatDateForReport(data.generatedAt)}`, {
        align: 'center',
      });
    doc.moveDown(0.5);
    drawRule(doc);
    doc.moveDown(1);

    data.summary.forEach((section) => {
      doc.font('Helvetica-Bold').fontSize(13).text(section.listName);
      doc.moveDown(0.2);

      doc.font('Helvetica').fontSize(11);
      section.cards.forEach((card) => {
        doc.text(`• ${card.name}`, { indent: 20 });
      });

      doc.font('Helvetica-Bold').fontSize(11).text(`Total: ${section.total} card(s)`, {
        indent: 20,
      });
      doc.moveDown(0.8);
    });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#999')
      .text('Nota: excluídos cards fechados e listas de arquivo/lixeira');

    // Pages 2+: details
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(16).text('Detalhes dos Cards', { align: 'center' });
    doc.moveDown(1);

    data.details.forEach(({ card }) => {
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
      }

      doc.font('Helvetica-Bold').fontSize(13).text(card.name);
      doc.moveDown(0.4);

      drawDetail(doc, 'Prioridade', card.priority || 'Sem prioridade');
      drawDetail(doc, 'Descrição', card.description || '');
      drawDetail(doc, 'Vencimento', card.dueDate || 'Sem data');
      drawDetail(
        doc,
        'Labels',
        card.labels.length > 0 ? card.labels.map((label) => label.name).join(', ') : 'Sem labels',
      );

      doc.font('Helvetica-Bold').fontSize(9).text('Último Comentário:');
      if (card.lastComment) {
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(`${card.lastComment.authorName} - ${card.lastComment.createdAt}`);
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(card.lastComment.text, {
            width: doc.page.width - 100,
          });
      } else {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#999').text('Sem comentários');
        doc.fillColor('#000');
      }

      doc.moveDown(1);
      drawRule(doc);
      doc.moveDown(0.5);
    });

    doc.end();
  });

module.exports = {
  formatDateForReport,
  toCSV,
  toPDF,
};
