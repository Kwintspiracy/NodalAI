// chat-list.ts — deux listes, pas une : les CANAUX et les conversations.
//
// POURQUOI. /chat mélangeait tout dans une seule liste triée par date. Sur la
// base de Quentin, le 08/09/2026, cela donnait 45 lignes pour son SEUL chat
// Telegram — une par conversation ouverte au fil des mois — noyant les dix
// conversations du dashboard. Et chacune portait pour titre le premier message
// de sa vie, si bien qu'un fil actif ce matin s'appelait encore « Fais-moi une
// app en HTML, en récupérant l'API de IGDB », écrit dix jours plus tôt.
//
// Les deux objets ne se ressemblent pas :
//   - un CHAT de canal ne se ferme jamais et ne se nettoie pas. Il n'est pas
//     nommé par ce qu'on y a dit en premier, mais par la personne ou le salon
//     à l'autre bout ;
//   - une conversation du dashboard est jetable : on l'ouvre d'un bouton, on la
//     supprime, l'IA la renomme.
//
// D'où une ligne PAR CHAT en haut — pas par canal : Telegram a un privé et des
// groupes, Discord plusieurs salons — et les conversations du dashboard en bas.

import type { ConversationListRow } from './conversation-actions.ts';

/** Un chat de canal, avec ce qui s'y passe en ce moment. */
export type ChannelChatRow = {
  /** `<canal>:<chatId>` — stable, et sans collision entre canaux. */
  key: string;
  channel: string;
  chatId: string;
  /**
   * Le nom du chat : la personne ou le salon à l'autre bout. Jamais un extrait
   * de message. `null` quand on ne le connaît pas — l'écran dit alors ce qu'il
   * sait, sans inventer.
   */
  name: string | null;
  /**
   * Sa nature — `private`, `group`, `channel`. Elle DISTINGUE : sur Discord et
   * Slack, l'allowlist enregistre le même `requester_name` pour le privé et
   * pour le salon d'une même personne, et deux lignes portaient donc le même
   * libellé (constaté à l'écran le 08/09).
   */
  kind: string | null;
  /** Le fil COURANT de ce chat : celui qu'on ouvre en cliquant. */
  currentConversationId: string;
  /** Combien de fils ce chat a portés — 1 tant que personne n'a tapé `/new`. */
  conversationCount: number;
  agentName: string | null;
  agentSlug: string | null;
  agentAvatarUrl: string | null;
  updatedAt: Date | null;
  /** Le dernier mot de l'agent sur le fil courant. */
  lastPreview: string | null;
  /** Les tours du fil courant. */
  turns: number;
};

export type ChatLists = {
  channels: ChannelChatRow[];
  dashboard: ConversationListRow[];
};

/**
 * Le nom d'un chat, tel que l'allowlist le connaît.
 *
 * Clé `<canal>:<chatId>`, valeur le nom déclaré par la personne à l'autre bout
 * — `requesterName`. Le propriétaire n'en a pas : c'est lui qui a branché le
 * bot, personne ne l'a « demandé ».
 */
export type ChatNames = Readonly<Record<string, { name: string | null; kind: string | null }>>;

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

/**
 * Sépare les fils de canal des conversations du dashboard, et replie les
 * premiers par chat.
 *
 * Les lignes arrivent les plus récentes d'abord (l'action trie par
 * `updated_at`) : le PREMIER fil rencontré pour un chat est donc son fil
 * courant, et c'est celui qu'on ouvre. Les suivants ne servent qu'à compter —
 * ils restent lisibles par leur URL, ils ne méritent pas une ligne de liste.
 *
 * Une conversation de canal sans `chatId` ne peut être ratachée à aucun chat :
 * elle reste dans la liste du bas plutôt que de disparaître.
 */
export function groupChatLists(
  rows: readonly ConversationListRow[],
  names: ChatNames = {},
): ChatLists {
  const channels = new Map<string, ChannelChatRow>();
  const dashboard: ConversationListRow[] = [];

  for (const r of rows) {
    if (r.channel === 'dashboard' || r.chatId === null || r.chatId === '') {
      dashboard.push(r);
      continue;
    }
    const key = chatKey(r.agentId, r.channel, r.chatId);
    const nameKey = `${r.channel}:${r.chatId}`;
    const seen = channels.get(key);
    if (seen) {
      seen.conversationCount += 1;
      continue;
    }
    channels.set(key, {
      key,
      channel: r.channel,
      chatId: r.chatId,
      // Le NOM se cherche par (canal, chat) : l'allowlist nomme l'interlocuteur,
      // qui est le même quel que soit l'agent qui lui parle.
      name: names[nameKey]?.name ?? null,
      kind: names[nameKey]?.kind ?? null,
      currentConversationId: r.id,
      conversationCount: 1,
      agentName: r.agentName,
      agentSlug: r.agentSlug,
      agentAvatarUrl: r.agentAvatarUrl,
      updatedAt: r.updatedAt,
      lastPreview: r.lastPreview,
      turns: r.turns,
    });
  }

  return { channels: [...channels.values()], dashboard };
}
