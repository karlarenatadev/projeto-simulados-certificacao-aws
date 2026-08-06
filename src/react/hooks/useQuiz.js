import { useReducer, useCallback } from 'react';
import { api } from '@/services/api';

const initialState = {
  status: 'idle', // idle | running | finished
  mode: 'exam',
  quizId: null,
  questions: [],
  answers: [],
  currentIndex: 0,
  score: null,
};

function quizReducer(state, action) {
  switch (action.type) {
    case 'START':
      return {
        ...initialState,
        status: 'running',
        mode: action.payload.mode,
        quizId: action.payload.quizId,
        questions: action.payload.questions,
      };
    case 'ANSWER':
      const currentQ = state.questions[state.currentIndex];
      const isCorrect = action.payload.optionId === currentQ.answer;
      const newAnswers = [
        ...state.answers, 
        { questionId: currentQ.id, domain: currentQ.domain, optionId: action.payload.optionId, isCorrect }
      ];
      return { ...state, answers: newAnswers };
    case 'NEXT':
      return { ...state, currentIndex: state.currentIndex + 1 };
    case 'FINISH':
      return { ...state, status: 'finished', score: action.payload.score };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  const startQuiz = useCallback(async (userId, certification, num_questions, mode) => {
    try {
      const res = await api.post('/quiz/start', { user_id: userId, certification, num_questions });
      dispatch({ 
        type: 'START', 
        payload: { 
          mode, 
          quizId: res.data.quiz_id, 
          questions: res.data.questions 
        } 
      });
      return true;
    } catch (err) {
      console.error('Erro ao iniciar simulado:', err);
      return false;
    }
  }, []);

  const answerQuestion = useCallback(async (optionId) => {
    if (!state.quizId) return;
    const currentQ = state.questions[state.currentIndex];
    
    // Otimista no frontend
    dispatch({ type: 'ANSWER', payload: { optionId } });
    
    try {
      await api.post(`/quiz/${state.quizId}/answer`, {
        question_id: currentQ.id,
        selected_option: optionId
      });
    } catch (err) {
      console.error('Erro ao registrar resposta:', err);
    }
  }, [state.quizId, state.currentIndex, state.questions]);

  const nextQuestion = useCallback(() => dispatch({ type: 'NEXT' }), []);

  const finishQuiz = useCallback(async () => {
    if (!state.quizId) return;
    try {
      const res = await api.get(`/quiz/${state.quizId}/results`);
      const { score_percentage, passed, total_questions, correct_answers } = res.data.data || res.data;
      
      const { scoreByDomain } = await import('@/services/quizEngine');
      const domains = scoreByDomain(state.answers);

      const score = {
        total: total_questions,
        correct: correct_answers,
        percentage: score_percentage,
        passed: passed,
        domains: domains
      };
      dispatch({ type: 'FINISH', payload: { score } });
    } catch (err) {
      console.error('Erro ao buscar resultados finais:', err);
      dispatch({ type: 'FINISH', payload: { score: { total: 0, correct: 0, percentage: 0, passed: false, domains: [] } } });
    }
  }, [state.quizId]);

  const resetQuiz = useCallback(() => dispatch({ type: 'RESET' }), []);

  const currentQuestion = state.questions[state.currentIndex];
  const isLastQuestion = state.questions.length > 0 && state.currentIndex === state.questions.length - 1;
  const hasAnsweredCurrent = state.answers.some(a => a.questionId === currentQuestion?.id);

  return {
    ...state,
    currentQuestion,
    isLastQuestion,
    hasAnsweredCurrent,
    startQuiz,
    answerQuestion,
    nextQuestion,
    finishQuiz,
    resetQuiz,
  };
}
