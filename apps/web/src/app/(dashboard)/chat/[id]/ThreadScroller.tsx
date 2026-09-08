'use client';

// ThreadScroller — la zone qui défile dans un fil, et qui SUIT.
//
// Avant elle, rien ne faisait défiler un fil : `scrollIntoView` et `scrollTop`
// n'existaient nulle part dans les écrans de conversation, seulement dans le
// panneau de logs et l'onboarding, qui l'avaient chacun réimplémenté. Un
// message qui arrivait se posait donc sous le bord bas de la zone visible,
// contre la saisie, et il fallait faire défiler à la main pour lire ce qu'on
// venait de recevoir (Quentin, 08/09/2026).
//
// Deux règles, celles de n'importe quelle messagerie :
//   - à l'ouverture d'un fil, on est EN BAS ;
//   - un message qui arrive fait descendre le fil SEULEMENT si on y était déjà.
//     Sans cette seconde règle, remonter dans l'historique devient impossible :
//     le prochain rafraîchissement vous ramène en bas.
//
// Le suivi s'appuie sur un ResizeObserver et non sur les `children` : le fil
// est rendu par le serveur et rechargé par `LiveRefresh`, mais il grandit aussi
// sans nouveau rendu (une image qui finit de charger, un bloc qu'on déplie).
// Observer la HAUTEUR attrape les deux, et rien d'autre.

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Marge, en pixels, sous laquelle on considère que le lecteur est « en bas ».
 * Pas zéro : un défilement par molette s'arrête rarement au pixel près, et
 * quelques pixels de reste ne veulent pas dire qu'on a remonté l'historique.
 */
export const AT_BOTTOM_SLACK_PX = 64;

/**
 * Le lecteur est-il « en bas » ? La seule décision de ce composant, sortie ici
 * pour être éprouvée sans navigateur.
 *
 * `scrollHeight - scrollTop - clientHeight` est la distance qui reste sous la
 * zone visible : 0 au ras du bas, la hauteur d'un fil entier tout en haut.
 */
export function staysAtBottom(m: {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}): boolean {
  return m.scrollHeight - m.scrollTop - m.clientHeight < AT_BOTTOM_SLACK_PX;
}

export default function ThreadScroller({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /** Faut-il suivre le bas ? Vrai tant que le lecteur n'a pas remonté. */
  const follow = useRef(true);
  /**
   * Un défilement que NOUS venons de provoquer, à ignorer.
   *
   * Sans ce drapeau, le composant se sabote : écrire `scrollTop` déclenche
   * `onScroll`, la mesure y est lue pendant que la hauteur bouge encore, et le
   * suivi se coupe tout seul dès le premier message. Constaté au navigateur —
   * le fil s'ouvrait à 243 px du bas au lieu d'être en bas.
   */
  const selfScroll = useRef(false);

  /** Descendre, sans que notre propre geste passe pour celui du lecteur. */
  const scrollToBottom = (el: HTMLDivElement) => {
    selfScroll.current = true;
    el.scrollTop = el.scrollHeight;
  };

  // AVANT la peinture : ouvrir un fil sur son dernier message, sans que le
  // lecteur voie passer le haut de l'historique.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) scrollToBottom(el);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observed = el.firstElementChild ?? el;
    const ro = new ResizeObserver(() => {
      if (follow.current) scrollToBottom(el);
    });
    ro.observe(observed);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      // Repère stable pour les tests de bout en bout : `.overflow-y-auto` seul
      // désigne aussi le conteneur du layout du dashboard, qui défile lui aussi.
      data-thread-scroller=""
      className={className}
      onScroll={() => {
        const el = ref.current;
        if (!el) return;
        // Notre propre geste ne dit rien de l'intention du lecteur : il vise le
        // bas par construction, et le mesurer en vol conclurait le contraire.
        if (selfScroll.current) {
          selfScroll.current = false;
          return;
        }
        follow.current = staysAtBottom(el);
      }}
    >
      {children}
    </div>
  );
}
