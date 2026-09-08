// schedule-state-repo.test.ts — l'état d'une routine, sur une vraie base.
//
// Ce que ces tests protègent, en une phrase : ce qu'une routine a écrit au run
// N, elle le relit À L'IDENTIQUE au run N+1. C'est précisément ce que la
// mémoire sémantique ne garantissait pas — le 08/09/2026, une annonce est
// partie deux fois sur Discord parce que la recherche a rendu autre chose.
//
// Règle de la maison : on assert les LIGNES réelles, pas des compteurs.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { spinUpTestDb, seedMinimal } from './helpers.ts';
import type { TestDb } from './helpers.ts';
import { agentSchedules, scheduleState, SCHEDULE_STATE_MAX_KEYS } from '../schema/index.ts';
import { readScheduleState, writeScheduleState, ScheduleStateRefused } from '../index.ts';
import { eq } from 'drizzle-orm';

let db: TestDb;
let agentId: string;
let entityId: string;

async function makeSchedule(name: string): Promise<string> {
  const [row] = await db
    .insert(agentSchedules)
    .values({ entityId, agentId, name, cronExpr: '0 * * * *', task: 'watch something' })
    .returning({ id: agentSchedules.id });
  if (!row) throw new Error('schedule insert failed');
  return row.id;
}

beforeAll(async () => {
  const res = await spinUpTestDb();
  db = res.db;
  const seeded = await seedMinimal(db);
  agentId = seeded.agentId;
  entityId = seeded.entityId;
});

afterEach(async () => {
  await db.delete(scheduleState);
});

describe('état de routine', () => {
  it('ce qui est écrit se relit mot pour mot', async () => {
    const scheduleId = await makeSchedule('watcher');
    const value = 'v0.8.8 — announced to Discord #announcements on 2026-08-28';
    await writeScheduleState(db, scheduleId, 'last_announced_version', value);

    const state = await readScheduleState(db, scheduleId);
    expect(state).toHaveLength(1);
    expect(state[0]?.key).toBe('last_announced_version');
    // Mot pour mot : c'est la comparaison du run suivant qui en dépend.
    expect(state[0]?.value).toBe(value);
  });

  it('une routine qui n’a rien écrit rend un état VIDE, pas une erreur', async () => {
    const scheduleId = await makeSchedule('neuve');
    expect(await readScheduleState(db, scheduleId)).toEqual([]);
  });

  it('réécrire une clé REMPLACE la valeur — pas une ligne de plus', async () => {
    const scheduleId = await makeSchedule('watcher');
    await writeScheduleState(db, scheduleId, 'last_announced_version', 'v0.8.7');
    await writeScheduleState(db, scheduleId, 'last_announced_version', 'v0.8.8');

    const state = await readScheduleState(db, scheduleId);
    expect(state).toHaveLength(1);
    expect(state[0]?.value).toBe('v0.8.8');
  });

  it('deux routines ne se voient pas', async () => {
    const a = await makeSchedule('routine A');
    const b = await makeSchedule('routine B');
    await writeScheduleState(db, a, 'cursor', 'A-42');
    await writeScheduleState(db, b, 'cursor', 'B-7');

    expect((await readScheduleState(db, a))[0]?.value).toBe('A-42');
    expect((await readScheduleState(db, b))[0]?.value).toBe('B-7');
  });

  it('supprimer la routine emporte son état', async () => {
    const scheduleId = await makeSchedule('éphémère');
    await writeScheduleState(db, scheduleId, 'cursor', '1');
    await db.delete(agentSchedules).where(eq(agentSchedules.id, scheduleId));
    expect(await readScheduleState(db, scheduleId)).toEqual([]);
  });

  it('les clés sortent dans un ordre STABLE d’un run à l’autre', async () => {
    const scheduleId = await makeSchedule('multi');
    await writeScheduleState(db, scheduleId, 'zulu', '1');
    await writeScheduleState(db, scheduleId, 'alpha', '2');
    await writeScheduleState(db, scheduleId, 'mike', '3');
    expect((await readScheduleState(db, scheduleId)).map((e) => e.key)).toEqual([
      'alpha',
      'mike',
      'zulu',
    ]);
  });
});

describe('ce que l’état REFUSE, en le disant', () => {
  it('une clé vide', async () => {
    const scheduleId = await makeSchedule('r');
    await expect(writeScheduleState(db, scheduleId, '   ', 'x')).rejects.toBeInstanceOf(
      ScheduleStateRefused,
    );
  });

  it('une valeur plus longue que la borne — et la raison le dit', async () => {
    const scheduleId = await makeSchedule('r');
    let refus: unknown;
    try {
      await writeScheduleState(db, scheduleId, 'k', 'x'.repeat(2001));
    } catch (err) {
      refus = err;
    }
    expect(refus).toBeInstanceOf(ScheduleStateRefused);
    expect((refus as ScheduleStateRefused).reason).toContain('2001 characters');
    expect((refus as ScheduleStateRefused).reason).toContain('not a report');
    // Rien n'a été écrit : un refus ne laisse pas de moitié de ligne.
    expect(await readScheduleState(db, scheduleId)).toEqual([]);
  });

  it('une clé de PLUS que le plafond — mais jamais la réécriture d’une clé connue', async () => {
    const scheduleId = await makeSchedule('bavarde');
    for (let i = 0; i < SCHEDULE_STATE_MAX_KEYS; i++) {
      await writeScheduleState(db, scheduleId, `k${i}`, String(i));
    }

    // Une clé de plus : refusée, avec le compte exact.
    let refus: unknown;
    try {
      await writeScheduleState(db, scheduleId, 'une-de-trop', 'x');
    } catch (err) {
      refus = err;
    }
    expect(refus).toBeInstanceOf(ScheduleStateRefused);
    expect((refus as ScheduleStateRefused).reason).toContain(
      `${SCHEDULE_STATE_MAX_KEYS} state keys`,
    );

    // Le cas nominal reste ouvert : réécrire une clé existante, à la limite.
    await writeScheduleState(db, scheduleId, 'k0', 'valeur neuve');
    const state = await readScheduleState(db, scheduleId);
    expect(state).toHaveLength(SCHEDULE_STATE_MAX_KEYS);
    expect(state.find((e) => e.key === 'k0')?.value).toBe('valeur neuve');
  });

  it('la clé est rangée sans ses espaces de bord', async () => {
    const scheduleId = await makeSchedule('r');
    await writeScheduleState(db, scheduleId, '  cursor  ', '1');
    expect((await readScheduleState(db, scheduleId))[0]?.key).toBe('cursor');
  });
});
