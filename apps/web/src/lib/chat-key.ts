// chat-key.ts — la clé d'un chat, et RIEN d'autre.
//
// Ce module existe pour être importable des DEUX côtés sans cycle : le
// regroupement de `/chat` (chat-list.ts) et l'action qui demande à la base de
// désigner le fil courant (conversation-actions.ts) doivent former la même
// clé, sinon la désignation ne retrouve jamais son chat.

/**
 * La clé d'un chat, du point de vue de l'écran.
 *
 * L'AGENT en fait partie, et c'est le point délicat : le runner identifie un
 * fil par (entité, agent, canal, chat) — voir `resolveConversation`. Deux bots
 * d'agents différents qui parlent au même utilisateur Telegram tiennent donc
 * deux fils distincts. Grouper sur le seul couple canal/chat les fusionnait, et
 * le second disparaissait des deux tableaux (revue Codex, PR #48, passe 2).
 *
 * Le canal en fait partie aussi : deux canaux peuvent porter le même id.
 */
export function chatKey(agentId: string | null, channel: string, chatId: string): string {
  return `${agentId ?? 'sans-agent'}:${channel}:${chatId}`;
}
