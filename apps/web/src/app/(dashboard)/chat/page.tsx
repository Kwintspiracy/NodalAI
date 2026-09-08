// /chat — la maison de TOUTES les conversations (P7).
//
// Le chat à deux volets a disparu avec cette page : une liste, et un fil par
// conversation (`/chat/[id]`), comme n'importe quelle application de
// messagerie. Les fils de canaux (Telegram, Slack, Discord, WhatsApp) sont
// ici au même titre que ceux du dashboard — c'est le même agent, et le canal
// n'est qu'un moyen d'y accéder.

import PageShell from '@/components/ui/PageShell';
import { listAllConversationsAction, listChatNamesAction } from '@/lib/conversation-actions.ts';
import { groupChatLists } from '@/lib/chat-list.ts';
import ChannelChatsTable from './ChannelChatsTable.tsx';
import ConversationsList from './ConversationsList.tsx';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const [result, names] = await Promise.all([
    listAllConversationsAction(),
    // Le nom des chats de canal. Une lecture qui échoue ne doit pas emporter la
    // page : les chats s'affichent alors par leur identifiant.
    listChatNamesAction(),
  ]);
  const { channels, dashboard } = groupChatLists(
    result.ok ? result.data : [],
    names.ok ? names.data : {},
  );

  return (
    <PageShell title="Chat" subtitle="Your channels, and the conversations you started here.">
      {result.ok ? (
        <>
          <ChannelChatsTable rows={channels} />
          <ConversationsList rows={dashboard} />
        </>
      ) : (
        <p className="text-sm text-err">{result.message}</p>
      )}
    </PageShell>
  );
}
