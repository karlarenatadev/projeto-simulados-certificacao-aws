import { useState } from 'react';
import { FaCalendarCheck, FaCircleCheck, FaClock, FaRotateLeft } from 'react-icons/fa6';
import { useSprintProgress } from '@/hooks/useSprintProgress';
import { getSprintDays, CERTIFICATIONS } from '@/services/sprintService';
import './study-sprint.css';

export default function StudySprint() {
  const [certId, setCertId] = useState(CERTIFICATIONS[0].id);
  const { completedDays, toggleDay, resetSprint, percentComplete } = useSprintProgress(certId);
  
  const sprintDays = getSprintDays(certId);

  return (
    <div className="study-sprint">
      <div className="study-sprint__header">
        <h1 className="study-sprint__title">Sprint de Estudos</h1>
        <p className="study-sprint__subtitle">Plano de 14 dias para certificação AWS</p>
      </div>

      <div className="sprint-controls">
        <select 
          className="sprint-select" 
          value={certId} 
          onChange={(e) => setCertId(e.target.value)}
        >
          {CERTIFICATIONS.map(cert => (
            <option key={cert.id} value={cert.id}>{cert.label}</option>
          ))}
        </select>
        
        <button className="sprint-reset-btn" onClick={resetSprint}>
          <FaRotateLeft style={{ marginRight: '4px' }} />
          Reiniciar
        </button>
      </div>

      <div className="sprint-progress-bar">
        <div 
          className="sprint-progress-bar__fill" 
          style={{ width: `${percentComplete}%` }}
        ></div>
      </div>
      <p className="sprint-progress-label">
        {completedDays.length} de 14 dias concluídos
      </p>

      <div className="sprint-grid">
        {sprintDays.map((day) => {
          const isDone = completedDays.includes(day.day);
          return (
            <div 
              key={day.day}
              className={`sprint-day ${isDone ? 'sprint-day--done' : ''}`}
              onClick={() => toggleDay(day.day)}
            >
              <p className="sprint-day__number">Dia {day.day}</p>
              <h3 className="sprint-day__title">{day.title}</h3>
              <div className="sprint-day__meta">
                <FaClock /> {day.readTime}
                <span className="sprint-day__topic-badge">{day.topic}</span>
              </div>
              <p className="sprint-day__takeaway">{day.keyTakeaway}</p>
              
              {isDone && <FaCircleCheck className="sprint-day__check" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
