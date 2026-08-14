import { PermissionService, Roles } from '../src/frontend/js/services/permissions.js';

describe('PermissionService', () => {
  test('normaliza as três roles oficiais nas bordas', () => {
    expect(PermissionService.normalizeRole('STUDENT')).toBe(Roles.STUDENT);
    expect(PermissionService.normalizeRole('validator')).toBe(Roles.VALIDATOR);
    expect(PermissionService.normalizeRole(' ADMIN ')).toBe(Roles.ADMIN);
  });

  test('Validation exige Validator ou Admin', () => {
    expect(PermissionService.canAccessValidation({ role: 'STUDENT' })).toBe(false);
    expect(PermissionService.canAccessValidation({ role: 'VALIDATOR' })).toBe(true);
    expect(PermissionService.canAccessValidation({ role: 'ADMIN' })).toBe(true);
    expect(PermissionService.canValidateQuestions({ role: 'VALIDATOR' })).toBe(true);
  });

  test('somente Admin pode excluir questões', () => {
    expect(PermissionService.canDeleteQuestion({ role: 'STUDENT' })).toBe(false);
    expect(PermissionService.canDeleteQuestion({ role: 'VALIDATOR' })).toBe(false);
    expect(PermissionService.canDeleteQuestion({ role: 'ADMIN' })).toBe(true);
  });
});
