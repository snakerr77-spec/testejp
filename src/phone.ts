export function phoneDigits(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, 11);
}

export function formatPhoneBR(value: string) {
  const digits = phoneDigits(value);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);

  if (digits.length <= 6) return `(${ddd}) ${local}`;
  if (digits.length <= 10) return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
}

export function formatPhoneDisplay(value?: string) {
  const original = String(value || '').trim();
  const digits = phoneDigits(original);
  if (digits.length < 10) return original || 'Não informado';
  return formatPhoneBR(digits);
}
