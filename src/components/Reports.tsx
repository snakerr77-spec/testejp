import { motion } from 'framer-motion';
import { Activity, BadgeCheck, BriefcaseBusiness, FileSearch, Stethoscope, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Candidate, CandidateStatus, CandidateType } from '../types';

const statusMeta: { key: CandidateStatus; label: string; className: string }[] = [
  { key: 'novo', label: 'Novos', className: 'novo' },
  { key: 'analise', label: 'Em análise', className: 'analise' },
  { key: 'entrevista', label: 'Entrevistas', className: 'entrevista' },
  { key: 'aguardando', label: 'Decisão de contratação', className: 'aguardando' },
  { key: 'aprovado', label: 'Aprovados', className: 'aprovado' },
  { key: 'reprovado', label: 'Reprovados', className: 'reprovado' }
];

export default function Reports({ candidates }: { candidates: Candidate[] }) {
  const [profileType, setProfileType] = useState<CandidateType | 'all'>('all');
  const visible = useMemo(() => candidates.filter(candidate => profileType === 'all' || candidate.profileType === profileType), [candidates, profileType]);

  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    visible.forEach(candidate => counts.set(candidate.specialty, (counts.get(candidate.specialty) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [visible]);

  const statusData = useMemo(() => statusMeta.map(item => ({
    ...item,
    count: visible.filter(candidate => candidate.status === item.key).length
  })), [visible]);

  const maxArea = Math.max(1, ...areas.map(item => item[1]));
  const total = Math.max(visible.length, 1);
  const doctors = visible.filter(candidate => candidate.profileType === 'medico');
  const collaborators = visible.filter(candidate => candidate.profileType === 'colaborador');
  const withRqe = doctors.filter(candidate => candidate.rqe && !['Não informado', 'Não se aplica'].includes(candidate.rqe)).length;
  const rqeRate = doctors.length ? Math.round((withRqe / doctors.length) * 100) : 0;
  const activeProcess = visible.filter(candidate => ['novo', 'analise', 'entrevista', 'aguardando'].includes(candidate.status)).length;
  const approved = visible.filter(candidate => candidate.status === 'aprovado').length;
  const conversion = visible.length ? Math.round((approved / visible.length) * 100) : 0;

  let cursor = 0;
  const donut = statusData.map(item => {
    const start = cursor;
    const size = (item.count / total) * 100;
    cursor += size;
    return `${statusColor(item.key)} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <section className="reports-layout">
      <div className="reports-filter-row">
        <div><small>VISUALIZAÇÃO</small><strong>Separar indicadores por perfil</strong></div>
        <div className="profile-segmented-control">
          <button className={profileType === 'all' ? 'selected' : ''} onClick={() => setProfileType('all')}>Todos</button>
          <button className={profileType === 'medico' ? 'selected' : ''} onClick={() => setProfileType('medico')}><Stethoscope size={14}/>Médicos</button>
          <button className={profileType === 'colaborador' ? 'selected' : ''} onClick={() => setProfileType('colaborador')}><BriefcaseBusiness size={14}/>Colaboradores</button>
        </div>
      </div>

      <div className="report-kpis report-kpis-refined">
        <article><span className="report-kpi-icon"><UsersRound size={18}/></span><div><small>PERFIS CADASTRADOS</small><strong>{visible.length}</strong><span>{profileType === 'all' ? `${doctors.length} médicos • ${collaborators.length} colaboradores` : 'total no banco de talentos'}</span></div></article>
        <article><span className="report-kpi-icon">{profileType === 'colaborador' ? <BriefcaseBusiness size={18}/> : <Stethoscope size={18}/>}</span><div><small>{profileType === 'colaborador' ? 'ÁREAS / CARGOS' : 'ESPECIALIDADES / ÁREAS'}</small><strong>{areas.length}</strong><span>áreas representadas</span></div></article>
        <article><span className="report-kpi-icon"><BadgeCheck size={18}/></span><div><small>{profileType === 'colaborador' ? 'APROVADOS' : 'CRM + RQE'}</small><strong>{profileType === 'colaborador' ? approved : `${rqeRate}%`}</strong><span>{profileType === 'colaborador' ? 'colaboradores aprovados' : 'médicos com registro complementar'}</span></div></article>
        <article><span className="report-kpi-icon"><Activity size={18}/></span><div><small>EM PROCESSO</small><strong>{activeProcess}</strong><span>inclui decisão de contratação</span></div></article>
      </div>

      <div className="report-chart-grid">
        <section className="module-panel report-chart-card pipeline-chart-card">
          <div className="module-panel-heading"><div><small>PIPELINE</small><h2>Distribuição por etapa</h2></div><span>{visible.length} perfis</span></div>
          <div className="pipeline-chart-body">
            <div className="pipeline-stacked-track" aria-label="Distribuição de perfis por etapa">
              {statusData.map(item => item.count > 0 && (
                <motion.span key={item.key} className={`pipeline-stack-segment ${item.className}`} initial={{ width: 0 }} animate={{ width: `${Math.max(3, (item.count / total) * 100)}%` }} transition={{ duration: .55, ease: [0.2, .8, .2, 1] }} title={`${item.label}: ${item.count}`}/>
              ))}
            </div>
            <div className="pipeline-breakdown">
              {statusData.map(item => <div key={item.key}><i className={`report-status-dot ${item.className}`}/><span>{item.label}</span><strong>{item.count}</strong><em>{Math.round((item.count / total) * 100)}%</em></div>)}
            </div>
          </div>
        </section>

        <section className="module-panel report-chart-card conversion-chart-card">
          <div className="module-panel-heading"><div><small>CONVERSÃO</small><h2>Resultado do processo</h2></div></div>
          <div className="conversion-chart-body">
            <div className="report-donut" style={{ background: `conic-gradient(${donut || '#d9d5cc 0 100%'})` }}><div><strong>{conversion}%</strong><span>aprovados</span></div></div>
            <div className="conversion-summary">
              <article><span><FileSearch size={15}/></span><div><small>Em processo</small><strong>{activeProcess}</strong></div></article>
              <article><span><BadgeCheck size={15}/></span><div><small>Aprovados</small><strong>{approved}</strong></div></article>
              <p>A taxa considera somente o tipo de perfil selecionado acima.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="module-panel chart-panel specialty-chart-card">
        <div className="module-panel-heading"><div><small>ÁREAS</small><h2>Distribuição de perfis</h2></div><span>{areas.length} áreas</span></div>
        <div className="specialty-bars specialty-bars-refined">
          {areas.length ? areas.map(([name, count], index) => {
            const percent = visible.length ? Math.round((count / visible.length) * 100) : 0;
            return (
              <div className="specialty-row" key={name}>
                <div><strong>{name}</strong><span>{count} {count === 1 ? 'perfil' : 'perfis'}</span></div>
                <div className="bar-track"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(7, count / maxArea * 100)}%` }} transition={{ duration: .5, delay: index * .04 }}/></div>
                <b>{percent}%</b>
              </div>
            );
          }) : <div className="report-empty">Ainda não há dados suficientes para gerar o relatório.</div>}
        </div>
      </section>
    </section>
  );
}

function statusColor(status: CandidateStatus) {
  const colors: Record<CandidateStatus, string> = {
    novo: '#6f9eb9', analise: '#d5b16f', entrevista: '#8e7d69', aguardando: '#b89a62', aprovado: '#82977b', reprovado: '#b98287'
  };
  return colors[status];
}
