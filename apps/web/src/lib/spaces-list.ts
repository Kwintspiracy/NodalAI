// spaces-list.ts — le regroupement des runs d'automatisation (retour de
// Quentin, 06/09 : « la liste est noyée par les cron, il faut les grouper à
// part »).
//
// Pur, pas de DB : des lignes → { conversations, scheduled }. Les tâches
// venues d'une automatisation se regroupent par automatisation (une ligne par
// automatisation, ses runs dessous, repliés) ; tout le reste — dashboard,
// Telegram, chat, API, webhook — est une conversation, telle quelle.
//
// P9 : les deux mondes ont désormais chacun LEUR page et LEUR action de
// lecture. /scheduled n'utilise que `scheduled` (elle ne lit que des runs
// cron) ; /spaces n'appelle plus cette fonction du tout. La sortie
// `conversations` reste pour que la fonction demeure totale — une ligne
// non-cron passée ici est CONSERVÉE (dans son ordre d'entrée, rien n'est trié
// ici), jamais perdue en silence (invariant #4).
//
// La clé d'un groupe est l'id de l'automatisation — la colonne `schedule_id`,
// ou l'id gardé dans la provenance quand l'automatisation a été supprimée
// (revue passe 26). Sans aucun id (jobs antérieurs à cette provenance), le
// nom sert de clé : deux automatisations homonymes d'avant se fondent alors en
// une ligne — connu, dit ici, et borné aux anciens runs.

import type { SpaceListRow } from './actions.ts';

export type ScheduleGroup = {
  /** L'id de l'automatisation, ou son nom, ou la tâche — le premier connu. */
  key: string;
  /**
   * L'identifiant RÉEL de la routine, `null` pour un run qui n'en porte pas.
   *
   * Distinct de `key`, qui se rabat sur le nom puis la tâche pour grouper. Tout
   * ce qui s'attache à la ROUTINE elle-même — son état, d'abord — se cherche
   * par ce champ : un run ancien dont le nom vaut par malchance l'uuid d'une
   * autre routine prendrait sinon l'état de celle-ci (revue Codex, PR #47).
   */
  scheduleId: string | null;
  name: string;
  agentName: string;
  agentSlug: string | null;
  agentAvatarUrl: string | null;
  runs: SpaceListRow[];
  lastRun: SpaceListRow;
  /** Runs terminés en échec ou annulés, sur ceux listés. */
  failed: number;
  totalCostUsd: number;
};

export type SpacesList = {
  conversations: SpaceListRow[];
  scheduled: ScheduleGroup[];
};

export function groupSpaces(rows: readonly SpaceListRow[]): SpacesList {
  const conversations: SpaceListRow[] = [];
  const groups = new Map<string, ScheduleGroup>();
  for (const r of rows) {
    if (r.channel !== 'cron') {
      conversations.push(r);
      continue;
    }
    // La clé porte sa PROVENANCE. Sans le préfixe, un run ancien sans
    // identifiant dont le nom vaut l'uuid d'une autre routine tombait dans le
    // même groupe qu'elle : deux routines fusionnées, et l'état de l'une
    // affiché sous l'autre (revue Codex, PR #47).
    const key =
      r.scheduleId !== null
        ? `id:${r.scheduleId}`
        : r.scheduleName !== null
          ? `name:${r.scheduleName}`
          : `task:${r.task}`;
    const g = groups.get(key);
    if (g) {
      g.runs.push(r);
      if (r.status === 'failed' || r.status === 'cancelled') g.failed += 1;
      g.totalCostUsd += r.costUsd;
      continue;
    }
    groups.set(key, {
      key,
      scheduleId: r.scheduleId,
      name: r.scheduleName ?? firstLine(r.task),
      agentName: r.agentName,
      agentSlug: r.agentSlug,
      agentAvatarUrl: r.agentAvatarUrl,
      runs: [r],
      lastRun: r, // les lignes arrivent les plus récentes d'abord
      failed: r.status === 'failed' || r.status === 'cancelled' ? 1 : 0,
      totalCostUsd: r.costUsd,
    });
  }
  return { conversations, scheduled: [...groups.values()] };
}

export function firstLine(text: string): string {
  return text.split('\n')[0] ?? text;
}
