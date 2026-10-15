import { BriefcaseBusiness, CalendarDays, Clock3, MapPin, Stethoscope, UserRound } from 'lucide-react';
import { Icons } from '../icons';
import { formatPhoneDisplay } from '../phone';
import { openStoredDocument } from '../storage';
import type { Candidate, InterviewEvent } from '../types';

type Props = {
  candidate: Candidate | null;
  interviewEvents?: InterviewEvent[];
  onClose: () => void;
  onToast: (message: string) => void;
};

const interviewStatusLabel = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  reagendada: 'Reagendada',
  em_andamento: 'Em atendimento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
} as const;

export default function CandidateModal({ candidate, interviewEvents = [], onClose, onToast }: Props) {
  if (!candidate) return null;

  const scheduledInterview = interviewEvents
    .filter(event => event.candidateId === candidate.id && ['agendada', 'confirmada', 'reagendada', 'em_andamento'].includes(event.status))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];

  const isDoctor = candidate.profileType === 'medico';

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="candidate-modal" role="dialog" aria-modal="true" aria-label={`Detalhes de ${candidate.name}`}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar"><Icons.Close size={21}/></button>
        <div className="modal-heading">
          <span className="modal-avatar">{candidate.initials}</span>
          <div>
            <div className="candidate-modal-tags">
              <span className="profile-kind-badge">{isDoctor ? <Stethoscope size={13}/> : <BriefcaseBusiness size={13}/>} {isDoctor ? 'Médico' : 'Colaborador'}</span>
              <span className={`status-pill status-${candidate.status}`}>{scheduledInterview ? 'Entrevista agendada' : candidate.statusLabel}</span>
            </div>
            <h2>{candidate.name}</h2>
            <p>{candidate.specialty} • {candidate.city}</p>
          </div>
        </div>

        <div className="modal-info-grid">
          {isDoctor ? <><article><small>CRM</small><strong>{candidate.crm}</strong></article><article><small>RQE</small><strong>{candidate.rqe}</strong></article></> : <><article><small>Perfil</small><strong>Colaborador</strong></article><article><small>Cargo / área</small><strong>{candidate.specialty}</strong></article></>}
          <article><small>E-mail</small><strong>{candidate.email}</strong></article>
          <article><small>Telefone</small><strong>{formatPhoneDisplay(candidate.phone)}</strong></article>
          <article><small>Experiência</small><strong>{candidate.experience}</strong></article>
          <article><small>Disponibilidade</small><strong>{candidate.availability}</strong></article>
          {isDoctor && candidate.contractType && <article><small>Modalidade</small><strong>{candidate.contractType}</strong></article>}
        </div>

        {isDoctor && candidate.company && Object.values(candidate.company).some(Boolean) && (
          <div className="modal-section">
            <div className="modal-section-title"><strong>Dados da empresa e recebimento</strong><span>Informados pelo candidato</span></div>
            <div className="modal-info-grid">
              {candidate.company.cnpj && <article><small>CNPJ</small><strong>{candidate.company.cnpj}</strong></article>}
              {candidate.company.accountHolder && <article><small>Titular</small><strong>{candidate.company.accountHolder}</strong></article>}
              {candidate.company.bank && <article><small>Banco</small><strong>{candidate.company.bank}</strong></article>}
              {candidate.company.branch && <article><small>Agência</small><strong>{candidate.company.branch}</strong></article>}
              {candidate.company.account && <article><small>Conta</small><strong>{candidate.company.account} {candidate.company.accountType ? `(${candidate.company.accountType})` : ''}</strong></article>}
            </div>
          </div>
        )}

        <div className="modal-section">
          <div className="modal-section-title"><strong>Currículo</strong><span>{candidate.curriculum.length} itens</span></div>
          <ul className="curriculum-list">
            {candidate.curriculum.length ? candidate.curriculum.map((item, index) => <li key={index}>{item}</li>) : <li>Resumo profissional não informado.</li>}
          </ul>
        </div>

        <div className="modal-section">
          <div className="modal-section-title"><strong>Documentos</strong><span>{candidate.documents.length} arquivos</span></div>
          <div className="document-list">
            {candidate.documents.length ? candidate.documents.map(doc => (
              <button key={doc.key} type="button" className="document-item" onClick={async () => {
                try { await openStoredDocument(doc); }
                catch { onToast('Não foi possível abrir este documento neste navegador.'); }
              }}>
                <Icons.File size={18}/><span><strong>{doc.label}</strong><small>{doc.name}</small></span><Icons.External size={16}/>
              </button>
            )) : <div className="empty-document">Este perfil ainda não enviou documentos.</div>}
          </div>
        </div>

        {scheduledInterview && (
          <div className="modal-section scheduled-interview-section">
            <div className="modal-section-title"><strong>Entrevista agendada</strong><span className={`event-status ${scheduledInterview.status}`}>{interviewStatusLabel[scheduledInterview.status]}</span></div>
            <div className="scheduled-interview-card">
              <div><span><CalendarDays size={16}/></span><p><small>Data</small><strong>{formatAgendaDate(scheduledInterview.date)}</strong></p></div>
              <div><span><Clock3 size={16}/></span><p><small>Horário</small><strong>{scheduledInterview.time} • {scheduledInterview.duration} min</strong></p></div>
              <div><span><MapPin size={16}/></span><p><small>Local</small><strong>{scheduledInterview.location}</strong></p></div>
              <div><span><UserRound size={16}/></span><p><small>Entrevistador</small><strong>{scheduledInterview.interviewer}</strong></p></div>
            </div>
            <p className="scheduled-interview-hint">Este perfil já está vinculado à agenda. A etapa “Entrevista” não aparece novamente para evitar duplicidade.</p>
          </div>
        )}

        <div className="modal-note"><small>Observações</small><p>{candidate.notes}</p></div>
      </section>
    </div>
  );
}

function formatAgendaDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
