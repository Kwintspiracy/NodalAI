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
   * La dernière position que NOUS avons écrite, ou `null` si le dernier
   * mouvement vient du lecteur.
   *
   * Pourquoi une POSITION et non un compteur : le navigateur FUSIONNE les
   * événements de défilement d'un même élément (CSSOM View §13.2). On ne sait
   * donc pas combien d'événements suivront nos écritures — un compteur restait
   * armé, ou se vidait sur le geste du lecteur, et l'avalait (revue Codex,
   * PR #48, passes 2 et 3, chacune ayant trouvé un entrelacement de plus).
   *
   * Une position, elle, se compare : l'événement porte celle du lecteur ou la
   * nôtre, quel qu'ait été le nombre d'événements en route.
   */
  const selfScrollTop = useRef<number | null>(null);

  /**
   * Descendre, sans que notre propre geste passe pour celui du lecteur.
   *
   * Le drapeau n'est armé que si la position a VRAIMENT bougé. Armé
   * inconditionnellement, il restait en attente d'un événement qui ne venait
   * jamais quand le fil était déjà en bas — et c'est alors le geste SUIVANT du
   * lecteur, un vrai celui-là, qui se faisait avaler : il remontait, son
   * défilement était ignoré, et la première croissance du contenu le ramenait
   * en bas (revue Codex, PR #48, constat 5).
   *
   * L'écriture est synchrone, l'événement asynchrone : lire `scrollTop` juste
   * après l'affectation dit si le navigateur a bougé, et le drapeau est donc
   * posé avant que l'événement n'arrive.
   */
  const scrollToBottom = (el: HTMLDivElement) => {
    el.scrollTop = el.scrollHeight;
    // La position EFFECTIVE après écriture, pas celle qu'on visait : le
    // navigateur borne `scrollTop` à ce que le contenu permet.
    selfScrollTop.current = el.scrollTop;
  };

  // AVANT la peinture : ouvrir un fil sur son dernier message, sans que le
  // lecteur voie passer le haut de l'historique.
  //
  // Ce que la mutation dit de cette ligne, et qu'il faut savoir : la neutraliser
  // NE fait pas rougir la spec `thread-autoscroll` — l'observateur ci-dessous
  // rattrape, parce qu'il émet dès qu'il commence à observer. Elle ne tient donc
  // pas la POSITION, qui est prouvée ailleurs ; elle évite le FLASH, ce
  // qu'aucun test de ce dépôt ne sait mesurer. Elle reste pour ça, et pour rien
  // d'autre.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) scrollToBottom(el);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observed = el.firstElementChild ?? el;
    const ro = new ResizeObserver(() => {
      // `follow` ne suffit pas : il n'est mis à jour qu'à la RÉCEPTION d'un
      // événement de défilement, et l'observateur peut se déclencher avant que
      // celui du lecteur n'ait été distribué. Sur une arrivée rapide, on
      // ramenait donc en bas quelqu'un qui venait de remonter (revue Codex,
      // PR #48, passe 3 — reproduit par la spec « en vol »).
      //
      // La position tranche sans attendre : si elle n'est plus celle que nous
      // avons écrite, quelqu'un d'autre l'a changée.
      const bougeParLeLecteur =
        selfScrollTop.current !== null && el.scrollTop !== selfScrollTop.current;
      if (bougeParLeLecteur) {
        follow.current = false;
        return;
      }
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
        // En bas, quelle qu'en soit la raison : on suit.
        if (staysAtBottom(el)) {
          selfScrollTop.current = null;
          follow.current = true;
          return;
        }
        // Pas en bas, mais la position est EXACTEMENT celle que nous avons
        // écrite : c'est notre propre défilement qui arrive, pas un geste. Le
        // cas se produit quand le contenu grandit sans que le bas soit
        // atteignable d'un coup.
        if (selfScrollTop.current !== null && el.scrollTop === selfScrollTop.current) return;
        // Pas en bas, et la position n'est pas la nôtre : le lecteur a remonté.
        selfScrollTop.current = null;
        follow.current = false;
      }}
    >
      {children}
    </div>
  );
}
