// RoutineState.test.tsx — ce que le propriétaire VOIT de l'état d'une routine.
//
// Pourquoi cet écran existe : cet état décide si une routine refera ou non son
// travail. Tant qu'il vivait dans la mémoire, il était invisible ici, et le
// supprimer depuis la page Memories a fait publier deux fois la même annonce
// sur Discord (08/09/2026). Ce qui commande un comportement doit se voir là où
// on regarde ce comportement.
//
// Rendu statique côté serveur : on lit le HTML, pas des compteurs d'appels.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoutineState } from '../ScheduledSection.tsx';

describe('RoutineState', () => {
  it('affiche chaque clé avec sa valeur, telle quelle', () => {
    const html = renderToStaticMarkup(
      <RoutineState
        entries={[
          {
            key: 'last_announced_version',
            value: 'v0.8.8 (2026-08-28)',
            updatedAt: new Date('2026-09-08T01:00:00Z'),
          },
          {
            key: 'last_checked_at',
            value: '2026-09-08T01:00:30Z',
            updatedAt: new Date('2026-09-08T01:00:00Z'),
          },
        ]}
      />,
    );

    expect(html).toContain('last_announced_version');
    expect(html).toContain('v0.8.8 (2026-08-28)');
    expect(html).toContain('last_checked_at');
  });

  it('une valeur longue reste lisible en entier au survol', () => {
    // La ligne est tronquée pour tenir dans le tableau, mais la valeur exacte
    // doit rester atteignable : c'est elle que la routine compare.
    const value = 'v0.8.8 — The Bot Tokens Release, announced to Discord #announcements';
    const html = renderToStaticMarkup(
      <RoutineState entries={[{ key: 'k', value, updatedAt: new Date('2026-09-08T01:00:00Z') }]} />,
    );
    expect(html).toContain(`title="${value}"`);
  });

  it('une routine sans état ne rend rien — pas un bloc vide', () => {
    expect(renderToStaticMarkup(<RoutineState entries={[]} />)).toBe('');
  });
});
