import { Icons } from '../icons';
import type { Candidate } from '../types';

export default function Messages({ candidates }: { candidates: Candidate[] }) {
  const recent = [...candidates].slice(0, 5);
  return (
    <section className="messages-layout">
      <article className="module-panel communication-compose">
        <div className="module-panel-heading"><div><small>COMUNICAÇÕES</small><h2>Central da equipe</h2></div><Icons.Message size={21}/></div>
        <div className="compose-card"><span>Mensagem interna</span><textarea rows={5} placeholder="Escreva uma observação para a equipe de recrutamento..."/><div><button className="button button-secondary" type="button">Salvar rascunho</button><button className="button button-primary" type="button">Registrar mensagem</button></div></div>
      </article>
      <article className="module-panel recent-contacts">
        <div className="module-panel-heading"><div><small>CONTATOS</small><h2>Candidatos recentes</h2></div></div>
        <div className="contact-list">{recent.map(candidate => <div key={candidate.id}><span>{candidate.initials}</span><div><strong>{candidate.name}</strong><small>{candidate.email}</small></div><button type="button" aria-label={`Enviar mensagem para ${candidate.name}`}><Icons.Mail size={17}/></button></div>)}</div>
      </article>
    </section>
  );
}
