// run-schedule-overlap.test.ts — deux exécutions de la MÊME routine à la fois.
//
// Le cron refuse depuis l'incident du 11/07/2026 (deux instances du même
// watcher en parallèle). Le lancement MANUEL, lui, insérait sans regarder :
// une routine qui poste pouvait poster deux fois, et un run en attente
// d'approbation se faisait périmer son état par un run lancé entre-temps
// (revue Codex, PR #47, passe 2, constat 3).
//
// Règle de la maison : on assert les LIGNES réelles, pas des compteurs.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { spinUpTestDb, seedMinimal } from '@nodal-agents/db/test-utils';
import { agentJobs, agentSchedules, eq, and } from '@nodal-agents/db';
import { META_TOOLS } from '../builtin/meta-ops';
import type { ToolContext } from '../types';
import type { TestDb } from '@nodal-agents/db/test-utils';

let db: TestDb;
let seed: { userId: string; entityId: string; agentId: string; jobId: string };
let scheduleId: string;

const SCHEDULE_NAME = 'Check-Nodal-Agents-GitHub-Updates';

const runScheduleTool = META_TOOLS.find((t) => t.name === 'run_schedule');

async function jobsOfSchedule() {
  return db
    .select({ id: agentJobs.id, status: agentJobs.status })
    .from(agentJobs)
    .where(eq(agentJobs.scheduleId, scheduleId));
}

function ctx(): ToolContext {
  return {
    jobId: seed.jobId,
    agentId: seed.agentId,
    entityId: seed.entityId,
    db: db as unknown as ToolContext['db'],
    jobChatId: null,
  };
}

beforeAll(async () => {
  const res = await spinUpTestDb();
  db = res.db;
  seed = await seedMinimal(db);
  const [sched] = await db
    .insert(agentSchedules)
    .values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      name: SCHEDULE_NAME,
      cronExpr: '0 */8 * * *',
      task: 'detect new CHANGELOG entries and announce them',
    })
    .returning({ id: agentSchedules.id });
  scheduleId = sched!.id;
});

beforeEach(async () => {
  await db.delete(agentJobs).where(eq(agentJobs.scheduleId, scheduleId));
});

describe('run_schedule — chevauchement', () => {
  it('l’outil existe et porte le nom attendu', () => {
    expect(runScheduleTool?.name).toBe('run_schedule');
  });

  it('refuse en le DISANT quand un run de cette routine est encore vivant', async () => {
    const [live] = await db
      .insert(agentJobs)
      .values({
        entityId: seed.entityId,
        agentId: seed.agentId,
        channel: 'cron',
        task: 'detect new CHANGELOG entries and announce them',
        status: 'awaiting_approval',
        scheduleId,
      })
      .returning({ id: agentJobs.id });

    const out = (await runScheduleTool!.execute({ name: SCHEDULE_NAME }, ctx())) as {
      ok: boolean;
      error?: string;
    };

    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/already running|still/i);
    // Et surtout : AUCUN job de plus. Un refus qui insère quand même serait
    // pire que pas de garde du tout.
    const jobs = await jobsOfSchedule();
    expect(jobs.map((j) => j.id)).toEqual([live!.id]);
  });

  it('lance quand le run précédent est terminé', async () => {
    await db.insert(agentJobs).values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      channel: 'cron',
      task: 'detect new CHANGELOG entries and announce them',
      status: 'completed',
      scheduleId,
    });

    const out = (await runScheduleTool!.execute({ name: SCHEDULE_NAME }, ctx())) as { ok: boolean };
    expect(out.ok).toBe(true);
    const pending = await db
      .select({ id: agentJobs.id })
      .from(agentJobs)
      .where(and(eq(agentJobs.scheduleId, scheduleId), eq(agentJobs.status, 'pending')));
    expect(pending).toHaveLength(1);
  });
});
