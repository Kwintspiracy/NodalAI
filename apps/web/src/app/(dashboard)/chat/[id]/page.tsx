// /chat/[id] — LE FIL d'une conversation (P7).
//
// Le même fil que la page d'un espace (P2), les mêmes cartes, la même preuve
// (P3) et la même barre d'état (P4) : une conversation et un travail se lisent
// de la même façon, parce que c'est la même matière — des tours, des actions,
// un coût. Ce que cette page ajoute, c'est la saisie en bas quand la
// conversation est celle du dashboard.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageShell from '@/components/ui/PageShell';
import StatusPill from '@/components/ui/StatusPill';
import ConversationFeedView from '@/app/(dashboard)/spaces/ConversationFeedView.tsx';
import LiveRefresh from '@/app/(dashboard)/spaces/LiveRefresh.tsx';
import DeliveriesCard from '@/app/(dashboard)/spaces/DeliveriesCard.tsx';
import StatusBar from '@/app/(dashboard)/spaces/StatusBar.tsx';
import VerificationSection from '@/app/(dashboard)/code/[id]/VerificationSection.tsx';
import { formatCost, formatTokens, originLabel } from '@/app/(dashboard)/spaces/format.ts';
import { getConversationThreadAction } from '@/lib/conversation-actions.ts';
import { plainText } from '@/components/Markdown.tsx';
import { truncate } from '@/lib/format-time';
import ThreadComposer from '../ThreadComposer.tsx';

// Force dynamic — le fil est relu à chaque requête, et pendant qu'un travail court.
export const dynamic = 'force-dynamic';

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getConversationThreadAction(id);
  if (!result.ok) {
    if (result.code === 'not_found') notFound();
    return (
      <PageShell title="Conversation">
        <Link href="/chat" className="text-xs text-ink-3 hover:text-ink-2">
          ← Chat
        </Link>
        <p className="mt-4 text-sm text-err">{result.message}</p>
      </PageShell>
    );
  }

  const { conversation, feed, verification, cost, deliveries, live, canReply } = result.data;
  const lastProof = verification.sequences.at(-1) ?? null;
  const pendingDeliveries = deliveries.filter(
    (d) => d.outcome === 'prepared' || d.outcome === 'attempted',
  ).length;
  const showVerification =
    verification.sequences.length > 0 ||
    verification.unconfigured.length > 0 ||
    verification.skippedSurfaces.length > 0 ||
    live;

  // Le titre : celui que porte la conversation, sinon sa première demande —
  // jamais un identifiant. « Untitled » n'apparaît que si les deux manquent.
  const firstRequest = feed.items.find((i) => i.kind === 'request');
  // `plainText` avant de couper : un titre qui commence par « ## **PRD** »
  // s'affichait avec ses dièses et ses astérisques.
  const title =
    conversation.title !== ''
      ? truncate(plainText(conversation.title), 90)
      : firstRequest
        ? truncate(plainText(firstRequest.text), 90)
        : 'Untitled';

  const origin = originLabel({
    channel: conversation.channel,
    scheduleName: null,
    chatId: conversation.chatId,
  });
  const subtitle = [
    origin,
    conversation.agentName,
    `${feed.totals.turns} ${feed.totals.turns === 1 ? 'turn' : 'turns'}`,
    `${formatTokens(feed.totals.inputTokens + feed.totals.outputTokens)} tokens`,
    feed.totals.costUsd !== null ? formatCost(feed.totals.costUsd) : null,
  ]
    .filter((x): x is string => typeof x === 'string' && x !== '')
    .join(' · ');

  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      toolbar={
        <div className="flex items-center gap-3">
          <Link href="/chat" className="text-xs text-ink-3 hover:text-ink-2">
            ← Chat
          </Link>
          <StatusPill variant={live ? 'run' : 'idle'} />
          {conversation.currentProject && (
            <Link
              href={`/spaces/${conversation.currentProject.id}`}
              className="text-xs text-ink-3 hover:text-ink-2"
              title={conversation.currentProject.path}
            >
              {conversation.currentProject.name}
            </Link>
          )}
        </div>
      }
    >
      <LiveRefresh live={live} />
      <ConversationFeedView feed={feed} deliverables={verification.deliverables} />
      {/* P3 — la preuve et la file d'envoi de TOUT le fil, la même carte que la
          page d'un espace. */}
      {/* La preuve ne se rend QUE s'il y a quelque chose à en dire. Une carte
          « No proof ran for this process. » sous chaque fil terminé était du
          bruit : la barre d'état le dit déjà, en permanence. */}
      <div className="mx-auto mt-8 max-w-[840px] space-y-6">
        {showVerification && (
          <VerificationSection
            sequences={verification.sequences}
            skippedSurfaces={verification.skippedSurfaces}
            unconfigured={verification.unconfigured}
            stage={live ? 'processing' : 'completed'}
            live={live}
          />
        )}
        <DeliveriesCard deliveries={deliveries} />
      </div>
      {canReply ? (
        <ThreadComposer conversationId={conversation.id} agentName={conversation.agentName} />
      ) : (
        <p className="mx-auto mt-8 max-w-[840px] text-body-13 text-ink-4">
          This conversation lives in {origin.replace(/^via /, '')}. Reply from there.
        </p>
      )}
      {/* P4 — la barre d'état, permanente en bas de la page. */}
      <StatusBar
        cost={cost}
        proofVerdict={lastProof?.verdict ?? null}
        proofSequences={verification.sequences.length}
        pendingDeliveries={pendingDeliveries}
        live={live}
      />
    </PageShell>
  );
}
