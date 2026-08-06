import { useNavigate } from 'react-router-dom';
import { FaBolt, FaCalendarCheck, FaPlay, FaDiagramProject, FaLayerGroup, FaBookOpenReader } from 'react-icons/fa6';
import { FeatureCard } from '@/components/common/Card';
import './dashboard.css';

const studyCards = [
  {
    icon: FaBolt,
    title: 'Estudar Agora',
    description: 'Sessão de estudo focada com timer Pomodoro',
    route: '/study-now',
  },
  {
    icon: FaCalendarCheck,
    title: 'Sprint de Estudos',
    description: 'Plano de 14 dias para certificação',
    route: '/study-sprint',
  },
];

const practiceCards = [
  {
    icon: FaPlay,
    title: 'Simulados',
    description: 'Questões no estilo do exame real AWS',
    route: '/simulados',
  },
  {
    icon: FaDiagramProject,
    title: 'Cases AWS',
    description: 'Cenários arquiteturais para praticar',
    route: '/cases',
  },
];

const resourceCards = [
  {
    icon: FaLayerGroup,
    title: 'Serviços AWS',
    description: 'Catálogo de serviços e suas funções',
    route: '/recursos',
  },
  {
    icon: FaBookOpenReader,
    title: 'Materiais',
    description: 'Guias, cheat sheets e referências',
    route: '/recursos',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <div className="dashboard__welcome">
        <p className="dashboard__welcome-tag">Cloud Academy A3</p>
        <h1 className="dashboard__welcome-title">Sua jornada AWS começa aqui</h1>
        <p className="dashboard__welcome-subtitle">Escolha por onde deseja começar hoje</p>
      </div>

      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Estudar</h2>
        <div className="dashboard__grid">
          {studyCards.map(({ icon: Icon, title, description, route }) => (
            <FeatureCard
              key={route + title}
              icon={<Icon />}
              title={title}
              description={description}
              onClick={() => navigate(route)}
            />
          ))}
        </div>
      </section>

      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Prática</h2>
        <div className="dashboard__grid">
          {practiceCards.map(({ icon: Icon, title, description, route }) => (
            <FeatureCard
              key={route + title}
              icon={<Icon />}
              title={title}
              description={description}
              onClick={() => navigate(route)}
            />
          ))}
        </div>
      </section>

      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Recursos</h2>
        <div className="dashboard__grid">
          {resourceCards.map(({ icon: Icon, title, description, route }) => (
            <FeatureCard
              key={route + title}
              icon={<Icon />}
              title={title}
              description={description}
              onClick={() => navigate(route)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
