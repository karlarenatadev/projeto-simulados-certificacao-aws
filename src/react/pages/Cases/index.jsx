import { EmptyState } from '@/components/common/EmptyState';
import './cases.css';

export default function Cases() {
  return (
    <div className="cases">
      <div className="cases__header">
        <h1 className="cases__title">Cases AWS</h1>
        <p className="cases__subtitle">Cenários arquiteturais para praticar decisões de design</p>
      </div>
      <EmptyState
        icon="???"
        title="Em construção"
        description="Os cases arquiteturais serão migrados em breve."
      />
    </div>
  );
}
