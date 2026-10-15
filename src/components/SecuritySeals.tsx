import { useEffect } from 'react';
import { motion, useAnimation, useReducedMotion, type AnimationControls, type Variants } from 'framer-motion';

/*
 * Selos de segurança com ícones animados.
 * Traços do Lucide (ISC), uma das famílias do 21st.dev/community/icons, animados no
 * mesmo estilo dos AnimateIcons: o tique é desenhado ao carregar e ao passar o mouse.
 */

const draw = (delay = 0): Variants => ({
  normal: { pathLength: 1, opacity: 1 },
  animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.7, delay, ease: 'easeInOut' } }
});

const pop: Variants = {
  normal: { scale: 1 },
  animate: { scale: [1, 1.1, 1], transition: { duration: 0.6, ease: 'easeInOut' } }
};

const lift: Variants = {
  normal: { y: 0 },
  animate: { y: [0, -2.5, 0], transition: { duration: 0.7, ease: 'easeInOut' } }
};

type IconProps = { controls: AnimationControls };

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

function BadgeCheck({ controls }: IconProps) {
  return (
    <Svg>
      <motion.path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" variants={pop} initial="normal" animate={controls} style={{ transformOrigin: 'center' }} />
      <motion.path d="m9 12 2 2 4-4" variants={draw(0.2)} initial="normal" animate={controls} />
    </Svg>
  );
}

function Lock({ controls }: IconProps) {
  return (
    <Svg>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <motion.path d="M7 11V7a5 5 0 0 1 10 0v4" variants={lift} initial="normal" animate={controls} />
    </Svg>
  );
}

function ShieldCheck({ controls }: IconProps) {
  return (
    <Svg>
      <motion.path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" variants={draw()} initial="normal" animate={controls} />
      <motion.path d="m9 12 2 2 4-4" variants={draw(0.35)} initial="normal" animate={controls} />
    </Svg>
  );
}

function Seal({ icon: Icon, title, caption }: { icon: (props: IconProps) => JSX.Element; title: string; caption: string }) {
  const controls = useAnimation();
  const reduced = useReducedMotion();
  const play = () => { if (!reduced) void controls.start('animate'); };
  useEffect(() => { play(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li onMouseEnter={play}>
      <i><Icon controls={controls} /></i>
      <b>{title}</b>
      <small>{caption}</small>
    </li>
  );
}

export default function SecuritySeals() {
  return (
    <ul className="application-seals" aria-label="Selos de segurança">
      <Seal icon={BadgeCheck} title="Site oficial" caption="J&P Serviços" />
      <Seal icon={Lock} title="Site seguro" caption="Certificado SSL" />
      <Seal icon={ShieldCheck} title="Dados protegidos" caption="LGPD" />
    </ul>
  );
}
