// save-routine-state.test.ts — l'outil par lequel une routine repose son état.
//
// Le point dur : cet outil doit écrire pour la ROUTINE du job, jamais ailleurs,
// et refuser en le DISANT quand le job n'en est pas une (invariant #4). Un
// refus silencieux laisserait la routine croire son état posé et refaire son
// travail au run suivant — c'est le doublon Discord du 08/09/2026.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { spinUpTestDb, seedMinimal } from '@nodal-agents/db/test-utils';
import { agentJobs, agentSchedules, scheduleState, readScheduleState } from '@nodal-agents/db';
import { saveRoutineStateTool } from '../builtin/save-routine-state';
import type { ToolContext } from '../types';
import type { TestDb } from '@nodal-agents/db/test-utils';

let db: TestDb;
let seed: { userId: string; entityId: string; agentId: string; jobId: string };
let scheduleId: string;
/** Un job qui EST une exécution de la routine. */
let routineJobId: string;

beforeAll(async () => {
  const res = await spinUpTestDb();
  db = res.db;
  seed = await seedMinimal(db);

  const [sched] = await db
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

  const [job] = await db
    .insert(agentJobs)
    .values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      channel: 'cron',
      task: 'detect new CHANGELOG entries and announce them',
      scheduleId,
    })
    .returning({ id: agentJobs.id });
  routineJobId = job!.id;
});

beforeEach(async () => {
  await db.delete(scheduleState);
});

function ctxFor(jobId: string): ToolContext {
  return {
    jobId,
    agentId: seed.agentId,
    entityId: seed.entityId,
    db: db as unknown as ToolContext['db'],
    jobChatId: null,
  };
}

describe('save_routine_state', () => {
  it('écrit l’état de la routine du job, lisible tel quel', async () => {
    const out = await saveRoutineStateTool.execute(
      { key: 'last_announced_version', value: 'v0.8.8 (2026-08-28)' },
      ctxFor(routineJobId),
    );
    expect(out).toEqual({ saved: true, key: 'last_announced_version' });

    // La ligne réelle, sur la bonne routine.
    const state = await readScheduleState(db, scheduleId);
    expect(state).toEqual([
      expect.objectContaining({ key: 'last_announced_version', value: 'v0.8.8 (2026-08-28)' }),
    ]);
  });

  it('un second run remplace la valeur du premier', async () => {
    await saveRoutineStateTool.execute(
      { key: 'last_announced_version', value: 'v0.8.7' },
      ctxFor(routineJobId),
    );
    await saveRoutineStateTool.execute(
      { key: 'last_announced_version', value: 'v0.8.8' },
      ctxFor(routineJobId),
    );
    const state = await readScheduleState(db, scheduleId);
    expect(state).toHaveLength(1);
    expect(state[0]?.value).toBe('v0.8.8');
  });

  it('un job qui n’est PAS une routine est refusé, avec la raison, sans rien écrire', async () => {
    const out = await saveRoutineStateTool.execute(
      { key: 'k', value: 'v' },
      // seed.jobId est un job 'api' ordinaire : pas de schedule_id.
      ctxFor(seed.jobId),
    );
    expect(out.saved).toBe(false);
    expect(out).toHaveProperty('reason');
    if (!out.saved) {
      expect(out.reason).toContain('not started by a routine');
      expect(out.reason).toContain('Nothing was saved');
    }
    expect(await readScheduleState(db, scheduleId)).toEqual([]);
  });

  it('une valeur trop longue est refusée en le disant — pas tronquée', async () => {
    const out = await saveRoutineStateTool.execute(
      { key: 'k', value: 'x'.repeat(2001) },
      ctxFor(routineJobId),
    );
    expect(out.saved).toBe(false);
    if (!out.saved) expect(out.reason).toContain('the limit is 2000');
    // Surtout : rien d'écrit. Une troncature laisserait un état FAUX, que le
    // run suivant comparerait sans savoir qu'il est amputé.
    expect(await readScheduleState(db, scheduleId)).toEqual([]);
  });

  it('dit au modèle de ne pas utiliser la mémoire pour ça', async () => {
    // La description est ce que le modèle lit. C'est elle qui empêche la
    // rechute vers `save_memory` — donc elle est testée comme du code.
    expect(saveRoutineStateTool.description).toContain('do NOT use `save_memory`');
    expect(saveRoutineStateTool.description).toContain('retrieved by search');
  });
});
