import {
  configured,
  emailCodeHash,
  emailDeliveryConfigured,
  equalSecret,
  fail,
  isPrimaryHost,
  json,
  limitRequest,
  maskedEmail,
  readJson,
  sameOrigin,
  sessionCookie,
  sessionEmail,
  staffIsActive,
  staffProfile,
  verifyStaffPassword,
  validEmail,
  type Env
} from '../_shared';

const MFA_LIFETIME_MS = 10 * 60 * 1000;
const MFA_MAX_ATTEMPTS = 5;

function generateCode() {
  const range = 0x1_0000_0000;
  const limit = range - range % 1_000_000;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return String(value[0] % 1_000_000).padStart(6, '0');
}

async function sendMfaEmail(env: Env, email: string, code: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MFA_FROM,
      to: [email],
      subject: 'Código de acesso ao Portal J&P',
      text: `Seu código de acesso é ${code}. Ele expira em 10 minutos e só pode ser usado uma vez. Se você não solicitou este código, ignore esta mensagem.`,
      html: `<div style="font-family:Arial,sans-serif;color:#17233a;max-width:520px;margin:auto"><p>Seu código para entrar no Portal J&amp;P:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${code}</p><p>Ele expira em 10 minutos e só pode ser usado uma vez.</p><p>Se você não solicitou este código, ignore esta mensagem.</p></div>`
    })
  });
  return response.ok;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const email = await sessionEmail(env, request);
  if (!email) return json({ authenticated: false, profile: null });
  return json({ authenticated: true, profile: await staffProfile(env, email) });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!configured(env)) return fail('Portal ainda não configurado no Cloudflare.', 503);
  if (!sameOrigin(request)) return fail('Origem inválida.', 403);
  if (Number(request.headers.get('Content-Length') || 0) > 4096) return fail('Solicitação inválida.', 413);
  const body = await readJson(request);
  const action = String(body?.action || '');

  if (action === 'request-mfa') {
    if (!emailDeliveryConfigured(env)) return fail('Envio do MFA ainda não está configurado.', 503);
    const email = String(body?.email || '').toLowerCase().trim();
    const password = String(body?.password || '');
    if (!validEmail(email) || password.length < 1 || password.length > 256) return fail('E-mail ou senha inválidos.', 401);
    const [ipAllowed, emailAllowed] = await Promise.all([
      limitRequest(env, request, 'login-ip', 8, 15 * 60 * 1000),
      limitRequest(env, request, 'login-email', 8, 15 * 60 * 1000, email)
    ]);
    if (!ipAllowed || !emailAllowed) return fail('Muitas tentativas. Aguarde 15 minutos.', 429);

    const credentialsValid = await verifyStaffPassword(env, email, password);
    if (!credentialsValid || !await staffIsActive(env, email)) return fail('E-mail ou senha inválidos.', 401);

    const now = Date.now();
    const challengeId = crypto.randomUUID();
    const code = generateCode();
    const codeHash = await emailCodeHash(env, challengeId, email, code);
    await env.DB.prepare('DELETE FROM mfa_challenges WHERE expires_at <= ? OR (consumed_at IS NOT NULL AND consumed_at <= ?)')
      .bind(now, now - 24 * 60 * 60 * 1000).run();
    await env.DB.prepare('UPDATE mfa_challenges SET consumed_at = ? WHERE email = ? COLLATE NOCASE AND consumed_at IS NULL')
      .bind(now, email).run();
    await env.DB.prepare(`INSERT INTO mfa_challenges (id, email, code_hash, created_at, expires_at, attempts, consumed_at)
      VALUES (?, ?, ?, ?, ?, 0, NULL)`)
      .bind(challengeId, email, codeHash, now, now + MFA_LIFETIME_MS).run();

    let emailSent = false;
    try { emailSent = await sendMfaEmail(env, email, code); } catch { emailSent = false; }
    if (!emailSent) {
      await env.DB.prepare('UPDATE mfa_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL')
        .bind(Date.now(), challengeId).run();
      return fail('Não foi possível enviar o código. Tente novamente mais tarde.', 502);
    }
    return json({ mfaRequired: true, challengeId, maskedEmail: maskedEmail(email) });
  }

  if (action === 'verify-mfa') {
    const challengeId = String(body?.challengeId || '');
    const code = String(body?.code || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) return fail('Código inválido ou expirado.', 401);
    const [ipAllowed, challengeAllowed] = await Promise.all([
      limitRequest(env, request, 'mfa-verify-ip', 20, 15 * 60 * 1000),
      limitRequest(env, request, 'mfa-verify-challenge', MFA_MAX_ATTEMPTS, 15 * 60 * 1000, challengeId)
    ]);
    if (!ipAllowed || !challengeAllowed) return fail('Código inválido ou expirado.', 429);

    const now = Date.now();
    const challenge = await env.DB.prepare(`SELECT id, email, code_hash, expires_at, attempts, consumed_at
      FROM mfa_challenges WHERE id = ?`).bind(challengeId).first<{
        id: string; email: string; code_hash: string; expires_at: number; attempts: number; consumed_at: number | null
      }>();
    if (!challenge || challenge.consumed_at !== null || challenge.expires_at <= now || challenge.attempts >= MFA_MAX_ATTEMPTS) {
      return fail('Código inválido ou expirado.', 401);
    }

    const expectedHash = await emailCodeHash(env, challenge.id, challenge.email, code);
    if (!await equalSecret(expectedHash, challenge.code_hash)) {
      await env.DB.prepare(`UPDATE mfa_challenges SET attempts = attempts + 1
        WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ?`)
        .bind(challengeId, now, MFA_MAX_ATTEMPTS).run();
      return fail('Código inválido ou expirado.', 401);
    }

    if (!await staffIsActive(env, challenge.email)) return fail('Código inválido ou expirado.', 401);
    const consumed = await env.DB.prepare(`UPDATE mfa_challenges SET consumed_at = ?
      WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ?`)
      .bind(now, challengeId, now, MFA_MAX_ATTEMPTS).run();
    if (consumed.meta.changes !== 1) return fail('Código inválido ou expirado.', 401);

    const email = challenge.email.toLowerCase().trim();
    const response = json({ authenticated: true, profile: await staffProfile(env, email) });
    response.headers.set('Set-Cookie', await sessionCookie(env, request, email));
    return response;
  }

  return fail('Solicitação inválida.');
};

export const onRequestDelete: PagesFunction<Env> = async ({ request }) => {
  if (!sameOrigin(request) || !isPrimaryHost(request)) return fail('Origem inválida.', 403);
  const response = json({ authenticated: false, profile: null });
  response.headers.set('Set-Cookie', `jp_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
  return response;
};
