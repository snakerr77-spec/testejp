export type CandidateStatus = 'novo' | 'analise' | 'entrevista' | 'aguardando' | 'aprovado' | 'reprovado';
export type CandidateType = 'medico' | 'colaborador';

export type CandidateDocument = {
  key: string;
  type: string;
  label: string;
  name: string;
  mime?: string;
  size?: number;
  legacy?: boolean;
};

export type Candidate = {
  id: number;
  profileType: CandidateType;
  name: string;
  initials: string;
  specialty: string;
  city: string;
  crm: string;
  rqe: string;
  status: CandidateStatus;
  statusLabel: string;
  email: string;
  phone: string;
  experience: string;
  availability: string;
  contractType?: 'Mutirão' | 'Fixo' | 'Plantões';
  company?: {
    cnpj?: string;
    bank?: string;
    accountHolder?: string;
    branch?: string;
    account?: string;
    accountType?: string;
  };
  createdAt: string;
  statusUpdatedAt?: string;
  notes: string;
  curriculum: string[];
  documents: CandidateDocument[];
};

export type UserProfile = {
  name: string;
  role: string;
  email: string;
  phone: string;
};


export type InterviewAudience = CandidateType;
export type InterviewStatus = 'agendada' | 'confirmada' | 'reagendada' | 'em_andamento' | 'concluida' | 'cancelada';

export type InterviewLogEntry = {
  id: string;
  at: string;
  action: 'criada' | 'confirmada' | 'reagendada' | 'iniciada' | 'concluida' | 'cancelada' | 'editada';
  label: string;
  details?: string;
};

export type InterviewEvent = {
  id: string;
  audience: InterviewAudience;
  candidateId?: number;
  personName: string;
  role: string;
  email?: string;
  phone?: string;
  date: string;
  time: string;
  duration: number;
  interviewer: string;
  location: string;
  notes: string;
  status: InterviewStatus;
  createdAt: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  actualDurationSec?: number;
  logs?: InterviewLogEntry[];
};
