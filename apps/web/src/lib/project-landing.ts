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
