// ChannelChatsTable — les CHATS de canal, une ligne chacun.
//
// Séparés des conversations du dashboard, et au-dessus d'elles, parce que ce
// sont deux objets différents : un chat ne se ferme jamais, ne se crée pas d'un
// bouton et ne se nettoie pas ; il est nommé par la personne ou le salon à
// l'autre bout, pas par ce qu'on y a dit en premier.
//
// Avant ce découpage, le chat Telegram de Quentin occupait à lui seul 45 lignes
// de la liste — une par fil ouvert au fil des mois — chacune titrée par son
// premier message, et le fil actif du matin s'appelait encore « Fais-moi une
// app en HTML, en récupérant l'API de IGDB », écrit dix jours plus tôt.
//
// Pas de sélection ni de suppression ici : on ne jette pas un interlocuteur.

import Link from 'next/link';
import AgentAvatar from '@/components/ui/AgentAvatar';
import Table, { THead, Th, Tr, Td } from '@/components/ui/Table';
import { MonoMicroTag } from '@/components/ui/MonoMicroTag';
import { LIST_MAX } from '@/lib/chat-key.ts';
import { relativeTime, truncate } from '@/lib/format-time';
import type { ChannelChatRow } from '@/lib/chat-list.ts';

/**
 * Ce qu'on écrit sur la ligne quand l'allowlist ne nomme pas le chat.
 *
 * C'est le cas du PROPRIÉTAIRE : il a branché le bot lui-même, personne n'a
 * « demandé » son accès, donc aucun `requester_name` n'a été enregistré. Son
 * identifiant seul ne lui dirait rien ; « Direct » dit ce que c'est.
 */
/** Les canaux où « #salon » est la convention que l'utilisateur lit ailleurs. */
const HASH_CHANNELS = new Set(['discord', 'slack']);

function chatLabel(row: ChannelChatRow): string {
  const salon = row.kind === 'channel' || row.kind === 'group';
  if (row.name !== null && row.name !== '') {
    // Le `#` distingue un salon d'un privé : sur Discord et Slack, l'allowlist
    // enregistre le même nom pour les deux, et deux lignes se ressemblaient
    // trait pour trait. Ailleurs il ne se dit pas — un groupe Telegram ne
    // s'écrit pas « #groupe » (revue Codex, PR #48).
    return salon && HASH_CHANNELS.has(row.channel) ? `#${row.name}` : row.name;
  }
  // Sans nom, on dit ce qu'on SAIT. « Direct » n'est vrai que pour un chat dont
  // on connaît la nature privée ; l'écrire par défaut rendait indistinguables
  // tous les chats anonymes, quels qu'ils soient (revue Codex, PR #48).
  if (row.kind === 'private') return 'Direct';
  return salon ? `Group ${row.chatId}` : row.chatId;
}

/** « telegram » → « Telegram ». Le canal, nommé comme l'utilisateur le nomme. */
function channelLabel(channel: string): string {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export default function ChannelChatsTable({
  rows,
  missingCurrent = false,
  hiddenByWindow = 0,
}: {
  rows: ChannelChatRow[];
  /** La base n'a pas pu désigner le fil courant d'au moins un chat. */
  missingCurrent?: boolean;
  /** Des chats existent mais aucune de leurs conversations n'est dans la fenêtre. */
  hiddenByWindow?: number;
}) {
  // Zéro ligne mais des chats cachés par la fenêtre : la section doit
  // apparaître QUAND MÊME, pour dire qu'elle est vide à tort.
  if (rows.length === 0 && hiddenByWindow === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-body-13 font-medium text-ink">Channels</h2>
        <span className="text-mono-11 text-ink-4">
          {rows.length} {rows.length === 1 ? 'chat' : 'chats'}
        </span>
      </div>
      {missingCurrent && (
        <p className="text-body-12 text-ink-3 mb-2">
          Chats marked “unavailable” below can’t be opened right now — their current thread couldn’t
          be read. Reload in a moment.
        </p>
      )}
      {hiddenByWindow > 0 && (
        <p className="text-body-12 text-ink-3 mb-2">
          {hiddenByWindow} more {hiddenByWindow === 1 ? 'chat is' : 'chats are'} not listed: the
          list shows the {LIST_MAX} most recently active conversations, and none of theirs made it
          in.
        </p>
      )}
      <Table>
        <THead>
          <Th>Agent</Th>
          <Th>Chat</Th>
          <Th className="hidden md:table-cell">Channel</Th>
          <Th className="hidden lg:table-cell">Last message</Th>
          <Th align="right" className="hidden sm:table-cell">
            Threads
          </Th>
          <Th className="hidden lg:table-cell">Last activity</Th>
        </THead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.key}>
              <Td>
                <div className="flex items-center gap-2">
                  <AgentAvatar
                    name={r.agentName ?? ''}
                    imageUrl={r.agentAvatarUrl}
                    size="sm"
                    shape="square"
                  />
                  <span className="truncate text-body-13 text-ink-2">{r.agentName ?? '—'}</span>
                </div>
              </Td>
              <Td>
                {/* Sans fil courant désigné, PAS de lien : on ne devine pas où
                    mène ce chat. Le nom reste lisible, et la bannière au-dessus
                    dit pourquoi il n'ouvre rien (invariant #4 — jamais un repli
                    silencieux qui présente une estimation comme un fait). */}
                {r.currentConversationId !== null ? (
                  <Link
                    href={`/chat/${r.currentConversationId}`}
                    className="text-body-13 text-ink hover:underline"
                  >
                    {chatLabel(r)}
                  </Link>
                ) : (
                  // L'état est DIT sur la ligne, pas seulement suggéré par une
                  // nuance de gris et l'absence de lien : sur cinquante chats,
                  // il fallait sinon deviner lequel n'ouvre rien (revue Codex,
                  // PR #48, passe 8).
                  <span className="text-body-13 text-ink-3">
                    {chatLabel(r)} <MonoMicroTag tone="ink">unavailable</MonoMicroTag>
                  </span>
                )}
              </Td>
              <Td className="hidden md:table-cell">
                <MonoMicroTag tone="ink">{channelLabel(r.channel)}</MonoMicroTag>
              </Td>
              <Td className="hidden lg:table-cell">
                <span className="text-body-12 text-ink-3">
                  {r.lastPreview !== null ? truncate(r.lastPreview, 60) : ''}
                </span>
              </Td>
              <Td align="right" className="hidden sm:table-cell">
                <span className="text-mono-11 text-ink-4">{r.conversationCount}</span>
              </Td>
              <Td className="hidden lg:table-cell">
                <span className="text-mono-11 text-ink-4">
                  {r.updatedAt ? relativeTime(r.updatedAt) : ''}
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
