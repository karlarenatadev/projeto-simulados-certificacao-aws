import { lazy, Suspense } from 'react';
import '@/styles/components/page-loader.css';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';

// ── Lazy loading de páginas — cada página só é carregada quando acessada ──

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const StudyNow = lazy(() => import('@/pages/StudyNow'));
const StudySprint = lazy(() => import('@/pages/StudySprint'));
const Cases = lazy(() => import('@/pages/Cases'));
const CaseView = lazy(() => import('@/pages/Cases/CaseView'));
const Resources = lazy(() => import('@/pages/Resources'));
const Simulados = lazy(() => import('@/pages/Simulados'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// ── Fallback de carregamento ──────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Carregando página...">
      <span className="page-loader__icon" aria-hidden="true">☁️</span>
      <span>Carregando...</span>
    </div>
  );
}

function withSuspense(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// ── Definição de rotas ────────────────────────────────────────────────────

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: withSuspense(Dashboard) },
        { path: 'study-now', element: withSuspense(StudyNow) },
        { path: 'study-sprint', element: withSuspense(StudySprint) },
        { path: 'cases', element: withSuspense(Cases) },
        { path: 'cases/:id', element: withSuspense(CaseView) },
        { path: 'recursos', element: withSuspense(Resources) },
        { path: 'simulados', element: withSuspense(Simulados) },
        { path: '*', element: withSuspense(NotFound) },
      ],
    },
  ],
  {
    // Base para GitHub Pages — ajuste conforme o deploy
    basename: import.meta.env.BASE_URL ?? '/',
  },
);
