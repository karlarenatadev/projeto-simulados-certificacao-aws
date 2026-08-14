/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from '@jest/globals';
import { PermissionService, Roles } from '../src/frontend/js/services/permissions.js';

describe('Validation role contract', () => {
  test('uses the three official role values at the frontend boundary', () => {
    expect(Roles).toEqual({ STUDENT: 'student', VALIDATOR: 'validator', ADMIN: 'admin' });
    expect(PermissionService.normalizeRole('STUDENT')).toBe(Roles.STUDENT);
    expect(PermissionService.normalizeRole('VALIDATOR')).toBe(Roles.VALIDATOR);
    expect(PermissionService.normalizeRole('ADMIN')).toBe(Roles.ADMIN);
  });

  test('only Validator and Admin can access Validation', () => {
    expect(PermissionService.canAccessValidation({ role: 'student' })).toBe(false);
    expect(PermissionService.canAccessValidation({ role: 'validator' })).toBe(true);
    expect(PermissionService.canAccessValidation({ role: 'admin' })).toBe(true);
  });
});
