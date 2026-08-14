/** @jest-environment node */

import { describe, expect, test } from '@jest/globals';
import {
  getBootstrapUsers,
  parseBootstrapEmails,
} from '../scripts/seed/seed-users.mjs';

describe('bootstrap role configuration', () => {
  test('normalizes and deduplicates configured emails', () => {
    expect(parseBootstrapEmails(' Admin@Example.com, admin@example.com, invalid ')).toEqual([
      'admin@example.com',
    ]);
  });

  test('supports multiple admins and validators, with ADMIN taking precedence', () => {
    const users = getBootstrapUsers({
      adminEmails: 'admin1@example.com, admin2@example.com, shared@example.com',
      validatorEmails: 'validator@example.com, shared@example.com',
    });

    expect(users).toEqual([
      expect.objectContaining({ email: 'admin1@example.com', role: 'ADMIN' }),
      expect.objectContaining({ email: 'admin2@example.com', role: 'ADMIN' }),
      expect.objectContaining({ email: 'shared@example.com', role: 'ADMIN' }),
      expect.objectContaining({ email: 'validator@example.com', role: 'VALIDATOR' }),
    ]);
  });

  test('does not invent a privileged user when configuration is absent', () => {
    expect(getBootstrapUsers({ adminEmails: '', validatorEmails: '' })).toEqual([]);
  });
});
