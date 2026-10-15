import { useState } from 'react';
import { BriefcaseBusiness, Check, Copy, ExternalLink, ShieldCheck, Stethoscope } from 'lucide-react';
import type { CandidateType } from '../types';

type Props = {
  onOpen: (type: CandidateType) => void;
  compact?: boolean;
};

function getPublicLink(type: CandidateType) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/candidatura/${type}`;
}

export default function ApplicationLinks({ onOpen, compact = false }: Props) {
  const [copied, setCopied] = useState<CandidateType | null>(null);

  const copy = async (type: CandidateType) => {
    const link = getPublicLink(type);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(type);
    window.setTimeout(() => setCopied(current => current === type ? null : current), 1800);
  };

  const cards: { type: CandidateType; title: string; subtitle: string; icon: typeof Stethoscope }[] = [
    { type: 'medico', title: 'Link para médicos', subtitle: 'Formulário exclusivo com CRM, RQE e documentação médica.', icon: Stethoscope },
    { type: 'colaborador', title: 'Link para colaboradores', subtitle: 'Formulário exclusivo para vagas administrativas e operacionais.', icon: BriefcaseBusiness }
  ];

  return (
    <section className={`application-links-panel ${compact ? 'compact' : ''}`}>
      <div className="application-links-heading">
        <div>
          <small>LINKS PÚBLICOS DE CANDIDATURA</small>
          <h2>Candidaturas separadas por perfil</h2>
          <p>Envie somente o link correspondente. A página pública não exibe candidatos, dados internos ou navegação do painel.</p>
        </div>
        <span className="public-isolation-badge"><ShieldCheck size={15}/> Área pública isolada</span>
      </div>
      <div className="application-links-grid">
        {cards.map(card => {
          const Icon = card.icon;
          const link = getPublicLink(card.type);
          return (
            <article className="application-link-card" key={card.type}>
              <span className={`application-link-icon ${card.type}`}><Icon size={19}/></span>
              <div className="application-link-copy">
                <strong>{card.title}</strong>
                <small>{card.subtitle}</small>
                <code>{link}</code>
              </div>
              <div className="application-link-actions">
                <button type="button" className="link-action-button" onClick={() => copy(card.type)}>{copied === card.type ? <Check size={15}/> : <Copy size={15}/>}<span>{copied === card.type ? 'Copiado' : 'Copiar'}</span></button>
                <button type="button" className="link-action-button primary" onClick={() => onOpen(card.type)}><ExternalLink size={15}/><span>Abrir</span></button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
