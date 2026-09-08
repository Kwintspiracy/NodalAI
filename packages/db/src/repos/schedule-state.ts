// repos/schedule-state.ts — lire et écrire l'état d'une routine.
//
// Deux fonctions, aucun LLM, aucune recherche. C'est tout l'intérêt : ce que la
// routine a écrit au run précédent, elle le relit à l'identique au suivant.
// Voir schema/schedule-state.ts pour ce qui a rendu cette table nécessaire.

import { eq, and, asc, sql } from 'drizzle-orm';
import type { AnyDrizzleDb } from '../client.ts';
import {
  scheduleState,
  SCHEDULE_STATE_KEY_MAX,
  SCHEDULE_STATE_VALUE_MAX,
  SCHEDULE_STATE_MAX_KEYS,
} from '../schema/schedule-state.ts';

/** Une entrée d'état, telle qu'elle est rendue au prompt et à l'écran. */
export interface ScheduleStateEntry {
  readonly key: string;
  readonly value: string;
  readonly updatedAt: Date;
}

/**
 * Refus d'écriture. Une erreur nommée plutôt qu'un booléen : l'outil rend la
 * RAISON au modèle, qui doit pouvoir corriger son appel (invariant #4 — jamais
 * un échec silencieux, jamais une troncature « intelligente »).
 */
export class ScheduleStateRefused extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'ScheduleStateRefused';
  }
}

/** Tout l'état d'une routine, par ordre de clé — stable d'un run à l'autre. */
export async function readScheduleState(
  db: AnyDrizzleDb,
  scheduleId: string,
): Promise<ScheduleStateEntry[]> {
  const rows = await db
    .select({
      key: scheduleState.key,
      value: scheduleState.value,
      updatedAt: scheduleState.updatedAt,
    })
    .from(scheduleState)
    .where(eq(scheduleState.scheduleId, scheduleId))
    .orderBy(asc(scheduleState.key));
  return rows.map((r) => ({ key: r.key, value: r.value, updatedAt: r.updatedAt }));
}

/**
 * Écrit une clé. Remplace la valeur si la clé existe déjà — c'est le geste
 * normal d'une routine : « la dernière version que j'ai annoncée est celle-ci ».
 *
 * Trois refus, tous EXPLICITES :
 *  - clé vide ou trop longue, valeur trop longue : les bornes de la table ;
 *  - au-delà de `SCHEDULE_STATE_MAX_KEYS` clés DIFFÉRENTES : une routine qui en
 *    accumule n'écrit plus un état, elle tient un journal — exactement ce que
 *    cette table remplace. Écraser une clé existante reste toujours permis.
 *
 * L'`INSERT … ON CONFLICT` fait le remplacement en une instruction : deux runs
 * qui se chevauchent ne peuvent pas laisser la ligne à moitié écrite.
 */
export async function writeScheduleState(
  db: AnyDrizzleDb,
  scheduleId: string,
  key: string,
  value: string,
): Promise<ScheduleStateEntry> {
  const k = key.trim();
  if (k === '') throw new ScheduleStateRefused('The key is empty.');
  if (k.length > SCHEDULE_STATE_KEY_MAX) {
    throw new ScheduleStateRefused(
      `The key is ${k.length} characters; the limit is ${SCHEDULE_STATE_KEY_MAX}.`,
    );
  }
  if (value.length > SCHEDULE_STATE_VALUE_MAX) {
    throw new ScheduleStateRefused(
      `The value is ${value.length} characters; the limit is ${SCHEDULE_STATE_VALUE_MAX}. ` +
        'State is what you need to recognise this run against the last one, not a report.',
    );
  }

  // Le plafond ne compte que si la clé est NEUVE : réécrire une clé connue est
  // le cas nominal et ne doit jamais être refusé, même à la limite.
  const [existing] = await db
    .select({ key: scheduleState.key })
    .from(scheduleState)
    .where(and(eq(scheduleState.scheduleId, scheduleId), eq(scheduleState.key, k)))
    .limit(1);
  if (!existing) {
    const [{ n }] = (await db
      .select({ n: sql<number>`count(*)::int` })
      .from(scheduleState)
      .where(eq(scheduleState.scheduleId, scheduleId))) as [{ n: number }];
    if (n >= SCHEDULE_STATE_MAX_KEYS) {
      throw new ScheduleStateRefused(
        `This routine already holds ${n} state keys, the maximum. Reuse one of its existing ` +
          'keys instead of adding another — state is not a log.',
      );
    }
  }

  const now = new Date();
  const [row] = await db
    .insert(scheduleState)
    .values({ scheduleId, key: k, value, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [scheduleState.scheduleId, scheduleState.key],
      set: { value, updatedAt: now },
    })
    .returning({
      key: scheduleState.key,
      value: scheduleState.value,
      updatedAt: scheduleState.updatedAt,
    });
  if (!row) {
    // Un INSERT … RETURNING qui ne rend rien n'a pas de repli honnête : le
    // modèle a besoin de savoir si son état est posé (invariant #4).
    throw new Error('schedule_state_write_failed');
  }
  return { key: row.key, value: row.value, updatedAt: row.updatedAt };
}
