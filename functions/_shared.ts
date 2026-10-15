export interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  /** Administradores legados; novos colaboradores autenticam com password_hash em staff_profiles no D1. */
  ADMIN_USERS?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET: string;
  RESEND_API_KEY?: string;
  MFA_FROM?: string;
}

export type AdminUser = { email: string; password: string };
export type StaffProfile = { name: string; role: string; email: string; phone: string };
type StaffRecord = { email: string; full_name: string; role: string; phone: string; active: number; password_hash: string | null };

export function adminUsers(env: Env): AdminUser[] {
  if (env.ADMIN_USERS) {
    try {
      const parsed: unknown = JSON.parse(env.ADMIN_USERS);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item): item is AdminUser => typeof item?.email === 'string' && typeof item?.password === 'string' && item.email.trim() !== '' && item.password !== '')
        .map(item => ({ email: item.email.toLowerCase().trim(), password: item.password }));
    } catch { return []; }
  }
  return env.ADMIN_EMAIL && env.ADMIN_PASSWORD ? [{ email: env.ADMIN_EMAIL.toLowerCase().trim(), password: env.ADMIN_PASSWORD }] : [];
}

export const statusLabels: Record<string, string> = {
  novo: 'Novo', analise: 'Em análise', entrevista: 'Entrevista',
  aguardando: 'Decisão de contratação', aprovado: 'Aprovado', reprovado: 'Reprovado'
};

export const json = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

export const fail = (message: string, status = 400) => json({ error: message }, status);

export const configured = (env: Env) => Boolean(env.DB && env.DOCUMENTS && env.SESSION_SECRET?.length >= 32);

export const emailDeliveryConfigured = (env: Env) => Boolean(env.RESEND_API_KEY?.trim() && env.MFA_FROM?.trim());

export const isPrimaryHost = (request: Request) => {
  const host = new URL(request.url).hostname.toLowerCase();
  return host === 'jpcredenciamentos.com.br' || host === 'localhost' || host === '127.0.0.1';
};

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return Boolean(origin && origin === new URL(request.url).origin && isPrimaryHost(request));
}

const encoder = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const unb64 = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), char => char.charCodeAt(0));
};

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function equalSecret(left: string, right: string) {
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(left)), crypto.subtle.digest('SHA-256', encoder.encode(right))]);
  return equal(new Uint8Array(a), new Uint8Array(b));
}

export async function sessionCookie(env: Env, request: Request, email: string) {
  const payload = b64(encoder.encode(JSON.stringify({ exp: Date.now() + 60 * 60 * 1000, email, nonce: crypto.randomUUID() })));
  const token = `${payload}.${b64(await hmac(env.SESSION_SECRET, payload))}`;
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `jp_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${secure}`;
}

export async function staffRecord(env: Env, email: string): Promise<StaffRecord | null> {
  return env.DB.prepare(`SELECT email, full_name, role, phone, active, password_hash
    FROM staff_profiles WHERE email = ? COLLATE NOCASE`).bind(email).first<StaffRecord>();
}

export async function staffProfile(env: Env, email: string): Promise<StaffProfile> {
  const record = await staffRecord(env, email);
  if (record) return {
    name: record.full_name,
    role: record.role || 'Colaborador',
    email: record.email,
    phone: record.phone || ''
  };
  const localPart = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const name = localPart.replace(/(^|\s)([a-z])/gi, (_match, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
  return { name: name || email, role: 'Colaborador', email, phone: '' };
}

export async function verifyStaffPassword(env: Env, email: string, password: string): Promise<boolean> {
  const profile = await staffRecord(env, email);
  if (profile?.password_hash) {
    if (profile.active !== 1) return false;
    return verifyPasswordHash(password, profile.password_hash);
  }
  const results = await Promise.all(adminUsers(env).map(async user => {
    const [emailMatches, passwordMatches] = await Promise.all([equalSecret(email, user.email), equalSecret(password, user.password)]);
    return emailMatches && passwordMatches;
  }));
  return results.includes(true) && await staffIsActive(env, email);
}

async function verifyPasswordHash(password: string, encoded: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, hashText, extra] = encoded.split('$');
  const iterations = Number(iterationsText);
  if (algorithm !== 'pbkdf2-sha256' || extra !== undefined || !Number.isInteger(iterations)
    || iterations < 100_000 || iterations > 600_000 || !saltText || !hashText) return false;
  try {
    const salt = Uint8Array.from(atob(saltText.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(saltText.length / 4) * 4, '=')), c => c.charCodeAt(0));
    const expected = Uint8Array.from(atob(hashText.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(hashText.length / 4) * 4, '=')), c => c.charCodeAt(0));
    if (salt.length !== 16 || expected.length !== 32) return false;
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256));
    return equal(derived, expected);
  } catch { return false; }
}

export async function staffIsActive(env: Env, email: string): Promise<boolean> {
  const record = await staffRecord(env, email);
  return !record || record.active === 1;
}

export async function emailCodeHash(env: Env, challengeId: string, email: string, code: string) {
  return b64(await hmac(env.SESSION_SECRET, `mfa-email-v1|${challengeId}|${email}|${code}`));
}

export function maskedEmail(email: string) {
  const [local, domain] = email.split('@');
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, Math.min(8, local.length - visible.length)))}@${domain}`;
}

export async function sessionEmail(env: Env, request: Request): Promise<string | null> {
  if (!configured(env) || !isPrimaryHost(request)) return null;
  const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)jp_session=([^;]+)/)?.[1];
  if (!cookie) return null;
  const [payload, signature, extra] = cookie.split('.');
  if (!payload || !signature || extra || payload.length > 256 || signature.length > 100) return null;
  try {
    if (!equal(unb64(signature), await hmac(env.SESSION_SECRET, payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(unb64(payload)));
    if (!Number.isFinite(data.exp) || data.exp <= Date.now() || data.exp >= Date.now() + 60 * 60 * 1000 + 60000
      || typeof data.email !== 'string' || !validEmail(data.email) || !await staffIsActive(env, data.email)) return null;
    return data.email.toLowerCase().trim();
  } catch { return null; }
}

export async function authorized(env: Env, request: Request): Promise<boolean> {
  return Boolean(await sessionEmail(env, request));
}

export async function limitRequest(env: Env, request: Request, scope: string, maximum: number, windowMs: number, identity?: string) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const subject = identity ? `identity:${identity.toLowerCase()}` : `ip:${ip}`;
  const key = `${scope}:${b64(await hmac(env.SESSION_SECRET, subject))}`;
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO request_limits (key, window_start, attempts) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN window_start < ? THEN 1 ELSE attempts + 1 END,
    window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END`)
    .bind(key, now, now - windowMs, now - windowMs).run();
  const row = await env.DB.prepare('SELECT attempts FROM request_limits WHERE key = ?').bind(key).first<{ attempts: number }>();
  return (row?.attempts || 0) <= maximum;
}

export const str = (value: string | File | null, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function readJson(request: Request) {
  if (!request.headers.get('Content-Type')?.includes('application/json')) return null;
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}
