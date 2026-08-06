import { lazy, Suspense } from 'react';
import '@/styles/components/page-loader.css';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const StudyNow = lazy(() => import('@/pages/StudyNow'));
const StudySprint = lazy(() => import('@/pages/StudySprint'));
const Cases = lazy(() => import('@/pages/Cases'));
const CaseView = lazy(() => import('@/pages/Cases/CaseView'));
const Resources = lazy(() => import('@/pages/Resources'));
const Simulados = lazy(() => import('@/pages/Simulados'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Login = lazy(() => import('@/pages/Login'));
const Jornada = lazy(() => import('@/pages/Jornada'));
const Diagnostico = lazy(() => import('@/pages/Diagnostico'));
const Profile = lazy(() => import('@/pages/Profile'));

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Carregando pǭgina...">
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

function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: withSuspense(Login),
    },
    {
      path: '/',
      element: <ProtectedLayout />,
      children: [
        { index: true, element: withSuspense(Dashboard) },
        { path: 'study-now', element: withSuspense(StudyNow) },
        { path: 'study-sprint', element: withSuspense(StudySprint) },
        { path: 'cases', element: withSuspense(Cases) },
        { path: 'cases/:id', element: withSuspense(CaseView) },
        { path: 'recursos', element: withSuspense(Resources) },
        { path: 'simulados', element: withSuspense(Simulados) },
        { path: 'jornada', element: withSuspense(Jornada) },
        { path: 'diagnostico', element: withSuspense(Diagnostico) },
        { path: 'profile', element: withSuspense(Profile) },
        { path: '*', element: withSuspense(NotFound) },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL ?? '/',
  },
);
