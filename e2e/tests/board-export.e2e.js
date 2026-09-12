/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * End-to-end coverage for the board cards export (PDF/CSV):
 * - CSV export downloads a flat table with pt-BR headers, open cards grouped
 *   by list, and closed cards excluded
 * - PDF export downloads a valid PDF attachment
 * - the priority band filter narrows the exported cards
 *
 * Run: `npm run e2e` with the docker-compose-dev stack up (server :1337, client :3000).
 */

const { readFileSync } = require('fs');
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:1337';

const ADMIN = {
  emailOrUsername: 'demo@demo.demo',
  password: 'demo',
};

const HIGH_CARD = 'High Priority Card';
const LOW_CARD = 'Low Priority Card';
const CLOSED_CARD = 'Closed Card';

// ---------------------------------------------------------------------------
// API helpers (setup only — the scenarios under test are driven through the UI)
// ---------------------------------------------------------------------------

async function api(request, method, url, { token, data } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await request[method](`${API_URL}${url}`, {
    headers,
    data,
  });

  if (!response.ok()) {
    throw new Error(`${method} ${url} -> ${response.status()} ${await response.text()}`);
  }

  const body = await response.json().catch(() => ({}));

  return body.item ?? body;
}

// Login through the API, completing the terms-acceptance step if the instance
// requires it. With `withHttpOnlyToken` the session cookie is stored in the
// given request/context cookie jar so the browser loads already authenticated.
async function createSession(request, emailOrUsername, password, withHttpOnlyToken) {
  const loginUrl = `/api/access-tokens${withHttpOnlyToken ? '?withHttpOnlyToken=true' : ''}`;
  const loginResponse = await request.post(`${API_URL}${loginUrl}`, {
    data: { emailOrUsername, password },
  });

  const loginBody = await loginResponse.json().catch(() => ({}));

  if (loginResponse.status() === 403 && loginBody.step === 'accept-terms') {
    const termsResponse = await request.get(`${API_URL}/api/terms?language=pt-BR`);
    const { item: terms } = await termsResponse.json();

    const acceptResponse = await request.post(`${API_URL}/api/access-tokens/accept-terms`, {
      data: {
        pendingToken: loginBody.pendingToken,
        signature: terms.signature,
        initialLanguage: 'pt-BR',
      },
    });

    expect(acceptResponse.ok()).toBeTruthy();
    const { item: accessToken } = await acceptResponse.json();

    return accessToken;
  }

  expect(loginResponse.ok()).toBeTruthy();

  return loginBody.item;
}

async function apiLogin(request, emailOrUsername, password) {
  return createSession(request, emailOrUsername, password, false);
}

// Authenticate through the real login form. The browser performs the full flow
// (access token cookie + httpOnly session), which the Sails API requires.
// New accounts must first accept the terms; the helper detects and completes
// that step whenever it appears, so it works for fresh or settled databases.
async function loginViaForm(page, emailOrUsername, password) {
  await page.goto('/login');
  await page.locator('input[name="emailOrUsername"]').fill(emailOrUsername);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();

  // Either the app navigates past /login or the terms modal appears first.
  const continueButton = page.getByRole('button', { name: 'Continuar' });
  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }),
    continueButton.waitFor({ state: 'visible', timeout: 30000 }),
  ]);

  if (await continueButton.isVisible()) {
    // The template terms include confirmations — accept all of them. Semantic-UI
    // hides the checkbox input under its label, so click each label (which
    // toggles the input) instead of calling check() on the hidden input.
    const checkboxes = page.locator('.ui.checkbox input');
    const checkboxCount = await checkboxes.count();
    for (let i = 0; i < checkboxCount; i += 1) {
      await checkboxes.nth(i).locator('xpath=following-sibling::label').click();
    }

    await continueButton.click();

    // Terms accepted — the app can now navigate past /login.
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
  }

  await expect(page.getByRole('button', { name: 'Entrar' })).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

// Open the board actions popup and click the "Export" item, leaving the
// export modal open.
async function openExportModal(page) {
  await page.locator('button:has(.icon.ellipsis.vertical)').click();
  await page.locator('.ui.popup:visible').getByText('Exportar', { exact: true }).click();
  await expect(
    page.locator('.ui.modal').getByText('Exportar cards', { exact: true }),
  ).toBeVisible();
}

// Pick a value in the format dropdown (semantic-ui selection dropdown).
async function selectExportFormat(page, label) {
  await page.locator('.ui.selection.dropdown').first().click();
  await page.locator('.ui.dropdown .menu.visible .item').filter({ hasText: label }).click();
}

// ---------------------------------------------------------------------------

test.describe.configure({ mode: 'serial' });

