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
import { relativeTime, truncate } from '@/lib/format-time';
import type { ChannelChatRow } from '@/lib/chat-list.ts';

/**
 * Ce qu'on écrit sur la ligne quand l'allowlist ne nomme pas le chat.
 *
 * C'est le cas du PROPRIÉTAIRE : il a branché le bot lui-même, personne n'a
 * « demandé » son accès, donc aucun `requester_name` n'a été enregistré. Son
 * identifiant seul ne lui dirait rien ; « Direct » dit ce que c'est.
 */
function chatLabel(row: ChannelChatRow): string {
  const salon = row.kind === 'channel' || row.kind === 'group';
  if (row.name !== null && row.name !== '') {
    // Le `#` distingue un salon d'un privé : sur Discord et Slack, l'allowlist
    // enregistre le même nom pour les deux, et deux lignes se ressemblaient
    // trait pour trait.
    return salon ? `#${row.name}` : row.name;
  }
  return salon ? `Group ${row.chatId}` : 'Direct';
}

/** « telegram » → « Telegram ». Le canal, nommé comme l'utilisateur le nomme. */
function channelLabel(channel: string): string {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export default function ChannelChatsTable({ rows }: { rows: ChannelChatRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-body-13 font-medium text-ink">Channels</h2>
        <span className="text-mono-11 text-ink-4">
          {rows.length} {rows.length === 1 ? 'chat' : 'chats'}
        </span>
      </div>
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
                <Link
                  href={`/chat/${r.currentConversationId}`}
                  className="text-body-13 text-ink hover:underline"
                >
                  {chatLabel(r)}
                </Link>
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
