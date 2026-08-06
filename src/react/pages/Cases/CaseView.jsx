import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaEye, FaEyeSlash } from 'react-icons/fa6';
import { useState, useEffect } from 'react';
import { fetchCases, markCompleted } from '@/services/casesService';
import './cases.css';

export default function CaseView() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const cases = await fetchCases();
      const found = cases.find(c => c.id === id);
      setCaseData(found);
      if (found && found.completed) setCompleted(true);
      setIsLoading(false);
    }
    load();
  }, [id]);

  if (isLoading) return <div className="cases-loading">Carregando...</div>;
  if (!caseData) return <div className="cases-loading">Caso não encontrado.</div>;

  const handleComplete = () => {
    markCompleted(caseData.id);
    setCompleted(true);
  };

  return (
    <div className="case-view">
      <div className="case-view__nav">
        <Link to="/cases" className="case-view__back">
          <FaArrowLeft /> Voltar para Cases
        </Link>
      </div>

      <div className="case-view__content">
        <div className="case-view__header">
          <h1 className="case-view__title">{caseData.title}</h1>
          <div className="case-view__meta">
            {caseData.certifications?.map(cert => <span key={cert} className="cert-tag">{cert}</span>)}
            {completed && <span className="difficulty--beginner"><FaCheck /> Concluído</span>}
          </div>
        </div>

        <section className="case-view__section">
          <h2>Cenário</h2>
          <p className="case-view__text">{caseData.scenario}</p>
        </section>

        {caseData.requirements && (
          <section className="case-view__section">
            <h2>Requisitos</h2>
            <ul className="case-view__list">
              {caseData.requirements.map((req, i) => <li key={i}>{req}</li>)}
            </ul>
          </section>
        )}

        <div className="case-view__solution-box">
          <button 
            className="case-view__toggle" 
            onClick={() => setShowSolution(s => !s)}
          >
            {showSolution ? <FaEyeSlash /> : <FaEye />}
            {showSolution ? 'Ocultar Solução' : 'Ver Solução Recomendada'}
          </button>
          
          {showSolution && (
            <div className="case-view__solution-content">
              <h3>Arquitetura Proposta</h3>
              <p>{caseData.solution?.description || 'Utilize os serviços recomendados para arquitetar a solução otimizada.'}</p>
              
              <h4>Serviços Utilizados:</h4>
              <div className="case-card__services">
                {caseData.services?.map(srv => <span key={srv} className="service-tag">{srv}</span>)}
              </div>

              {!completed && (
                <button className="case-view__complete-btn" onClick={handleComplete}>
                  <FaCheck /> Marcar como Concluído
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
