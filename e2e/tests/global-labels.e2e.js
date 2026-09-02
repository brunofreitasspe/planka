/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * End-to-end coverage for global project labels:
 * - manager promotes a board label to a project (global) label
 * - card keeps the label association through promote / demote
 * - manager creates a global label from the project settings
 * - manager demotes a global label back to a board label
 * - non-manager members see only the globals their project allows
 *   (managers-only globals stay hidden, no promote/demote buttons)
 *
 * Run: `npm run e2e` with the docker-compose-dev stack up (server :1337, client :3000).
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:1337';

const ADMIN = {
  emailOrUsername: 'demo@demo.demo',
  password: 'demo',
};

const MEMBER = {
  email: `e2e.member.${Date.now()}@example.com`,
  password: 'qK7!vB4#xZ9#mP2',
  name: 'E2E Member',
  username: `e2e_member_${Date.now()}`,
  role: 'boardUser',
};

const CARD_NAME = 'Card Alpha';
const LOCAL_LABEL_NAME = 'Local Alpha';
const GLOBAL_MEMBERS_NAME = 'Global Members';
const GLOBAL_MANAGERS_ONLY_NAME = 'Global Managers Only';
const SETTINGS_GLOBAL_NAME = 'Global Delta';

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
  await page.locator('form').getByRole('button', { name: 'Log in' }).click();

  // Either the app navigates past /login or the terms modal appears first.
  const continueButton = page.getByRole('button', { name: 'Continue' });
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

  await expect(page.getByRole('button', { name: 'Log in' })).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

async function openCardLabelSelector(page, cardId) {
  await page.goto(`/cards/${cardId}`);
  await expect(page.getByText(CARD_NAME, { exact: true }).first()).toBeVisible({ timeout: 30000 });

  // The card modal shows the linked label as a chip — clicking it opens the selector.
  // (The board tile also shows the label, so scope to the modal's exact-named button.)
  await page.getByRole('button', { name: LOCAL_LABEL_NAME, exact: true }).click();

  // The selector popup is open when its search box is visible. (Section titles
  // like "Board Labels" are hidden when that section has no labels.)
  await expect(page.getByPlaceholder('Search labels...')).toBeVisible();
}

// Locate one label row inside the opened selector by its name. The label's own
// `span` holds the name, and the globe (when present) is a child of that span.
// The promote/demote buttons live in the span's parent wrapper.
function labelItem(page, name) {
  return page.locator('.ui.popup:visible').getByText(name);
}

// Locate a label row inside one specific section of the opened selector.
// Demoting keeps the project label in the project vocabulary, so the same name
// can appear twice — once global (Project Labels) and once local (Board
// Labels). The items list is the first `div` sibling after the section title.
function labelItemInSection(page, sectionTitle, name) {
  return page
    .locator('.ui.popup:visible')
    .getByText(sectionTitle, { exact: true })
    .locator('xpath=following-sibling::div[1]')
    .getByText(name);
}

// ---------------------------------------------------------------------------

test.describe.configure({ mode: 'serial' });

