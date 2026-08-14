import { describe, expect, test } from '@jest/globals';
import { createSessionToken, verifySessionToken } from '../backend/api/services/sessionToken.js';

describe('backend session credentials', () => {
  test('validates the signed subject and rejects tampering', () => {
    const token = createSessionToken('user-a', 1_000);
    expect(verifySessionToken(token, 1_001).sub).toBe('user-a');
    const [payload, signature] = token.split('.');
    expect(verifySessionToken(`${payload}x.${signature}`, 1_001)).toBeNull();
  });

  test('rejects expired credentials', () => {
    const token = createSessionToken('user-a', 1_000);
    expect(verifySessionToken(token, 1_000 + 8 * 60 * 60)).toBeNull();
  });
});
