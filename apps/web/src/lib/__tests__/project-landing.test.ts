// project-landing.test.ts — où l'on atterrit en ouvrant un projet (07/09).

import { describe, it, expect } from 'vitest';
import { projectLanding } from '../project-landing.ts';

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
