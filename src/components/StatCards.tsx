import { Icons } from '../icons';
import type { Candidate } from '../types';

type Props = { candidates: Candidate[] };

export default function StatCards({ candidates }: Props) {
  const cards = [
    { label: 'TOTAL', value: candidates.length, sub: 'Perfis cadastrados', cls: 'metric-total', Icon: Icons.Users },
    { label: 'EM ANÁLISE', value: candidates.filter(c => c.status === 'analise').length, sub: 'Currículos em avaliação', cls: 'metric-review', Icon: Icons.File },
    { label: 'APROVADOS', value: candidates.filter(c => c.status === 'aprovado').length, sub: 'Contratações aprovadas', cls: 'metric-approved', Icon: Icons.ShieldCheck },
    { label: 'REPROVADOS', value: candidates.filter(c => c.status === 'reprovado').length, sub: 'Processos encerrados', cls: 'metric-rejected', Icon: Icons.Hourglass }
  ];
  return (
    <div className="stats-grid">
      {cards.map(({ label, value, sub, cls, Icon }) => (
        <article className={`stat-card ${cls}`} key={label}>
          <span className="stat-icon"><Icon size={25}/></span>
          <div className="stat-copy"><small>{label}</small><strong>{value}</strong><span>{sub}</span></div>
        </article>
      ))}
    </div>
  );
}
