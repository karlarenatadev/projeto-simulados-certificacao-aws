import { Link } from 'react-router-dom';
import './not-found.css';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1 className="not-found__code">404</h1>
      <h2 className="not-found__title">Página não encontrada</h2>
      <p className="not-found__description">A página que você buscou não existe ou foi movida.</p>
      <Link to="/" className="not-found__link">? Voltar ao Hub</Link>
    </div>
  );
}
