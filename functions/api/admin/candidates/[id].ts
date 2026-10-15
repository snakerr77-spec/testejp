import { authorized, fail, json, readJson, sameOrigin, statusLabels, type Env } from '../../../_shared';

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail('Acesso restrito.', 401);
  if (!sameOrigin(request)) return fail('Origem inválida.', 403);
  const status = String((await readJson(request))?.status || '');
  if (!statusLabels[status]) return fail('Status inválido.');
  const id = Number(params.id);
  if (!Number.isSafeInteger(id)) return fail('Identificador inválido.');
  const row = await env.DB.prepare('SELECT payload FROM candidates WHERE id = ?').bind(id).first<{ payload: string }>();
  if (!row) return fail('Candidato não encontrado.', 404);
  const candidate = { ...JSON.parse(row.payload), status, statusLabel: statusLabels[status], statusUpdatedAt: new Date().toISOString() };
  await env.DB.prepare('UPDATE candidates SET status = ?, payload = ? WHERE id = ?').bind(status, JSON.stringify(candidate), id).run();
  return json({ candidate });
};

// Exclui o candidato por completo: arquivos no R2, documentos, entrevistas ligadas a ele e o cadastro.
export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail('Acesso restrito.', 401);
  if (!sameOrigin(request)) return fail('Origem inválida.', 403);
  const id = Number(params.id);
  if (!Number.isSafeInteger(id)) return fail('Identificador inválido.');
  const exists = await env.DB.prepare('SELECT id FROM candidates WHERE id = ?').bind(id).first();
  if (!exists) return fail('Candidato não encontrado.', 404);

  const files = await env.DB.prepare('SELECT object_key FROM documents WHERE candidate_id = ?').bind(id).all<{ object_key: string }>();
  const keys = files.results.map(row => row.object_key);
  // Arquivos primeiro: se o R2 falhar, o cadastro continua no banco e dá para tentar de novo.
  try {
    for (let start = 0; start < keys.length; start += 1000) await env.DOCUMENTS.delete(keys.slice(start, start + 1000));
  } catch (error) {
    console.error('candidates: falha ao apagar documentos do R2', { id, arquivos: keys.length, erro: error instanceof Error ? error.message : String(error) });
    return fail('Não foi possível apagar os documentos. O cadastro foi mantido; tente novamente.', 500);
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM documents WHERE candidate_id = ?').bind(id),
    env.DB.prepare("DELETE FROM interviews WHERE json_extract(payload, '$.candidateId') = ?").bind(id),
    env.DB.prepare('DELETE FROM candidates WHERE id = ?').bind(id)
  ]);
  return json({ ok: true, documents: keys.length });
};
