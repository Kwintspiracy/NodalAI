// ThreadScreen — la charpente d'un écran de conversation (07/09).
//
// Un fil, ce n'est pas une page qui défile : c'est un ÉCRAN. L'en-tête en
// haut, le fil qui défile au milieu, la saisie ancrée en bas, la barre d'état
// sous elle, pleine largeur. Avec un document qui défile, un fil de deux
// lignes laissait la saisie et la barre au milieu de l'écran, et la saisie
// descendait à mesure qu'on écrivait (Quentin, 07/09 : « est-ce que t'as
// sincèrement déjà vu une application fonctionner comme ça ? »).
//
// Les trois écrans de fil (chat, projet, run) partagent cette charpente : la
// géométrie ne doit pas diverger d'un écran à l'autre.

import type { ReactNode } from 'react';
import ThreadScroller from './ThreadScroller.tsx';

export default function ThreadScreen({
  children,
  composer,
  statusBar,
}: {
  /** Le fil : la seule zone qui défile. */
  children: ReactNode;
  /** La saisie, ou ce qui la remplace (un mot quand on ne peut pas écrire). */
  composer?: ReactNode;
  /** La barre d'état, tout en bas, pleine largeur. */
  statusBar?: ReactNode;
}) {
  return (
    <>
      <ThreadScroller className="min-h-0 flex-1 overflow-y-auto px-5 pt-6 pb-2 sm:px-8 lg:px-9">
        {/* Un seul enfant : c'est LUI dont la hauteur est observée. Sans ce
            conteneur, l'observateur suivrait la zone de défilement, dont la
            hauteur ne bouge jamais — et rien ne descendrait. */}
        <div>{children}</div>
      </ThreadScroller>
      {composer !== undefined && (
        <div className="shrink-0 px-5 pt-2 pb-3 sm:px-8 lg:px-9">{composer}</div>
      )}
      {statusBar}
    </>
  );
}
