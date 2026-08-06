import { useState, useEffect } from 'react';
import { FaPlay, FaCheck, FaXmark, FaArrowRight, FaRotateLeft } from 'react-icons/fa6';
import { useQuiz } from '@/hooks/useQuiz';
import { fetchFilteredQuestions } from '@/services/questionService';
import { CERTIFICATIONS, QUIZ_MODES, QUESTION_COUNTS, pickRandom, hasPassed } from '@/services/quizEngine';
import './simulados.css';

export default function Simulados() {
  const quiz = useQuiz();
  const [cert, setCert] = useState(CERTIFICATIONS[0].id);
  const [mode, setMode] = useState(QUIZ_MODES[0].id);
  const [count, setCount] = useState(QUESTION_COUNTS[1]); // default 10
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showReview, setShowReview] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const allQuestions = await fetchFilteredQuestions({ certification: cert });
      const selectedQuestions = pickRandom(allQuestions, count);
      quiz.startQuiz(selectedQuestions, mode);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar questões');
    }
    setLoading(false);
  };

  const handleAnswer = () => {
    if (selectedOption === null) return;
    quiz.answerQuestion(selectedOption);
    if (quiz.mode === 'review') {
      setShowReview(true);
    } else {
      goNext();
    }
  };

  const goNext = () => {
    setShowReview(false);
    setSelectedOption(null);
    if (quiz.isLastQuestion) {
      quiz.finishQuiz();
    } else {
      quiz.nextQuestion();
    }
  };

  if (quiz.status === 'running' && quiz.currentQuestion) {
    const q = quiz.currentQuestion;
    const answered = quiz.hasAnsweredCurrent;
    return (
      <div className="simulados">
        <div className="quiz-room">
          <div className="quiz-room__header">
            <span className="quiz-room__progress">Questão {quiz.currentIndex + 1} de {quiz.questions.length}</span>
            {q.domain && <span className="quiz-room__domain">{q.domain}</span>}
          </div>
          
          <h2 className="quiz-room__question">{q.text}</h2>
          
          <div className="quiz-options">
            {q.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              let stateClass = '';
              if (answered && quiz.mode === 'review') {
                if (idx === q.answer) stateClass = 'quiz-option--correct';
                else if (isSelected) stateClass = 'quiz-option--incorrect';
              } else if (isSelected) {
                stateClass = 'quiz-option--selected';
              }

              return (
                <div 
                  key={idx} 
                  className={`quiz-option ${stateClass}`}
                  onClick={() => !answered && setSelectedOption(idx)}
                >
                  <span className="quiz-option__letter">{String.fromCharCode(65 + idx)}.</span>
                  <span className="quiz-option__text">{opt}</span>
                </div>
              );
            })}
          </div>

          {showReview && (
            <div className="quiz-explanation">
              <h4>Comentário da Questão:</h4>
              <p>{q.explanation || 'Nenhuma explicação disponível para esta questão.'}</p>
            </div>
          )}

          <div className="quiz-room__actions">
            {!answered ? (
              <button 
                className="quiz-btn" 
                onClick={handleAnswer}
                disabled={selectedOption === null}
              >
                Confirmar Resposta <FaCheck />
              </button>
            ) : (
              <button className="quiz-btn" onClick={goNext}>
                {quiz.isLastQuestion ? 'Finalizar Simulado' : 'Próxima Questão'} <FaArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (quiz.status === 'finished' && quiz.score) {
    const certConfig = CERTIFICATIONS.find(c => c.id === cert) || CERTIFICATIONS[0];
    const pass = hasPassed(quiz.score.percentage, certConfig.passingScore);
    
    return (
      <div className="simulados">
        <div className="quiz-results">
          <h2 className={`quiz-results__score ${pass ? 'quiz-results__score--pass' : 'quiz-results__score--fail'}`}>
            {quiz.score.percentage}%
          </h2>
          <p className="quiz-results__status">
            {pass ? 'Aprovado! Parabéns!' : 'Reprovado. Continue estudando!'}
          </p>
          <p>Você acertou {quiz.score.correct} de {quiz.score.total} questões.</p>
          
          <div className="quiz-results__domains">
            <h3>Performance por Domínio</h3>
            {quiz.score.domains.map(dom => {
              const domPass = hasPassed(dom.percentage, certConfig.passingScore);
              return (
                <div key={dom.name} className="quiz-domain">
                  <div className="quiz-domain__header">
                    <span>{dom.name}</span>
                    <span>{dom.percentage}%</span>
                  </div>
                  <div className="quiz-domain__bar">
                    <div 
                      className={`quiz-domain__fill ${domPass ? 'quiz-domain__fill--pass' : 'quiz-domain__fill--fail'}`}
                      style={{ width: `${dom.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button className="quiz-btn" onClick={quiz.resetQuiz}>
              <FaRotateLeft /> Novo Simulado
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="simulados">
      <div className="simulados__header">
        <h1 className="simulados__title">
          <FaPlay style={{ color: 'var(--color-brand-primary)' }} />
          Simulados AWS
        </h1>
        <p className="simulados__subtitle">Configure seu simulado para treinar com questões reais do exame.</p>
      </div>

      <div className="quiz-config">
        <div className="quiz-config__group">
          <label className="quiz-config__label">Certificação</label>
          <select className="quiz-config__select" value={cert} onChange={e => setCert(e.target.value)}>
            {CERTIFICATIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div className="quiz-config__group">
          <label className="quiz-config__label">Modo do Simulado</label>
          <select className="quiz-config__select" value={mode} onChange={e => setMode(e.target.value)}>
            {QUIZ_MODES.map(m => <option key={m.id} value={m.id}>{m.label} - {m.description}</option>)}
          </select>
        </div>

        <div className="quiz-config__group">
          <label className="quiz-config__label">Quantidade de Questões</label>
          <select className="quiz-config__select" value={count} onChange={e => setCount(Number(e.target.value))}>
            {QUESTION_COUNTS.map(c => <option key={c} value={c}>{c} questões</option>)}
          </select>
        </div>

        <div className="quiz-config__actions">
          <button className="quiz-config__btn" onClick={handleStart} disabled={loading}>
            {loading ? 'Carregando...' : 'Iniciar Simulado'}
          </button>
        </div>
      </div>
    </div>
  );
}
