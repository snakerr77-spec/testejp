import { configured, fail, json, limitRequest, sameOrigin, str, validEmail, type Env } from '../_shared';

const maxFileBytes = 10 * 1024 * 1024;
const requiredMedical = ['cv', 'photoId', 'residence', 'crmCard', 'diplomas', 'practice', 'clearance'];
const labels: Record<string, string> = {
  cv: 'Currículo profissional', photoId: 'Documento com foto', residence: 'Comprovante de residência',
  crmCard: 'Carteirinha CRM', diplomas: 'Diploma e certificados', practice: 'Declaração de atuação na área',
  clearance: 'Certidão Negativa', companyCnpj: 'Cartão CNPJ'
};

const extensions: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

// Identifica o arquivo pelo conteúdo (não pelo nome nem pelo tipo informado pelo navegador).
// O PDF pode ter alguns bytes antes do cabeçalho "%PDF-"; a especificação aceita até 1024.
function kind(file: File) {
  return file.slice(0, 1024).arrayBuffer().then(buffer => {
    const b = new Uint8Array(buffer);
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a) return 'image/png';
    for (let i = 0; i + 4 < b.length; i++) {
      if (b[i] === 0x25 && b[i + 1] === 0x50 && b[i + 2] === 0x44 && b[i + 3] === 0x46 && b[i + 4] === 0x2d) return 'application/pdf';
    }
    return '';
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!configured(env)) return fail('Cadastro indisponível até a configuração do Cloudflare.', 503);
  if (!sameOrigin(request)) return fail('Origem inválida.', 403);
  if (!request.headers.get('Content-Type')?.includes('multipart/form-data')) return fail('Envie o formulário com seus documentos.');
  if (Number(request.headers.get('Content-Length')) > 75 * 1024 * 1024) return fail('O envio excede 75 MB.', 413);
  if (!await limitRequest(env, request, 'application', 30, 60 * 60 * 1000)) return fail('Limite de envios atingido. Tente mais tarde.', 429);
  let form: FormData;
  try { form = await request.formData(); } catch { return fail('Não foi possível ler os arquivos enviados.'); }
  const profileType = str(form.get('profileType'));
  const isDoctor = profileType === 'medico';
  if (!isDoctor && profileType !== 'colaborador') return fail('Tipo de candidatura inválido.');
  const name = str(form.get('name'), 160);
  const email = str(form.get('email'), 254).toLowerCase();
  const phone = str(form.get('phone'), 32);
  const specialty = str(form.get('specialty'), 120);
  const city = str(form.get('city'), 120);
  const crm = str(form.get('crm'), 80);
  const availability = str(form.get('availability'), 200);
  const contractType = str(form.get('contractType'), 20);
  if (name.length < 3 || !validEmail(email) || phone.replace(/\D/g, '').length < 10 || !specialty || !city || !availability || (isDoctor && (!crm || !['Mutirão', 'Fixo', 'Plantões'].includes(contractType)))) return fail('Preencha os campos obrigatórios de identificação e atuação.');
  if (form.get('privacyAcknowledged') !== 'yes') return fail('Leia e confirme o aviso de privacidade.');

  const fields = isDoctor ? [...requiredMedical, 'companyCnpj'] : ['cv'];
  const files: { field: string; file: File; mime: string }[] = [];
  for (const field of fields) {
    const selected = form.getAll(field).filter((value): value is File => value instanceof File && value.size > 0);
    if ((isDoctor ? requiredMedical : ['cv']).includes(field) && !selected.length) return fail(`Anexe ${labels[field]}.`);
    if (field !== 'diplomas' && selected.length > 1) return fail(`Envie apenas um arquivo para ${labels[field]}.`);
    if (selected.length > 8) return fail('Envie no máximo oito arquivos por campo.');
    for (const file of selected) {
      if (file.size > maxFileBytes) return fail(`${file.name} ultrapassa 10 MB.`);
      const mime = await kind(file);
      if (!mime) return fail(`Formato não permitido: ${file.name}. Use PDF, JPG ou PNG.`);
      files.push({ field, file, mime });
    }
  }
  if (files.reduce((sum, item) => sum + item.file.size, 0) > 70 * 1024 * 1024) return fail('O total de arquivos deve ter até 70 MB.');
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const createdAt = new Date().toISOString();
  const company = isDoctor ? {
    cnpj: str(form.get('companyCnpjNumber'), 30),
    bank: str(form.get('bank'), 100),
    accountHolder: str(form.get('accountHolder'), 160),
    branch: str(form.get('branch'), 30),
    account: str(form.get('account'), 40),
    accountType: str(form.get('accountType'), 30)
  } : undefined;
  const documents: { key: string; type: string; label: string; name: string; mime: string; size: number }[] = [];
  const stored: string[] = [];
  const objectKeys = new Map<string, string>();
  try {
    for (const { field, file, mime } of files) {
      const key = crypto.randomUUID();
      // Nome legível no R2: candidates/<protocolo>/<campo>-<uuid>.pdf (a extensão vem do conteúdo).
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
      id, profileType, name, initials: name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join(''),
      email, phone, specialty, city, crm: isDoctor ? crm : 'Não se aplica',
      rqe: isDoctor ? str(form.get('rqe'), 80) || 'Não informado' : 'Não se aplica',
      experience: str(form.get('experience'), 160) || 'Não informado', availability, contractType: isDoctor ? contractType : undefined,
      company, status: 'novo', statusLabel: 'Novo', createdAt, documents,
      notes: 'Candidatura recebida pelo formulário público.',
      curriculum: [str(form.get('summary'), 1200) || 'Resumo profissional não informado.', `Disponibilidade: ${availability}.`]
    };
    await env.DB.batch([
      env.DB.prepare('INSERT INTO candidates (id, profile_type, status, created_at, payload) VALUES (?, ?, ?, ?, ?)')
        .bind(id, profileType, 'novo', createdAt, JSON.stringify(candidate)),
      ...documents.map(doc => env.DB.prepare('INSERT INTO documents (id, candidate_id, object_key, name, mime, size) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(doc.key, id, objectKeys.get(doc.key), doc.name, doc.mime, doc.size))
    ]);
    return json({ ok: true, protocol: String(id) }, 201);
  } catch (error) {
    console.error('applications: falha ao gravar a candidatura', { id, profileType, arquivos: stored.length, erro: error instanceof Error ? error.message : String(error) });
    await Promise.allSettled(stored.map(key => env.DOCUMENTS.delete(key)));
    return fail('Não foi possível concluir o cadastro. Tente novamente.', 500);
  }
};
