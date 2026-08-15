import { readFileSync } from 'node:fs';

const usersPage = readFileSync(new URL('../src/frontend/validation/users.html', import.meta.url), 'utf8');
const historyPage = readFileSync(new URL('../src/frontend/validation/history.html', import.meta.url), 'utf8');
const validationPage = readFileSync(new URL('../src/frontend/validation/valid.html', import.meta.url), 'utf8');
const adminStyles = readFileSync(new URL('../src/frontend/validation/css/admin.css', import.meta.url), 'utf8');

describe('separate validation administration pages', () => {
  test('users page owns users and validator requests with the official shell', () => {
    expect(usersPage).toContain('id="left-sidebar"');
    expect(usersPage).toContain('id="users-list"');
    expect(usersPage).toContain('id="requests-list"');
    expect(usersPage).toContain("./js/usersPage.js");
    expect(usersPage).not.toContain('valid.html#users');
  });

  test('history page uses the shared shell and real history controller', () => {
    expect(historyPage).toContain('id="left-sidebar"');
    expect(historyPage).toContain('id="history-status"');
    expect(historyPage).toContain('id="history-list"');
    expect(historyPage).toContain("./js/historyPage.js");
  });

  test('validation page no longer renders the users management area', () => {
    expect(validationPage).not.toContain('id="admin-access-section"');
    expect(validationPage).toContain('<script type="module" src="js/validationUI.js"></script>');
  });

  test('admin styles use shared tokens and include accessible semantic states', () => {
    expect(adminStyles).toContain('var(--a3-surface-success)');
    expect(adminStyles).toContain('var(--a3-surface-danger)');
    expect(adminStyles).toContain('var(--a3-focus-ring)');
    expect(adminStyles).toContain('.admin-status-pending');
    expect(adminStyles).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
