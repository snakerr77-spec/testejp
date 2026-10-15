import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileSearch2,
  LogOut,
  Link2,
  Moon,
  Search,
  Settings2,
  Stethoscope,
  Sun,
  UserRoundSearch,
  UsersRound,
  Workflow
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserProfile } from '../types';

export type ModuleKey = 'candidates' | 'applications' | 'reviews' | 'waiting' | 'approved' | 'processes' | 'interviews' | 'agenda' | 'reports' | 'settings';
export type ThemeMode = 'light' | 'dark';

type Props = {
  collapsed: boolean;
  active: ModuleKey;
  profile: UserProfile;
  theme: ThemeMode;
  onSelect: (key: ModuleKey) => void;
  onThemeToggle: () => void;
  onLogout: () => void;
};

type NavItem = { key: ModuleKey; label: string; short: string; icon: LucideIcon };

const recruitmentItems: NavItem[] = [
  { key: 'candidates', label: 'Candidatos', short: 'Candidatos', icon: UserRoundSearch },
  { key: 'applications', label: 'Links de candidatura', short: 'Links', icon: Link2 },
  { key: 'reviews', label: 'Currículos em avaliação', short: 'Currículos', icon: FileSearch2 },
  { key: 'processes', label: 'Processos', short: 'Processos', icon: Workflow },
  { key: 'interviews', label: 'Entrevistas', short: 'Entrevistas', icon: UsersRound },
  { key: 'waiting', label: 'Decisão de contratação', short: 'Decisão', icon: ClipboardCheck },
  { key: 'approved', label: 'Perfis aprovados', short: 'Aprovados', icon: BadgeCheck },
  { key: 'agenda', label: 'Agenda de entrevistas', short: 'Agenda', icon: CalendarDays }
];

const managementItems: NavItem[] = [
  { key: 'reports', label: 'Relatórios', short: 'Relatórios', icon: BarChart3 }
];

export default function Sidebar({ collapsed, active, profile, theme, onSelect, onThemeToggle, onLogout }: Props) {
  const [query, setQuery] = useState('');
  const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A';

  const filterItems = (items: NavItem[]) => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return items;
    return items.filter(item => `${item.label} ${item.short}`.toLocaleLowerCase('pt-BR').includes(normalized));
  };

  const filteredRecruitment = useMemo(() => filterItems(recruitmentItems), [query]);
  const filteredManagement = useMemo(() => filterItems(managementItems), [query]);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <button
        type="button"
        key={item.key}
        className={`sidebar-item ${active === item.key ? 'active' : ''}`}
        onClick={() => onSelect(item.key)}
        title={collapsed ? item.label : undefined}
      >
        <span className="sidebar-item-icon"><Icon size={18} strokeWidth={1.85} /></span>
        <span className="sidebar-label">{item.label}</span>
        <span className="sidebar-active-dot" aria-hidden="true" />
      </button>
    );
  };

  return (
    <aside className={`jp-sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Navegação principal">
      <div className="sidebar-brand-zone">
        <button className="sidebar-brand" type="button" onClick={() => onSelect('candidates')} title="J&P Serviços Médicos">
          <span className="sidebar-brand-symbol" aria-hidden="true" />
          <span className="sidebar-brand-copy">
            <strong>J&amp;P Serviços</strong>
            <small>Credenciamento</small>
          </span>
        </button>
      </div>

      <div className="sidebar-search" role="search">
        <Search size={15} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar módulo" aria-label="Buscar módulo" />
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-group">
          <span className="sidebar-group-label">RECRUTAMENTO</span>
          {filteredRecruitment.map(renderItem)}
        </div>
        <div className="sidebar-group">
          <span className="sidebar-group-label">GESTÃO</span>
          {filteredManagement.map(renderItem)}
        </div>
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-profile-section">
        <button className={`sidebar-item ${active === 'settings' ? 'active' : ''}`} type="button" onClick={() => onSelect('settings')} title={collapsed ? 'Configurações' : undefined}>
          <span className="sidebar-item-icon"><Settings2 size={18} strokeWidth={1.85}/></span>
          <span className="sidebar-label">Configurações</span>
          <span className="sidebar-active-dot" aria-hidden="true" />
        </button>
        <button className="sidebar-profile" type="button" onClick={() => onSelect('settings')} title={collapsed ? profile.name : undefined}>
          <span className="profile-avatar">{initials.slice(0, 1)}</span>
          <span className="profile-copy"><strong>{profile.name}</strong><small>{profile.email}</small></span>
          <span className="profile-online" aria-label="Online" />
        </button>
        <button className="sidebar-theme-toggle" type="button" onClick={onThemeToggle} aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
          <span className="sidebar-theme-icon">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</span>
          <span className="sidebar-theme-label">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          <span className={`theme-switch ${theme === 'dark' ? 'is-on' : ''}`} aria-hidden="true"><span /></span>
        </button>
        <button className="sidebar-logout" type="button" onClick={onLogout} title={collapsed ? 'Sair' : undefined}>
          <LogOut size={17} strokeWidth={1.85}/><span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
