import type { Candidate, InterviewEvent } from './types';
import type { ModuleKey } from './components/Sidebar';

export type NotificationKind = 'curriculo' | 'agenda' | 'atraso' | 'decisao';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  meta?: string;
  module: ModuleKey;
  createdAt: string;
  priority: 1 | 2 | 3;
};

const toDate = (event: InterviewEvent) => new Date(`${event.date}T${event.time}:00`);
const formatDayTime = (value: Date) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
}).format(value);

export function buildNotifications(candidates: Candidate[], events: InterviewEvent[], now = new Date()): AppNotification[] {
  const notifications: AppNotification[] = [];

  candidates
    .filter(candidate => candidate.status === 'novo')
    .forEach(candidate => {
      notifications.push({
        id: `curriculo-${candidate.id}-${candidate.createdAt}`,
        kind: 'curriculo',
        title: `Novo currículo • ${candidate.profileType === 'medico' ? 'Médico' : 'Colaborador'}`,
        description: candidate.name,
        meta: candidate.specialty,
        module: 'candidates',
        createdAt: candidate.createdAt,
        priority: 2
      });
    });

  candidates
    .filter(candidate => candidate.status === 'aguardando')
    .forEach(candidate => {
      notifications.push({
        id: `decisao-${candidate.id}-${candidate.statusUpdatedAt || candidate.createdAt}`,
        kind: 'decisao',
        title: 'Decisão de contratação pendente',
        description: candidate.name,
        meta: candidate.profileType === 'medico' ? `Médico • ${candidate.specialty}` : `Colaborador • ${candidate.specialty}`,
        module: 'waiting',
        createdAt: candidate.statusUpdatedAt || candidate.createdAt,
        priority: 1
      });
    });

  events
    .filter(event => ['agendada', 'confirmada', 'reagendada'].includes(event.status))
    .forEach(event => {
      const start = toDate(event);
      const end = new Date(start.getTime() + event.duration * 60000);
      const msToStart = start.getTime() - now.getTime();

      if (end.getTime() < now.getTime()) {
        notifications.push({
          id: `atraso-${event.id}-${event.updatedAt || event.createdAt}`,
          kind: 'atraso',
          title: 'Horário de entrevista ultrapassado',
          description: event.personName,
          meta: `${formatDayTime(start)} • ${event.interviewer}`,
          module: 'interviews',
          createdAt: event.updatedAt || event.createdAt,
          priority: 3
        });
        return;
      }

      if (msToStart >= 0 && msToStart <= 7 * 24 * 60 * 60 * 1000) {
        const minutes = Math.max(0, Math.round(msToStart / 60000));
        const title = minutes <= 60
          ? `Entrevista em ${minutes} min`
          : minutes <= 24 * 60
            ? `Entrevista em ${Math.round(minutes / 60)} h`
            : 'Entrevista programada';
        notifications.push({
          id: `agenda-${event.id}-${event.updatedAt || event.createdAt}`,
          kind: 'agenda',
          title,
          description: event.personName,
          meta: `${formatDayTime(start)} • ${event.location}`,
          module: 'agenda',
          createdAt: event.updatedAt || event.createdAt,
          priority: minutes <= 60 ? 3 : minutes <= 24 * 60 ? 2 : 1
        });
      }
    });

  return notifications.sort((a, b) => b.priority - a.priority || +new Date(b.createdAt) - +new Date(a.createdAt));
}
