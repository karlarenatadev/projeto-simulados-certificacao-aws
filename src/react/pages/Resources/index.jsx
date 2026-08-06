import { EmptyState } from '@/components/common/EmptyState';
import './resources.css';

export default function Resources() {
  return (
    <div className="resources">
      <div className="resources__header">
        <h1 className="resources__title">Recursos AWS</h1>
        <p className="resources__subtitle">Materiais de estudo, guias e referências</p>
      </div>
      <EmptyState
        icon="??"
        title="Em construção"
        description="Os recursos serão migrados em breve."
      />
    </div>
  );
}
