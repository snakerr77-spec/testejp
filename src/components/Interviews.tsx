import { useEffect, useMemo, useState } from 'react';
import Portal from './Portal';
import {
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleAlert,
  Clock3,
  History,
  MapPin,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Search,
  TimerReset,
  UserRound,
  UsersRound,
  Video,
  X,
  XCircle
} from 'lucide-react';
import type { Candidate, InterviewAudience, InterviewEvent, InterviewLogEntry, InterviewStatus } from '../types';

const statusLabel: Record<InterviewStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  reagendada: 'Reagendada',
  em_andamento: 'Em atendimento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};

const workflowTabs: { key: InterviewStatus; label: string }[] = [
  { key: 'agendada', label: 'Agendadas' },
  { key: 'confirmada', label: 'Confirmadas' },
  { key: 'reagendada', label: 'Reagendadas' },
  { key: 'em_andamento', label: 'Em atendimento' },
  { key: 'concluida', label: 'Concluídas' },
  { key: 'cancelada', label: 'Canceladas' }
];

type Props = {
  candidates: Candidate[];
  events: InterviewEvent[];
  onOpenAgenda: (candidateId?: number) => void;
  onOpenCandidate: (candidate: Candidate) => void;
  onSave: (event: InterviewEvent) => void;
  onToast?: (message: string) => void;
};

type RescheduleDraft = {
  eventId: string;
  date: string;
  time: string;
  duration: number;
  interviewer: string;
  location: string;
};

function localDateKey(value: Date | number) {
  const date = typeof value === 'number' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDateTime(event: InterviewEvent) {
  return new Date(`${event.date}T${event.time || '00:00'}:00`);
}

function formatDate(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) return dateValue;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}

function formatCompactDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours) return `${hours}h ${minutes}min`;
  if (minutes) return `${minutes}min ${seconds}s`;
  return `${seconds}s`;
}

function createLog(action: InterviewLogEntry['action'], label: string, details?: string): InterviewLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    action,
    label,
    details
  };
}

function withLog(event: InterviewEvent, log: InterviewLogEntry): InterviewLogEntry[] {
  return [...(event.logs || []), log];
}

function activeForStart(status: InterviewStatus) {
  return status === 'agendada' || status === 'confirmada' || status === 'reagendada';
}

