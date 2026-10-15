import { PROFILE_KEY, statusMap } from './data';
import type { Candidate, CandidateDocument, UserProfile } from './types';
import { formatPhoneBR } from './phone';

export const initialsFromName = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');

export const normalizeCandidate = (candidate: Partial<Candidate>): Candidate => {
  const status = candidate.status && statusMap[candidate.status] ? candidate.status : 'novo';
  const name = candidate.name || 'Candidato';
  return {
    id: candidate.id ?? Date.now(),
    profileType: candidate.profileType === 'colaborador' ? 'colaborador' : 'medico',
    name,
    initials: candidate.initials || initialsFromName(name),
    specialty: candidate.specialty || 'Não informado',
    city: candidate.city || 'Não informado',
    crm: candidate.crm || 'Não informado',
    rqe: candidate.rqe || 'Não informado',
    status,
    statusLabel: statusMap[status].label,
    email: candidate.email || '',
    phone: formatPhoneBR(candidate.phone || ''),
    experience: candidate.experience || 'Não informado',
    availability: candidate.availability || 'Não informado',
    contractType: candidate.contractType,
    company: candidate.company,
    createdAt: candidate.createdAt || new Date().toISOString(),
    statusUpdatedAt: candidate.statusUpdatedAt,
    notes: candidate.notes || '',
    curriculum: candidate.curriculum || [],
    documents: candidate.documents || []
  };
};

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function loadProfile(): UserProfile {
  const defaults: UserProfile = {
    name: 'Administrador',
    role: 'Equipe de recrutamento',
    email: 'administrativo@jepservicos.com.br',
    phone: ''
  };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') }; }
  catch { return defaults; }
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function openStoredDocument(meta: CandidateDocument) {
  const response = await fetch(`/api/admin/documents/${encodeURIComponent(meta.key)}`, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Documento indisponível');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = meta.name || 'documento';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
