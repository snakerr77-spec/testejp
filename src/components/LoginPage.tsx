import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import { Icons } from '../icons';
import type { UserProfile } from '../types';

type Props = { onLogin: (profile: UserProfile) => void };

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      if (step === 'credentials') {
        if (!email.trim() || !password) {
          setMessage('Preencha e-mail e senha para continuar.');
          return;
        }
        const result = await api.requestMfa(email.trim(), password);
        setChallengeId(result.challengeId);
        setMaskedEmail(result.maskedEmail);
        setCode('');
        setPassword('');
        setStep('mfa');
        setMessage('');
        return;
      }

      if (!/^\d{6}$/.test(code.trim())) {
        setMessage('Digite o código de 6 números enviado por e-mail.');
        return;
      }
      const result = await api.verifyMfa(challengeId, code.trim());
      setCode('');
      onLogin(result.profile);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep('credentials');
    setChallengeId('');
    setMaskedEmail('');
    setCode('');
    setMessage('');
  };

  return (
    <div className="login-page">
      <section className="login-visual">
        <div className="login-photo" style={{ backgroundImage: "url('./assets/login-clinic-bg-blue.jpg')" }} />
        <video className="login-leaves" autoPlay muted loop playsInline poster="./assets/login-clinic-bg-blue.jpg">
          <source src="./assets/leaves-overlay-blue.webm" type="video/webm" />
        </video>
        <div className="login-shade" />

        <div className="login-brand">
          <span>J&amp;P Serviços · Portal de credenciamento</span>
        </div>

        <div className="login-copy">
          <small>PORTAL PROFISSIONAL</small>
          <h1>Gestão médica com mais organização.</h1>
          <p>Centralize candidatos, documentos e etapas de contratação em um só lugar.</p>
          <div>
            <span><Icons.Check size={17} />Seleção mais organizada</span>
            <span><Icons.Check size={17} />Dados centralizados</span>
          </div>
        </div>
      </section>

      <section className="login-form-side">
        <form className="login-card" onSubmit={submit}>
          <img className="login-logo" src="./assets/jp-logo.svg" width={942} height={189} alt="J&P Serviços Ltda. — serviços médicos e consultoria em gestão pública" />
          <span className="login-eyebrow">ÁREA RESTRITA</span>
          <h2>{step === 'credentials' ? 'Bem-vindo de volta' : 'Confirme seu acesso'}</h2>
          <p>{step === 'credentials' ? 'Use seu e-mail e sua senha cadastrados para acessar o painel.' : `Digite o código enviado para ${maskedEmail}.`}</p>

          {step === 'credentials' ? (
            <>
              <label>
                Endereço de e-mail
                <div className="login-input">
                  <Icons.Mail size={18} />
                  <input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required placeholder="Seu e-mail" />
                </div>
              </label>

              <label>
                Senha
                <div className="login-input">
                  <Icons.Lock size={18} />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Sua senha" />
                  <button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                </div>
              </label>

              <div className="login-meta">
                <span>Depois de validar a senha, você receberá um código de acesso por e-mail.</span>
                <a href="mailto:administrativo@jepservicos.com.br?subject=Acesso%20ao%20portal%20J%26P">Precisa de acesso?</a>
              </div>
            </>
          ) : (
            <>
              <label>
                Código de verificação
                <div className="login-input">
                  <Icons.ShieldCheck size={18} />
                  <input type="text" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" aria-label={`Código enviado para ${maskedEmail}`} />
                </div>
              </label>
              <div className="login-meta">
                <span>O código vale por 10 minutos e só pode ser usado uma vez.</span>
                <button className="login-back" type="button" onClick={restart}>Voltar</button>
              </div>
            </>
          )}

          {message && <div className="login-message" role="status">{message}</div>}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? (step === 'credentials' ? 'Validando acesso...' : 'Verificando código...') : (step === 'credentials' ? 'Enviar código de acesso' : 'Confirmar e entrar')}</button>
          <div className="security-line"><Icons.ShieldCheck size={17} />Senha e código MFA obrigatórios</div>
        </form>
      </section>

      {loading && (
        <div className="loading-screen">
          <div className="loading-orbit">
            <div className="loading-ring" />
            <div className="loading-brand"><strong>J&amp;P</strong><span>{step === 'credentials' ? 'Enviando código...' : 'Validando código...'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
