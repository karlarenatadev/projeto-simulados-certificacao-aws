/** @jest-environment jsdom */

import { describe, expect, test } from '@jest/globals';
import { getAppBasePath, resolveAppUrl } from '../src/frontend/js/core/navigation.js';

describe('application navigation URLs', () => {
  test('resolves routes from localhost root and nested Validation pages', () => {
    expect(resolveAppUrl('validation/valid.html', '/index.html')).toBe('/validation/valid.html');
    expect(resolveAppUrl('validation/valid.html#users', '/profile.html')).toBe('/validation/valid.html#users');
    expect(resolveAppUrl('validation/users.html', '/validation/valid.html')).toBe('/validation/users.html');
    expect(resolveAppUrl('validation/history.html', '/validation/users.html')).toBe('/validation/history.html');
    expect(resolveAppUrl('profile.html', '/validation/valid.html')).toBe('/profile.html');
    expect(resolveAppUrl('settings.html', '/validation/valid.html')).toBe('/settings.html');
    expect(resolveAppUrl('./validation/valid.html#users', '/validation/valid.html'))
      .toBe('/validation/valid.html#users');
  });

  test('preserves a GitHub Pages repository base path', () => {
    const path = '/projeto-simulados-certificacao-aws/validation/valid.html';

    expect(getAppBasePath(path)).toBe('/projeto-simulados-certificacao-aws');
    expect(resolveAppUrl('validation/valid.html', path))
      .toBe('/projeto-simulados-certificacao-aws/validation/valid.html');
    expect(resolveAppUrl('validation/valid.html#users', path))
      .toBe('/projeto-simulados-certificacao-aws/validation/valid.html#users');
    expect(resolveAppUrl('validation/users.html', path))
      .toBe('/projeto-simulados-certificacao-aws/validation/users.html');
    expect(resolveAppUrl('validation/history.html', path))
      .toBe('/projeto-simulados-certificacao-aws/validation/history.html');
    expect(resolveAppUrl('profile.html', path))
      .toBe('/projeto-simulados-certificacao-aws/profile.html');
    expect(resolveAppUrl('settings.html', path))
      .toBe('/projeto-simulados-certificacao-aws/settings.html');
  });
});
