import { authorized, fail, json, readJson, sameOrigin, type Env } from '../../../_shared';

export const onRequestPut: PagesFunction<Env> = async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail('Acesso restrito.', 401);
  if (!sameOrigin(request)) return fail('Origem inválida.', 403);
  const body = await readJson(request);
  const id = String(params.id || '');
  if (!body || body.id !== id || id.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(id) || !['medico', 'colaborador'].includes(String(body.audience)) || !['agendada', 'confirmada', 'reagendada', 'em_andamento', 'concluida', 'cancelada'].includes(String(body.status)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) || !/^\d{2}:\d{2}$/.test(String(body.time))) return fail('Entrevista inválida.');
  const payload = JSON.stringify(body);
  if (payload.length > 12000) return fail('Entrevista muito grande.');
  await env.DB.prepare('INSERT INTO interviews (id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload').bind(id, payload).run();
  return json({ interview: body });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail('Acesso restrito.', 401);
  if (!sameOrigin(request)) return fail('Origem inválida.', 403);
  await env.DB.prepare('DELETE FROM interviews WHERE id = ?').bind(String(params.id || '')).run();
  return json({ ok: true });
};
