var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _shared.ts
function adminUsers(env) {
  if (env.ADMIN_USERS) {
    try {
      const parsed = JSON.parse(env.ADMIN_USERS);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => typeof item?.email === "string" && typeof item?.password === "string" && item.email.trim() !== "" && item.password !== "").map((item) => ({ email: item.email.toLowerCase().trim(), password: item.password }));
    } catch {
      return [];
    }
  }
  return env.ADMIN_EMAIL && env.ADMIN_PASSWORD ? [{ email: env.ADMIN_EMAIL.toLowerCase().trim(), password: env.ADMIN_PASSWORD }] : [];
}
__name(adminUsers, "adminUsers");
var statusLabels = {
  novo: "Novo",
  analise: "Em an\xE1lise",
  entrevista: "Entrevista",
  aguardando: "Decis\xE3o de contrata\xE7\xE3o",
  aprovado: "Aprovado",
  reprovado: "Reprovado"
};
var json = /* @__PURE__ */ __name((value, status = 200) => Response.json(value, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
}), "json");
var fail = /* @__PURE__ */ __name((message, status = 400) => json({ error: message }, status), "fail");
var configured = /* @__PURE__ */ __name((env) => Boolean(env.DB && env.DOCUMENTS && env.SESSION_SECRET?.length >= 32), "configured");
var emailDeliveryConfigured = /* @__PURE__ */ __name((env) => Boolean(env.RESEND_API_KEY?.trim() && env.MFA_FROM?.trim()), "emailDeliveryConfigured");
var isPrimaryHost = /* @__PURE__ */ __name((request) => {
  const host = new URL(request.url).hostname.toLowerCase();
  return host === "jpcredenciamentos.com.br" || host === "localhost" || host === "127.0.0.1";
}, "isPrimaryHost");
function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && origin === new URL(request.url).origin && isPrimaryHost(request));
}
__name(sameOrigin, "sameOrigin");
var encoder = new TextEncoder();
var b64 = /* @__PURE__ */ __name((bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), "b64");
var unb64 = /* @__PURE__ */ __name((value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
}, "unb64");
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
__name(hmac, "hmac");
function equal(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
__name(equal, "equal");
async function equalSecret(left, right) {
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(left)), crypto.subtle.digest("SHA-256", encoder.encode(right))]);
  return equal(new Uint8Array(a), new Uint8Array(b));
}
__name(equalSecret, "equalSecret");
async function sessionCookie(env, request, email) {
  const payload = b64(encoder.encode(JSON.stringify({ exp: Date.now() + 60 * 60 * 1e3, email, nonce: crypto.randomUUID() })));
  const token = `${payload}.${b64(await hmac(env.SESSION_SECRET, payload))}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `jp_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${secure}`;
}
__name(sessionCookie, "sessionCookie");
async function staffRecord(env, email) {
  return env.DB.prepare(`SELECT email, full_name, role, phone, active, password_hash
    FROM staff_profiles WHERE email = ? COLLATE NOCASE`).bind(email).first();
}
__name(staffRecord, "staffRecord");
async function staffProfile(env, email) {
  const record = await staffRecord(env, email);
  if (record) return {
    name: record.full_name,
    role: record.role || "Colaborador",
    email: record.email,
    phone: record.phone || ""
  };
  const localPart = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  const name = localPart.replace(/(^|\s)([a-z])/gi, (_match, space, letter) => `${space}${letter.toUpperCase()}`);
  return { name: name || email, role: "Colaborador", email, phone: "" };
}
__name(staffProfile, "staffProfile");
async function verifyStaffPassword(env, email, password) {
  const profile = await staffRecord(env, email);
  if (profile?.password_hash) {
    if (profile.active !== 1) return false;
    return verifyPasswordHash(password, profile.password_hash);
  }
  const results = await Promise.all(adminUsers(env).map(async (user) => {
    const [emailMatches, passwordMatches] = await Promise.all([equalSecret(email, user.email), equalSecret(password, user.password)]);
    return emailMatches && passwordMatches;
  }));
  return results.includes(true) && await staffIsActive(env, email);
}
__name(verifyStaffPassword, "verifyStaffPassword");
async function verifyPasswordHash(password, encoded) {
  const [algorithm, iterationsText, saltText, hashText, extra] = encoded.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || extra !== void 0 || !Number.isInteger(iterations) || iterations < 1e5 || iterations > 6e5 || !saltText || !hashText) return false;
  try {
    const salt = Uint8Array.from(atob(saltText.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(saltText.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
    const expected = Uint8Array.from(atob(hashText.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(hashText.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
    if (salt.length !== 16 || expected.length !== 32) return false;
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256));
    return equal(derived, expected);
  } catch {
    return false;
  }
}
__name(verifyPasswordHash, "verifyPasswordHash");
async function staffIsActive(env, email) {
  const record = await staffRecord(env, email);
  return !record || record.active === 1;
}
__name(staffIsActive, "staffIsActive");
async function emailCodeHash(env, challengeId, email, code) {
  return b64(await hmac(env.SESSION_SECRET, `mfa-email-v1|${challengeId}|${email}|${code}`));
}
__name(emailCodeHash, "emailCodeHash");
function maskedEmail(email) {
  const [local, domain] = email.split("@");
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, Math.min(8, local.length - visible.length)))}@${domain}`;
}
__name(maskedEmail, "maskedEmail");
async function sessionEmail(env, request) {
  if (!configured(env) || !isPrimaryHost(request)) return null;
  const cookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)jp_session=([^;]+)/)?.[1];
  if (!cookie) return null;
  const [payload, signature, extra] = cookie.split(".");
  if (!payload || !signature || extra || payload.length > 256 || signature.length > 100) return null;
  try {
    if (!equal(unb64(signature), await hmac(env.SESSION_SECRET, payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(unb64(payload)));
    if (!Number.isFinite(data.exp) || data.exp <= Date.now() || data.exp >= Date.now() + 60 * 60 * 1e3 + 6e4 || typeof data.email !== "string" || !validEmail(data.email) || !await staffIsActive(env, data.email)) return null;
    return data.email.toLowerCase().trim();
  } catch {
    return null;
  }
}
__name(sessionEmail, "sessionEmail");
async function authorized(env, request) {
  return Boolean(await sessionEmail(env, request));
}
__name(authorized, "authorized");
async function limitRequest(env, request, scope, maximum, windowMs, identity) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const subject = identity ? `identity:${identity.toLowerCase()}` : `ip:${ip}`;
  const key = `${scope}:${b64(await hmac(env.SESSION_SECRET, subject))}`;
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO request_limits (key, window_start, attempts) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN window_start < ? THEN 1 ELSE attempts + 1 END,
    window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END`).bind(key, now, now - windowMs, now - windowMs).run();
  const row = await env.DB.prepare("SELECT attempts FROM request_limits WHERE key = ?").bind(key).first();
  return (row?.attempts || 0) <= maximum;
}
__name(limitRequest, "limitRequest");
var str = /* @__PURE__ */ __name((value, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "", "str");
var validEmail = /* @__PURE__ */ __name((email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "validEmail");
async function readJson(request) {
  if (!request.headers.get("Content-Type")?.includes("application/json")) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}
__name(readJson, "readJson");

// api/admin/candidates/[id].ts
var onRequestPatch = /* @__PURE__ */ __name(async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail("Acesso restrito.", 401);
  if (!sameOrigin(request)) return fail("Origem inv\xE1lida.", 403);
  const status = String((await readJson(request))?.status || "");
  if (!statusLabels[status]) return fail("Status inv\xE1lido.");
  const id = Number(params.id);
  if (!Number.isSafeInteger(id)) return fail("Identificador inv\xE1lido.");
  const row = await env.DB.prepare("SELECT payload FROM candidates WHERE id = ?").bind(id).first();
  if (!row) return fail("Candidato n\xE3o encontrado.", 404);
  const candidate = { ...JSON.parse(row.payload), status, statusLabel: statusLabels[status], statusUpdatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  await env.DB.prepare("UPDATE candidates SET status = ?, payload = ? WHERE id = ?").bind(status, JSON.stringify(candidate), id).run();
  return json({ candidate });
}, "onRequestPatch");
var onRequestDelete = /* @__PURE__ */ __name(async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail("Acesso restrito.", 401);
  if (!sameOrigin(request)) return fail("Origem inv\xE1lida.", 403);
  const id = Number(params.id);
  if (!Number.isSafeInteger(id)) return fail("Identificador inv\xE1lido.");
  const exists = await env.DB.prepare("SELECT id FROM candidates WHERE id = ?").bind(id).first();
  if (!exists) return fail("Candidato n\xE3o encontrado.", 404);
  const files = await env.DB.prepare("SELECT object_key FROM documents WHERE candidate_id = ?").bind(id).all();
  const keys = files.results.map((row) => row.object_key);
  try {
    for (let start = 0; start < keys.length; start += 1e3) await env.DOCUMENTS.delete(keys.slice(start, start + 1e3));
  } catch (error) {
    console.error("candidates: falha ao apagar documentos do R2", { id, arquivos: keys.length, erro: error instanceof Error ? error.message : String(error) });
    return fail("N\xE3o foi poss\xEDvel apagar os documentos. O cadastro foi mantido; tente novamente.", 500);
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM documents WHERE candidate_id = ?").bind(id),
    env.DB.prepare("DELETE FROM interviews WHERE json_extract(payload, '$.candidateId') = ?").bind(id),
    env.DB.prepare("DELETE FROM candidates WHERE id = ?").bind(id)
  ]);
  return json({ ok: true, documents: keys.length });
}, "onRequestDelete");

// api/admin/documents/[id].ts
var onRequestGet = /* @__PURE__ */ __name(async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail("Acesso restrito.", 401);
  const row = await env.DB.prepare("SELECT object_key, name FROM documents WHERE id = ?").bind(String(params.id || "")).first();
  if (!row) return fail("Documento n\xE3o encontrado.", 404);
  const object = await env.DOCUMENTS.get(row.object_key);
  if (!object) return fail("Documento indispon\xEDvel.", 404);
  const filename = row.name.replace(/[\r\n"\\]/g, "").slice(0, 150);
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="documento"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox"
    }
  });
}, "onRequestGet");

// api/admin/interviews/[id].ts
var onRequestPut = /* @__PURE__ */ __name(async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail("Acesso restrito.", 401);
  if (!sameOrigin(request)) return fail("Origem inv\xE1lida.", 403);
  const body = await readJson(request);
  const id = String(params.id || "");
  if (!body || body.id !== id || id.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(id) || !["medico", "colaborador"].includes(String(body.audience)) || !["agendada", "confirmada", "reagendada", "em_andamento", "concluida", "cancelada"].includes(String(body.status)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) || !/^\d{2}:\d{2}$/.test(String(body.time))) return fail("Entrevista inv\xE1lida.");
  const payload = JSON.stringify(body);
  if (payload.length > 12e3) return fail("Entrevista muito grande.");
  await env.DB.prepare("INSERT INTO interviews (id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload").bind(id, payload).run();
  return json({ interview: body });
}, "onRequestPut");
var onRequestDelete2 = /* @__PURE__ */ __name(async ({ env, request, params }) => {
  if (!await authorized(env, request)) return fail("Acesso restrito.", 401);
  if (!sameOrigin(request)) return fail("Origem inv\xE1lida.", 403);
  await env.DB.prepare("DELETE FROM interviews WHERE id = ?").bind(String(params.id || "")).run();
  return json({ ok: true });
}, "onRequestDelete");

// api/admin/candidates.ts
var onRequestPost = /* @__PURE__ */ __name(async ({ env, request }) => {
  if (!await authorized(env, request)) return fail("Acesso restrito.", 401);
  if (!sameOrigin(request)) return fail("Origem inv\xE1lida.", 403);
  const body = await readJson(request);
  if (!body) return fail("Dados inv\xE1lidos.");
  const name = String(body.name || "").trim().slice(0, 160);
  const email = String(body.email || "").trim().slice(0, 254);
  const status = String(body.status || "novo");
  if (name.length < 3 || !validEmail(email) || !statusLabels[status]) return fail("Informe nome, e-mail e status v\xE1lidos.");
  const id = Date.now() * 1e3 + Math.floor(Math.random() * 1e3);
  const profileType = body.profileType === "colaborador" ? "colaborador" : "medico";
  const candidate = {
    id,
    profileType,
    name,
    initials: name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join(""),
    email,
    status,
    statusLabel: statusLabels[status],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    specialty: String(body.specialty || "").slice(0, 120),
    city: String(body.city || "").slice(0, 120),
    crm: String(body.crm || "").slice(0, 80),
    rqe: String(body.rqe || "").slice(0, 80),
    phone: String(body.phone || "").slice(0, 32),
    experience: String(body.experience || "").slice(0, 160),
    availability: String(body.availability || "").slice(0, 200),
    notes: String(body.notes || "").slice(0, 1e3),
    curriculum: Array.isArray(body.curriculum) ? body.curriculum.slice(0, 5).map((value) => String(value).slice(0, 500)) : [],
    documents: []
  };
  await env.DB.prepare("INSERT INTO candidates (id, profile_type, status, created_at, payload) VALUES (?, ?, ?, ?, ?)").bind(id, profileType, status, candidate.createdAt, JSON.stringify(candidate)).run();
  return json({ candidate }, 201);
}, "onRequestPost");

// api/admin/dashboard.ts
var onRequestGet2 = /* @__PURE__ */ __name(async ({ env, request }) => {
  if (!await authorized(env, request)) return fail("Acesso restrito.", 401);
  const [candidates, interviews] = await Promise.all([
    env.DB.prepare("SELECT payload FROM candidates ORDER BY created_at DESC LIMIT 1000").all(),
    env.DB.prepare("SELECT payload FROM interviews LIMIT 1000").all()
  ]);
  return json({ candidates: candidates.results.map((row) => JSON.parse(row.payload)), interviews: interviews.results.map((row) => JSON.parse(row.payload)) });
}, "onRequestGet");

// api/applications.ts
var maxFileBytes = 10 * 1024 * 1024;
var requiredMedical = ["cv", "photoId", "residence", "crmCard", "diplomas", "practice", "clearance"];
var labels = {
  cv: "Curr\xEDculo profissional",
  photoId: "Documento com foto",
  residence: "Comprovante de resid\xEAncia",
  crmCard: "Carteirinha CRM",
  diplomas: "Diploma e certificados",
  practice: "Declara\xE7\xE3o de atua\xE7\xE3o na \xE1rea",
  clearance: "Certid\xE3o Negativa",
  companyCnpj: "Cart\xE3o CNPJ"
};
var extensions = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
function kind(file) {
  return file.slice(0, 1024).arrayBuffer().then((buffer) => {
    const b = new Uint8Array(buffer);
    if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
    if (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 && b[4] === 13 && b[5] === 10) return "image/png";
    for (let i = 0; i + 4 < b.length; i++) {
      if (b[i] === 37 && b[i + 1] === 80 && b[i + 2] === 68 && b[i + 3] === 70 && b[i + 4] === 45) return "application/pdf";
    }
    return "";
  });
}
__name(kind, "kind");
var onRequestPost2 = /* @__PURE__ */ __name(async ({ env, request }) => {
  if (!configured(env)) return fail("Cadastro indispon\xEDvel at\xE9 a configura\xE7\xE3o do Cloudflare.", 503);
  if (!sameOrigin(request)) return fail("Origem inv\xE1lida.", 403);
  if (!request.headers.get("Content-Type")?.includes("multipart/form-data")) return fail("Envie o formul\xE1rio com seus documentos.");
  if (Number(request.headers.get("Content-Length")) > 75 * 1024 * 1024) return fail("O envio excede 75 MB.", 413);
  if (!await limitRequest(env, request, "application", 30, 60 * 60 * 1e3)) return fail("Limite de envios atingido. Tente mais tarde.", 429);
  let form;
  try {
    form = await request.formData();
  } catch {
    return fail("N\xE3o foi poss\xEDvel ler os arquivos enviados.");
  }
  const profileType = str(form.get("profileType"));
  const isDoctor = profileType === "medico";
  if (!isDoctor && profileType !== "colaborador") return fail("Tipo de candidatura inv\xE1lido.");
  const name = str(form.get("name"), 160);
  const email = str(form.get("email"), 254).toLowerCase();
  const phone = str(form.get("phone"), 32);
  const specialty = str(form.get("specialty"), 120);
  const city = str(form.get("city"), 120);
  const crm = str(form.get("crm"), 80);
  const availability = str(form.get("availability"), 200);
  const contractType = str(form.get("contractType"), 20);
  if (name.length < 3 || !validEmail(email) || phone.replace(/\D/g, "").length < 10 || !specialty || !city || !availability || isDoctor && (!crm || !["Mutir\xE3o", "Fixo", "Plant\xF5es"].includes(contractType))) return fail("Preencha os campos obrigat\xF3rios de identifica\xE7\xE3o e atua\xE7\xE3o.");
  if (form.get("privacyAcknowledged") !== "yes") return fail("Leia e confirme o aviso de privacidade.");
  const fields = isDoctor ? [...requiredMedical, "companyCnpj"] : ["cv"];
  const files = [];
  for (const field of fields) {
    const selected = form.getAll(field).filter((value) => value instanceof File && value.size > 0);
    if ((isDoctor ? requiredMedical : ["cv"]).includes(field) && !selected.length) return fail(`Anexe ${labels[field]}.`);
    if (field !== "diplomas" && selected.length > 1) return fail(`Envie apenas um arquivo para ${labels[field]}.`);
    if (selected.length > 8) return fail("Envie no m\xE1ximo oito arquivos por campo.");
    for (const file of selected) {
      if (file.size > maxFileBytes) return fail(`${file.name} ultrapassa 10 MB.`);
      const mime = await kind(file);
      if (!mime) return fail(`Formato n\xE3o permitido: ${file.name}. Use PDF, JPG ou PNG.`);
      files.push({ field, file, mime });
    }
  }
  if (files.reduce((sum, item) => sum + item.file.size, 0) > 70 * 1024 * 1024) return fail("O total de arquivos deve ter at\xE9 70 MB.");
  const id = Date.now() * 1e3 + Math.floor(Math.random() * 1e3);
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const company = isDoctor ? {
    cnpj: str(form.get("companyCnpjNumber"), 30),
    bank: str(form.get("bank"), 100),
    accountHolder: str(form.get("accountHolder"), 160),
    branch: str(form.get("branch"), 30),
    account: str(form.get("account"), 40),
    accountType: str(form.get("accountType"), 30)
  } : void 0;
  const documents = [];
  const stored = [];
  const objectKeys = /* @__PURE__ */ new Map();
  try {
    for (const { field, file, mime } of files) {
      const key = crypto.randomUUID();
      const objectKey = `candidates/${id}/${field}-${key}.${extensions[mime]}`;
      await env.DOCUMENTS.put(objectKey, file.stream(), {
        httpMetadata: { contentType: mime },
        customMetadata: { candidate: String(id), field, originalName: file.name.slice(0, 180) }
      });
      stored.push(objectKey);
      objectKeys.set(key, objectKey);
      documents.push({ key, type: field, label: labels[field], name: file.name.slice(0, 180), mime, size: file.size });
    }
    const candidate = {
      id,
      profileType,
      name,
      initials: name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join(""),
      email,
      phone,
      specialty,
      city,
      crm: isDoctor ? crm : "N\xE3o se aplica",
      rqe: isDoctor ? str(form.get("rqe"), 80) || "N\xE3o informado" : "N\xE3o se aplica",
      experience: str(form.get("experience"), 160) || "N\xE3o informado",
      availability,
      contractType: isDoctor ? contractType : void 0,
      company,
      status: "novo",
      statusLabel: "Novo",
      createdAt,
      documents,
      notes: "Candidatura recebida pelo formul\xE1rio p\xFAblico.",
      curriculum: [str(form.get("summary"), 1200) || "Resumo profissional n\xE3o informado.", `Disponibilidade: ${availability}.`]
    };
    await env.DB.batch([
      env.DB.prepare("INSERT INTO candidates (id, profile_type, status, created_at, payload) VALUES (?, ?, ?, ?, ?)").bind(id, profileType, "novo", createdAt, JSON.stringify(candidate)),
      ...documents.map((doc) => env.DB.prepare("INSERT INTO documents (id, candidate_id, object_key, name, mime, size) VALUES (?, ?, ?, ?, ?, ?)").bind(doc.key, id, objectKeys.get(doc.key), doc.name, doc.mime, doc.size))
    ]);
    return json({ ok: true, protocol: String(id) }, 201);
  } catch (error) {
    console.error("applications: falha ao gravar a candidatura", { id, profileType, arquivos: stored.length, erro: error instanceof Error ? error.message : String(error) });
    await Promise.allSettled(stored.map((key) => env.DOCUMENTS.delete(key)));
    return fail("N\xE3o foi poss\xEDvel concluir o cadastro. Tente novamente.", 500);
  }
}, "onRequestPost");

// api/session.ts
var MFA_LIFETIME_MS = 10 * 60 * 1e3;
var MFA_MAX_ATTEMPTS = 5;
function generateCode() {
  const range = 4294967296;
  const limit = range - range % 1e6;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return String(value[0] % 1e6).padStart(6, "0");
}
__name(generateCode, "generateCode");
async function sendMfaEmail(env, email, code) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MFA_FROM,
      to: [email],
      subject: "C\xF3digo de acesso ao Portal J&P",
      text: `Seu c\xF3digo de acesso \xE9 ${code}. Ele expira em 10 minutos e s\xF3 pode ser usado uma vez. Se voc\xEA n\xE3o solicitou este c\xF3digo, ignore esta mensagem.`,
      html: `<div style="font-family:Arial,sans-serif;color:#17233a;max-width:520px;margin:auto"><p>Seu c\xF3digo para entrar no Portal J&amp;P:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${code}</p><p>Ele expira em 10 minutos e s\xF3 pode ser usado uma vez.</p><p>Se voc\xEA n\xE3o solicitou este c\xF3digo, ignore esta mensagem.</p></div>`
    })
  });
  return response.ok;
}
__name(sendMfaEmail, "sendMfaEmail");
var onRequestGet3 = /* @__PURE__ */ __name(async ({ env, request }) => {
  const email = await sessionEmail(env, request);
  if (!email) return json({ authenticated: false, profile: null });
  return json({ authenticated: true, profile: await staffProfile(env, email) });
}, "onRequestGet");
var onRequestPost3 = /* @__PURE__ */ __name(async ({ env, request }) => {
  if (!configured(env)) return fail("Portal ainda n\xE3o configurado no Cloudflare.", 503);
  if (!sameOrigin(request)) return fail("Origem inv\xE1lida.", 403);
  if (Number(request.headers.get("Content-Length") || 0) > 4096) return fail("Solicita\xE7\xE3o inv\xE1lida.", 413);
  const body = await readJson(request);
  const action = String(body?.action || "");
  if (action === "request-mfa") {
    if (!emailDeliveryConfigured(env)) return fail("Envio do MFA ainda n\xE3o est\xE1 configurado.", 503);
    const email = String(body?.email || "").toLowerCase().trim();
    const password = String(body?.password || "");
    if (!validEmail(email) || password.length < 1 || password.length > 256) return fail("E-mail ou senha inv\xE1lidos.", 401);
    const [ipAllowed, emailAllowed] = await Promise.all([
      limitRequest(env, request, "login-ip", 8, 15 * 60 * 1e3),
      limitRequest(env, request, "login-email", 8, 15 * 60 * 1e3, email)
    ]);
    if (!ipAllowed || !emailAllowed) return fail("Muitas tentativas. Aguarde 15 minutos.", 429);
    const credentialsValid = await verifyStaffPassword(env, email, password);
    if (!credentialsValid || !await staffIsActive(env, email)) return fail("E-mail ou senha inv\xE1lidos.", 401);
    const now = Date.now();
    const challengeId = crypto.randomUUID();
    const code = generateCode();
    const codeHash = await emailCodeHash(env, challengeId, email, code);
    await env.DB.prepare("DELETE FROM mfa_challenges WHERE expires_at <= ? OR (consumed_at IS NOT NULL AND consumed_at <= ?)").bind(now, now - 24 * 60 * 60 * 1e3).run();
    await env.DB.prepare("UPDATE mfa_challenges SET consumed_at = ? WHERE email = ? COLLATE NOCASE AND consumed_at IS NULL").bind(now, email).run();
    await env.DB.prepare(`INSERT INTO mfa_challenges (id, email, code_hash, created_at, expires_at, attempts, consumed_at)
      VALUES (?, ?, ?, ?, ?, 0, NULL)`).bind(challengeId, email, codeHash, now, now + MFA_LIFETIME_MS).run();
    let emailSent = false;
    try {
      emailSent = await sendMfaEmail(env, email, code);
    } catch {
      emailSent = false;
    }
    if (!emailSent) {
      await env.DB.prepare("UPDATE mfa_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL").bind(Date.now(), challengeId).run();
      return fail("N\xE3o foi poss\xEDvel enviar o c\xF3digo. Tente novamente mais tarde.", 502);
    }
    return json({ mfaRequired: true, challengeId, maskedEmail: maskedEmail(email) });
  }
  if (action === "verify-mfa") {
    const challengeId = String(body?.challengeId || "");
    const code = String(body?.code || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) return fail("C\xF3digo inv\xE1lido ou expirado.", 401);
    const [ipAllowed, challengeAllowed] = await Promise.all([
      limitRequest(env, request, "mfa-verify-ip", 20, 15 * 60 * 1e3),
      limitRequest(env, request, "mfa-verify-challenge", MFA_MAX_ATTEMPTS, 15 * 60 * 1e3, challengeId)
    ]);
    if (!ipAllowed || !challengeAllowed) return fail("C\xF3digo inv\xE1lido ou expirado.", 429);
    const now = Date.now();
    const challenge = await env.DB.prepare(`SELECT id, email, code_hash, expires_at, attempts, consumed_at
      FROM mfa_challenges WHERE id = ?`).bind(challengeId).first();
    if (!challenge || challenge.consumed_at !== null || challenge.expires_at <= now || challenge.attempts >= MFA_MAX_ATTEMPTS) {
      return fail("C\xF3digo inv\xE1lido ou expirado.", 401);
    }
    const expectedHash = await emailCodeHash(env, challenge.id, challenge.email, code);
    if (!await equalSecret(expectedHash, challenge.code_hash)) {
      await env.DB.prepare(`UPDATE mfa_challenges SET attempts = attempts + 1
        WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ?`).bind(challengeId, now, MFA_MAX_ATTEMPTS).run();
      return fail("C\xF3digo inv\xE1lido ou expirado.", 401);
    }
    if (!await staffIsActive(env, challenge.email)) return fail("C\xF3digo inv\xE1lido ou expirado.", 401);
    const consumed = await env.DB.prepare(`UPDATE mfa_challenges SET consumed_at = ?
      WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ?`).bind(now, challengeId, now, MFA_MAX_ATTEMPTS).run();
    if (consumed.meta.changes !== 1) return fail("C\xF3digo inv\xE1lido ou expirado.", 401);
    const email = challenge.email.toLowerCase().trim();
    const response = json({ authenticated: true, profile: await staffProfile(env, email) });
    response.headers.set("Set-Cookie", await sessionCookie(env, request, email));
    return response;
  }
  return fail("Solicita\xE7\xE3o inv\xE1lida.");
}, "onRequestPost");
var onRequestDelete3 = /* @__PURE__ */ __name(async ({ request }) => {
  if (!sameOrigin(request) || !isPrimaryHost(request)) return fail("Origem inv\xE1lida.", 403);
  const response = json({ authenticated: false, profile: null });
  response.headers.set("Set-Cookie", `jp_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
  return response;
}, "onRequestDelete");

// ../.wrangler/tmp/pages-yum6rL/functionsRoutes-0.35547377370061717.mjs
var routes = [
  {
    routePath: "/api/admin/candidates/:id",
    mountPath: "/api/admin/candidates",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/admin/candidates/:id",
    mountPath: "/api/admin/candidates",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/admin/documents/:id",
    mountPath: "/api/admin/documents",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/admin/interviews/:id",
    mountPath: "/api/admin/interviews",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/admin/interviews/:id",
    mountPath: "/api/admin/interviews",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/admin/candidates",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/admin/dashboard",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/applications",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/session",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/session",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/session",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str2) {
  var tokens = [];
  var i = 0;
  while (i < str2.length) {
    var char = str2[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str2[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str2[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str2[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str2[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str2.length) {
        var code = str2.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str2[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str2[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str2.length) {
        if (str2[j] === "\\") {
          pattern += str2[j++] + str2[j++];
          continue;
        }
        if (str2[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str2[j] === "(") {
          count++;
          if (str2[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str2[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str2[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str2, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str2);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str2, options) {
  var keys = [];
  var re = pathToRegexp(str2, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str2) {
  return str2.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
