import { useEffect, useMemo, useState } from 'react';
import Portal from './Portal';
import {
  CalendarDays,
  Clock3,
  Filter,
  Grid3X3,
  List,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  Video,
  X
} from 'lucide-react';
import type { Candidate, InterviewAudience, InterviewEvent, InterviewLogEntry, InterviewStatus } from '../types';
import { formatPhoneBR } from '../phone';

type Props = {
  candidates: Candidate[];
  events: InterviewEvent[];
  onSave: (event: InterviewEvent) => void;
  onDelete: (id: string) => void;
  onOpenCandidate: (candidate: Candidate) => void;
  initialCandidateId?: number | null;
  onInitialCandidateConsumed?: () => void;
};

type CalendarView = 'month' | 'week' | 'day' | 'list';

type Draft = {
  id?: string;
  audience: InterviewAudience;
  candidateId: string;
  personName: string;
  role: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  duration: string;
  interviewer: string;
  location: string;
  notes: string;
  status: InterviewStatus;
  createdAt?: string;
};

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const HOURS = Array.from({ length: 14 }, (_, index) => index + 7);
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const shortFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

const statusLabel: Record<InterviewStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  reagendada: 'Reagendada',
  em_andamento: 'Em atendimento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function timeFromHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function newDraft(date: string, time = '09:00'): Draft {
  return {
    audience: 'medico',
    candidateId: '',
    personName: '',
    role: '',
    email: '',
    phone: '',
    date,
    time,
    duration: '30',
    interviewer: 'Equipe de recrutamento',
    location: 'Videochamada',
    notes: '',
    status: 'agendada'
  };
}

function EventBadge({ event, onClick, draggable = false, onDragStart }: { event: InterviewEvent; onClick: () => void; draggable?: boolean; onDragStart?: () => void }) {
  return (
    <button
      type="button"
      className={`calendar-event-badge ${event.audience} status-${event.status}`}
      onClick={event => { event.stopPropagation(); onClick(); }}
      draggable={draggable}
      onDragStart={onDragStart}
      title={`${event.time} • ${event.personName}`}
    >
      <span>{event.time}</span>
      <strong>{event.personName}</strong>
    </button>
  );
}

