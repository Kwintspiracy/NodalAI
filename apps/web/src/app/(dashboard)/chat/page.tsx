// /chat — la maison de TOUTES les conversations (P7).
//
// Le chat à deux volets a disparu avec cette page : une liste, et un fil par
// conversation (`/chat/[id]`), comme n'importe quelle application de
// messagerie. Les fils de canaux (Telegram, Slack, Discord, WhatsApp) sont
// ici au même titre que ceux du dashboard — c'est le même agent, et le canal
// n'est qu'un moyen d'y accéder.

import PageShell from '@/components/ui/PageShell';
import {
  listAllConversationsAction,
  listChatNamesAction,
  listCurrentThreadByChatAction,
} from '@/lib/conversation-actions.ts';
import { groupChatLists } from '@/lib/chat-list.ts';
import ChannelChatsTable from './ChannelChatsTable.tsx';
import ConversationsList from './ConversationsList.tsx';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const [result, names, currents] = await Promise.all([
    listAllConversationsAction(),
    // Le nom des chats de canal. Une lecture qui échoue ne doit pas emporter la
    // page : les chats s'affichent alors par leur identifiant — mais elle se
    // DIT, voir `namesUnreadable`.
    listChatNamesAction(),
    // Le fil courant de chaque chat, désigné par la BASE avec la règle du
    // runner. Une lecture qui échoue n'emporte pas la page — mais elle se DIT :
    // voir `threadsUnreadable` ci-dessous.
    listCurrentThreadByChatAction(),
  ]);
  const { channels, dashboard, missingCurrent, hiddenByWindow } = groupChatLists(
    result.ok ? result.data : [],
    names.ok ? names.data : {},
    currents.ok ? currents.data.current : {},
    currents.ok ? currents.data.listable : [],
  );

  // L'échec de la désignation se transmet TEL QUEL, sans passer par les lignes.
  // Quand la liste ne rapporte aucun canal — 200 conversations du dashboard
  // devant — et que cette lecture échoue, tous les compteurs valent zéro et la
  // section disparaissait : l'utilisateur ne pouvait pas distinguer « aucun chat
  // de canal » de « impossible de le vérifier » (revue Codex, PR #48, passe 11).
  const threadsUnreadable = !currents.ok;
  // Même règle pour les NOMS : sans eux, un chat s'affiche par son identifiant
  // et perd sa nature (privé, groupe). Rien ne distinguait cette panne d'un
  // chat qu'on n'a jamais nommé — le propriétaire, notamment, n'en a pas
  // (revue Codex, PR #48, passe 12).
  const namesUnreadable = !names.ok;

  return (
    <PageShell title="Chat" subtitle="Your channels, and the conversations you started here.">
      {result.ok ? (
        <>
          <ChannelChatsTable
            rows={channels}
            threadsUnreadable={threadsUnreadable}
            namesUnreadable={namesUnreadable}
            missingCurrent={missingCurrent}
            hiddenByWindow={hiddenByWindow}
          />
          <ConversationsList rows={dashboard} />
        </>
      ) : (
        <p className="text-sm text-err">{result.message}</p>
      )}
    </PageShell>
  );
}
