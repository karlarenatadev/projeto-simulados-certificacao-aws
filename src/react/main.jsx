import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error(
    '[CloudAcademy] Elemento #root não encontrado. Verifique o index.html.',
  );
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
