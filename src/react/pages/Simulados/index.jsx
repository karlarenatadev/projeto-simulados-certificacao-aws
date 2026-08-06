import { EmptyState } from '@/components/common/EmptyState';
import './simulados.css';

export default function Simulados() {
  return (
    <div className="simulados">
      <div className="simulados__header">
        <h1 className="simulados__title">Simulados</h1>
        <p className="simulados__subtitle">Questões no estilo do exame real AWS</p>
      </div>
      <EmptyState
        icon="??"
        title="Em construção"
        description="O simulador está sendo migrado para a nova arquitetura. Use o frontend atual enquanto isso."
      />
    </div>
  );
}
