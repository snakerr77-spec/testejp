import type { Candidate, CandidateStatus, InterviewEvent, UserProfile } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Falha na comunicação (${response.status}).`);
  return body as T;
}

const jsonBody = (value: unknown) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });

export const api = {
  session: () => request<{ authenticated: boolean; profile: UserProfile | null }>('/api/session'),
  requestMfa: (email: string, password: string) => request<{ mfaRequired: true; challengeId: string; maskedEmail: string }>('/api/session', { method: 'POST', ...jsonBody({ action: 'request-mfa', email, password }) }),
  verifyMfa: (challengeId: string, code: string) => request<{ authenticated: true; profile: UserProfile }>('/api/session', { method: 'POST', ...jsonBody({ action: 'verify-mfa', challengeId, code }) }),
  logout: () => request<{ authenticated: boolean }>('/api/session', { method: 'DELETE' }),
  dashboard: () => request<{ candidates: Candidate[]; interviews: InterviewEvent[] }>('/api/admin/dashboard'),
  createCandidate: (candidate: Candidate) => request<{ candidate: Candidate }>('/api/admin/candidates', { method: 'POST', ...jsonBody(candidate) }),
  updateStatus: (id: number, status: CandidateStatus) => request<{ candidate: Candidate }>(`/api/admin/candidates/${id}`, { method: 'PATCH', ...jsonBody({ status }) }),
  deleteCandidate: (id: number) => request<{ ok: boolean; documents: number }>(`/api/admin/candidates/${id}`, { method: 'DELETE' }),
  saveInterview: (event: InterviewEvent) => request<{ interview: InterviewEvent }>(`/api/admin/interviews/${encodeURIComponent(event.id)}`, { method: 'PUT', ...jsonBody(event) }),
  deleteInterview: (id: string) => request<{ ok: boolean }>(`/api/admin/interviews/${encodeURIComponent(id)}`, { method: 'DELETE' })
};
