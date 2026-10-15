import { authorized, fail, type Env } from '../../../_shared';

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail('Acesso restrito.', 401);
  const row = await env.DB.prepare('SELECT object_key, name FROM documents WHERE id = ?')
    .bind(String(params.id || '')).first<{ object_key: string; name: string }>();
  if (!row) return fail('Documento não encontrado.', 404);
  const object = await env.DOCUMENTS.get(row.object_key);
  if (!object) return fail('Documento indisponível.', 404);
  const filename = row.name.replace(/[\r\n"\\]/g, '').slice(0, 150);
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="documento"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox"
    }
  });
};
