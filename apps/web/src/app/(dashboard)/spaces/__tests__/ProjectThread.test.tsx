// ProjectThread.test.tsx — le bas de la page d'un projet rendu en HTML.
//
// Le cas qui compte : un fil qu'on n'a PAS pu lire. Il doit dire l'erreur et
// retirer la saisie, sinon on répond par-dessus un historique jamais chargé
// (revue passe 30, constat 1). Les deux autres cas sont là pour prouver que la
// saisie, elle, existe bien quand il n'y a rien à cacher.

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ProjectThread from '../ProjectThread.tsx';
import type { ConversationThreadView } from '@/lib/conversation-actions.ts';

// La saisie appelle `useRouter`, qui exige un routeur monté. Un rendu statique
// n'en a pas : on le remplace par un objet inerte, puisque ce qui est en jeu
// ici est la PRÉSENCE de la saisie, jamais la navigation.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

/** Un fil lu, avec un seul tour de l'utilisateur. */
const filLu = {
  ok: true as const,
  data: {
    feed: {
      items: [
        {
          kind: 'request' as const,
          text: 'Range le dossier',
          origin: { channel: 'dashboard', scheduleName: null, chatId: null },
        },
      ],
      totals: { turns: 1, inputTokens: 0, outputTokens: 0, costUsd: null },
    },
    // P12 — le fil passe l'état des documents au rendu des cartes. Aucun ici :
    // ce fixture n'a pas de fichier écrit.
    verification: { sequences: [], skippedSurfaces: [], unconfigured: [], deliverables: [] },
    conversation: { agentName: 'Alfred' },
  } as unknown as ConversationThreadView,
};

describe('ProjectThread', () => {
  it('un fil qu’on n’a pas pu lire : l’erreur est DITE, et la saisie disparaît', () => {
    const html = renderToStaticMarkup(
      <ProjectThread
        projectId="p-1"
        conversationId="c-1"
        thread={{ ok: false, code: 'db_error', message: 'Failed to load the conversation' }}
        composer={{ kind: 'reply', agentName: 'Alfred' }}
      />,
    );
    expect(html).toContain('Failed to load the conversation');
    // Pas de saisie : on ne répond pas par-dessus un historique inconnu.
    expect(html).not.toContain('Reply');
    expect(html).not.toContain('Send');
    // Et surtout, pas de « vide » là où il y a une panne.
    expect(html).not.toContain('Nothing said here yet');
  });

  it('pas encore de conversation : on le dit, et on peut écrire — au ROOT, qui la recevra', () => {
    const html = renderToStaticMarkup(
      <ProjectThread
        projectId="p-1"
        conversationId={null}
        thread={null}
        composer={{
          kind: 'start',
          agentName: 'Alfred',
          placeholder: 'Write to Alfred…',
          note: null,
        }}
      />,
    );
    expect(html).toContain('Nothing said here yet');
    expect(html).toContain('placeholder="Write to Alfred…"');
    // Aucun fil affiché : rien à annoncer avant l'envoi.
    expect(html).not.toContain('Writing here starts');
  });

  it('pas de ROOT : pas de saisie du tout, un mot qui dit pourquoi (passe 61)', () => {
    const html = renderToStaticMarkup(
      <ProjectThread
        projectId="p-1"
        conversationId={null}
        thread={null}
        composer={{
          kind: 'blocked',
          message: 'No ROOT agent yet. Designate one in Settings to write here.',
        }}
      />,
    );
    expect(html).toContain('No ROOT agent yet');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('Send');
  });

  it('le fil est là : il est dessiné, et on peut écrire', () => {
    const html = renderToStaticMarkup(
      <ProjectThread
        projectId="p-1"
        conversationId="c-1"
        thread={filLu}
        composer={{ kind: 'reply', agentName: 'Alfred' }}
      />,
    );
    expect(html).toContain('Range le dossier');
    // P2bis — la saisie dit À QUI on écrit : ce que la page a décidé.
    expect(html).toContain('placeholder="Reply to Alfred…"');
    expect(html).not.toContain('Nothing said here yet');
  });

  it('un fil d’un AUTRE agent qu’on lit, et une saisie qui va créer la conversation du projet : elle nomme le vrai destinataire, et le dit avant l’envoi (passe 60)', () => {
    const filTelegram = {
      ...filLu,
      data: {
        ...filLu.data,
        conversation: { agentName: 'Lead-Dev', channel: 'telegram', chatId: '42' },
      } as unknown as ConversationThreadView,
    };
    const html = renderToStaticMarkup(
      <ProjectThread
        projectId="p-1"
        conversationId={null}
        thread={filTelegram}
        composer={{
          kind: 'start',
          agentName: 'Alfred',
          placeholder: 'Write to Alfred…',
          note: "You're reading a conversation via Telegram with Lead-Dev. Writing here starts this project's own conversation with Alfred, shown here instead.",
        }}
      />,
    );
    expect(html).toContain('Range le dossier');
    expect(html).toContain('placeholder="Write to Alfred…"');
    expect(html).not.toContain('Reply to Lead-Dev');
    expect(html).toContain('Writing here starts this project&#x27;s own conversation with Alfred');
  });
});
