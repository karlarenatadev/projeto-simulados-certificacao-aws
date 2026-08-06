import { FaRoute } from 'react-icons/fa6';
import { EmptyState } from '@/components/common/EmptyState';
import './jornada.css';

export default function Jornada() {
  return (
    <div className="jornada">
      <header className="jornada__header">
        <h1 className="jornada__title">Trilha de Jornada</h1>
        <p className="jornada__subtitle">Progresso gamificado por módulos e conquistas</p>
      </header>
      
      <main className="jornada__content">
        <EmptyState 
          icon={<FaRoute />}
          title="Em construção"
          description="A trilha de jornada estará disponível em breve."
        />
      </main>
    </div>
  );
}
