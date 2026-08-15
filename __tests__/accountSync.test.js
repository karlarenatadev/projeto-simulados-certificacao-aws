import { describe, expect, jest, test } from '@jest/globals';
import { createDataRepository } from '../src/frontend/js/dataRepository.js';

const CERTIFICATIONS = ['clf-c02', 'saa-c03', 'dva-c02', 'aif-c01'];

function createStorage(localStates = {}) {
  const applied = [];
  return {
    applied,
    getAccountModuleState: jest.fn((module, certification) =>
      localStates[`${module}:${certification}`] || null),
    setAccountModuleState: jest.fn((module, certification, state) => {
      applied.push({ module, certification, state });
      return true;
    }),
    saveSprintState: jest.fn(() => true),
  };
}

describe('account state synchronization policy', () => {
  test('server state wins over an older local cache', async () => {
    const storage = createStorage({ 'sprint:clf-c02': { currentDay: 2 } });
    const api = {
      getMyProfile: jest.fn(async () => ({ success: true, data: {} })),
      getModuleState: jest.fn(async (module, certification) => (
        module === 'sprint' && certification === 'clf-c02'
          ? { success: true, data: { state_json: { currentDay: 4 } } }
          : { success: true, data: null }
      )),
      saveModuleState: jest.fn(),
    };

    await createDataRepository(storage, api).hydrateAccountState();

    expect(storage.setAccountModuleState).toHaveBeenCalledWith(
      'sprint',
      'clf-c02',
      { currentDay: 4 },
    );
    expect(api.saveModuleState).not.toHaveBeenCalledWith(
      'sprint',
      'clf-c02',
      { currentDay: 2 },
    );
  });

  test('migrates valid local state when the account has no server state', async () => {
    const localState = { completedStages: ['1'], currentDay: 1 };
    const storage = createStorage({ 'sprint:saa-c03': localState });
    const api = {
      getMyProfile: jest.fn(async () => ({ success: true, data: {} })),
      getModuleState: jest.fn(async () => ({ success: true, data: null })),
      saveModuleState: jest.fn(async () => ({ success: true })),
    };

    await createDataRepository(storage, api).hydrateAccountState();

    expect(api.saveModuleState).toHaveBeenCalledWith('sprint', 'saa-c03', localState);
    expect(api.saveModuleState.mock.calls.filter((call) => call[0] === 'sprint')).toHaveLength(1);
    expect(CERTIFICATIONS).toContain('saa-c03');
  });
});
