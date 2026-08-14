/** @jest-environment jsdom */

import { beforeEach, describe, expect, test } from '@jest/globals';
import { ADMIN_MENU_STORAGE_KEY, buildSidebar } from '../src/frontend/js/shell.js';

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
