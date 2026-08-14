describe('Validation API guard', () => {
  test('converte indisponibilidade de rede em mensagem explícita', async () => {
    window.ValidationAPI = {
      fetchPendingQuestions: async () => {
        throw new TypeError('Failed to fetch');
      },
      validateQuestion: async () => {
        throw new TypeError('Failed to fetch');
      },
    };

    await import(`../src/frontend/js/utils/validationApiGuard.js?offline-test-${Date.now()}`);

    await expect(window.ValidationAPI.fetchPendingQuestions()).rejects.toThrow(
      'Painel de validação requer conexão com a API.',
    );
    await expect(window.ValidationAPI.validateQuestion()).rejects.toThrow(
      'Painel de validação requer conexão com a API.',
    );
  });

  test('preserva erros HTTP para que a UI mostre o status correto', async () => {
    window.ValidationAPI = {
      fetchPendingQuestions: async () => {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      },
    };

    await import(`../src/frontend/js/utils/validationApiGuard.js?http-test-${Date.now()}`);

    await expect(window.ValidationAPI.fetchPendingQuestions()).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    });
  });
});
