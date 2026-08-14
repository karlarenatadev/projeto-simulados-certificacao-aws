import {
    getCurrentLanguage,
    normalizeLanguage,
    setCurrentLanguage,
} from '../src/frontend/js/core/languageManager.js';
import { SessionManager } from '../src/frontend/js/core/sessionManager.js';

describe('LanguageManager - contrato único de idioma', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('usa pt como idioma padrão sem sessão ou preferência legada', () => {
        expect(getCurrentLanguage()).toBe('pt');
    });

    test.each([
        ['pt', 'pt'],
        ['PT-BR', 'pt'],
        ['en', 'en'],
        ['en-US', 'en'],
        ['invalid', null],
    ])('normaliza %s para %s', (input, expected) => {
        expect(normalizeLanguage(input)).toBe(expected);
    });

    test('prioriza idioma oficial da sessão sobre preferências legadas', () => {
        SessionManager.persist({
            user: {
                id: 'user-1',
                email: 'user@a3data.com.br',
                language: 'en',
                role: 'ADMIN',
                certification: 'saa-c03',
            },
        });
        localStorage.setItem('language', 'pt');
        localStorage.setItem('aws_sim_lang', 'pt');

        expect(getCurrentLanguage()).toBe('en');
    });

    test('migra valor legado válido para a sessão oficial', () => {
        SessionManager.persist({
            user: {
                id: 'user-2',
                email: 'user@a3data.com.br',
                role: 'STUDENT',
                certification: 'clf-c02',
            },
        });
        localStorage.setItem('language', 'en-US');

        expect(getCurrentLanguage()).toBe('en');
        expect(JSON.parse(localStorage.getItem('cloudacademy_session')).user.language).toBe('en');
    });

    test('migra aws_sim_lang quando language é inválido', () => {
        SessionManager.persist({
            user: {
                id: 'user-3',
                email: 'user@a3data.com.br',
                language: 'unknown',
                role: 'VALIDATOR',
                certification: 'dva-c02',
            },
        });
        localStorage.setItem('language', 'invalid');
        localStorage.setItem('aws_sim_lang', 'pt-BR');

        expect(getCurrentLanguage()).toBe('pt');
        expect(JSON.parse(localStorage.getItem('cloudacademy_session')).user.language).toBe('pt');
    });

    test.each([['pt', 'en'], ['en', 'pt']])('troca %s para %s preservando sessão', (from, to) => {
        SessionManager.persist({
            user: {
                id: 'user-4',
                email: 'user@a3data.com.br',
                language: from,
                role: 'VALIDATOR',
                certification: 'aif-c01',
                progress: { completedStages: ['aif-1'] },
            },
        });

        expect(setCurrentLanguage(to)).toBe(to);
        const session = SessionManager.restore();
        expect(session.user.language).toBe(to);
        expect(session.user.role).toBe('VALIDATOR');
        expect(session.user.certification).toBe('aif-c01');
        expect(session.user.progress).toEqual({ completedStages: ['aif-1'] });
    });

    test('persiste idioma localmente sem sessão e mantém chaves legadas consistentes', () => {
        localStorage.setItem('language', 'en');

        expect(setCurrentLanguage('pt')).toBe('pt');
        expect(getCurrentLanguage()).toBe('pt');
        expect(localStorage.getItem('language')).toBe('pt');
        expect(localStorage.getItem('aws_sim_lang')).toBe('pt');
    });

    test('valor inválido usa pt e não altera campos da sessão', () => {
        SessionManager.persist({
            user: {
                id: 'user-5',
                email: 'user@a3data.com.br',
                language: 'en',
                role: 'STUDENT',
                certification: 'clf-c02',
            },
        });

        expect(setCurrentLanguage('es')).toBe('pt');
        const session = SessionManager.restore();
        expect(session.user.language).toBe('pt');
        expect(session.user.id).toBe('user-5');
        expect(session.user.role).toBe('STUDENT');
        expect(session.user.certification).toBe('clf-c02');
    });
});
