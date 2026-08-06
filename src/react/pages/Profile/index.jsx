import { FaUser } from 'react-icons/fa6';
import { EmptyState } from '@/components/common/EmptyState';
import './profile.css';

export default function Profile() {
  return (
    <div className="profile">
      <header className="profile__header">
        <h1 className="profile__title">Meu Perfil</h1>
        <p className="profile__subtitle">Configurações da conta e preferências</p>
      </header>
      
      <main className="profile__content">
        <EmptyState 
          icon={<FaUser />}
          title="Em construção"
          description="As configurações do perfil estarão disponíveis em breve."
        />
      </main>
    </div>
  );
}
