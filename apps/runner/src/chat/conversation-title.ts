// conversation-title.ts — NOMMER une conversation d'après ce qui s'y dit.
//
// Quentin, 07/09 : « il faudrait que les intitulés des chats soient renommés
// automatiquement par l'IA en quelque chose de bref et succinct. Là, le titre
// c'est la première phrase que j'envoie ; quand je démarre en disant "bonjour
// tu es là", ça ne m'aide pas à retrouver le contenu après. »
//
// Le titre provisoire (la première phrase, tronquée) reste écrit tout de
// suite : il faut bien quelque chose dans la liste pendant que la réponse se
// génère. Il est REMPLACÉ après le premier échange complet, par un titre que
// le modèle tire de l'échange entier — la question ET la réponse, parce que
// « bonjour » seul ne dit rien de ce dont on a parlé.
//
// Ce module est PUR : il construit la consigne et nettoie ce qui revient. Le
// branchement (quand appeler, avec quel client) vit dans `run-chat-turn.ts`.

/** Au-delà, la liste tronque — autant que le modèle vise court d'emblée. */
export const TITLE_MAX_CHARS = 48;

export const TITLE_SYSTEM_PROMPT = [
  'You name conversations. Read the exchange and answer with a title only.',
  'Rules: 2 to 5 words. No quotes, no final period, no emoji, no prefix like "Title:".',
  'Name the SUBJECT, not the greeting: "tu es là ?" answered by a greeting is "Quick hello".',
  'Use the language the user wrote in.',
].join(' ');

/** L'échange, tel que le nommeur le lit. */
export function titlePrompt(input: { userMessage: string; agentReply: string }): string {
  const user = input.userMessage.trim().slice(0, 1500);
  const agent = input.agentReply.trim().slice(0, 1500);
  return `User:\n${user}\n\nAssistant:\n${agent}\n\nTitle:`;
}

/**
 * Le titre RETENU, ou `null` s'il n'y a rien d'utilisable — et alors le titre
 * provisoire reste : mieux vaut la première phrase de l'utilisateur qu'un
 * titre inventé ou vide.
 *
 * Ce qui est retiré : les guillemets dont les modèles entourent volontiers
 * leur réponse, un préfixe « Title: », les retours à la ligne (un titre tient
 * sur une ligne), la ponctuation finale, et tout ce qui dépasse — un modèle
 * bavard rendrait un paragraphe, et un paragraphe n'est pas un titre.
 */
export function cleanTitle(raw: string): string | null {
  let t = raw.trim();
  if (t === '') return null;
  // Une seule ligne : la première non vide.
  const firstLine = t.split('\n').find((l) => l.trim() !== '');
  if (firstLine === undefined) return null;
  t = firstLine.trim();
  // « Title: … », « Titre : … »
  t = t.replace(/^(title|titre)\s*[:：]\s*/i, '');
  // Guillemets autour du tout (droits, français, courbes).
  t = t.replace(/^["'«“”]+\s*/, '').replace(/\s*["'»“”]+$/, '');
  // Ponctuation finale — jamais un point, mais on garde « ? » : il porte du sens.
  t = t.replace(/[.,;:!]+$/, '').trim();
  if (t === '') return null;
  // Un paragraphe n'est pas un titre : on refuse plutôt que de couper au
  // milieu d'un mot et de faire passer une phrase pour un intitulé.
  if (t.length > TITLE_MAX_CHARS * 2) return null;
  return t.length > TITLE_MAX_CHARS ? t.slice(0, TITLE_MAX_CHARS).trimEnd() + '…' : t;
}