test.describe('Board cards export', () => {
  let adminToken;
  let boardId;

  test.beforeAll(async ({ request }) => {
    // Admin login (seeded by `npm run db:init`).
    adminToken = await apiLogin(request, ADMIN.emailOrUsername, ADMIN.password);

    const project = await api(request, 'post', '/api/projects', {
      token: adminToken,
      data: { type: 'private', name: `E2E Export Project ${Date.now()}` },
    });

    const board = await api(request, 'post', `/api/projects/${project.id}/boards`, {
      token: adminToken,
      data: { position: 65536, name: 'Export Board' },
    });
    boardId = board.id;

    const todoList = await api(request, 'post', `/api/boards/${boardId}/lists`, {
      token: adminToken,
      data: { type: 'active', position: 65536, name: 'To Do' },
    });

    const doneList = await api(request, 'post', `/api/boards/${boardId}/lists`, {
      token: adminToken,
      data: { type: 'closed', position: 131072, name: 'Done' },
    });

    // High-priority card in "To Do", with one comment (last-comment is exported).
    const highCard = await api(request, 'post', `/api/lists/${todoList.id}/cards`, {
      token: adminToken,
      data: { type: 'project', position: 65536, name: HIGH_CARD },
    });
    await api(request, 'patch', `/api/cards/${highCard.id}`, {
      token: adminToken,
      data: { priority: 6 },
    });
    await api(request, 'post', `/api/cards/${highCard.id}/comments`, {
      token: adminToken,
      data: { text: 'Comment on high card' },
    });

    // Low-priority card in "Done".
    const lowCard = await api(request, 'post', `/api/lists/${doneList.id}/cards`, {
      token: adminToken,
      data: { type: 'project', position: 65536, name: LOW_CARD },
    });
    await api(request, 'patch', `/api/cards/${lowCard.id}`, {
      token: adminToken,
      data: { priority: 9 },
    });

    // Closed card — must never appear in exports.
    const closedCard = await api(request, 'post', `/api/lists/${doneList.id}/cards`, {
      token: adminToken,
      data: { type: 'project', position: 131072, name: CLOSED_CARD },
    });
    await api(request, 'patch', `/api/cards/${closedCard.id}`, {
      token: adminToken,
      data: { isClosed: true },
    });
  });

  test('exports CSV with open cards grouped by list, closed card excluded', async ({
    browser,
  }) => {
    const page = await browser.newPage();
    await loginViaForm(page, ADMIN.emailOrUsername, ADMIN.password);

    await page.goto(`/boards/${boardId}`);
    await expect(page.getByText('Export Board').first()).toBeVisible({ timeout: 30000 });

    await openExportModal(page);
    await selectExportFormat(page, 'CSV');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('.ui.modal').getByRole('button', { name: 'Exportar agora' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^board-export-\d{4}-\d{2}-\d{2}\.csv$/);

    const csv = readFileSync(await download.path(), 'utf8');
    expect(csv.startsWith('﻿')).toBeTruthy();
    expect(csv).toContain(
      'List,Card,Prioridade,Descrição,Vencimento,Labels,Custom Fields,Último Comentário',
    );

    // Open cards from both lists are present; the closed card is not.
    expect(csv).toContain(HIGH_CARD);
    expect(csv).toContain(LOW_CARD);
    expect(csv).not.toContain(CLOSED_CARD);

    // The last comment of the high-priority card is exported.
    expect(csv).toContain('Comment on high card');

    // Grouped by list order: "To Do" cards precede "Done" cards.
    expect(csv.indexOf(HIGH_CARD)).toBeLessThan(csv.indexOf(LOW_CARD));

    await page.close();
  });

  test('exports a PDF attachment by default', async ({ browser }) => {
    const page = await browser.newPage();
    await loginViaForm(page, ADMIN.emailOrUsername, ADMIN.password);

    await page.goto(`/boards/${boardId}`);
    await expect(page.getByText('Export Board').first()).toBeVisible({ timeout: 30000 });

    await openExportModal(page);

    // Format defaults to PDF — export directly.
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.ui.modal').getByRole('button', { name: 'Exportar agora' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^board-export-\d{4}-\d{2}-\d{2}\.pdf$/);

    const pdf = readFileSync(await download.path());
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');

    await page.close();
  });

  test('applies the priority band filter', async ({ browser }) => {
    const page = await browser.newPage();
    await loginViaForm(page, ADMIN.emailOrUsername, ADMIN.password);

    await page.goto(`/boards/${boardId}`);
    await expect(page.getByText('Export Board').first()).toBeVisible({ timeout: 30000 });

    await openExportModal(page);
    await selectExportFormat(page, 'CSV');

    // Only the "High" (Alta) band is selected.
    await page.locator('.ui.modal').getByText('Alta', { exact: true }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('.ui.modal').getByRole('button', { name: 'Exportar agora' }).click();
    const download = await downloadPromise;

    const csv = readFileSync(await download.path(), 'utf8');
    expect(csv).toContain(HIGH_CARD);
    expect(csv).not.toContain(LOW_CARD);

    await page.close();
  });
});
