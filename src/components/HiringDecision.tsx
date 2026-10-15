import { useMemo, useState } from 'react';
import Portal from './Portal';
import { BadgeCheck, BriefcaseBusiness, Eye, Stethoscope, X, XCircle } from 'lucide-react';
import type { Candidate, CandidateType } from '../types';

export default function HiringDecision({ candidates, onOpen, onDecision }: {
  candidates: Candidate[];
  onOpen: (candidate: Candidate) => void;
  onDecision: (id: number, status: 'aprovado' | 'reprovado') => void;
}) {
  const [profileType, setProfileType] = useState<CandidateType | 'all'>('all');
  const [pendingDecision, setPendingDecision] = useState<{ candidate: Candidate; status: 'aprovado' | 'reprovado' } | null>(null);
  const waiting = useMemo(() => candidates.filter(candidate => candidate.status === 'aguardando' && (profileType === 'all' || candidate.profileType === profileType)), [candidates, profileType]);

  return (
    <section className="module-panel hiring-decision-panel">
      <div className="module-panel-heading hiring-decision-heading">
        <div><small>DECISÃO FINAL</small><h2>Contratação</h2><p>Defina quem será contratado ou encerre o processo. A decisão atualiza automaticamente o perfil.</p></div>
        <div className="profile-segmented-control">
          <button className={profileType === 'all' ? 'selected' : ''} onClick={() => setProfileType('all')}>Todos</button>
          <button className={profileType === 'medico' ? 'selected' : ''} onClick={() => setProfileType('medico')}><Stethoscope size={14}/>Médicos</button>
          <button className={profileType === 'colaborador' ? 'selected' : ''} onClick={() => setProfileType('colaborador')}><BriefcaseBusiness size={14}/>Colaboradores</button>
        </div>
      </div>

      <div className="hiring-decision-list">
        {waiting.map(candidate => (
          <article className="hiring-decision-card" key={candidate.id}>
            <div className="hiring-person">
              <span className="hiring-avatar">{candidate.initials}</span>
              <div><span className="hiring-kind">{candidate.profileType === 'medico' ? 'Médico' : 'Colaborador'}</span><strong>{candidate.name}</strong><small>{candidate.specialty} • {candidate.city}</small></div>
            </div>
            <div className="hiring-meta"><span><small>Experiência</small><strong>{candidate.experience}</strong></span><span><small>Disponibilidade</small><strong>{candidate.availability}</strong></span></div>
            <div className="hiring-actions">
              <button className="button button-ghost" onClick={() => onOpen(candidate)}><Eye size={14}/>Ver perfil</button>
              <button className="button hiring-reject" onClick={() => setPendingDecision({ candidate, status: 'reprovado' })}><XCircle size={14}/>Encerrar processo</button>
              <button className="button hiring-approve" onClick={() => setPendingDecision({ candidate, status: 'aprovado' })}><BadgeCheck size={14}/>Aprovar contratação</button>
            </div>
          </article>
        ))}
        {!waiting.length && <div className="hiring-empty"><BadgeCheck size={24}/><strong>Nenhum perfil aguardando decisão</strong><span>Quando uma entrevista for confirmada ou concluída, o perfil aparecerá aqui.</span></div>}
      </div>

      {pendingDecision && (
        <Portal><div className="interview-confirm-layer" onMouseDown={event => { if (event.target === event.currentTarget) setPendingDecision(null); }}>
          <section className={`interview-confirm-card hiring-confirm-card ${pendingDecision.status}`} role="alertdialog" aria-modal="true" aria-label="Confirmar decisão de contratação">
            <button type="button" className="interview-confirm-close" onClick={() => setPendingDecision(null)} aria-label="Fechar"><X size={16}/></button>
            <span className={`interview-confirm-icon ${pendingDecision.status === 'aprovado' ? 'confirm' : ''}`}>{pendingDecision.status === 'aprovado' ? <BadgeCheck size={20}/> : <XCircle size={20}/>}</span>
            <div className="interview-confirm-copy">
              <small>DECISÃO DE CONTRATAÇÃO</small>
              <h3>{pendingDecision.status === 'aprovado' ? 'Confirmar contratação?' : 'Encerrar este processo?'}</h3>
              <p>Tem certeza que deseja {pendingDecision.status === 'aprovado' ? 'aprovar a contratação de' : 'encerrar o processo de'} <strong>{pendingDecision.candidate.name}</strong>? {pendingDecision.status === 'aprovado' ? 'O perfil será movido para Perfis aprovados.' : 'O perfil será movido para Reprovados.'}</p>
            </div>
            <div className="interview-confirm-actions">
              <button type="button" className="button button-secondary" onClick={() => setPendingDecision(null)}>Voltar</button>
              <button type="button" className={`button ${pendingDecision.status === 'aprovado' ? 'interview-confirm-button' : 'interview-danger-button'}`} onClick={() => { onDecision(pendingDecision.candidate.id, pendingDecision.status); setPendingDecision(null); }}>
                {pendingDecision.status === 'aprovado' ? <BadgeCheck size={14}/> : <XCircle size={14}/>}
                {pendingDecision.status === 'aprovado' ? 'Sim, aprovar contratação' : 'Sim, encerrar processo'}
              </button>
            </div>
          </section>
        </div></Portal>
      )}
    </section>
  );
}
