import { FaStethoscope } from 'react-icons/fa6';
import { EmptyState } from '@/components/common/EmptyState';
import './diagnostico.css';

export default function Diagnostico() {
  return (
    <div className="diagnostico">
      <header className="diagnostico__header">
        <h1 className="diagnostico__title">Raio-X de Domínios</h1>
        <p className="diagnostico__subtitle">Diagnóstico por área: veja onde você está forte</p>
      </header>
      
      <main className="diagnostico__content">
        <EmptyState 
          icon={<FaStethoscope />}
          title="Em construção"
          description="O diagnóstico detalhado estará disponível em breve."
        />
      </main>
    </div>
  );
}
