import '../src/frontend/js/utils/validationSessionBridge.js';

describe('Validation session bridge', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('usa cloudacademy_session.user como fonte oficial', () => {
    localStorage.setItem('cloudacademy_session', JSON.stringify({
      user: {
        id: 'validator-1',
        email: 'validator@a3data.com.br',
        role: 'validator',
        name: 'Validator',
      },
    }));

    const user = window.CloudAcademyValidationSession.sync();

    expect(user).toMatchObject({ id: 'validator-1', role: 'VALIDATOR' });
    expect(JSON.parse(localStorage.getItem('cloudacademy_user'))).toMatchObject({
      id: 'validator-1',
      role: 'VALIDATOR',
    });
  });

  test('não transforma role adulterada no localStorage em autorização backend', () => {
    localStorage.setItem('cloudacademy_session', JSON.stringify({
      user: { id: 'student-1', role: 'student' },
    }));
    localStorage.setItem('cloudacademy_user', JSON.stringify({
      id: 'student-1', role: 'ADMIN',
    }));

    const user = window.CloudAcademyValidationSession.sync();

    expect(user.role).toBe('STUDENT');
    expect(JSON.parse(localStorage.getItem('cloudacademy_user')).role).toBe('STUDENT');
  });

  test('mantém fallback legado somente quando não há sessão oficial', () => {
    localStorage.setItem('cloudacademy_user', JSON.stringify({
      id: 'legacy-validator', role: 'VALIDATOR',
    }));

    expect(window.CloudAcademyValidationSession.sync()).toMatchObject({
      id: 'legacy-validator',
      role: 'VALIDATOR',
    });
  });
});
