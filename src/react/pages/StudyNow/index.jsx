import { FaBolt } from 'react-icons/fa6';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import './study-now.css';

export default function StudyNow() {
  return (
    <div className="study-now">
      <div className="study-now__header">
        <h1 className="study-now__title">
          <FaBolt style={{ color: 'var(--color-warning)', marginRight: 'var(--spacing-xs)' }} />
          Estudar Agora
        </h1>
        <p className="study-now__subtitle">Sessão de estudo focada com Pomodoro</p>
      </div>
      <EmptyState 
        icon="⚡" 
        title="Em construção" 
        description="A página de estudo focado será migrada em breve. Use o frontend atual enquanto isso."
        action={<Button variant="outline" onClick={() => window.location.href = '/'}>Abrir versão atual</Button>}
      />
    </div>
  );
}
