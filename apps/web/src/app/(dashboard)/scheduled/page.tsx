import Link from 'next/link';
import { listScheduledRunsAction, listRoutineStatesAction } from '@/lib/actions.ts';
import { groupSpaces } from '@/lib/spaces-list.ts';
import PageShell from '@/components/ui/PageShell';
import EmptyState from '@/components/ui/EmptyState';
import ScheduledSection from './ScheduledSection.tsx';

// Force dynamic — this page reads per-request DB state.
export const dynamic = 'force-dynamic';

export default async function ScheduledPage() {
  // P9 : les runs d'automatisation ont leur page. On lit UNIQUEMENT les runs
  // cron (leur propre action, leur propre limite) ; `groupSpaces` les replie
  // par automatisation, une ligne par automatisation, ses runs dessous.
  const [result, states] = await Promise.all([
    listScheduledRunsAction(),
    // L'état de chaque routine — ce qui décide s'il y aura du travail au
    // prochain run. Une lecture qui échoue ne doit pas emporter la page : la
    // liste des runs reste lisible, l'état est simplement absent.
    listRoutineStatesAction(),
  ]);
  const { scheduled } = groupSpaces(result.ok ? result.data : []);
  const routineState = states.ok ? states.data : {};

  return (
    <PageShell
      title="Scheduled"
      subtitle="Every run of your automations, grouped by automation."
      toolbar={
        <div className="flex items-center gap-3">
          <Link href="/automations" className="text-xs text-ink-3 hover:text-ink-2">
            Configure automations
          </Link>
        </div>
      }
    >
      {!result.ok ? (
        <p className="text-sm text-err">{result.message}</p>
      ) : scheduled.length === 0 ? (
        <EmptyState
          title="No scheduled run yet"
          description="Runs of your automations show up here. Set one up in Automations."
        />
      ) : (
        <ScheduledSection groups={scheduled} routineState={routineState} />
      )}
    </PageShell>
  );
}
