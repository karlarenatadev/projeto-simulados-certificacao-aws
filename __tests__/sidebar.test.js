/** @jest-environment jsdom */

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  ADMIN_MENU_STORAGE_KEY,
  buildSidebar,
  renderUserMenu,
} from '../src/frontend/js/shell.js';

describe('role-aware administrative sidebar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<nav id="left-sidebar"><div class="left-sidebar-nav"></div></nav>';
    localStorage.clear();
    window.history.replaceState({}, '', '/index.html');
  });

  test('STUDENT has no validation or admin group', () => {
    buildSidebar({ role: 'STUDENT' });
    expect(document.getElementById('sidebar-btn-validation')).toBeNull();
    expect(document.getElementById('sidebar-admin-toggle')).toBeNull();
    expect(document.getElementById('sidebar-btn-users')).toBeNull();
    expect(document.getElementById('sidebar-btn-history')).toBeNull();
  });

  test('VALIDATOR sees Validation and History without the admin group', () => {
    buildSidebar({ role: 'VALIDATOR' });
    expect(document.getElementById('sidebar-btn-validation')).not.toBeNull();
    expect(document.getElementById('sidebar-btn-history')).not.toBeNull();
    expect(document.getElementById('sidebar-admin-toggle')).toBeNull();
    expect(document.getElementById('sidebar-btn-users')).toBeNull();
  });

  test('ADMIN gets a collapsible group with real page destinations', () => {
    window.history.replaceState({}, '', '/validation/users.html');
    buildSidebar({ role: 'ADMIN' });
    const toggle = document.getElementById('sidebar-admin-toggle');
    const users = document.getElementById('sidebar-btn-users');
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('sidebar-admin-menu');
    expect(users.getAttribute('href')).toBe('/validation/users.html');
    expect(users.tagName).toBe('A');
    expect(users.querySelector('i').className).toContain('fa-users');
    expect(document.querySelector('#sidebar-btn-validation i').className).toContain('fa-circle-check');
    expect(document.querySelector('#sidebar-btn-history i').className).toContain('fa-clock-rotate-left');
    expect(document.querySelector('#sidebar-btn-profile i').className).toContain('fa-circle-user');
    expect(document.querySelector('#sidebar-btn-settings i').className).toContain('fa-sliders');
    expect(users.classList.contains('is-active')).toBe(true);
    expect(document.getElementById('sidebar-btn-validation').getAttribute('href')).toBe('/validation/valid.html');
    expect(document.getElementById('sidebar-btn-profile').getAttribute('href')).toBe('/profile.html');
    expect(document.getElementById('sidebar-btn-settings').getAttribute('href')).toBe('/settings.html');
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(localStorage.getItem(ADMIN_MENU_STORAGE_KEY)).toBe('true');
  });

  test('Users link points to the dedicated page from Validation', () => {
    window.history.replaceState({}, '', '/validation/valid.html');
    buildSidebar({ role: 'ADMIN' });
    expect(document.getElementById('sidebar-btn-users').getAttribute('href')).toBe('/validation/users.html');
    expect(window.location.pathname).toBe('/validation/valid.html');
    expect(window.location.hash).toBe('');
  });

  test('ADMIN preference is restored while active route remains visible', () => {
    localStorage.setItem(ADMIN_MENU_STORAGE_KEY, 'true');
    buildSidebar({ role: 'ADMIN' });
    expect(document.getElementById('sidebar-admin-toggle').getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('sidebar-admin-menu').hidden).toBe(true);
  });
});

describe('secure user menu rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="user-menu-container"></div>';
    localStorage.clear();
  });

  test('renders profile values as text and preserves the menu structure', () => {
    renderUserMenu({
      nickname: 'Karla Renata',
      full_name: 'Karla Renata',
      email: 'karla@a3data.com.br',
      role: 'STUDENT',
    });

    expect(document.querySelector('.a3-user-name').textContent).toBe('Karla Renata');
    expect(document.querySelector('.a3-dropdown-email').textContent).toBe('karla@a3data.com.br');
    expect(document.querySelector('.a3-user-menu')).not.toBeNull();
    expect(document.getElementById('user-menu-profile')).not.toBeNull();
    expect(document.getElementById('user-menu-settings')).not.toBeNull();
    expect(document.getElementById('user-menu-logout')).not.toBeNull();
  });

  test.each([
    '<b>Karla</b>',
    '<img src=x onerror="window.__xss = true">',
    'Karla & Renata <AWS>',
  ])('does not parse profile HTML payload %s', (payload) => {
    renderUserMenu({ nickname: payload, email: 'user@a3data.com.br', role: 'ADMIN' });

    expect(document.querySelector('.a3-user-name').textContent).toBe(payload);
    expect(document.querySelector('.a3-dropdown-name').textContent).toBe(payload);
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
    expect(window.__xss).toBeUndefined();
  });

  test('sets title through the DOM API and keeps quotes as text', () => {
    const displayName = 'Karla "Cloud"';
    renderUserMenu({ nickname: displayName, email: 'user@a3data.com.br' });

    const name = document.querySelector('.a3-user-name');
    expect(name.textContent).toBe(displayName);
    expect(name.title).toBe(displayName);
  });

  test.each([
    ['STUDENT', 'a3-role-student'],
    ['VALIDATOR', 'a3-role-validator'],
    ['ADMIN', 'a3-role-admin'],
  ])('preserves the safe role class for %s', (role, expectedClass) => {
    renderUserMenu({ email: 'user@a3data.com.br', role });

    expect(document.querySelector('.a3-user-role').classList.contains(expectedClass)).toBe(true);
  });

  test('keeps the existing fallback for empty profile values and Unicode initials', () => {
    renderUserMenu({ nickname: '', full_name: '', email: 'ø@a3data.com.br' });

    expect(document.querySelector('.a3-user-name').textContent).toBe('ø@a3data.com.br');
    expect(document.querySelector('.a3-avatar').textContent).toBe('Ø');
  });
});
