import { useState } from 'react';
import { BriefcaseBusiness, Building2, Stethoscope } from 'lucide-react';
import SecuritySeals from './SecuritySeals';
import { Icons } from '../icons';
import { formatPhoneBR } from '../phone';
import type { CandidateType } from '../types';

type Props = { profileType: CandidateType };

type DocumentField = { name: string; type: string; label: string; hint: string; required?: boolean };

const commonDocuments: DocumentField[] = [
  { name: 'cv', type: 'curriculo', label: 'Currículo profissional', hint: 'PDF, JPG ou PNG • até 10 MB por arquivo', required: true },
  { name: 'photoId', type: 'documento_foto', label: 'Documento com foto', hint: 'RG, CNH ou equivalente', required: true },
  { name: 'residence', type: 'comprovante_residencia', label: 'Comprovante de residência', hint: 'Arquivo recente', required: true }
];

const medicalDocuments: DocumentField[] = [
  { name: 'crmCard', type: 'carteirinha_crm', label: 'Carteirinha CRM', hint: 'Frente ou arquivo digital', required: true },
  { name: 'diplomas', type: 'diploma_certificado', label: 'Diploma e certificados', hint: 'Permite vários arquivos', required: true },
  { name: 'practice', type: 'declaracao_atuacao', label: 'Declaração de atuação na área', hint: 'Comprovação de experiência/atuação', required: true },
  { name: 'clearance', type: 'certidao_crm', label: 'Certidão Negativa', hint: 'Certidão ética / nada consta do CRM', required: true }
];

