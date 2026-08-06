import { FaBookOpenReader, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { RESOURCES } from '@/services/resourcesData';
import './resources.css';

export default function Resources() {
  return (
    <div className="resources">
      <div className="resources__header">
        <h1 className="resources__title">
          <FaBookOpenReader />
          Materiais de Estudo
        </h1>
        <p className="resources__subtitle">
          Explore essa curadoria de links oficiais da AWS e de comunidades externas para aprofundar seus conhecimentos.
        </p>
      </div>
      <div className="resources__grid">
        {RESOURCES.map((category) => (
          <div key={category.id} className="resource-category">
            <h3 className="resource-category__title">{category.category}</h3>
            <ul className="resource-category__list">
              {category.links.map((link, index) => (
                <li key={index}>
                  <a
                    className="resource-link"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaArrowUpRightFromSquare className="resource-link__icon" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
