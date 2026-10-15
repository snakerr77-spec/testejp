import { Icons } from '../icons';
import type { CandidateType, UserProfile } from '../types';
import type { ThemeMode } from './Sidebar';
import ApplicationLinks from './ApplicationLinks';

export default function Settings({ profile, theme, onThemeChange, onLogout, onPublicApplication }: {
  profile: UserProfile;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onLogout: () => void;
  onPublicApplication: (type: CandidateType) => void;
}) {
  const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map(item => item[0]).join('').toUpperCase() || 'CO';

  return (
    <section className="settings-page">
      <div className="settings-grid">
        <article className="module-panel profile-summary">
          <span className="profile-big-avatar">{initials}</span>
          <h2>{profile.name}</h2>
          <p>{profile.role}</p>
          <small>Perfil de colaborador</small>
          <button className="button button-ghost logout-settings" onClick={onLogout}>Sair do portal</button>
        </article>

        <article className="module-panel profile-form-card">
          <div className="module-panel-heading"><div><small>PERFIL</small><h2>Dados do colaborador</h2></div></div>
          <div className="profile-form">
            <label>Nome completo<strong>{profile.name}</strong></label>
            <label>Cargo / função<strong>{profile.role}</strong></label>
            <label>E-mail<strong>{profile.email}</strong></label>
            <label>Telefone<strong>{profile.phone || 'Não informado'}</strong></label>
            <p className="profile-source-note">Esses dados vêm do cadastro de colaboradores no D1.</p>
          </div>
        </article>
      </div>

      <ApplicationLinks onOpen={onPublicApplication} compact/>

      <article className="module-panel appearance-card">
        <div className="module-panel-heading">
          <div><small>APARÊNCIA</small><h2>Tema da interface</h2></div>
          <span>Aplicado em todos os módulos administrativos</span>
        </div>
        <div className="appearance-options">
          <button className={`appearance-option ${theme === 'light' ? 'selected' : ''}`} type="button" onClick={() => onThemeChange('light')}>
            <span className="appearance-preview light-preview"><span /><span /><span /></span>
            <span className="appearance-option-copy"><span className="appearance-icon"><Icons.Sun size={17} /></span><span><strong>Modo claro</strong><small>Visual limpo e luminoso</small></span></span>
            <span className="appearance-radio" />
          </button>
          <button className={`appearance-option ${theme === 'dark' ? 'selected' : ''}`} type="button" onClick={() => onThemeChange('dark')}>
            <span className="appearance-preview dark-preview"><span /><span /><span /></span>
            <span className="appearance-option-copy"><span className="appearance-icon"><Icons.Moon size={17} /></span><span><strong>Modo escuro</strong><small>Reduz brilho e mantém o contraste</small></span></span>
            <span className="appearance-radio" />
          </button>
        </div>
      </article>
    </section>
  );
}