test.describe('Global project labels', () => {
  let adminToken;
  let projectId;
  let boardId;
  let cardId;

  test.beforeAll(async ({ request }) => {
    // Admin login (seeded by `npm run db:init`).
    adminToken = await apiLogin(request, ADMIN.emailOrUsername, ADMIN.password);

    // Project + board + list + card + one board label, with the label on the card.
    const project = await api(request, 'post', '/api/projects', {
      token: adminToken,
      data: { type: 'private', name: `E2E Project ${Date.now()}` },
    });
    projectId = project.id;

    const board = await api(request, 'post', `/api/projects/${projectId}/boards`, {
      token: adminToken,
      data: { position: 65536, name: 'Main Board' },
    });
    boardId = board.id;

    const list = await api(request, 'post', `/api/boards/${boardId}/lists`, {
      token: adminToken,
      data: { type: 'active', position: 65536, name: 'To Do' },
    });

    const card = await api(request, 'post', `/api/lists/${list.id}/cards`, {
      token: adminToken,
      data: { type: 'project', position: 65536, name: CARD_NAME },
    });
    cardId = card.id;

    const localLabel = await api(request, 'post', `/api/boards/${boardId}/labels`, {
      token: adminToken,
      data: { position: 65536, name: LOCAL_LABEL_NAME, color: 'berry-red' },
    });

    await api(request, 'post', `/api/cards/${cardId}/card-labels`, {
      token: adminToken,
      data: { labelId: localLabel.id },
    });

    // A member (editor on the board, not a project manager) for the filtered view.
    const member = await api(request, 'post', '/api/users', {
      token: adminToken,
      data: MEMBER,
    });

    await api(request, 'post', `/api/boards/${boardId}/board-memberships`, {
      token: adminToken,
      data: { userId: member.id, role: 'editor' },
    });

    // Project globals: one members-usable, one managers-only.
    await api(request, 'post', `/api/projects/${projectId}/labels`, {
      token: adminToken,
      data: { name: GLOBAL_MEMBERS_NAME, color: 'sunny-grass', canBeUsedByMembers: true },
    });

    await api(request, 'post', `/api/projects/${projectId}/labels`, {
      token: adminToken,
      data: { name: GLOBAL_MANAGERS_ONLY_NAME, color: 'apricot-red', canBeUsedByMembers: false },
    });
  });

  test('manager promotes a board label to a project label (card keeps it)', async ({
    browser,
  }) => {
    const page = await browser.newPage();
    await loginViaForm(page, ADMIN.emailOrUsername, ADMIN.password);

    await openCardLabelSelector(page, cardId);

    // The label starts in the Board Labels section without a globe.
    const boardItem = labelItem(page, LOCAL_LABEL_NAME);
    await expect(boardItem).toContainText(LOCAL_LABEL_NAME);
    await expect(boardItem.locator('span[class*="globe"]')).toHaveCount(0);

    // Promote it.
    await boardItem.locator('xpath=..').locator('button:has(i.arrow.up)').click();

    // The promote step opens pre-filled; submit it.
    await page.getByRole('button', { name: 'Promote to project label' }).click();

    // It now lives in the Project Labels section, marked with the globe.
    await expect(page.getByText('Project Labels', { exact: true })).toBeVisible();
    const globalItem = labelItem(page, LOCAL_LABEL_NAME);
    await expect(globalItem).toContainText(LOCAL_LABEL_NAME);
    await expect(globalItem.locator('span[class*="globe"]')).toHaveCount(1);

    // The card still carries the label (association survives promote).
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.getByText(LOCAL_LABEL_NAME, { exact: true }).first()).toBeVisible();

    await page.close();
  });

  test('manager creates a global label from the project settings', async ({ browser }) => {
    const page = await browser.newPage();
    await loginViaForm(page, ADMIN.emailOrUsername, ADMIN.password);

    await page.goto(`/boards/${boardId}`);
    await expect(page.getByText('Main Board').first()).toBeVisible({ timeout: 30000 });

    // Managers see the project settings pencil only in edit mode (locked by default).
    await page.locator('i.lock.icon').click();
    await expect(page.locator('i.pencil.icon').first()).toBeVisible({ timeout: 10000 });

    // Open project settings via the pencil next to the project name (first in the DOM).
    await page.locator('i.pencil.icon').locator('xpath=ancestor::button').first().click();
    await expect(page.getByRole('dialog').or(page.locator('.ui.modal'))).toBeVisible();

    // Switch to the Labels tab and open the create form.
    // (Semantic-UI tab items are plain links, not role=tab — scope to the modal.)
    await page.locator('.ui.modal').getByText('Labels', { exact: true }).click();
    await page.getByRole('button', { name: 'Create project label' }).first().click();

    // Fill the editor and submit (the name input has no placeholder).
    const editorPopup = page.locator('.ui.popup').filter({
      has: page.locator('input[name="name"]'),
    });
    await editorPopup.locator('input[name="name"]').fill(SETTINGS_GLOBAL_NAME);
    await editorPopup.getByRole('button', { name: 'Create project label' }).click();

    // The new global label appears in the project settings list.
    await expect(page.getByText(SETTINGS_GLOBAL_NAME, { exact: true })).toBeVisible();

    await page.close();
  });

  test('manager demotes a project label back to a board label (card keeps it)', async ({
    browser,
  }) => {
    const page = await browser.newPage();
    await loginViaForm(page, ADMIN.emailOrUsername, ADMIN.password);

    await openCardLabelSelector(page, cardId);

    // It is global now, in the Project Labels section with a globe and a demote (↓) button.
    await expect(page.getByText('Project Labels', { exact: true })).toBeVisible();
    const globalItem = labelItem(page, LOCAL_LABEL_NAME);
    await expect(globalItem.locator('span[class*="globe"]')).toHaveCount(1);

    // Demote it back to a board label.
    await globalItem.locator('xpath=..').locator('button:has(i.arrow.down)').click();

    // Back in the Board Labels section: local again, no globe. The demote keeps
    // the project label in the project vocabulary, so this board now shows the
    // same name twice — the demoted local here and the global in Project Labels.
    await expect(page.getByText('Board Labels', { exact: true })).toBeVisible();
    const boardItem = labelItemInSection(page, 'Board Labels', LOCAL_LABEL_NAME);
    await expect(boardItem).toContainText(LOCAL_LABEL_NAME);
    await expect(boardItem.locator('span[class*="globe"]')).toHaveCount(0);

    // The project vocabulary still holds the global (still available to boards).
    await expect(labelItem(page, LOCAL_LABEL_NAME).first()).toBeVisible();
    await expect(labelItem(page, LOCAL_LABEL_NAME).first().locator('span[class*="globe"]')).toHaveCount(1);

    // The card still carries the label (association survives demote).
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.getByText(LOCAL_LABEL_NAME, { exact: true }).first()).toBeVisible();

    await page.close();
  });

  test('non-manager sees only the globals their project allows', async ({ browser }) => {
    const page = await browser.newPage();
    await loginViaForm(page, MEMBER.email, MEMBER.password);

    await openCardLabelSelector(page, cardId);

    // Board labels are visible as usual (the demoted label is local again).
    await expect(page.getByText('Board Labels', { exact: true })).toBeVisible();
    await expect(labelItemInSection(page, 'Board Labels', LOCAL_LABEL_NAME)).toContainText(
      LOCAL_LABEL_NAME,
    );

    // The members-usable global is visible, marked with the globe.
    await expect(page.getByText('Project Labels', { exact: true })).toBeVisible();
    const membersItem = labelItem(page, GLOBAL_MEMBERS_NAME);
    await expect(membersItem.locator('span[class*="globe"]')).toHaveCount(1);

    // The managers-only global is hidden from members.
    await expect(page.getByText(GLOBAL_MANAGERS_ONLY_NAME, { exact: true })).toHaveCount(0);

    // Members get no promote/demote controls.
    await expect(page.locator('button:has(i.arrow.up)')).toHaveCount(0);
    await expect(page.locator('button:has(i.arrow.down)')).toHaveCount(0);

    await page.close();
  });
});
