import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Monta janelas e confirmações direto no painel, fora do bloco de conteúdo.
 * Assim elas cobrem a tela inteira (menu lateral e topo incluídos), em vez de ficarem
 * presas à camada de empilhamento do conteúdo, que deixava o menu e o topo por cima do fundo.
 */
export default function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.querySelector('.dashboard-shell') ?? document.body);
}
