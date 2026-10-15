import { motion } from 'framer-motion';
import { CheckCircle2, FileSearch, Plus, UserRoundSearch, UsersRound } from 'lucide-react';
import type { Candidate } from '../types';

export type HeroProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  candidates: Candidate[];
  onApplication?: () => void;
  onNewCandidate?: () => void;
  compact?: boolean;
};

export default function Hero({ eyebrow = 'Recrutamento médico', title, subtitle, candidates, onApplication, onNewCandidate, compact = false }: HeroProps) {
  const hasActions = Boolean(onApplication || onNewCandidate);
  const inReview = candidates.filter(candidate => candidate.status === 'analise').length;
  const interviews = candidates.filter(candidate => candidate.status === 'entrevista').length;
  const approved = candidates.filter(candidate => candidate.status === 'aprovado').length;

  return (
    <section className={`dashboard-hero ${compact ? 'compact' : ''} ${hasActions ? 'has-actions' : ''}`}>
      <div className="hero-ambient" aria-hidden="true"><span/><span/><span/></div>
      <motion.div
        className="hero-copy"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: .42 }}
      >
        <span className="hero-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </motion.div>

      <motion.aside
        className="hero-operational-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .42, delay: .04 }}
        aria-label="Resumo operacional do recrutamento"
      >
        <div className="hero-operational-head">
          <span><UsersRound size={17}/></span>
          <div><small>VISÃO OPERACIONAL</small><strong>Processo seletivo</strong></div>
        </div>
        <div className="hero-operational-list">
          <div><span className="hero-step-icon review"><FileSearch size={15}/></span><p><strong>{inReview}</strong><small>currículos em análise</small></p></div>
          <div><span className="hero-step-icon interview"><UserRoundSearch size={15}/></span><p><strong>{interviews}</strong><small>perfis em entrevista</small></p></div>
          <div><span className="hero-step-icon approved"><CheckCircle2 size={15}/></span><p><strong>{approved}</strong><small>perfis aprovados</small></p></div>
        </div>
      </motion.aside>

      {hasActions && (
        <div className="hero-actions">
          {onApplication && (
            <button className="button button-secondary" onClick={onApplication}>
              <UserRoundSearch size={16}/>
              Ver página de candidatura
            </button>
          )}
          {onNewCandidate && (
            <button className="button button-primary" onClick={onNewCandidate}>
              <Plus size={17}/>
              Novo candidato
            </button>
          )}
        </div>
      )}
    </section>
  );
}