export default function Interviews({ candidates, events, onOpenAgenda, onOpenCandidate, onSave, onToast }: Props) {
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState<InterviewAudience | 'all'>('all');
  const [tab, setTab] = useState<InterviewStatus>('agendada');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [logOpenId, setLogOpenId] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<RescheduleDraft | null>(null);
  const [rescheduleError, setRescheduleError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<InterviewEvent | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<InterviewEvent | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sorted = useMemo(() => [...events].sort((a, b) => localDateTime(a).getTime() - localDateTime(b).getTime()), [events]);

  const awaitingSchedule = useMemo(() => candidates.filter(candidate => {
    if (candidate.status !== 'entrevista') return false;
    return !events.some(event => event.candidateId === candidate.id && ['agendada', 'confirmada', 'reagendada', 'em_andamento'].includes(event.status));
  }), [candidates, events]);

  const counts = useMemo(() => Object.fromEntries(
    workflowTabs.map(item => [item.key, events.filter(event => event.status === item.key).length])
  ) as Record<InterviewStatus, number>, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR');
    return sorted.filter(event => {
      const haystack = `${event.personName} ${event.role} ${event.interviewer} ${event.location} ${event.email || ''} ${event.phone || ''}`.toLocaleLowerCase('pt-BR');
      return event.status === tab &&
        (!q || haystack.includes(q)) &&
        (audience === 'all' || event.audience === audience);
    });
  }, [sorted, query, audience, tab]);

  const overdueCount = useMemo(() => events.filter(event => {
    if (!activeForStart(event.status) || event.startedAt) return false;
    const end = localDateTime(event).getTime() + event.duration * 60000;
    return nowMs > end;
  }).length, [events, nowMs]);

  const todayKey = localDateKey(nowMs);
  const todayCount = events.filter(event => event.date === todayKey && !['concluida', 'cancelada'].includes(event.status)).length;
  const runningCount = counts.em_andamento;
  const pendingConfirmation = counts.agendada + counts.reagendada;

  const openProfile = (event: InterviewEvent) => {
    if (!event.candidateId) return;
    const candidate = candidates.find(item => item.id === event.candidateId);
    if (candidate) onOpenCandidate(candidate);
  };

  const saveAction = (
    event: InterviewEvent,
    patch: Partial<InterviewEvent>,
    action: InterviewLogEntry['action'],
    label: string,
    details?: string,
    toastMessage?: string
  ) => {
    onSave({
      ...event,
      ...patch,
      updatedAt: new Date().toISOString(),
      logs: withLog(event, createLog(action, label, details))
    });
    if (toastMessage) onToast?.(toastMessage);
  };

  const confirmInterview = (event: InterviewEvent) => {
    setConfirmTarget(event);
  };

  const confirmConfirmation = () => {
    if (!confirmTarget) return;
    saveAction(confirmTarget, { status: 'confirmada' }, 'confirmada', 'Entrevista confirmada', 'Presença confirmada pela equipe de recrutamento.', 'Entrevista confirmada e perfil enviado para Decisão de contratação.');
    setConfirmTarget(null);
    setTab('confirmada');
  };

  const cancelInterview = (event: InterviewEvent) => {
    setCancelTarget(event);
  };

  const confirmCancellation = () => {
    if (!cancelTarget) return;
    saveAction(cancelTarget, { status: 'cancelada' }, 'cancelada', 'Entrevista cancelada', `Agendamento de ${formatDate(cancelTarget.date)} às ${cancelTarget.time} foi cancelado.`, 'Entrevista cancelada.');
    setCancelTarget(null);
    setTab('cancelada');
  };

  const startInterview = (event: InterviewEvent) => {
    const start = localDateTime(event).getTime();
    if (nowMs < start) {
      onToast?.(`A entrevista poderá ser iniciada a partir de ${event.time}.`);
      return;
    }
    const startedAt = new Date().toISOString();
    saveAction(event, { status: 'em_andamento', startedAt, completedAt: undefined, actualDurationSec: undefined }, 'iniciada', 'Entrevista iniciada', `Cronômetro iniciado às ${new Date(startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`, 'Entrevista iniciada.');
    setTab('em_andamento');
  };

  const concludeInterview = (event: InterviewEvent) => {
    const completedAt = new Date().toISOString();
    const started = event.startedAt ? new Date(event.startedAt).getTime() : nowMs;
    const actualDurationSec = Math.max(0, Math.floor((new Date(completedAt).getTime() - started) / 1000));
    saveAction(event, { status: 'concluida', completedAt, actualDurationSec }, 'concluida', 'Entrevista concluída', `Duração registrada: ${formatCompactDuration(actualDurationSec)}.`, 'Entrevista concluída e arquivada na aba Concluídas.');
    setTab('concluida');
  };

  const openReschedule = (event: InterviewEvent) => {
    setReschedule({
      eventId: event.id,
      date: event.date,
      time: event.time,
      duration: event.duration,
      interviewer: event.interviewer,
      location: event.location
    });
    setRescheduleError('');
  };

  const submitReschedule = () => {
    if (!reschedule) return;
    const event = events.find(item => item.id === reschedule.eventId);
    if (!event) return;
    if (!reschedule.date || !reschedule.time) {
      setRescheduleError('Escolha a nova data e o novo horário.');
      return;
    }

    const proposedStart = new Date(`${reschedule.date}T${reschedule.time}:00`).getTime();
    const proposedEnd = proposedStart + Math.max(15, Number(reschedule.duration) || 30) * 60000;
    const conflict = events.some(item => {
      if (item.id === event.id || item.status === 'cancelada' || item.date !== reschedule.date) return false;
      if (item.interviewer.trim().toLowerCase() !== reschedule.interviewer.trim().toLowerCase()) return false;
      const itemStart = localDateTime(item).getTime();
      const itemEnd = itemStart + item.duration * 60000;
      return proposedStart < itemEnd && proposedEnd > itemStart;
    });
    if (conflict) {
      setRescheduleError('O entrevistador já possui compromisso nesse período. Escolha outro horário.');
      return;
    }

    const oldSlot = `${formatDate(event.date)} às ${event.time}`;
    const newSlot = `${formatDate(reschedule.date)} às ${reschedule.time}`;
    saveAction(event, {
      date: reschedule.date,
      time: reschedule.time,
      duration: Math.max(15, Number(reschedule.duration) || 30),
      interviewer: reschedule.interviewer.trim() || 'Equipe de recrutamento',
      location: reschedule.location.trim() || 'A definir',
      status: 'reagendada',
      startedAt: undefined,
      completedAt: undefined,
      actualDurationSec: undefined
    }, 'reagendada', 'Entrevista reagendada', `${oldSlot} para ${newSlot}.`, 'Entrevista reagendada.');
    setReschedule(null);
    setTab('reagendada');
  };

  const renderTimingState = (event: InterviewEvent) => {
    if (event.status === 'em_andamento' && event.startedAt) {
      const elapsed = Math.max(0, Math.floor((nowMs - new Date(event.startedAt).getTime()) / 1000));
      return (
        <div className="interview-live-timer">
          <span><PlayCircle size={15}/> Entrevista em atendimento</span>
          <strong>{formatClock(elapsed)}</strong>
          <small>Tempo corrido desde o início</small>
        </div>
      );
    }

    if (event.status === 'concluida') {
      return (
        <div className="interview-time-state completed">
          <CheckCircle2 size={15}/>
          <div><strong>Entrevista concluída</strong><small>{event.actualDurationSec ? `Duração: ${formatCompactDuration(event.actualDurationSec)}` : 'Duração não registrada'}</small></div>
        </div>
      );
    }

    if (!activeForStart(event.status)) return null;

    const start = localDateTime(event).getTime();
    const end = start + event.duration * 60000;
    if (nowMs < start) {
      const until = Math.floor((start - nowMs) / 1000);
      return (
        <div className="interview-time-state waiting">
          <Clock3 size={15}/>
          <div><strong>Aguardando horário</strong><small>Disponível para iniciar em {formatClock(until)}</small></div>
        </div>
      );
    }
    if (nowMs <= end) {
      const late = Math.floor((nowMs - start) / 1000);
      return (
        <div className="interview-time-state ready">
          <PlayCircle size={15}/>
          <div><strong>Horário disponível para iniciar</strong><small>{late > 30 ? `Horário começou há ${formatCompactDuration(late)}` : 'A entrevista pode ser iniciada agora'}</small></div>
        </div>
      );
    }
    return (
      <div className="interview-time-state overdue">
        <CircleAlert size={15}/>
        <div><strong>Horário ultrapassado</strong><small>O período agendado terminou. Você pode iniciar agora ou reagendar.</small></div>
      </div>
    );
  };

  return (
    <section className="interviews-module interviews-workflow">
      {awaitingSchedule.length > 0 && (
        <section className="interview-intake-panel">
          <div className="interview-intake-heading">
            <div>
              <small>ENVIADOS PARA ENTREVISTA</small>
              <h2>Aguardando agendamento</h2>
              <p>Perfis movidos para a etapa Entrevista aparecem aqui até receberem data e horário.</p>
            </div>
            <strong>{awaitingSchedule.length}</strong>
          </div>
          <div className="interview-intake-list">
            {awaitingSchedule.map(candidate => (
              <article className="interview-intake-card" key={candidate.id}>
                <span className={`interview-person-mark ${candidate.profileType}`}><UserRound size={17}/></span>
                <div><strong>{candidate.name}</strong><small>{candidate.specialty} · {candidate.profileType === 'medico' ? 'Médico' : 'Colaborador'}</small></div>
                <button type="button" className="button interview-schedule-button" onClick={() => onOpenAgenda(candidate.id)}><CalendarPlus size={14}/>Agendar entrevista</button>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="interview-ops-grid">
        <article className="interview-op-card">
          <span><CalendarDays size={17}/></span>
          <div><small>HOJE</small><strong>{todayCount}</strong><p>Entrevistas previstas para hoje</p></div>
        </article>
        <article className="interview-op-card">
          <span><BadgeCheck size={17}/></span>
          <div><small>AGUARDANDO AÇÃO</small><strong>{pendingConfirmation}</strong><p>Agendadas ou reagendadas</p></div>
        </article>
        <article className={`interview-op-card ${overdueCount ? 'attention' : ''}`}>
          <span><TimerReset size={17}/></span>
          <div><small>HORÁRIO ULTRAPASSADO</small><strong>{overdueCount}</strong><p>Precisam ser reagendadas</p></div>
        </article>
        <article className={`interview-op-card ${runningCount ? 'live' : ''}`}>
          <span><PlayCircle size={17}/></span>
          <div><small>EM ATENDIMENTO</small><strong>{runningCount}</strong><p>Cronômetros ativos</p></div>
        </article>
      </div>

      <div className="interviews-panel interview-control-center">
        <div className="interviews-panel-header interview-control-header">
          <div>
            <small>CONTROLE DE ENTREVISTAS</small>
            <h2>Gestão de entrevistas</h2>
            <p>Confirme, inicie, acompanhe o tempo, reagende, cancele e consulte o histórico de cada entrevista.</p>
          </div>
          <button type="button" className="interview-agenda-button" onClick={() => onOpenAgenda()}>
            <CalendarDays size={16}/><span>Abrir agenda</span>
          </button>
        </div>

        <div className="interview-status-tabs" role="tablist" aria-label="Status das entrevistas">
          {workflowTabs.map(item => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? 'active' : ''}
              onClick={() => setTab(item.key)}
              key={item.key}
            >
              <span>{item.label}</span>
              <strong>{counts[item.key]}</strong>
            </button>
          ))}
        </div>

        <div className="interviews-toolbar workflow-toolbar">
          <label className="interview-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nome, especialidade, entrevistador..." /></label>
          <select value={audience} onChange={e => setAudience(e.target.value as InterviewAudience | 'all')}>
            <option value="all">Médicos e colaboradores</option>
            <option value="medico">Médicos</option>
            <option value="colaborador">Colaboradores</option>
          </select>
        </div>

        <div className="interview-workflow-list">
          {filtered.map(event => {
            const start = localDateTime(event).getTime();
            const end = start + event.duration * 60000;
            const isOverdue = activeForStart(event.status) && !event.startedAt && nowMs > end;
            const canStart = activeForStart(event.status) && nowMs >= start;
            const canOpenProfile = Boolean(event.candidateId && candidates.some(c => c.id === event.candidateId));
            const logs = [...(event.logs || [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

            return (
              <article className={`interview-workflow-card status-${event.status} ${isOverdue ? 'is-overdue' : ''}`} key={event.id}>
                <div className="interview-workflow-main">
                  <div className={`interview-person-mark ${event.audience}`}>
                    {event.audience === 'medico' ? <UserRound size={18}/> : <UsersRound size={18}/>} 
                  </div>
                  <div className="interview-person-copy">
                    <div className="interview-title-line">
                      <strong>{event.personName}</strong>
                      <span className={`agenda-status ${event.status}`}>{statusLabel[event.status]}</span>
                      {isOverdue && <span className="overdue-pill">Horário ultrapassado</span>}
                    </div>
                    <p>{event.role} · {event.audience === 'medico' ? 'Médico' : 'Colaborador'}</p>
                    <div className="interview-meta-line">
                      <span><CalendarDays size={13}/>{formatDate(event.date)}</span>
                      <span><Clock3 size={13}/>{event.time} · {event.duration} min</span>
                      <span>{event.location.toLocaleLowerCase('pt-BR').includes('video') ? <Video size={13}/> : <MapPin size={13}/>} {event.location}</span>
                    </div>
                  </div>
                  <div className="interview-interviewer-badge"><small>ENTREVISTADOR</small><strong>{event.interviewer}</strong></div>
                </div>

                {renderTimingState(event)}

                <div className="interview-action-bar">
                  <div className="interview-secondary-actions">
                    {canOpenProfile && <button type="button" onClick={() => openProfile(event)}><UserRound size={14}/> Ver perfil</button>}
                    <button type="button" onClick={() => setLogOpenId(current => current === event.id ? null : event.id)}><History size={14}/> Histórico</button>
                  </div>
                  <div className="interview-primary-actions">
                    {event.status === 'agendada' && <button type="button" className="action-confirm" onClick={() => confirmInterview(event)}><BadgeCheck size={14}/> Confirmar</button>}
                    {event.status === 'reagendada' && <button type="button" className="action-confirm" onClick={() => confirmInterview(event)}><BadgeCheck size={14}/> Confirmar novo horário</button>}
                    {activeForStart(event.status) && <button type="button" className="action-start" disabled={!canStart} title={!canStart ? `Disponível a partir de ${event.time}` : 'Iniciar atendimento'} onClick={() => startInterview(event)}><PlayCircle size={14}/> Iniciar entrevista</button>}
                    {event.status === 'em_andamento' && <button type="button" className="action-complete" onClick={() => concludeInterview(event)}><CheckCircle2 size={14}/> Concluir atendimento</button>}
                    {activeForStart(event.status) && <button type="button" className={isOverdue ? 'action-reschedule emphasis' : 'action-reschedule'} onClick={() => openReschedule(event)}><RefreshCcw size={14}/> Reagendar</button>}
                    {activeForStart(event.status) && <button type="button" className="action-cancel" onClick={() => cancelInterview(event)}><XCircle size={14}/> Cancelar</button>}
                  </div>
                </div>

                {logOpenId === event.id && (
                  <div className="interview-log-panel">
                    <div className="interview-log-heading"><History size={14}/><div><strong>Histórico da entrevista</strong><small>Registro das ações realizadas neste agendamento.</small></div></div>
                    <div className="interview-log-list">
                      {logs.length ? logs.map(log => (
                        <div className="interview-log-item" key={log.id}>
                          <span className={`log-dot action-${log.action}`}/>
                          <div><strong>{log.label}</strong>{log.details && <p>{log.details}</p>}<small>{formatDateTime(log.at)}</small></div>
                        </div>
                      )) : <div className="interview-log-empty">Nenhum registro disponível.</div>}
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {!filtered.length && (
            <div className="interviews-empty workflow-empty">
              <span>{tab === 'concluida' ? <CheckCircle2 size={22}/> : tab === 'cancelada' ? <XCircle size={22}/> : <PauseCircle size={22}/>}</span>
              <strong>Nenhuma entrevista em “{statusLabel[tab]}”</strong>
              <p>Esta aba mostra somente entrevistas com esse status.</p>
              {tab !== 'concluida' && tab !== 'cancelada' && <button type="button" onClick={() => onOpenAgenda()}>Abrir agenda</button>}
            </div>
          )}
        </div>
      </div>

      {confirmTarget && (
        <Portal><div className="interview-confirm-layer" onMouseDown={event => { if (event.target === event.currentTarget) setConfirmTarget(null); }}>
          <section className="interview-confirm-card confirm" role="alertdialog" aria-modal="true" aria-label="Confirmar entrevista">
            <button type="button" className="interview-confirm-close" onClick={() => setConfirmTarget(null)} aria-label="Fechar"><X size={16}/></button>
            <span className="interview-confirm-icon confirm"><BadgeCheck size={20}/></span>
            <div className="interview-confirm-copy">
              <small>CONFIRMAR ENTREVISTA</small>
              <h3>Tem certeza que deseja confirmar?</h3>
              <p><strong>{confirmTarget.personName}</strong> ficará com a entrevista confirmada para <strong>{formatDate(confirmTarget.date)} às {confirmTarget.time}</strong> e o perfil seguirá para Decisão de contratação.</p>
            </div>
            <div className="interview-confirm-actions">
              <button type="button" className="button button-secondary" onClick={() => setConfirmTarget(null)}>Voltar</button>
              <button type="button" className="button interview-confirm-button" onClick={confirmConfirmation}><BadgeCheck size={14}/>Confirmar entrevista</button>
            </div>
          </section>
        </div></Portal>
      )}

      {cancelTarget && (
        <Portal><div className="interview-confirm-layer" onMouseDown={event => { if (event.target === event.currentTarget) setCancelTarget(null); }}>
          <section className="interview-confirm-card" role="alertdialog" aria-modal="true" aria-label="Confirmar cancelamento">
            <button type="button" className="interview-confirm-close" onClick={() => setCancelTarget(null)} aria-label="Fechar"><X size={16}/></button>
            <span className="interview-confirm-icon"><CircleAlert size={20}/></span>
            <div className="interview-confirm-copy">
              <small>CONFIRMAR CANCELAMENTO</small>
              <h3>Cancelar entrevista?</h3>
              <p>O agendamento de <strong>{cancelTarget.personName}</strong>, marcado para <strong>{formatDate(cancelTarget.date)} às {cancelTarget.time}</strong>, será movido para a aba Canceladas.</p>
            </div>
            <div className="interview-confirm-actions">
              <button type="button" className="button button-secondary" onClick={() => setCancelTarget(null)}>Manter agendamento</button>
              <button type="button" className="button interview-danger-button" onClick={confirmCancellation}><XCircle size={14}/>Cancelar entrevista</button>
            </div>
          </section>
        </div></Portal>
      )}

      {reschedule && (
        <Portal><div className="interview-action-layer" onMouseDown={event => { if (event.target === event.currentTarget) setReschedule(null); }}>
          <section className="interview-reschedule-card" role="dialog" aria-modal="true" aria-label="Reagendar entrevista">
            <button type="button" className="interview-reschedule-close" onClick={() => setReschedule(null)} aria-label="Fechar"><X size={16}/></button>
            <div className="interview-reschedule-heading">
              <span><RefreshCcw size={18}/></span>
              <div><small>REAGENDAMENTO</small><h3>Escolher novo horário</h3><p>O histórico anterior será mantido automaticamente.</p></div>
            </div>
            <div className="interview-reschedule-form">
              <label>Nova data<input type="date" value={reschedule.date} onChange={e => setReschedule(prev => prev ? { ...prev, date: e.target.value } : prev)}/></label>
              <label>Novo horário<input type="time" value={reschedule.time} onChange={e => setReschedule(prev => prev ? { ...prev, time: e.target.value } : prev)}/></label>
              <label>Duração<select value={reschedule.duration} onChange={e => setReschedule(prev => prev ? { ...prev, duration: Number(e.target.value) } : prev)}><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hora</option><option value={90}>1h30</option></select></label>
              <label>Entrevistador<input value={reschedule.interviewer} onChange={e => setReschedule(prev => prev ? { ...prev, interviewer: e.target.value } : prev)}/></label>
              <label className="span-2">Local / link<input value={reschedule.location} onChange={e => setReschedule(prev => prev ? { ...prev, location: e.target.value } : prev)} placeholder="Sala ou videochamada"/></label>
            </div>
            {rescheduleError && <div className="interview-reschedule-error">{rescheduleError}</div>}
            <div className="interview-reschedule-actions">
              <button type="button" className="button button-secondary" onClick={() => setReschedule(null)}>Cancelar</button>
              <button type="button" className="button button-primary" onClick={submitReschedule}><RefreshCcw size={14}/>Salvar reagendamento</button>
            </div>
          </section>
        </div></Portal>
      )}
    </section>
  );
}
