import { EmptyState } from '@/components/common/EmptyState';
import './study-sprint.css';

export default function StudySprint() {
  return (
    <div className="study-sprint">
      <div className="study-sprint__header">
        <h1 className="study-sprint__title">Sprint de Estudos</h1>
        <p className="study-sprint__subtitle">Plano de 14 dias para certificação AWS</p>
      </div>
      <EmptyState
        icon="??"
        title="Em construção"
        description="A sprint de estudos estará disponível em breve."
      />
    </div>
  );
}
