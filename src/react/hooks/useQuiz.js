import { useReducer, useCallback } from 'react';
import { calculateScore, scoreByDomain } from '@/services/quizEngine';

const initialState = {
  status: 'idle', // idle | running | finished
  mode: 'exam',
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
        questions: action.payload.questions,
      };
    case 'ANSWER':
      const currentQ = state.questions[state.currentIndex];
      const isCorrect = action.payload.optionId === currentQ.correctAnswer;
      const newAnswers = [...state.answers, { questionId: currentQ.id, domain: currentQ.domain, optionId: action.payload.optionId, isCorrect }];
      return { ...state, answers: newAnswers };
    case 'NEXT':
      return { ...state, currentIndex: state.currentIndex + 1 };
    case 'FINISH':
      const score = calculateScore(state.answers);
      const domains = scoreByDomain(state.answers);
      return { ...state, status: 'finished', score: { ...score, domains } };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  const startQuiz = useCallback((questions, mode) => dispatch({ type: 'START', payload: { questions, mode } }), []);
  const answerQuestion = useCallback((optionId) => dispatch({ type: 'ANSWER', payload: { optionId } }), []);
  const nextQuestion = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const finishQuiz = useCallback(() => dispatch({ type: 'FINISH' }), []);
  const resetQuiz = useCallback(() => dispatch({ type: 'RESET' }), []);

  const currentQuestion = state.questions[state.currentIndex];
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
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
