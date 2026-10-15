import { useEffect, useMemo, useRef, useState } from 'react';
import Portal from './Portal';
import { BriefcaseBusiness, GripVertical, Stethoscope, Trash2, X } from 'lucide-react';
import type { Candidate, CandidateStatus, CandidateType } from '../types';
import { formatDate } from '../storage';

const columns: { status: CandidateStatus; label: string; hint: string }[] = [
  { status: 'novo', label: 'Novo', hint: 'Candidaturas recebidas' },
  { status: 'analise', label: 'Em análise', hint: 'Currículo em avaliação' },
  { status: 'entrevista', label: 'Entrevista', hint: 'Etapa de conversa' },
  { status: 'aguardando', label: 'Decisão de contratação', hint: 'Contratar ou encerrar' },
  { status: 'aprovado', label: 'Aprovado', hint: 'Perfil para contratação' },
  { status: 'reprovado', label: 'Reprovado', hint: 'Processo encerrado' }
];

type Props = {
  candidates: Candidate[];
  onOpen: (candidate: Candidate) => void;
  onMove: (candidate: Candidate, status: CandidateStatus) => void;
  onDelete: (candidate: Candidate) => Promise<void>;
};

export default function ProcessBoard({ candidates, onOpen, onMove, onDelete }: Props) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<CandidateStatus | null>(null);
  const [profileType, setProfileType] = useState<CandidateType | 'all'>('all');
  const [pendingDelete, setPendingDelete] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const suppressClickUntil = useRef(0);

  const visibleCandidates = useMemo(() => candidates.filter(candidate => profileType === 'all' || candidate.profileType === profileType), [candidates, profileType]);
  const draggedCandidate = draggedId ? candidates.find(candidate => candidate.id === draggedId) || null : null;

  useEffect(() => {
    if (!pendingDelete) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !deleting) setPendingDelete(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pendingDelete, deleting]);

  const finishDrag = () => {
    suppressClickUntil.current = Date.now() + 250;
    setDraggedId(null);
    setDropTarget(null);
  };

  const dropCandidate = (status: CandidateStatus) => {
    if (!draggedCandidate) return finishDrag();
    if (draggedCandidate.status !== status) onMove(draggedCandidate, status);
    finishDrag();
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try { await onDelete(pendingDelete); }
    finally { setDeleting(false); setPendingDelete(null); }
  };

  return (
    <section className="module-panel process-panel">
      <div className="module-panel-heading process-heading">
        <div><small>PIPELINE</small><h2>Etapas do processo seletivo</h2><p>Arraste cada perfil para a etapa desejada. A alteração é salva automaticamente.</p></div>
        <div className="profile-segmented-control">
          <button className={profileType === 'all' ? 'selected' : ''} onClick={() => setProfileType('all')}>Todos</button>
          <button className={profileType === 'medico' ? 'selected' : ''} onClick={() => setProfileType('medico')}><Stethoscope size={14}/>Médicos</button>
          <button className={profileType === 'colaborador' ? 'selected' : ''} onClick={() => setProfileType('colaborador')}><BriefcaseBusiness size={14}/>Colaboradores</button>
        </div>
      </div>
      <div className="kanban-grid">
        {columns.map(column => {
          const items = visibleCandidates.filter(candidate => candidate.status === column.status);
          const isDropTarget = dropTarget === column.status && Boolean(draggedId);
          return (
            <article
              className={`kanban-column kanban-${column.status} ${isDropTarget ? 'drag-over' : ''}`}
              key={column.status}
              onDragOver={event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTarget(column.status);
              }}
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(current => current === column.status ? null : current);
              }}
              onDrop={event => {
                event.preventDefault();
                dropCandidate(column.status);
              }}
            >
              <div className="kanban-column-title">
                <div><strong>{column.label}</strong><small>{column.hint}</small></div>
                <span>{items.length}</span>
              </div>
              <div className="kanban-cards">
                {items.map(candidate => (
                  <div className="kanban-item" key={candidate.id}>
                    <button
                      className={`kanban-card ${draggedId === candidate.id ? 'is-dragging' : ''}`}
                      draggable
                      onDragStart={event => {
                        setDraggedId(candidate.id);
                        setDropTarget(candidate.status);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(candidate.id));
                      }}
                      onDragEnd={finishDrag}
                      onClick={() => {
                        if (Date.now() < suppressClickUntil.current) return;
                        onOpen(candidate);
                      }}
                    >
                      <span className="kanban-avatar">{candidate.initials}</span>
                      <span className="kanban-card-copy"><strong>{candidate.name}</strong><small>{candidate.profileType === 'medico' ? 'Médico' : 'Colaborador'} • {candidate.specialty}</small><em>{formatDate(candidate.createdAt)}</em></span>
                      <span className="kanban-drag-handle" title="Arrastar para outra etapa"><GripVertical size={15}/></span>
                    </button>
                    <button type="button" className="kanban-delete" title="Excluir perfil" aria-label={`Excluir ${candidate.name}`} onClick={() => setPendingDelete(candidate)}><X size={13}/></button>
                  </div>
                ))}
                {!items.length && <div className={`kanban-empty ${isDropTarget ? 'ready' : ''}`}>{isDropTarget ? 'Solte o perfil aqui' : 'Nenhum perfil'}</div>}
              </div>
            </article>
          );
        })}
      </div>

      {pendingDelete && (
        <Portal><div className="interview-confirm-layer" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) setPendingDelete(null); }}>
          <section className="interview-confirm-card hiring-confirm-card" role="alertdialog" aria-modal="true" aria-label="Confirmar exclusão do perfil">
            <button type="button" className="interview-confirm-close" onClick={() => setPendingDelete(null)} disabled={deleting} aria-label="Fechar"><X size={16}/></button>
            <span className="interview-confirm-icon"><Trash2 size={20}/></span>
            <div className="interview-confirm-copy">
              <small>EXCLUIR PERFIL</small>
              <h3>Excluir este perfil?</h3>
              <p>Tem certeza que deseja excluir <strong>{pendingDelete.name}</strong>? O cadastro, os documentos enviados e as entrevistas agendadas serão apagados do banco de dados e <strong>não poderão ser recuperados</strong>.</p>
            </div>
            <div className="interview-confirm-actions">
              <button type="button" className="button button-secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>Voltar</button>
              <button type="button" className="button interview-danger-button" onClick={confirmDelete} disabled={deleting}><Trash2 size={14}/>{deleting ? 'Excluindo...' : 'Sim, excluir perfil'}</button>
            </div>
          </section>
        </div></Portal>
      )}
    </section>
  );
}
