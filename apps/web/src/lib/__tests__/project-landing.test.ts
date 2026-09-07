// project-landing.test.ts — où l'on atterrit en ouvrant un projet (07/09).

import { describe, it, expect } from 'vitest';
import { composerPresentation, NO_ROOT_MESSAGE, projectLanding } from '../project-landing.ts';

const rows = [
  { id: 'tg-2', channel: 'telegram' },
  { id: 'dash-1', channel: 'dashboard' },
  { id: 'own', channel: 'dashboard' },
];

describe('projectLanding', () => {
  it('la conversation ouverte depuis le projet gagne, même si une autre est plus récente', () => {
    expect(projectLanding(rows, 'own')).toEqual({
      conversationId: 'own',
      composerConversationId: 'own',
    });
  });

  it('sans conversation propre : la plus récente, et la saisie la prolonge si elle vient du web', () => {
    expect(projectLanding([rows[1]!, rows[2]!], null)).toEqual({
      conversationId: 'dash-1',
      composerConversationId: 'dash-1',
    });
  });

  it('la plus récente vient de Telegram : on la LIT, la saisie ouvrira la conversation du projet', () => {
    expect(projectLanding(rows, null)).toEqual({
      conversationId: 'tg-2',
      composerConversationId: null,
    });
  });

  it('une conversation propre sans travail encore : elle est le fil quand même', () => {
    expect(projectLanding([], 'own')).toEqual({
      conversationId: 'own',
      composerConversationId: 'own',
    });
  });

  it('rien du tout : null — la page dit qu’il n’y a rien, et la saisie crée', () => {
    expect(projectLanding([], null)).toBeNull();
  });
});

describe('composerPresentation — ce que la saisie dit d’elle-même (passes 60-61)', () => {
  it('prolonge un fil du tableau de bord : « Reply to <son agent> », aucune note', () => {
    expect(
      composerPresentation({
        continues: true,
        threadAgentName: 'Alfred',
        threadOrigin: 'from the dashboard',
        rootAgentName: 'Alfred',
      }),
    ).toEqual({ kind: 'reply', agentName: 'Alfred' });
  });

  it('prolonge un fil dont l’agent est inconnu : un « Reply… » honnête, pas un nom inventé', () => {
    expect(
      composerPresentation({
        continues: true,
        threadAgentName: null,
        threadOrigin: 'from the dashboard',
        rootAgentName: 'Alfred',
      }),
    ).toEqual({ kind: 'reply', agentName: null });
  });

  it('aucun fil : elle écrira au ROOT, sans note de transition', () => {
    expect(
      composerPresentation({
        continues: false,
        threadAgentName: null,
        threadOrigin: null,
        rootAgentName: 'Alfred',
      }),
    ).toEqual({ kind: 'start', agentName: 'Alfred', placeholder: 'Write to Alfred…', note: null });
  });

  it('un fil Telegram d’un AUTRE agent : la note nomme le fil lu, puis le ROOT qui recevra', () => {
    const p = composerPresentation({
      continues: false,
      threadAgentName: 'Lead-Dev',
      threadOrigin: 'via Telegram',
      rootAgentName: 'Alfred',
    });
    expect(p.kind).toBe('start');
    expect(p.kind === 'start' && p.placeholder).toBe('Write to Alfred…');
    expect(p.kind === 'start' && p.note).toBe(
      "You're reading a conversation via Telegram with Lead-Dev. Writing here starts this project's own conversation with Alfred, shown here instead.",
    );
  });

  it('un fil Telegram du MÊME agent : le nom ne se répète pas', () => {
    const p = composerPresentation({
      continues: false,
      threadAgentName: 'Alfred',
      threadOrigin: 'via Telegram',
      rootAgentName: 'Alfred',
    });
    expect(p.kind === 'start' && p.note).toBe(
      "You're reading a conversation via Telegram with Alfred. Writing here starts this project's own conversation, shown here instead.",
    );
  });

  it('un fil Telegram sans nom d’agent : la note ne dit pas « with »', () => {
    const p = composerPresentation({
      continues: false,
      threadAgentName: null,
      threadOrigin: 'via Telegram',
      rootAgentName: 'Alfred',
    });
    expect(p.kind === 'start' && p.note).toBe(
      "You're reading a conversation via Telegram. Writing here starts this project's own conversation with Alfred, shown here instead.",
    );
  });

  it('pas de ROOT : la saisie est BLOQUÉE et le dit — jamais un « Write… » qui échouerait à l’envoi', () => {
    expect(
      composerPresentation({
        continues: false,
        threadAgentName: 'Lead-Dev',
        threadOrigin: 'via Telegram',
        rootAgentName: null,
      }),
    ).toEqual({
      kind: 'blocked',
      message: NO_ROOT_MESSAGE,
      // Le geste qui débloque : créer un orchestrateur (le ROOT n'est pas
      // « désigné », il naît avec le premier) — le lien de Settings, pas Settings.
      action: { label: expect.stringContaining('ROOT'), href: '/agents' },
    });
    // Mais un fil qu'on PROLONGE n'a pas besoin de ROOT.
    expect(
      composerPresentation({
        continues: true,
        threadAgentName: 'Alfred',
        threadOrigin: 'from the dashboard',
        rootAgentName: null,
      }).kind,
    ).toBe('reply');
  });
});
