// schedule_state — l'ÉTAT d'une routine entre deux exécutions.
//
// POURQUOI CETTE TABLE EXISTE. Le 08/09/2026, la routine
// « Check-Nodal-Agents-GitHub-Updates » a republié sur Discord une annonce
// qu'elle avait déjà faite dix jours plus tôt. Sa consigne lui disait de garder
// son état dans la mémoire sémantique : « Read the last-known announced version
// with query_memory. This memory IS your stored state. » Trois exécutions de
// suite ont bien retrouvé le fait ; à la quatrième, la recherche a rendu en tête
// un souvenir sans rapport (un vault Obsidian), la routine a conclu « premier
// run » et a republié.
//
// La mémoire ne pouvait pas tenir ce rôle, pour trois raisons qui ne se
// corrigent pas :
//   - elle se lit par RECHERCHE FLOUE, donc rien ne garantit qu'un fait donné
//     ressorte en tête, et le classement change quand d'autres faits arrivent ;
//   - elle est EFFAÇABLE d'un clic depuis la page Memories, qui ne dit nulle
//     part qu'une routine en dépend (c'est ce qui s'est produit : le fait a été
//     supprimé, pas archivé) ;
//   - c'est ce que l'agent sait de l'UTILISATEUR, pas son journal de bord. Sur
//     37 faits, 13 étaient des états de routines.
//
// Ici : une clé, une valeur, lues et écrites sans LLM. Une routine ne partage
// son état avec personne, et supprimer la routine emporte son état (cascade).
//
// Pourquoi une TABLE et pas une colonne `jsonb` sur `agent_schedules` : deux
// clés d'une même routine s'écrivent indépendamment. Avec un objet unique,
// écrire l'une réécrit l'autre — et deux exécutions qui se chevauchent
// perdraient silencieusement une écriture.

import { pgTable, text, uuid, timestamp, primaryKey, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { agentSchedules } from './schedules.ts';

/** Ce qu'une valeur d'état peut peser. Un état n'est pas un document. */
export const SCHEDULE_STATE_VALUE_MAX = 2000;

/** Ce qu'une clé peut peser. Assez pour être lisible, trop peu pour un récit. */
export const SCHEDULE_STATE_KEY_MAX = 120;

/** Combien de clés une routine peut tenir. Au-delà, ce n'est plus un état. */
export const SCHEDULE_STATE_MAX_KEYS = 20;

export const scheduleState = pgTable(
  'schedule_state',
  {
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => agentSchedules.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.scheduleId, table.key] }),
    index('idx_schedule_state_schedule').on(table.scheduleId),
    // Les bornes sont EN BASE, pas seulement dans l'outil : une écriture qui
    // passerait par un autre chemin ne doit pas pouvoir transformer l'état en
    // dépotoir. Une clé vide n'identifie rien.
    check('schedule_state_key_len', sql`length(${table.key}) BETWEEN 1 AND 120`),
    check('schedule_state_value_len', sql`length(${table.value}) <= 2000`),
  ],
);
