// /spaces/[id] — LA PAGE D'UN PROJET : sa conversation (P8, refaite le 07/09).
//
// Ouvrir un projet, c'est atterrir dans le fil de SA conversation, la saisie
// collée en bas — exactement comme /chat/[id]. Quentin, 07/09 : « quand
// j'ouvre mon projet, je veux atterrir dans le feed de la conversation
// directement » ; « ce que je vois, c'est des réglages de mon projet ». Le
// dossier, ses fichiers, sa preuve et les autres conversations sont donc sur
// /spaces/[id]/files, derrière le bouton « Files » de l'en-tête — pas empilés
// au-dessus du fil.
//
// La page du FIL D'UN JOB n'est pas ici : /scheduled/[id] pour un run
// d'automatisation, /chat/[id] pour tout le reste.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageShell from '@/components/ui/PageShell';
import StatusPill from '@/components/ui/StatusPill';
import { getProjectPageAction } from '@/lib/project-actions.ts';
import { getConversationThreadAction } from '@/lib/conversation-actions.ts';
import { projectLanding } from '@/lib/project-landing.ts';
import WorkHeader from '../WorkHeader.tsx';
import { threadAgents } from '../format.ts';
import ProjectThread from '../ProjectThread.tsx';
import StatusBar from '../StatusBar.tsx';

// Force dynamic — le projet et son fil sont relus à chaque requête.
export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getProjectPageAction(id);
  if (!result.ok) {
    if (result.code === 'not_found') notFound();
    return (
      <PageShell title="Project">
        <Link href="/spaces" className="text-xs text-ink-3 hover:text-ink-2">
          ← Spaces
        </Link>
        <p className="mt-4 text-sm text-err">{result.message}</p>
      </PageShell>
    );
  }

  const { project, conversations, projectConversationId } = result.data;
  const landing = projectLanding(conversations, projectConversationId);

  // Le fil de la conversation du projet — la MÊME lecture que /chat/[id] (P7).
  const thread =
    landing === null ? null : await getConversationThreadAction(landing.conversationId);
  const view = thread !== null && thread.ok ? thread.data : null;
  const lastProof = view?.verification.sequences.at(-1) ?? null;
  const pendingDeliveries =
    view?.deliveries.filter((d) => d.outcome === 'prepared' || d.outcome === 'attempted').length ??
    0;

  return (
    <PageShell
      header={
        <WorkHeader
          name={project.name}
          path={project.path}
          agents={view !== null ? threadAgents(view.feed.items) : []}
          proofVerdict={lastProof?.verdict ?? null}
          filesHref={`/spaces/${project.id}/files`}
        />
      }
      toolbar={
        <div className="flex items-center gap-3">
          <Link href="/spaces" className="text-mono-11 text-ink-4 hover:text-ink-2">
            ← Spaces
          </Link>
          {view !== null && <StatusPill variant={view.live ? 'run' : 'idle'} />}
        </div>
      }
    >
      {/* Le fil et la saisie : un échec de lecture y est DIT, et retire la
          saisie (revue passe 30, constat 1). La saisie prolonge la conversation
          du projet quand on peut y répondre depuis le web ; sinon (un fil
          Telegram qu'on lit ici) le premier envoi crée celle du projet. */}
      <ProjectThread
        projectId={project.id}
        conversationId={landing?.composerConversationId ?? null}
        thread={thread}
        {...(project.agentName !== null ? { agentName: project.agentName } : {})}
      />
      {/* P4 — la barre d'état, permanente en bas de la page, sous la saisie. */}
      {view !== null && (
        <StatusBar
          cost={view.cost}
          proofVerdict={lastProof?.verdict ?? null}
          proofSequences={view.verification.sequences.length}
          pendingDeliveries={pendingDeliveries}
          live={view.live}
        />
      )}
    </PageShell>
  );
}
