// run-schedule-now-overlap.test.ts — le bouton « Run now » et le chevauchement.
//
// Trois chemins insèrent un job de routine : le tick du cron, l'outil
// `run_schedule`, et cette action web. La garde de l'incident du 11/07/2026
// (deux instances du même watcher en parallèle) ne vivait que dans le premier ;
// une garde qui ne couvre pas les trois ne garantit rien.
//
// Depuis la PR #47 l'enjeu s'est alourdi : un run lancé pendant qu'un autre
// attend une approbation périme l'état que ce dernier a lu au début de son run,
// et son prompt est déjà écrit.
//
// Assertions sur les LIGNES relues, jamais sur `result.ok` seul.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { spinUpTestDb, seedMinimal } from '@nodal-agents/db/test-utils';
import type { TestDb } from '@nodal-agents/db/test-utils';
import { agentJobs, agentSchedules, eq } from '@nodal-agents/db';

let testDb: TestDb;
let seed: Awaited<ReturnType<typeof seedMinimal>>;
let scheduleId = '';

vi.mock('@/lib/server.ts', () => ({
  getDb: () => testDb,
  getAuthProvider: () => ({ name: 'local-trust' }),
  ACTIVE_ENTITY_COOKIE: 'nodalai_active_entity',
  applyActiveEntity: (session: { userId: string; entityId?: string }) => ({
    ...session,
    entityId: seed?.entityId ?? session.entityId ?? '',
  }),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ set: () => {}, get: () => null, delete: () => {} }),
}));

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

vi.mock('@nodal-agents/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nodal-agents/auth')>();
  return {
    ...actual,
    requireAuth: async () => ({
      userId: seed?.userId ?? 'mock-user-id',
      entityId: seed?.entityId ?? 'mock-entity-id',
    }),
  };
});

const actions = () => import('../actions.ts');

beforeAll(async () => {
  const result = await spinUpTestDb();
  testDb = result.db;
  seed = await seedMinimal(testDb);
  const [sched] = await testDb
    .insert(agentSchedules)
    .values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      name: 'Check-Nodal-Agents-GitHub-Updates',
      cronExpr: '0 */8 * * *',
      task: 'detect new CHANGELOG entries and announce them',
    })
    .returning({ id: agentSchedules.id });
  scheduleId = sched!.id;
});

beforeEach(async () => {
  await testDb.delete(agentJobs).where(eq(agentJobs.scheduleId, scheduleId));
});

async function jobsOfSchedule() {
  return testDb
    .select({ id: agentJobs.id, status: agentJobs.status })
    .from(agentJobs)
    .where(eq(agentJobs.scheduleId, scheduleId));
}

describe('runScheduleNowAction — chevauchement', () => {
  it('refuse tant qu’un run de cette routine est vivant, et n’insère RIEN', async () => {
    const [live] = await testDb
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

    const { runScheduleNowAction } = await actions();
    const res = await runScheduleNowAction(scheduleId);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('conflict');
      expect(res.message).toContain('already running');
      // Le statut du run qui bloque est NOMMÉ : sans lui, on ne sait pas s'il
      // faut attendre ou débloquer une approbation.
      expect(res.message).toContain('awaiting_approval');
    }

    const jobs = await jobsOfSchedule();
    expect(jobs.map((j) => j.id)).toEqual([live!.id]);
  });

  it('lance quand le run précédent est terminé', async () => {
    await testDb.insert(agentJobs).values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      channel: 'cron',
      task: 'detect new CHANGELOG entries and announce them',
      status: 'completed',
      scheduleId,
    });

    const { runScheduleNowAction } = await actions();
    const res = await runScheduleNowAction(scheduleId);

    expect(res.ok).toBe(true);
    const jobs = await jobsOfSchedule();
    expect(jobs.filter((j) => j.status === 'pending')).toHaveLength(1);
  });
});
