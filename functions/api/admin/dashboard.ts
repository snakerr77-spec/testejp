import { authorized, fail, json, type Env } from '../../_shared';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  if (!await authorized(env, request)) return fail('Acesso restrito.', 401);
  const [candidates, interviews] = await Promise.all([
    env.DB.prepare('SELECT payload FROM candidates ORDER BY created_at DESC LIMIT 1000').all<{ payload: string }>(),
    env.DB.prepare('SELECT payload FROM interviews LIMIT 1000').all<{ payload: string }>()
  ]);
  return json({ candidates: candidates.results.map(row => JSON.parse(row.payload)), interviews: interviews.results.map(row => JSON.parse(row.payload)) });
};
