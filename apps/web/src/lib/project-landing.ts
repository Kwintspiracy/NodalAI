// project-landing.ts — LA conversation d'un projet, celle où l'on atterrit.
//
// Quentin, 07/09 : « quand j'ouvre mon projet, je veux atterrir dans le feed
// de la conversation directement ». Un projet n'a qu'une conversation aux
// yeux de celui qui l'ouvre : celle qu'il a ouverte depuis la page du projet
// s'il l'a fait (`origin = 'project'`, la seule que la saisie prolonge à coup
// sûr — revue Codex passe 30), sinon la plus récente de celles qui portent un
// travail du projet, quel que soit son canal. Une conversation Telegram se
// LIT ici ; on n'y répond pas depuis le web (P7), donc la saisie ouvre alors
// la conversation du projet au premier envoi, comme pour un projet neuf.
//
// Pur : les lignes sont déjà lues, triées de la plus récente à la plus
// ancienne (`getProjectPageAction`).

export type LandingCandidate = { id: string; channel: string };

export type ProjectLanding = {
  /** Le fil à dessiner. */
  conversationId: string;
  /**
   * Ce que la saisie prolonge : la même conversation si l'on peut y répondre
   * depuis le web, sinon `null` — le premier envoi crée la conversation du
   * projet (la règle de `ThreadComposer.onBeforeSend`).
   */
  composerConversationId: string | null;
};

/** Depuis le web, on ne répond qu'à une conversation du tableau de bord (P7). */
export function canReplyFromWeb(channel: string): boolean {
  return channel === 'dashboard';
}

/**
 * Ce que la saisie DIT d'elle-même, dérivé du choix ci-dessus (revue Codex,
 * passes 60-61) :
 *   - `reply`   — elle prolonge le fil affiché : « Reply to <son agent>… » ;
 *   - `start`   — elle va CRÉER la conversation du projet, attribuée au ROOT :
 *                 « Write to <ROOT>… », et si un fil d'un autre canal est
 *                 affiché, une note le dit AVANT l'envoi (le nom du ROOT ne se
 *                 répète que s'il diffère de l'agent du fil lu) ;
 *   - `blocked` — pas de ROOT : toute création échouerait (`no_root_agent`),
 *                 donc pas de saisie du tout, un mot à la place — un champ
 *                 « Write… » qui échoue à l'envoi mentirait.
 */
export type ComposerPresentation =
  | { kind: 'reply'; agentName: string | null }
  | { kind: 'start'; agentName: string; placeholder: string; note: string | null }
  | { kind: 'blocked'; message: string };

export const NO_ROOT_MESSAGE = 'No ROOT agent yet. Designate one in Settings to write here.';

export function composerPresentation(input: {
  /** La saisie prolonge-t-elle le fil affiché ? (`composerConversationId !== null`) */
  continues: boolean;
  /** L'agent du fil affiché, s'il y a un fil. */
  threadAgentName: string | null;
  /** D'où vient le fil affiché (« via Telegram »), s'il y a un fil. */
  threadOrigin: string | null;
  /** Le ROOT de l'entité, celui qui recevra une conversation créée. */
  rootAgentName: string | null;
}): ComposerPresentation {
  if (input.continues) return { kind: 'reply', agentName: input.threadAgentName };
  if (input.rootAgentName === null) return { kind: 'blocked', message: NO_ROOT_MESSAGE };
  const root = input.rootAgentName;
  const note =
    input.threadOrigin === null
      ? null
      : `You're reading a conversation ${input.threadOrigin}${
          input.threadAgentName !== null ? ` with ${input.threadAgentName}` : ''
        }. Writing here starts this project's own conversation${
          root !== input.threadAgentName ? ` with ${root}` : ''
        }, shown here instead.`;
  return { kind: 'start', agentName: root, placeholder: `Write to ${root}…`, note };
}

export function projectLanding(
  rows: readonly LandingCandidate[],
  projectConversationId: string | null,
): ProjectLanding | null {
  const own =
    projectConversationId !== null ? rows.find((r) => r.id === projectConversationId) : undefined;
  const chosen = own ?? rows[0];
  if (chosen === undefined) {
    // La conversation du projet existe mais ne porte encore aucun travail :
    // elle n'est pas dans les lignes, elle est quand même le fil.
    return projectConversationId !== null
      ? { conversationId: projectConversationId, composerConversationId: projectConversationId }
      : null;
  }
  return {
    conversationId: chosen.id,
    composerConversationId: canReplyFromWeb(chosen.channel) ? chosen.id : null,
  };
}
