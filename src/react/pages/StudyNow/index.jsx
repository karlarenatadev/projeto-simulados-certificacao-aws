import { EmptyState } from '@/components/common/EmptyState';
import './study-now.css';

export default function StudyNow() {
  return (
    <div className="study-now">
      <div className="study-now__header">
        <h1 className="study-now__title">Estudar Agora</h1>
        <p className="study-now__subtitle">Sessão de estudo focada com Pomodoro</p>
      </div>
      <EmptyState
        icon="?"
        title="Em construção"
        description="A página de estudo focado será migrada em breve. Use o frontend atual enquanto isso."
        linkLabel="Abrir versão atual"
        linkTo="/"
      />
    </div>
  );
}
