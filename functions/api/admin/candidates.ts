import { authorized, fail, json, readJson, sameOrigin, statusLabels, validEmail, type Env } from '../../_shared';

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!await authorized(env, request)) return fail('Acesso restrito.', 401);
  if (!sameOrigin(request)) return fail('Origem inválida.', 403);
  const body = await readJson(request);
  if (!body) return fail('Dados inválidos.');
  const name = String(body.name || '').trim().slice(0, 160);
  const email = String(body.email || '').trim().slice(0, 254);
  const status = String(body.status || 'novo');
  if (name.length < 3 || !validEmail(email) || !statusLabels[status]) return fail('Informe nome, e-mail e status válidos.');
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const profileType = body.profileType === 'colaborador' ? 'colaborador' : 'medico';
  const candidate = {
    id, profileType, name, initials: name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join(''),
    email, status, statusLabel: statusLabels[status], createdAt: new Date().toISOString(),
    specialty: String(body.specialty || '').slice(0, 120), city: String(body.city || '').slice(0, 120),
    crm: String(body.crm || '').slice(0, 80), rqe: String(body.rqe || '').slice(0, 80),
    phone: String(body.phone || '').slice(0, 32), experience: String(body.experience || '').slice(0, 160),
    availability: String(body.availability || '').slice(0, 200), notes: String(body.notes || '').slice(0, 1000),
    curriculum: Array.isArray(body.curriculum) ? body.curriculum.slice(0, 5).map(value => String(value).slice(0, 500)) : [], documents: []
  };
  await env.DB.prepare('INSERT INTO candidates (id, profile_type, status, created_at, payload) VALUES (?, ?, ?, ?, ?)')
    .bind(id, profileType, status, candidate.createdAt, JSON.stringify(candidate)).run();
  return json({ candidate }, 201);
};
