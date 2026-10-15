import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import ApplicationPage from './components/ApplicationPage';
import { api } from './api';
import type { CandidateType, UserProfile } from './types';

type Route = 'login' | 'dashboard' | 'application-medico' | 'application-colaborador';

function routeFromHash(): Route {
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('/candidatura/medico')) return 'application-medico';
  if (hash.includes('/candidatura/colaborador')) return 'application-colaborador';
  if (hash.includes('dashboard')) return 'dashboard';
  return 'login';
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash());
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    api.session().then(result => {
      setProfile(result.profile);
      setAuthenticated(result.authenticated);
    }).catch(() => { setProfile(null); setAuthenticated(false); });
  }, []);

  useEffect(() => {
    const sync = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const go = (next: Route) => {
    const hash = next === 'dashboard'
      ? '#/dashboard/candidatos'
      : next === 'application-medico'
        ? '#/candidatura/medico'
        : next === 'application-colaborador'
          ? '#/candidatura/colaborador'
          : '#/login';
    if (window.location.hash === hash) setRoute(next);
    else window.location.hash = hash;
  };

  const openPublicApplication = (type: CandidateType) => {
    const hash = type === 'medico' ? '#/candidatura/medico' : '#/candidatura/colaborador';
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (route === 'application-medico' || route === 'application-colaborador') {
    const profileType: CandidateType = route === 'application-medico' ? 'medico' : 'colaborador';
    return <ApplicationPage profileType={profileType}/>;
  }

  if (authenticated === null) return <div className="portal-loading">Carregando portal J&amp;P…</div>;

  if (route === 'dashboard' && authenticated && profile) {
    return <Dashboard profile={profile} onLogout={() => { setAuthenticated(false); setProfile(null); go('login'); }} onPublicApplication={openPublicApplication}/>;
  }

  return <LoginPage onLogin={nextProfile => { setProfile(nextProfile); setAuthenticated(true); go('dashboard'); }}/>
}