export default function ApplicationPage({ profileType }: Props) {
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [protocol, setProtocol] = useState('');
  const [otherCity, setOtherCity] = useState(false);
  const [otherSpecialty, setOtherSpecialty] = useState(false);

  const documentFields = profileType === 'medico'
    ? [...commonDocuments, ...medicalDocuments]
    : [commonDocuments[0]];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('city') === 'Outra cidade') data.set('city', String(data.get('cityOther') || '').trim());
    if (data.get('specialty') === 'Outra especialidade') data.set('specialty', String(data.get('specialtyOther') || '').trim());
    const requiredText = profileType === 'medico'
      ? ['name', 'email', 'phone', 'crm', 'specialty', 'city', 'contractType', 'availability']
      : ['name', 'email', 'phone', 'specialty', 'city', 'availability'];
    if (requiredText.some(key => !String(data.get(key) || '').trim())) {
      setMessage('Preencha todos os campos obrigatórios de identificação e atuação.');
      return;
    }

    for (const field of [...documentFields, ...(profileType === 'medico' ? [{ name: 'companyCnpj', type: 'cartao_cnpj', label: 'Cartão CNPJ', hint: 'Arquivo opcional' }] : [])]) {
      const files = data.getAll(field.name).filter(value => value instanceof File && value.size > 0) as File[];
      if (field.required && !files.length) {
        setMessage(`Anexe ${field.label} para continuar.`);
        return;
      }
      for (const file of files) {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || /\.(pdf|jpe?g|png)$/i.test(file.name);
        if (!allowed) { setMessage('Envie apenas arquivos PDF, JPG ou PNG.'); return; }
        if (file.size > 10 * 1024 * 1024) { setMessage(`O arquivo ${file.name} ultrapassa o limite de 10 MB.`); return; }
      }
    }

    setSubmitting(true);
    setMessage('');
    try {
      data.set('profileType', profileType);
      const response = await fetch('/api/applications', { method: 'POST', body: data, credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a candidatura.');
      setProtocol(String(result.protocol || ''));
      form.reset();
      setFileNames({});
      setSuccess(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar a candidatura. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDoctor = profileType === 'medico';

  return (
    <div className="application-page">
      <aside className="application-story">
        <div className="application-photo" style={{ backgroundImage: "url('./assets/login-clinic-bg-blue.jpg')" }} />
        <video className="application-leaves" autoPlay muted loop playsInline><source src="./assets/leaves-overlay-blue.webm" type="video/webm"/></video>
        <div className="application-overlay" />
        <div className="application-story-content">
          <div className="application-story-copy">
            <small>J&amp;P SERVIÇOS LTDA. · CREDENCIAMENTO</small>
            <h1>{isDoctor ? 'O seu trabalho transforma o cuidado.' : 'Sua carreira encontra novos caminhos.'}</h1>
            <p>{isDoctor ? 'Apresente sua especialidade e escolha como deseja atuar com a J&P.' : 'Cadastre seu perfil para oportunidades administrativas, operacionais e de atendimento.'}</p>
            <div className="application-history"><span>NOSSA TRAJETÓRIA</span><p>Com origem em Cerquilho, no interior de São Paulo, a J&amp;P atua em serviços médicos e consultoria em gestão pública. Seu trabalho reúne profissionais, exames e soluções de saúde para clínicas, hospitais e contratos públicos em diferentes regiões do Brasil.</p></div>
            <div className="application-features">
              <article>{isDoctor ? <Stethoscope size={20}/> : <BriefcaseBusiness size={20}/>}<div><strong>{isDoctor ? 'Atuação médica' : 'Perfil de colaborador'}</strong><span>{isDoctor ? 'Mutirão, posição fixa ou plantões.' : 'Oportunidades em diferentes áreas.'}</span></div></article>
              <article><Icons.File size={20}/><div><strong>Uma candidatura, tudo em seu lugar</strong><span>Experiência e documentos em um só envio.</span></div></article>
            </div>
          </div>
          <small className="application-footer">J&amp;P Serviços Ltda. · CNPJ 46.326.571/0001-11 · Cerquilho/SP</small>
        </div>
      </aside>
      <main className="application-form-panel">
        <div className="application-form-wrap">
          <img className="application-logo" src="./assets/jp-logo.svg" width={942} height={189} alt="J&P Serviços Ltda. — serviços médicos e consultoria em gestão pública"/>
          {!success ? (
            <>
              <div className={`application-fixed-profile ${isDoctor ? 'doctor' : 'collaborator'}`}>{isDoctor ? <Stethoscope size={18}/> : <BriefcaseBusiness size={18}/>}<div><small>FORMULÁRIO EXCLUSIVO</small><strong>{isDoctor ? 'Candidatura médica' : 'Candidatura de colaborador'}</strong><span>{isDoctor ? 'Este link recebe apenas perfis médicos.' : 'Este link recebe apenas perfis administrativos e operacionais.'}</span></div></div>
              <div className="application-form-title"><span>{isDoctor ? 'CREDENCIAMENTO MÉDICO' : 'CANDIDATURA DE COLABORADOR'}</span><h2>Vamos conhecer você.</h2><p>Preencha seus dados e anexe os documentos indicados. A equipe J&amp;P avaliará sua candidatura.</p></div>
              <SecuritySeals/>
              <form className="public-application-form" onSubmit={submit}>
                <div className="public-form-grid">
                  <label>Nome completo *<input name="name" required placeholder={isDoctor ? 'Ex.: Dra. Mariana Costa' : 'Ex.: Juliana Martins'}/></label>
                  <label>E-mail *<input name="email" type="email" required placeholder="email@exemplo.com"/></label>
                  <label>Telefone *<input name="phone" required inputMode="tel" maxLength={15} placeholder="(__) _____-____" onInput={event => { event.currentTarget.value = formatPhoneBR(event.currentTarget.value); }}/></label>
                  <label>Cidade de atuação *<select name="city" required defaultValue="" onChange={event => setOtherCity(event.target.value === 'Outra cidade')}><option value="" disabled>Selecione uma cidade</option>{['Cerquilho', 'Tatuí', 'Itapeva', 'Embu das Artes', 'Sorocaba', 'São Paulo', 'Outra cidade'].map(city => <option key={city} value={city}>{city}</option>)}</select></label>
                  <label>{isDoctor ? 'Especialidade *' : 'Cargo / área de interesse *'}{isDoctor ? <select name="specialty" required defaultValue="" onChange={event => setOtherSpecialty(event.target.value === 'Outra especialidade')}><option value="" disabled>Selecione sua especialidade</option>{['Clínica Geral', 'Medicina da Família', 'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Gastroenterologia', 'Geriatria', 'Ginecologia e Obstetrícia', 'Neurologia', 'Ortopedia e Traumatologia', 'Otorrinolaringologia', 'Pediatria', 'Psiquiatria', 'Urologia', 'Outra especialidade'].map(specialty => <option key={specialty} value={specialty}>{specialty}</option>)}</select> : <input name="specialty" required placeholder="Ex.: Recepção / Atendimento"/>}</label>
                  {otherCity && <label>Informe a cidade *<input name="cityOther" required placeholder="Cidade e estado"/></label>}
                  {isDoctor && otherSpecialty && <label>Informe a especialidade *<input name="specialtyOther" required placeholder="Sua especialidade"/></label>}
                  {isDoctor && <label>CRM *<input name="crm" required placeholder="Ex.: CRM/SP 123456"/></label>}
                  {isDoctor && <label>RQE<input name="rqe" placeholder="Ex.: RQE 55190"/></label>}
                  {isDoctor && <label>Modalidade de contratação *<select name="contractType" required defaultValue=""><option value="" disabled>Selecione a modalidade</option><option>Mutirão</option><option>Fixo</option><option>Plantões</option></select></label>}
                  <label>Experiência<input name="experience" placeholder={isDoctor ? 'Ex.: 8 anos' : 'Ex.: 3 anos em atendimento'}/></label>
                  <label className="span-2">Disponibilidade *<input name="availability" required placeholder="Ex.: Seg a Sex • Tarde"/></label>
                  <label className="span-2">Resumo profissional<textarea name="summary" rows={4} placeholder="Conte um pouco sobre sua atuação e experiência."/></label>
                </div>
                {isDoctor && <details className="company-details"><summary><Building2 size={19}/><span><strong>Dados da empresa e conta para recebimento</strong><small>Opcional · preencha somente se já tiver esses dados</small></span><Icons.ChevronDown size={17}/></summary><div className="public-form-grid"><label>CNPJ da empresa<input name="companyCnpjNumber" inputMode="numeric" placeholder="00.000.000/0000-00"/></label><label>Titular da conta<input name="accountHolder" placeholder="Nome ou razão social"/></label><label>Banco<input name="bank" placeholder="Nome do banco"/></label><label>Agência<input name="branch" inputMode="numeric" placeholder="Número da agência"/></label><label>Conta para recebimento<input name="account" placeholder="Número da conta e dígito"/></label><label>Tipo de conta<select name="accountType" defaultValue=""><option value="">Selecione se aplicável</option><option>Corrente</option><option>Poupança</option></select></label></div><div className="company-upload"><label className="upload-card"><input name="companyCnpj" type="file" accept="application/pdf,.pdf,image/jpeg,image/png,.jpg,.jpeg,.png" onChange={event => setFileNames(current => ({ ...current, companyCnpj: event.target.files?.[0]?.name || '' }))}/><span className="upload-icon"><Icons.Upload size={19}/></span><span><strong>Cartão CNPJ (opcional)</strong><small>{fileNames.companyCnpj || 'PDF, JPG ou PNG • até 10 MB'}</small></span></label></div></details>}
                <div className="document-section-title"><span>{isDoctor ? 'DOCUMENTOS' : 'CURRÍCULO'}</span><h3>{isDoctor ? 'Documentação médica' : 'Currículo profissional'}</h3><p>{isDoctor ? 'PDF, JPG ou PNG. Limite de 10 MB por arquivo. Itens marcados com * são obrigatórios.' : 'Envie somente o seu currículo profissional. PDF, JPG ou PNG, com limite de 10 MB.'}</p></div>
                <div className={`upload-grid ${isDoctor ? '' : 'collaborator-only'}`}>
                  {documentFields.map(field => (
                    <label className="upload-card" key={field.name}>
                      <input name={field.name} type="file" multiple={field.name === 'diplomas'} required={field.required} accept="application/pdf,.pdf,image/jpeg,image/png,.jpg,.jpeg,.png" onChange={event => {
                        const files = [...(event.target.files || [])];
                        setFileNames(current => ({ ...current, [field.name]: files.length === 1 ? files[0].name : files.length ? `${files.length} arquivos selecionados` : '' }));
                      }}/>
                      <span className="upload-icon"><Icons.Upload size={19}/></span>
                      <span><strong>{field.label}{field.required ? ' *' : ''}</strong><small>{fileNames[field.name] || field.hint}</small></span>
                    </label>
                  ))}
                </div>
                <label className="privacy-consent"><input type="checkbox" name="privacyAcknowledged" value="yes" required/><span>Li o <a href="./privacidade.html" target="_blank" rel="noopener noreferrer">aviso de privacidade</a> e estou ciente do uso dos meus dados para avaliação desta candidatura. *</span></label>
                {message && <div className="application-error" role="alert">{message}</div>}
                <button className="application-submit" type="submit" disabled={submitting}>{submitting ? 'Enviando candidatura...' : 'Enviar candidatura'}</button>
              </form>
            </>
          ) : (
            <section className="application-success"><span className="success-icon"><Icons.Check size={34}/></span><small>CANDIDATURA ENVIADA</small><h2>Recebemos seus dados.</h2><p>Protocolo: <strong>{protocol}</strong>. Guarde esse número. Sua candidatura está disponível para avaliação da equipe J&amp;P.</p><button className="button button-primary" onClick={() => setSuccess(false)}>Enviar outra candidatura</button></section>
          )}
          <footer className="application-privacy-footer">
            <p><strong>Seus dados estão protegidos — LGPD (Lei nº 13.709/2018).</strong> Tratamos as informações desta candidatura apenas para análise do processo seletivo, e os documentos são acessíveis somente à equipe autorizada. Para acessar, corrigir ou excluir seus dados, escreva para <a href="mailto:administrativo@jepservicos.com.br">administrativo@jepservicos.com.br</a> ou leia o <a href="./privacidade.html" target="_blank" rel="noopener noreferrer">aviso de privacidade</a>.</p>
            <small>J&amp;P Serviços Ltda. · CNPJ 46.326.571/0001-11 · Inscrição Municipal 17931 · Av. Presidente Washington Luiz, 199, Sala 02, Centro, Cerquilho/SP · CEP 18.520-039 · (15) 99672-7181</small>
          </footer>
        </div>
      </main>
    </div>
  );
}
