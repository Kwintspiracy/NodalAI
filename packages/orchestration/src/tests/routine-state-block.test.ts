// routine-state-block.test.ts — ce que la routine LIT de son propre état.
//
// Ces tests existent à cause d'une annonce publiée deux fois : le 08/09/2026,
// une routine qui gardait son état dans la mémoire sémantique ne l'a pas
// retrouvé, a conclu « premier run » et a republié sur Discord. La phrase du
// premier cas ci-dessous est la correction : un état vide se DIT, pour qu'un
// premier run ne puisse pas être confondu avec un état perdu.
//
// Règle de la maison : on assert le texte RENDU, pas des compteurs d'appels.

import { describe, it, expect } from 'vitest';
import { buildRuntimeBlock } from '../system-prompt';
import type { DeploymentContext } from '../system-prompt';

const DEPLOYMENT: DeploymentContext = {
  os: 'Windows',
  networkMode: 'loopback',
  authMode: 'local-trust',
};

const CRON = {
  type: 'cron' as const,
  scheduleName: 'Check-Nodal-Agents-GitHub-Updates',
  prevRunAt: '2026-09-07T15:00:18.795Z',
};

describe('buildRuntimeBlock — état de routine', () => {
  it('sans état (job ordinaire) : aucune ligne d’état', () => {
    const block = buildRuntimeBlock(DEPLOYMENT, CRON);
    expect(block).toContain('Scheduled run of "Check-Nodal-Agents-GitHub-Updates"');
    expect(block).not.toContain('Routine state');
  });

  it('état VIDE : le prompt le dit, et n’en conclut RIEN sur les runs passés', () => {
    const block = buildRuntimeBlock(DEPLOYMENT, CRON, []);
    expect(block).toContain('Routine state: nothing recorded yet');
    expect(block).toContain('does NOT mean the routine has never run');
    expect(block).toContain('save_routine_state');

    // Le piège que ce test garde fermé. La table naît vide (migration 0101) :
    // toute routine antérieure lit un état vide à son premier run après la mise
    // à jour. Lui dire « premier run » la ferait republier ce qu'elle a déjà
    // publié — le bug même que ce lot répare (revue Codex, passe 5).
    expect(block).not.toMatch(/first run/i);
    expect(block).not.toMatch(/never recorded/i);
  });

  it('un état vide ne contredit pas la ligne du run précédent', () => {
    // Les deux lignes cohabitent dans le même bloc : « previous run: … » et
    // « nothing recorded yet ». Elles doivent pouvoir être vraies ensemble.
    const block = buildRuntimeBlock(DEPLOYMENT, CRON, []);
    expect(block).toContain('Previous run of this schedule: 2026-09-07T15:00:18.795Z');
    expect(block).toContain('nothing recorded yet');
  });

  it('état rempli : chaque clé est rendue telle quelle, et la mémoire est écartée', () => {
    const block = buildRuntimeBlock(DEPLOYMENT, CRON, [
      { key: 'last_announced_version', value: 'v0.8.8 (2026-08-28)' },
      { key: 'last_checked_at', value: '2026-09-08T01:00:30Z' },
    ]);

    expect(block).toContain('exactly as you recorded it on an earlier run');
    expect(block).toContain('do NOT look for it in memory');
    expect(block).toContain('`last_announced_version`: v0.8.8 (2026-08-28)');
    expect(block).toContain('`last_checked_at`: 2026-09-08T01:00:30Z');
    // Ce n'est pas la formule du premier run : les deux cas ne doivent jamais
    // se ressembler dans le prompt.
    expect(block).not.toContain('Routine state: EMPTY');
  });

  it('une valeur ne se fait pas tronquer ni reformuler en chemin', () => {
    // La valeur exacte est ce qui permet la comparaison au run suivant. Une
    // troncature « intelligente » ferait rater une égalité (invariant #4).
    const value = 'v0.8.8 — The Bot Tokens Release, announced to Discord #announcements';
    const block = buildRuntimeBlock(DEPLOYMENT, CRON, [{ key: 'k', value }]);
    expect(block).toContain(value);
  });

  it('l’état s’affiche même quand le job n’a pas de contexte de déclenchement', () => {
    // Un run relancé à la main porte un schedule_id sans trigger_context : il
    // doit voir l'état, sans quoi il referait le travail déjà fait.
    const block = buildRuntimeBlock(DEPLOYMENT, undefined, [{ key: 'cursor', value: '42' }]);
    expect(block).toContain('`cursor`: 42');
    expect(block).not.toContain('Scheduled run of');
  });
});
