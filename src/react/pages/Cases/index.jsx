import { useState } from 'react';
import { FaDiagramProject, FaArrowRight } from 'react-icons/fa6';
import { useCases } from '@/hooks/useCases';
import { DIFFICULTY_CONFIG } from '@/services/casesService';
import './cases.css';

export default function Cases() {
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterCert, setFilterCert] = useState('');
  
  const { cases, isLoading } = useCases({ 
    difficulty: filterDifficulty, 
    certification: filterCert 
  });

  return (
    <div className="cases">
      <div className="cases-hero">
        <span className="cases-hero__badge">
          <FaDiagramProject /> Prática Arquitetural
        </span>
        <h1 className="cases-hero__title">Cases AWS Reais</h1>
        <p className="cases-hero__subtitle">
          Cenários baseados em problemas reais de empresas para você aplicar seus conhecimentos em design de soluções na nuvem.
        </p>
        <div className="cases-loop">
          <span className="cases-loop__step">1. Leia o Cenário</span>
          <FaArrowRight className="cases-loop__arrow" />
          <span className="cases-loop__step">2. Projete a Solução</span>
          <FaArrowRight className="cases-loop__arrow" />
          <span className="cases-loop__step">3. Compare com a Referência</span>
        </div>
      </div>

      <div className="cases-filters">
        <select 
          className="cases-filter-select"
          value={filterDifficulty}
          onChange={e => setFilterDifficulty(e.target.value)}
        >
          <option value="">Todas as Dificuldades</option>
          <option value="beginner">Iniciante</option>
          <option value="intermediate">Intermediário</option>
          <option value="advanced">Avançado</option>
        </select>

        <select 
          className="cases-filter-select"
          value={filterCert}
          onChange={e => setFilterCert(e.target.value)}
        >
          <option value="">Todas as Certificações</option>
          <option value="CLF-C02">Cloud Practitioner (CLF-C02)</option>
          <option value="SAA-C03">Solutions Architect (SAA-C03)</option>
          <option value="DVA-C02">Developer Associate (DVA-C02)</option>
          <option value="AIF-C01">AI Practitioner (AIF-C01)</option>
        </select>

        <span className="cases-count">{cases.length} cases encontrados</span>
      </div>

      {isLoading ? (
        <div className="cases-loading">Carregando cases...</div>
      ) : (
        <div className="cases-grid">
          {cases.map(c => {
            const diff = DIFFICULTY_CONFIG[c.difficulty] || DIFFICULTY_CONFIG.intermediate;
            return (
              <a key={c.id} href={`/cases/${c.id}`} className="case-card">
                <div className="case-card__accent"></div>
                <div className="case-card__body">
                  <div className="case-card__header">
                    <h3 className="case-card__title">{c.title}</h3>
                    <span className={diff.className}>{diff.label}</span>
                  </div>
                  <p className="case-card__scenario">{c.scenario}</p>
                  <div className="case-card__footer">
                    <div className="case-card__certs">
                      {c.certifications?.map(cert => (
                        <span key={cert} className="cert-tag">{cert}</span>
                      ))}
                    </div>
                  </div>
                  <div className="case-card__services">
                    {c.services?.map(srv => (
                      <span key={srv} className="service-tag">{srv}</span>
                    ))}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
