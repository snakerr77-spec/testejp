import { useState } from 'react';
import { BriefcaseBusiness, Stethoscope } from 'lucide-react';
import { Icons } from '../icons';
import { initialsFromName, normalizeCandidate } from '../storage';
import { statusMap } from '../data';
import type { Candidate, CandidateStatus, CandidateType } from '../types';
import { formatPhoneBR } from '../phone';

type Props = { open: boolean; onClose: () => void; onCreate: (candidate: Candidate) => Promise<void> };

export default function NewCandidateModal({ open, onClose, onCreate }: Props) {
  const [status, setStatus] = useState<CandidateStatus>('novo');
  const [profileType, setProfileType] = useState<CandidateType>('medico');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!open) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const name = String(form.get('name') || '').trim();
    const area = String(form.get('specialty') || '').trim();
    const candidate = normalizeCandidate({
      id: Date.now(),
      profileType,
      name,
      initials: initialsFromName(name),
      specialty: area,
      city: String(form.get('city') || '').trim(),
      crm: profileType === 'medico' ? String(form.get('crm') || '').trim() : 'Não se aplica',
      rqe: profileType === 'medico' ? String(form.get('rqe') || '').trim() || 'Não informado' : 'Não se aplica',
      status,
      statusLabel: statusMap[status].label,
      email: String(form.get('email') || '').trim(),
      phone: formatPhoneBR(String(form.get('phone') || '')),
      experience: String(form.get('experience') || '').trim() || 'Não informado',
      availability: String(form.get('availability') || '').trim(),
      createdAt: new Date().toISOString(),
      notes: String(form.get('notes') || '').trim() || 'Candidato adicionado manualmente pelo painel.',
      curriculum: [`${profileType === 'medico' ? 'Médico' : 'Colaborador'} cadastrado manualmente no painel administrativo.`],
      documents: []
    });
    setSaving(true);
    setError('');
    try {
      await onCreate(candidate);
      element.reset();
      setStatus('novo');
      setProfileType('medico');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao salvar candidato.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="new-candidate-modal" role="dialog" aria-modal="true" aria-label="Novo candidato">
        <button className="modal-close" type="button" onClick={onClose}><Icons.Close size={21}/></button>
        <div className="new-modal-title"><span>NOVO CADASTRO</span><h2>Adicionar candidato</h2><p>Escolha o perfil e preencha os dados principais.</p></div>
        <div className="candidate-type-switch">
          <button type="button" className={profileType === 'medico' ? 'selected' : ''} onClick={() => setProfileType('medico')}><Stethoscope size={18}/><span><strong>Médico</strong><small>CRM, RQE e especialidade</small></span></button>
          <button type="button" className={profileType === 'colaborador' ? 'selected' : ''} onClick={() => setProfileType('colaborador')}><BriefcaseBusiness size={18}/><span><strong>Colaborador</strong><small>Administrativo ou operacional</small></span></button>
        </div>
        <form className="candidate-form" onSubmit={submit}>
          <label className="span-2">Nome completo<input name="name" required placeholder={profileType === 'medico' ? 'Ex.: Dr. João da Silva' : 'Ex.: Juliana Martins'} /></label>
          <label>{profileType === 'medico' ? 'Especialidade' : 'Cargo / área'}<input name="specialty" required placeholder={profileType === 'medico' ? 'Ex.: Pediatria' : 'Ex.: Recepção / Atendimento'} /></label>
          {profileType === 'medico' ? <label>CRM<input name="crm" required placeholder="Ex.: CRM/SP 123456" /></label> : <label>Cidade<input name="city" required placeholder="Ex.: Cerquilho" /></label>}
          {profileType === 'medico' ? <label>Cidade<input name="city" required placeholder="Ex.: Cerquilho" /></label> : <label>Experiência<input name="experience" placeholder="Ex.: 3 anos" /></label>}
          {profileType === 'medico' ? <label>RQE<input name="rqe" placeholder="Ex.: RQE 55210" /></label> : <label>Status<select value={status} onChange={event => setStatus(event.target.value as CandidateStatus)}>{Object.entries(statusMap).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>}
          <label>E-mail<input name="email" type="email" required placeholder="email@exemplo.com" /></label>
          <label>Telefone<input name="phone" required inputMode="tel" maxLength={15} placeholder="(__) _____-____" onInput={event => { event.currentTarget.value = formatPhoneBR(event.currentTarget.value); }} /></label>
          {profileType === 'medico' && <label>Experiência<input name="experience" placeholder="Ex.: 6 anos" /></label>}
          {profileType === 'medico' && <label>Status<select value={status} onChange={event => setStatus(event.target.value as CandidateStatus)}>{Object.entries(statusMap).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>}
          <label className="span-2">Disponibilidade<input name="availability" required placeholder="Ex.: Seg a Sex • Manhã" /></label>
          <label className="span-2">Observações<textarea name="notes" rows={3} placeholder="Informações relevantes do candidato..." /></label>
          {error && <p className="application-error span-2" role="alert">{error}</p>}
          <div className="form-actions span-2"><button className="button button-ghost" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar candidato'}</button></div>
        </form>
      </section>
    </div>
  );
}