export default function Agenda({ candidates, events, onSave, onDelete, onOpenCandidate, initialCandidateId = null, onInitialCandidateConsumed }: Props) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<CalendarView>('month');
  const [query, setQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'todos' | InterviewAudience>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | InterviewStatus>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsDate, setDetailsDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => newDraft(todayKey));
  const [formError, setFormError] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCandidateId) return;
    const candidate = candidates.find(item => item.id === initialCandidateId);
    if (!candidate) {
      onInitialCandidateConsumed?.();
      return;
    }
    const base = newDraft(todayKey);
    setDetailsDate(null);
    setDraft({
      ...base,
      audience: candidate.profileType,
      candidateId: String(candidate.id),
      personName: candidate.name,
      role: candidate.specialty,
      email: candidate.email,
      phone: formatPhoneBR(candidate.phone || '')
    });
    setFormError('');
    setModalOpen(true);
    onInitialCandidateConsumed?.();
  }, [initialCandidateId, candidates, todayKey, onInitialCandidateConsumed]);

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return events
      .filter(event => event.status !== 'concluida')
      .filter(event => audienceFilter === 'todos' || event.audience === audienceFilter)
      .filter(event => statusFilter === 'todos' || event.status === statusFilter)
      .filter(event => {
        if (!term) return true;
        return [event.personName, event.role, event.interviewer, event.location, event.email, event.phone]
          .filter(Boolean)
          .some(value => String(value).toLocaleLowerCase('pt-BR').includes(term));
      })
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  }, [events, audienceFilter, statusFilter, query]);

  const metrics = useMemo(() => {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);
    const endKey = toDateKey(endDate);
    const valid = events.filter(event => !['cancelada', 'concluida'].includes(event.status));
    return {
      today: valid.filter(event => event.date === todayKey).length,
      week: valid.filter(event => event.date >= todayKey && event.date <= endKey).length,
      doctors: valid.filter(event => event.audience === 'medico').length,
      staff: valid.filter(event => event.audience === 'colaborador').length
    };
  }, [events, todayKey]);

  const openNew = (date = toDateKey(currentDate), time = '09:00') => {
    setDetailsDate(null);
    setDraft(newDraft(date, time));
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (event: InterviewEvent) => {
    setDetailsDate(null);
    setDraft({
      id: event.id,
      audience: event.audience,
      candidateId: event.candidateId ? String(event.candidateId) : '',
      personName: event.personName,
      role: event.role,
      email: event.email || '',
      phone: formatPhoneBR(event.phone || ''),
      date: event.date,
      time: event.time,
      duration: String(event.duration),
      interviewer: event.interviewer,
      location: event.location,
      notes: event.notes,
      status: event.status,
      createdAt: event.createdAt
    });
    setFormError('');
    setModalOpen(true);
  };

  const selectCandidate = (candidateId: string) => {
    const candidate = candidates.find(item => String(item.id) === candidateId);
    setDraft(prev => ({
      ...prev,
      candidateId,
      personName: candidate?.name || '',
      role: candidate?.specialty || '',
      email: candidate?.email || '',
      phone: formatPhoneBR(candidate?.phone || '')
    }));
  };

  const submitDraft = () => {
    if (!draft.date || !draft.time || !draft.personName.trim() || !draft.role.trim()) {
      setFormError('Preencha data, horário, nome e cargo/especialidade.');
      return;
    }
    if (!draft.candidateId) {
      setFormError(`Selecione um ${draft.audience === 'medico' ? 'médico' : 'colaborador'} cadastrado para continuar.`);
      return;
    }

    if (draft.candidateId) {
      const duplicateInterview = events.find(event =>
        event.id !== draft.id &&
        event.audience === draft.audience &&
        event.candidateId === Number(draft.candidateId) &&
        ['agendada', 'confirmada', 'reagendada', 'em_andamento'].includes(event.status)
      );
      if (duplicateInterview) {
        const [year, month, day] = duplicateInterview.date.split('-');
        setFormError(`Este ${draft.audience === 'medico' ? 'médico' : 'colaborador'} já possui entrevista ${duplicateInterview.status === 'confirmada' ? 'confirmada' : 'agendada'} em ${day}/${month}/${year} às ${duplicateInterview.time}. Edite o compromisso existente na agenda.`);
        return;
      }
    }

    const start = minutesFromTime(draft.time);
    const duration = Math.max(15, Number(draft.duration) || 30);
    const end = start + duration;
    const conflict = events.some(event => {
      if (event.id === draft.id || event.date !== draft.date || ['cancelada', 'concluida'].includes(event.status)) return false;
      if (event.interviewer.trim().toLowerCase() !== draft.interviewer.trim().toLowerCase()) return false;
      const eventStart = minutesFromTime(event.time);
      const eventEnd = eventStart + event.duration;
      return start < eventEnd && end > eventStart;
    });
    if (conflict) {
      setFormError('Este entrevistador já possui outro compromisso nesse horário. Escolha outro período.');
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: draft.id || `interview-${Date.now()}`,
      audience: draft.audience,
      candidateId: Number(draft.candidateId),
      personName: draft.personName.trim(),
      role: draft.role.trim(),
      email: draft.email.trim(),
      phone: formatPhoneBR(draft.phone),
      date: draft.date,
      time: draft.time,
      duration,
      interviewer: draft.interviewer.trim() || 'Equipe de recrutamento',
      location: draft.location.trim() || 'A definir',
      notes: draft.notes.trim(),
      status: draft.status,
      createdAt: draft.createdAt || now,
      updatedAt: draft.id ? now : undefined
    });
    setModalOpen(false);
  };

  const moveEvent = (date: string, hour?: number) => {
    if (!draggedId) return;
    const event = events.find(item => item.id === draggedId);
    if (!event) return;
    const nextTime = hour === undefined ? event.time : timeFromHour(hour);
    const log: InterviewLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      action: 'reagendada',
      label: 'Entrevista reagendada pela agenda',
      details: `${event.date} às ${event.time} para ${date} às ${nextTime}.`
    };
    onSave({
      ...event,
      date,
      time: nextTime,
      status: 'reagendada',
      startedAt: undefined,
      completedAt: undefined,
      actualDurationSec: undefined,
      logs: [...(event.logs || []), log],
      updatedAt: new Date().toISOString()
    });
    setDraggedId(null);
  };

  const navigate = (direction: -1 | 1) => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (view === 'month') next.setMonth(prev.getMonth() + direction);
      else if (view === 'week') next.setDate(prev.getDate() + direction * 7);
      else next.setDate(prev.getDate() + direction);
      return next;
    });
  };

  const setToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));


  const openDateDetails = (date: string) => {
    setModalOpen(false);
    setDetailsDate(date);
  };

  const handleCalendarSlot = (date: string, time = '09:00', slotEvents?: InterviewEvent[]) => {
    const dateEvents = slotEvents ?? filteredEvents.filter(event => event.date === date);
    if (dateEvents.length > 0) openDateDetails(date);
    else openNew(date, time);
  };

  const detailsEvents = useMemo(() =>
    detailsDate ? filteredEvents.filter(event => event.date === detailsDate) : [],
    [detailsDate, filteredEvents]
  );

  const monthCells = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const base = new Date(currentDate);
    const mondayOffset = (base.getDay() + 6) % 7;
    base.setDate(base.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() + index);
      return date;
    });
  }, [currentDate]);

  const dateTitle = view === 'month'
    ? monthFormatter.format(currentDate)
    : view === 'week'
      ? `Semana de ${shortFormatter.format(weekDays[0])}`
      : view === 'day'
        ? dayFormatter.format(currentDate)
        : 'Próximas entrevistas';

  const renderMonth = () => (
    <div className="event-month-view">
      <div className="event-weekdays">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
      <div className="event-month-grid">
        {monthCells.map(date => {
          const key = toDateKey(date);
          const dayEvents = filteredEvents.filter(event => event.date === key);
          const isToday = key === todayKey;
          const outside = date.getMonth() !== currentDate.getMonth();
          return (
            <div
              key={key}
              className={`event-month-day ${isToday ? 'today' : ''} ${outside ? 'outside' : ''} ${dayEvents.length ? 'has-events' : 'empty-slot'}`}
              onClick={() => handleCalendarSlot(key, '09:00', dayEvents)}
              onDragOver={event => event.preventDefault()}
              onDrop={() => moveEvent(key)}
            >
              <button type="button" className="event-day-number" onClick={event => { event.stopPropagation(); handleCalendarSlot(key, '09:00', dayEvents); }}>{date.getDate()}</button>
              <div className="event-day-stack">
                {dayEvents.slice(0, 3).map(event => <EventBadge key={event.id} event={event} onClick={() => openDateDetails(key)} draggable onDragStart={() => setDraggedId(event.id)}/>)}
                {dayEvents.length > 3 && <span className="event-more">+{dayEvents.length - 3} entrevistas</span>}
              </div>
              {!dayEvents.length && !outside && <span className="event-empty-slot-hint"><Plus size={11}/> Agendar</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeek = () => (
    <div className="event-week-scroll">
      <div className="event-week-grid event-week-header">
        <span className="event-time-head">HORÁRIO</span>
        {weekDays.map(day => <button type="button" key={toDateKey(day)} onClick={() => { setCurrentDate(day); setView('day'); }}><strong>{WEEKDAYS[(day.getDay() + 6) % 7]}</strong><small>{day.getDate()}</small></button>)}
      </div>
      <div className="event-week-body">
        {HOURS.map(hour => (
          <div className="event-week-grid event-hour-row" key={hour}>
            <span className="event-hour-label">{timeFromHour(hour)}</span>
            {weekDays.map(day => {
              const key = toDateKey(day);
              const dayEvents = filteredEvents.filter(event => event.date === key && Number(event.time.slice(0, 2)) === hour);
              return (
                <div key={`${key}-${hour}`} className={`event-hour-cell ${dayEvents.length ? 'has-events' : 'empty-slot'}`} onClick={() => handleCalendarSlot(key, timeFromHour(hour), dayEvents)} onDragOver={event => event.preventDefault()} onDrop={() => moveEvent(key, hour)}>
                  {dayEvents.map(event => <EventBadge key={event.id} event={event} onClick={() => openDateDetails(key)} draggable onDragStart={() => setDraggedId(event.id)}/>)}
                  {!dayEvents.length && <span className="event-hour-add-hint"><Plus size={10}/></span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const renderDay = () => {
    const key = toDateKey(currentDate);
    return (
      <div className="event-day-view">
        {HOURS.map(hour => {
          const hourEvents = filteredEvents.filter(event => event.date === key && Number(event.time.slice(0, 2)) === hour);
          return (
            <div className={`event-day-hour ${hourEvents.length ? 'has-events' : 'empty-slot'}`} key={hour} onClick={() => handleCalendarSlot(key, timeFromHour(hour), hourEvents)} onDragOver={event => event.preventDefault()} onDrop={() => moveEvent(key, hour)}>
              <span>{timeFromHour(hour)}</span>
              <div>{hourEvents.map(event => <EventBadge key={event.id} event={event} onClick={() => openDateDetails(key)} draggable onDragStart={() => setDraggedId(event.id)}/>)}{!hourEvents.length && <span className="event-day-add-hint"><Plus size={11}/> Adicionar entrevista</span>}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderList = () => {
    const groups = filteredEvents.reduce<Record<string, InterviewEvent[]>>((acc, event) => {
      (acc[event.date] ||= []).push(event);
      return acc;
    }, {});
    return (
      <div className="event-list-view">
        {!filteredEvents.length && <div className="event-empty"><CalendarDays size={24}/><strong>Nenhuma entrevista encontrada</strong><span>Ajuste os filtros ou crie um novo agendamento.</span></div>}
        {Object.entries(groups).map(([date, items]) => (
          <section key={date} className="event-list-group">
            <div className="event-list-date"><strong>{dayFormatter.format(dateFromKey(date))}</strong><span>{items.length} compromisso{items.length !== 1 ? 's' : ''}</span></div>
            <div className="event-list-items">
              {items.map(event => (
                <button type="button" key={event.id} className={`event-list-card ${event.audience}`} onClick={() => openDateDetails(event.date)}>
                  <span className="event-list-time">{event.time}<small>{event.duration} min</small></span>
                  <span className={`event-person-icon ${event.audience}`}>{event.audience === 'medico' ? <StethoscopeIcon/> : <UsersRound size={17}/>}</span>
                  <span className="event-list-copy"><strong>{event.personName}</strong><small>{event.role} • {event.location}</small></span>
                  <em className={`event-status ${event.status}`}>{statusLabel[event.status]}</em>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="event-manager-page">
      <div className="agenda-overview-strip">
        <article className="agenda-overview-card blue"><span><CalendarDays size={19}/></span><div><small>HOJE</small><strong>{metrics.today}</strong><p>entrevistas</p></div></article>
        <article className="agenda-overview-card beige"><span><Clock3 size={19}/></span><div><small>PRÓXIMOS 7 DIAS</small><strong>{metrics.week}</strong><p>compromissos</p></div></article>
        <article className="agenda-overview-card teal"><span><UserRound size={19}/></span><div><small>MÉDICOS</small><strong>{metrics.doctors}</strong><p>agendamentos</p></div></article>
        <article className="agenda-overview-card rose"><span><UsersRound size={19}/></span><div><small>COLABORADORES</small><strong>{metrics.staff}</strong><p>agendamentos</p></div></article>
      </div>

      <section className="event-manager-shell">
        <header className="event-manager-header">
          <div className="event-date-controls">
            <div><small>AGENDA DE RECRUTAMENTO</small><h2>{dateTitle}</h2></div>
            <div className="event-nav-buttons"><button type="button" onClick={() => navigate(-1)}>Anterior</button><button type="button" className="today" onClick={setToday}>Hoje</button><button type="button" onClick={() => navigate(1)}>Próximo</button></div>
          </div>
          <div className="event-view-actions">
            <div className="event-view-switch">
              <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}><CalendarDays size={14}/><span>Mês</span></button>
              <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}><Grid3X3 size={14}/><span>Semana</span></button>
              <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}><Clock3 size={14}/><span>Dia</span></button>
              <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={14}/><span>Lista</span></button>
            </div>
            <button className="button button-primary event-new" onClick={() => openNew(todayKey)}><Plus size={16}/>Nova entrevista</button>
          </div>
        </header>

        <div className="event-filters">
          <label className="event-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome, cargo, local ou entrevistador..."/>{query && <button type="button" onClick={() => setQuery('')}><X size={14}/></button>}</label>
          <label className="event-filter-select"><Filter size={14}/><select value={audienceFilter} onChange={event => setAudienceFilter(event.target.value as typeof audienceFilter)}><option value="todos">Todos os perfis</option><option value="medico">Médicos</option><option value="colaborador">Colaboradores</option></select></label>
          <label className="event-filter-select"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}><option value="todos">Todos os status</option><option value="agendada">Agendada</option><option value="confirmada">Confirmada</option><option value="reagendada">Reagendada</option><option value="em_andamento">Em atendimento</option><option value="cancelada">Cancelada</option></select></label>
        </div>

        <div className="event-calendar-surface">
          {view === 'month' && renderMonth()}
          {view === 'week' && renderWeek()}
          {view === 'day' && renderDay()}
          {view === 'list' && renderList()}
        </div>
      </section>

      {detailsDate && (
        <Portal><div className="event-details-layer" onMouseDown={event => { if (event.target === event.currentTarget) setDetailsDate(null); }}>
          <section className="event-details-card" role="dialog" aria-modal="false" aria-label="Detalhes dos agendamentos">
            <header className="event-details-header">
              <div>
                <small>AGENDA • {detailsEvents.length} {detailsEvents.length === 1 ? 'COMPROMISSO' : 'COMPROMISSOS'}</small>
                <h3>{detailsDate ? dayFormatter.format(dateFromKey(detailsDate)) : ''}</h3>
              </div>
              <div className="event-details-header-actions">
                <button type="button" className="event-details-add" onClick={() => openNew(detailsDate, '09:00')}><Plus size={14}/>Adicionar</button>
                <button type="button" className="event-details-close" onClick={() => setDetailsDate(null)} aria-label="Fechar"><X size={16}/></button>
              </div>
            </header>

            <div className="event-details-list">
              {detailsEvents.map(event => (
                <article className={`event-detail-item ${event.audience}`} key={event.id}>
                  <div className="event-detail-title">
                    <span className={`event-person-icon ${event.audience}`}>{event.audience === 'medico' ? <StethoscopeIcon/> : <UsersRound size={17}/>}</span>
                    <div><strong>{event.personName}</strong><small>{event.role}</small></div>
                    <em className={`event-status ${event.status}`}>{statusLabel[event.status]}</em>
                  </div>

                  <div className="event-detail-timebar">
                    <span><Clock3 size={13}/><strong>{event.time}</strong> • {event.duration} min</span>
                    <span>{event.location.toLowerCase().includes('video') ? <Video size={13}/> : <MapPin size={13}/>} {event.location || 'Local a definir'}</span>
                  </div>

                  <div className="event-detail-grid">
                    <div><small>Entrevistador</small><strong>{event.interviewer || 'Equipe de recrutamento'}</strong></div>
                    <div><small>Tipo</small><strong>{event.audience === 'medico' ? 'Médico' : 'Colaborador'}</strong></div>
                    <div><small>E-mail</small><strong>{event.email || 'Não informado'}</strong></div>
                    <div><small>Telefone</small><strong>{event.phone ? formatPhoneBR(event.phone) : 'Não informado'}</strong></div>
                    <div className="span-2"><small>Observações</small><strong>{event.notes || 'Sem observações para este agendamento.'}</strong></div>
                  </div>

                  <footer className="event-detail-actions">
                    {event.candidateId && <button className="button button-ghost" type="button" onClick={() => { const candidate = candidates.find(item => item.id === event.candidateId); if (candidate) onOpenCandidate(candidate); }}><UserRound size={13}/>Ver perfil</button>}
                    <button className="button button-primary" type="button" onClick={() => openEdit(event)}><Pencil size={13}/>Editar</button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </div></Portal>
      )}

      {modalOpen && (
        <Portal><div className="modal-backdrop event-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="agenda-modal event-editor" role="dialog" aria-modal="true" aria-label="Agendar entrevista">
            <button className="modal-close" type="button" onClick={() => setModalOpen(false)}><X size={17}/></button>
            <div className="agenda-modal-heading"><span className="agenda-modal-icon"><CalendarDays size={20}/></span><div><small>{draft.id ? 'EDITAR ENTREVISTA' : 'NOVA ENTREVISTA'}</small><h2>{draft.id ? 'Atualizar agendamento' : 'Agendar entrevista'}</h2><p>Escolha o perfil, horário e os detalhes da conversa.</p></div></div>

            <div className="agenda-person-type">
              <button type="button" className={draft.audience === 'medico' ? 'selected' : ''} onClick={() => setDraft(prev => ({ ...newDraft(prev.date, prev.time), id: prev.id, createdAt: prev.createdAt, audience: 'medico', status: prev.status }))}><span><UserRound size={18}/></span><div><strong>Médico</strong><small>Selecionar candidato cadastrado</small></div><i/></button>
              <button type="button" className={draft.audience === 'colaborador' ? 'selected' : ''} onClick={() => setDraft(prev => ({ ...newDraft(prev.date, prev.time), id: prev.id, createdAt: prev.createdAt, audience: 'colaborador', status: prev.status }))}><span><UsersRound size={18}/></span><div><strong>Colaborador</strong><small>Entrevista administrativa ou operacional</small></div><i/></button>
            </div>

            <div className="agenda-form">
              <label className="span-2">{draft.audience === 'medico' ? 'Médico candidato' : 'Colaborador candidato'}<select value={draft.candidateId} onChange={event => selectCandidate(event.target.value)}><option value="">Selecione um perfil disponível</option>{candidates.filter(candidate => {
                if (candidate.profileType !== draft.audience || candidate.status === 'reprovado') return false;
                if (String(candidate.id) === draft.candidateId) return true;
                return !events.some(item => item.audience === draft.audience && item.candidateId === candidate.id && ['agendada', 'confirmada', 'reagendada', 'em_andamento'].includes(item.status));
              }).map(candidate => <option value={candidate.id} key={candidate.id}>{candidate.name} — {candidate.specialty}</option>)}</select><small className="field-hint">Perfis com entrevista ativa não aparecem novamente nesta lista.</small></label>
              <label>Data<input type="date" value={draft.date} onChange={event => setDraft(prev => ({ ...prev, date: event.target.value }))}/></label>
              <label>Horário<input type="time" value={draft.time} onChange={event => setDraft(prev => ({ ...prev, time: event.target.value }))}/></label>
              <label>Duração<select value={draft.duration} onChange={event => setDraft(prev => ({ ...prev, duration: event.target.value }))}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1h30</option></select></label>
              <div className="agenda-status-readonly"><small>Situação</small><strong>{statusLabel[draft.status]}</strong><span>Alterações de status são feitas na Central de Entrevistas.</span></div>
              <label>Entrevistador<input value={draft.interviewer} onChange={event => setDraft(prev => ({ ...prev, interviewer: event.target.value }))}/></label>
              <label>Local / link<input value={draft.location} onChange={event => setDraft(prev => ({ ...prev, location: event.target.value }))} placeholder="Sala ou videochamada"/></label>
              <label>E-mail<input type="email" value={draft.email} onChange={event => setDraft(prev => ({ ...prev, email: event.target.value }))}/></label>
              <label>Telefone<input value={draft.phone} inputMode="tel" maxLength={15} placeholder="(__) _____-____" onChange={event => setDraft(prev => ({ ...prev, phone: formatPhoneBR(event.target.value) }))}/></label>
              <label className="span-2">Observações<textarea rows={3} value={draft.notes} onChange={event => setDraft(prev => ({ ...prev, notes: event.target.value }))} placeholder="Pontos para abordar na entrevista..."/></label>
            </div>

            {formError && <div className="agenda-form-error">{formError}</div>}
            <div className="event-editor-meta">
              <span><Clock3 size={13}/>{draft.time || '--:--'} • {draft.duration || 30} min</span>
              <span>{draft.location.toLowerCase().includes('video') ? <Video size={13}/> : <MapPin size={13}/>} {draft.location || 'Local a definir'}</span>
            </div>
            <div className="agenda-modal-actions">
              {draft.id && <button className="button event-delete" type="button" onClick={() => { onDelete(draft.id!); setModalOpen(false); }}><Trash2 size={14}/>Excluir</button>}
              {draft.id && draft.candidateId && <button className="button button-ghost" type="button" onClick={() => { const candidate = candidates.find(item => item.id === Number(draft.candidateId)); if (candidate) onOpenCandidate(candidate); }}><UserRound size={14}/>Ver perfil</button>}
              <button className="button button-secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="button button-primary" type="button" onClick={submitDraft}><Pencil size={14}/>{draft.id ? 'Salvar alterações' : 'Agendar entrevista'}</button>
            </div>
          </section>
        </div></Portal>
      )}
    </div>
  );
}

function StethoscopeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3v5a5 5 0 0 0 10 0V3M4 3h4M14 3h4"/><path d="M11 13v2a4 4 0 0 0 8 0v-1"/><circle cx="19" cy="11" r="2"/></svg>;
}
