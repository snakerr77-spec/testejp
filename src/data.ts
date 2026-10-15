import type { CandidateStatus } from './types';

export const PROFILE_KEY = 'jpRecruitUserProfile_v1';
export const SIDEBAR_KEY = 'jpSidebarCollapsed_v1';
export const THEME_KEY = 'jpThemeMode_v1';

export const statusMap: Record<CandidateStatus, { label: string; className: string }> = {
  novo: { label: 'Novo', className: 'status-new' },
  analise: { label: 'Em análise', className: 'status-review' },
  entrevista: { label: 'Entrevista', className: 'status-interview' },
  aguardando: { label: 'Decisão de contratação', className: 'status-waiting' },
  aprovado: { label: 'Aprovado', className: 'status-approved' },
  reprovado: { label: 'Reprovado', className: 'status-rejected' }
};
