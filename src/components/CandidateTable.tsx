import { useMemo, useState } from 'react';
import { Icons } from '../icons';
import { formatDate } from '../storage';
import type { Candidate, CandidateStatus, CandidateType } from '../types';

const statusClass: Record<CandidateStatus, string> = {
  novo: 'status-new', analise: 'status-review', entrevista: 'status-interview', aguardando: 'status-waiting', aprovado: 'status-approved', reprovado: 'status-rejected'
};

type Props = {
  candidates: Candidate[];
  onOpen: (candidate: Candidate) => void;
  forcedStatus?: CandidateStatus;
  title?: string;
};

export default function CandidateTable({ candidates, onOpen, forcedStatus, title }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CandidateStatus | 'all'>(forcedStatus ?? 'all');
  const [profileType, setProfileType] = useState<CandidateType | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selected = forcedStatus ?? status;
    return [...candidates]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .filter(candidate => {
        const haystack = `${candidate.name} ${candidate.specialty} ${candidate.city} ${candidate.crm} ${candidate.email}`.toLowerCase();
        return (!q || haystack.includes(q)) &&
          (selected === 'all' || candidate.status === selected) &&
          (profileType === 'all' || candidate.profileType === profileType);
      });
  }, [candidates, forcedStatus, profileType, query, status]);

  return (
    <section className="table-panel">
      {title && <div className="panel-inline-title"><strong>{title}</strong><span>{filtered.length} registros</span></div>}
      <div className="table-toolbar table-toolbar-split">
        <label className="search-control"><Icons.Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, área, cidade, registro ou e-mail..." /></label>
        <div className="table-toolbar-filters">
          <label className="profile-filter"><select value={profileType} onChange={e => setProfileType(e.target.value as CandidateType | 'all')}><option value="all">Médicos e colaboradores</option><option value="medico">Médicos</option><option value="colaborador">Colaboradores</option></select><Icons.ChevronDown size={14}/></label>
          <label className="status-filter"><Icons.Filter size={18}/><select value={forcedStatus ?? status} onChange={e => setStatus(e.target.value as CandidateStatus | 'all')} disabled={Boolean(forcedStatus)}><option value="all">Todos os status</option><option value="novo">Novo</option><option value="analise">Em análise</option><option value="entrevista">Entrevista</option><option value="aguardando">Decisão de contratação</option><option value="aprovado">Aprovado</option><option value="reprovado">Reprovado</option></select><Icons.ChevronDown size={14}/></label>
        </div>
      </div>
      <div className="candidate-table" role="table" aria-label="Lista de candidatos">
        <div className="candidate-head candidate-grid" role="row">
          <span>PERFIL</span><span>ÁREA / ESPECIALIDADE</span><span>REGISTRO</span><span>DATA</span><span>STATUS</span><span>AÇÃO</span>
        </div>
        <div className="candidate-body">
          {filtered.map(candidate => (
            <article className="candidate-row candidate-grid" key={candidate.id} role="row">
              <div className="doctor-cell">
                <span className={`doctor-avatar avatar-${candidate.id % 4}`}>{candidate.initials}</span>
                <span className="doctor-copy"><strong>{candidate.name}</strong><small>{candidate.profileType === 'medico' ? 'Médico' : 'Colaborador'} • {candidate.city} • {candidate.email}</small></span>
              </div>
              <span className="table-text">{candidate.specialty}</span>
              <span className="table-text">{candidate.profileType === 'medico' ? candidate.crm : '—'}</span>
              <span className="date-cell"><strong>{formatDate(candidate.createdAt)}</strong><small>Candidatura</small></span>
              <span className={`status-pill ${statusClass[candidate.status]}`}>{candidate.statusLabel}</span>
              <button className="view-button" type="button" onClick={() => onOpen(candidate)} aria-label={`Ver ${candidate.name}`}><Icons.Eye size={18}/></button>
            </article>
          ))}
          {!filtered.length && <div className="empty-row">Nenhum perfil encontrado com esses filtros.</div>}
        </div>
      </div>
    </section>
  );
}
