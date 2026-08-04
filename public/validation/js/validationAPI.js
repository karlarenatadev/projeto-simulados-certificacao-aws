// js/validation/validationAPI.js

const API_BASE_URL = window.VALIDATION_API_BASE_URL || 'http://localhost:3001';

function toOptionLabel(index) {
    return String.fromCharCode(65 + index);
}

function normalizeOption(option, index) {
    if (typeof option === 'string') {
        return {
            id: toOptionLabel(index),
            text: option
        };
    }

    if (!option || typeof option !== 'object') {
        return {
            id: toOptionLabel(index),
            text: ''
        };
    }

    return {
        id: option.id || option.key || option.label || toOptionLabel(index),
        text: option.text || option.value || option.label || ''
    };
}

function normalizeCorrectAnswer(correctAnswer) {
    const answers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

    return answers
        .filter(answer => answer !== null && answer !== undefined && answer !== '')
        .map(answer => {
            const numericAnswer = Number(answer);

            if (Number.isInteger(numericAnswer) && numericAnswer >= 0 && numericAnswer <= 25) {
                return toOptionLabel(numericAnswer);
            }

            return String(answer).toUpperCase();
        });
}

function normalizeQuestion(question) {
    return {
        ...question,
        options: Array.isArray(question.options)
            ? question.options.map(normalizeOption)
            : Object.entries(question.options || {}).map(([id, text]) => ({ id, text })),
        correct_answer: normalizeCorrectAnswer(question.correct_answer ?? question.correctAnswer ?? [])
    };
}

function normalizePendingResponse(response) {
    const questions = Array.isArray(response)
        ? response
        : response.data || response.questions || [];

    return {
        success: response.success !== false,
        data: questions.map(normalizeQuestion)
    };
}

window.VALIDATION_API_CONTRACT = {
    pending: {
        method: 'GET',
        path: '/api/questions/pending',
        rawResponse: {
            id: 'question-id',
            certification: 'CLF-C02',
            domain: 'Cloud Concepts',
            difficulty: 'easy',
            question_text: 'Question text',
            options: [
                'First answer',
                'Second answer'
            ],
            correct_answer: [0],
            explanation: 'Explanation text',
            validation_status: 'PENDING'
        },
        normalizedForUI: {
            id: 'question-id',
            certification: 'CLF-C02',
            domain: 'Cloud Concepts',
            difficulty: 'easy',
            question_text: 'Question text',
            options: [
                { id: 'A', text: 'First answer' },
                { id: 'B', text: 'Second answer' }
            ],
            correct_answer: ['A'],
            explanation: 'Explanation text',
            validation_status: 'PENDING'
        }
    },
    validate: {
        method: 'POST',
        path: '/api/questions/:id/validate',
        payload: {
            status: 'APPROVED | REJECTED',
            feedback: 'Optional reviewer feedback',
            rejection_reason: 'Required when status is REJECTED',
            validated_by: 'Validator name',
            validated_at: 'ISO timestamp'
        },
        response: {
            success: true,
            data: {
                id: 'question-id',
                validation_status: 'APPROVED | REJECTED',
                validated_by: 'Validator name',
                validated_at: 'ISO timestamp'
            }
        }
    }
};

async function fetchJSON(path, options = {}) {
    try {
        const { headers = {}, ...fetchOptions } = options;

        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...fetchOptions,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        });

        let body = null;
        try {
            body = await response.json();
        } catch {
            body = null;
        }

        if (!response.ok) {
            const message = body?.error || body?.message || `HTTP ${response.status}`;
            const error = new Error(message);
            error.status = response.status;
            error.details = body;
            throw error;
        }

        return body;
    } catch (error) {
        if (error.status) {
            throw error;
        }

        throw new Error(`Falha de comunicacao com a API de validacao: ${error.message}`);
    }
}

function normalizeValidationPayload(payload) {
    const status = String(payload.status || '').toUpperCase();
    const rejectionReason = payload.rejection_reason || payload.feedback || '';

    return {
        status,
        feedback: payload.feedback,
        rejection_reason: status === 'REJECTED' ? rejectionReason : null,
        correctionNeeded: payload.correctionNeeded || payload.correction_needed || false,
        validated_by: payload.validated_by,
        validated_at: payload.validated_at || new Date().toISOString()
    };
}

window.ValidationAPI = {
    isMockMode() {
        return false;
    },

    /**
     * Login corporativo via email @a3data.
     * POST /api/auth/login
     */
    async login(email) {
        return fetchJSON('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    async fetchPendingQuestions(userId) {
        try {
            const headers = userId ? { 'X-User-Id': userId } : {};
            const response = await fetchJSON('/api/questions/pending', { headers });
            return normalizePendingResponse(response);
        } catch (error) {
            throw new Error(`Nao foi possivel carregar questoes pendentes: ${error.message}`);
        }
    },

    async validateQuestion(id, payload, userId) {
        return this.submitValidation(id, payload, userId);
    },

    async submitValidation(id, payload, userId) {
        try {
            const headers = userId ? { 'X-User-Id': userId } : {};
            const normalizedPayload = normalizeValidationPayload(payload);
            return await fetchJSON(`/api/questions/${encodeURIComponent(id)}/validate`, {
                method: 'POST',
                body: JSON.stringify(normalizedPayload),
                headers
            });
        } catch (error) {
            throw new Error(`Nao foi possivel enviar a validacao: ${error.message}`);
        }
    }
};
