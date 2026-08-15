/** @jest-environment jsdom */

import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';
import { translations } from '../src/frontend/js/i18n/translations.js';
import { t } from '../src/frontend/js/i18n/useTranslation.js';

const activePages = [
  'index.html', 'simulados.html', 'diagnostico.html', 'flashcards.html',
  'study-now.html', 'study-sprint.html', 'jornada.html', 'laboratorios.html',
  'cases.html', 'case-view.html', 'profile.html', 'settings.html',
  'resources.html', 'simulator-hub.html', 'simulator-room.html',
].map((file) => new URL(`../src/frontend/pages/${file}`, import.meta.url));
const validationPages = ['valid.html', 'users.html', 'history.html'].map(
  (file) => new URL(`../src/frontend/validation/${file}`, import.meta.url),
);

describe('centralized PT/EN interface translations', () => {
  test('PT and EN dictionaries have exact key parity', () => {
    expect(Object.keys(translations.pt).sort()).toEqual(Object.keys(translations.en).sort());
  });

  test('missing keys use a safe empty fallback instead of exposing internal keys', () => {
    expect(t('missing.visible.key', 'en')).toBe('');
    expect(t('admin_users_title', 'en')).toBe('User management');
  });

  test('all active source pages are represented in the i18n audit', () => {
    expect(activePages.length + validationPages.length).toBe(18);
    [...activePages, ...validationPages].forEach((url) => {
      const source = readFileSync(url, 'utf8');
      if (url.pathname.endsWith('/study-now.html')) {
        expect(source).toContain('index.html#study-now-section');
      } else if (url.pathname.endsWith('/valid.html')) {
        expect(source).toContain('validationUI.js');
      } else {
        expect(source).toMatch(/btn-language|initShell|app\.js|i18n\/|languageManager|simulator\/engine|shell\.js/);
      }
    });
  });

  test('active pages do not introduce independent language storage', () => {
    [...activePages, ...validationPages].forEach((url) => {
      const source = readFileSync(url, 'utf8');
      expect(source).not.toMatch(/localStorage\.(getItem|setItem)\(['"](?:language|aws_sim_lang)/);
    });
  });

  test('administrative pages expose translatable visible controls', () => {
    for (const file of ['valid.html', 'users.html', 'history.html']) {
      const source = readFileSync(new URL(`../src/frontend/validation/${file}`, import.meta.url), 'utf8');
      if (file === 'valid.html') {
        expect(source).toContain('validationUI.js');
      } else {
        expect(source).toContain('btn-language');
      }
      if (file !== 'valid.html') expect(source).toContain('data-i18n');
    }
  });
});
