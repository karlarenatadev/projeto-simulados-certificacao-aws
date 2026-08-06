import { useNavigate } from 'react-router-dom';
import { 
  FaBrain, 
  FaRoute, 
  FaStethoscope, 
  FaLayerGroup, 
  FaChevronRight, 
  FaPlay, 
  FaBookOpenReader 
} from 'react-icons/fa6';
import './dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      {/* Banner */}
      <div className="lh-banner">
        <p className="lh-banner-tag">SIMULADOR IA</p>
        <h2 className="lh-banner-title">Comece por aqui</h2>
        <p className="lh-banner-desc">
          Seu painel central de estudos: acompanhe seu progresso, veja insights de IA, acesse simulados e muito mais — tudo em um só lugar.
        </p>
        <div className="lh-banner-actions">
          <button className="lh-banner-btn" onClick={() => navigate('/simulados')}>
            <FaBrain /> Simulador
          </button>
          <button className="lh-banner-btn lh-banner-btn--outline" onClick={() => navigate('/jornada')}>
            <FaRoute /> Minha Jornada
          </button>
          <button className="lh-banner-btn lh-banner-btn--outline" onClick={() => navigate('/diagnostico')}>
            <FaStethoscope /> Diagnóstico
          </button>
        </div>
      </div>

      {/* DASHBOARD DA JORNADA INJETADO NO HUB */}
      <div className="jornada-dashboard-grid">
        <div className="stat-card">
          <p className="stat-card-label">Progresso</p>
          <p className="stat-card-value text-brand-primary">12%</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Taxa Acerto</p>
          <p className="stat-card-value text-success">68%</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Questões</p>
          <p className="stat-card-value text-brand-sky">42</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Ponto Fraco</p>
          <p className="stat-card-value text-danger text-lg">Security</p>
        </div>
      </div>

      {/* Grade principal: indicadores + o que encontrar */}
      <div className="lh-panel">
        <p className="lh-section-label">O QUE VOCÊ VAI ENCONTRAR</p>
        
        <button className="lh-feature-item" onClick={() => navigate('/jornada')}>
          <span className="lh-feature-icon lh-feat-purple">
            <FaRoute />
          </span>
          <div className="lh-feature-info">
            <p className="lh-feature-name">Trilha de Jornada</p>
            <p className="lh-feature-desc">Progresso gamificado por módulos, fases e conquistas desbloqueáveis</p>
          </div>
          <FaChevronRight className="lh-feature-arrow" />
        </button>

        <button className="lh-feature-item" onClick={() => navigate('/diagnostico')}>
          <span className="lh-feature-icon lh-feat-cyan">
            <FaStethoscope />
          </span>
          <div className="lh-feature-info">
            <p className="lh-feature-name">Raio-X de Domínios</p>
            <p className="lh-feature-desc">Diagnóstico por área: veja onde você está forte e onde precisa evoluir</p>
          </div>
          <FaChevronRight className="lh-feature-arrow" />
        </button>

        <button className="lh-feature-item" onClick={() => navigate('/simulados')}>
          <span className="lh-feature-icon lh-feat-green">
            <FaPlay />
          </span>
          <div className="lh-feature-info">
            <p className="lh-feature-name">Simulados Oficiais</p>
            <p className="lh-feature-desc">Questões elaboradas para simular o ambiente de prova real</p>
          </div>
          <FaChevronRight className="lh-feature-arrow" />
        </button>
        
        <button className="lh-feature-item" onClick={() => navigate('/cases')}>
          <span className="lh-feature-icon lh-feat-orange">
            <FaLayerGroup />
          </span>
          <div className="lh-feature-info">
            <p className="lh-feature-name">Cases de Arquitetura</p>
            <p className="lh-feature-desc">Estude com cenários arquiteturais baseados no Well-Architected Framework</p>
          </div>
          <FaChevronRight className="lh-feature-arrow" />
        </button>

        <button className="lh-feature-item" onClick={() => navigate('/recursos')}>
          <span className="lh-feature-icon lh-feat-blue">
            <FaBookOpenReader />
          </span>
          <div className="lh-feature-info">
            <p className="lh-feature-name">Materiais e Recursos</p>
            <p className="lh-feature-desc">Documentações da AWS, whitepapers e guias práticos</p>
          </div>
          <FaChevronRight className="lh-feature-arrow" />
        </button>
      </div>

    </div>
  );
}
