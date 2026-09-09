// ProjectVerificationPanel.test.tsx — ce que l'écran DIT des commandes de preuve.
//
// Le sujet n'est pas cosmétique. Ce panneau demandait à l'utilisateur des
// commandes qu'il n'a aucune raison de connaître — « je sais pas quelle
// commande, je sais pas ce qu'il faut taper » (08/09/2026) — et personne ne les
// a jamais remplies : 0 preuve produite sur la base de référence depuis
// l'origine. C'est l'agent qui construit qui déclare, désormais ; l'écran doit
// le dire, et ne plus reprocher un champ vide.
//
// Rendu statique côté serveur : on lit le HTML.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ProjectVerificationPanel from '../ProjectVerificationPanel.tsx';
import type { ProjectVerification } from '../ProjectVerificationPanel.tsx';

const COMMANDES = [{ command: 'node --check app.js', timeoutSeconds: 60 }];

function rendu(verification: ProjectVerification | null): string {
  return renderToStaticMarkup(
    <ProjectVerificationPanel
      projectPath="C:/Users/kwint/Documents/Dev/recipes-app"
      verification={verification}
      isOwner
      onPrefsReloaded={() => {}}
    />,
  );
}

describe('ProjectVerificationPanel — ce que l’écran dit', () => {
  it('rien de déclaré : l’écran n’ACCUSE pas, il explique qui déclarera', () => {
    const html = rendu({
      verifyCommands: null,
      verifyApprovedAt: null,
      verifyManifestHash: null,
      verifyStatus: 'not_configured',
      verifySource: null,
    });

    expect(html).toContain('Nothing declared yet');
    expect(html).toContain('Nothing to fill in');
    expect(html).toContain('declares how to check its own work');
    // L'ancien libellé disait « Not configured » — un reproche adressé à qui
    // n'avait rien à configurer.
    expect(html).not.toContain('Not configured');
  });

  it('déclaré par l’agent : l’écran le DIT, et ne parle pas d’approbation', () => {
    const html = rendu({
      verifyCommands: COMMANDES,
      verifyApprovedAt: new Date('2026-09-08T13:50:00Z'),
      verifyManifestHash: 'h',
      verifyStatus: 'approved',
      verifySource: 'agent',
    });

    expect(html).toContain('Declared by the agent');
    expect(html).toContain('you never have to write them');
    // Le point qui compte : ne pas présenter comme le choix du propriétaire ce
    // qu'il n'a pas décidé. La preuve s'exécute pareil ; c'est le MOT qui
    // change.
    expect(html).not.toContain('>Approved ');
  });

  it('saisi par le propriétaire : le mot « Approved » reste le sien', () => {
    const html = rendu({
      verifyCommands: COMMANDES,
      verifyApprovedAt: new Date('2026-09-08T13:50:00Z'),
      verifyManifestHash: 'h',
      verifyStatus: 'approved',
      verifySource: 'owner',
    });

    expect(html).toContain('Approved');
    expect(html).not.toContain('Declared by the agent');
  });

  it('la commande déclarée est LISIBLE, pas seulement comptée', () => {
    const html = rendu({
      verifyCommands: COMMANDES,
      verifyApprovedAt: new Date('2026-09-08T13:50:00Z'),
      verifyManifestHash: 'h',
      verifyStatus: 'approved',
      verifySource: 'agent',
    });
    expect(html).toContain('node --check app.js');
  });
});
