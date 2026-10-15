import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarClock, CheckCheck, ClipboardList, FileText, Mail, TriangleAlert } from 'lucide-react';
import { Icons } from '../icons';
import type { AppNotification } from '../notifications';
import type { UserProfile } from '../types';

type Props = {
  profile: UserProfile;
  onMenu: () => void;
  onProfile: () => void;
  notifications: AppNotification[];
  readNotificationIds: string[];
  onNotificationOpen: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
};

const kindIcon = (kind: AppNotification['kind']) => {
  if (kind === 'curriculo') return <FileText size={16}/>;
  if (kind === 'agenda') return <CalendarClock size={16}/>;
  if (kind === 'atraso') return <TriangleAlert size={16}/>;
  return <ClipboardList size={16}/>;
};

export default function Topbar({ profile, onMenu, onProfile, notifications, readNotificationIds, onNotificationOpen, onMarkAllRead }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(item => !readNotificationIds.includes(item.id)).length;
  const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'CO';

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  const openNotification = (notification: AppNotification) => {
    setOpen(false);
    onNotificationOpen(notification);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-icon-button menu-trigger" onClick={onMenu} aria-label="Abrir ou recolher navegação"><Icons.Menu size={22} /></button>
        <span className="topbar-dot">•</span>
        <div className="topbar-title">
          <small>PAINEL ADMINISTRATIVO</small>
          <strong>Recrutamento</strong>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="notification-wrap" ref={wrapRef}>
          <button className={`topbar-icon-button notification-button ${open ? 'active' : ''}`} aria-label="Notificações" onClick={() => setOpen(value => !value)}>
            <Bell size={20} />{unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {open && (
            <section className="notification-panel" aria-label="Central de notificações">
              <div className="notification-panel-head">
                <div><small>CENTRAL DE NOTIFICAÇÕES</small><strong>Recrutamento em tempo real</strong></div>
                <button type="button" onClick={onMarkAllRead} disabled={!unreadCount}><CheckCheck size={15}/> Marcar lidas</button>
              </div>
              <div className="notification-list">
                {notifications.slice(0, 12).map(notification => {
                  const unread = !readNotificationIds.includes(notification.id);
                  return (
                    <button key={notification.id} type="button" className={`notification-item ${unread ? 'unread' : ''} kind-${notification.kind}`} onClick={() => openNotification(notification)}>
                      <span className="notification-kind-icon">{kindIcon(notification.kind)}</span>
                      <span className="notification-copy"><strong>{notification.title}</strong><span>{notification.description}</span>{notification.meta && <small>{notification.meta}</small>}</span>
                      {unread && <span className="notification-unread-dot" aria-label="Não lida"/>}
                    </button>
                  );
                })}
                {!notifications.length && <div className="notification-empty"><Bell size={19}/><strong>Tudo em dia</strong><span>Novos currículos, decisões e horários de entrevista aparecerão aqui.</span></div>}
              </div>
              <div className="notification-panel-foot"><span><FileText size={13}/> Currículos</span><span><CalendarClock size={13}/> Agenda</span><span><TriangleAlert size={13}/> Alertas</span></div>
            </section>
          )}
        </div>
        <button className="topbar-icon-button" aria-label="Mensagens"><Mail size={20} /></button>
        <span className="topbar-separator" />
        <button className="topbar-account" type="button" onClick={onProfile}>
          <span className="account-avatar">{initials}</span>
          <span title={profile.name}>{profile.name}</span>
          <Icons.ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}

