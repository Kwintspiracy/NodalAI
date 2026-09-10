// queries/skill-approval-rules.ts — les règles d'approbation suivent la skill.
//
// Une skill DÉBLOQUE des outils, par `required_builtins`. Les règles
// d'approbation posées sur ces outils — dont le toggle Yolo,
// `run_command → auto_approve` — restaient en base quand la skill était
// retirée à l'agent. Invisibles : l'écran Autonomie affiche des OUTILS et va
// chercher leur règle, jamais l'inverse, donc un outil sans ligne à l'écran est
// un outil dont la règle n'est rendue nulle part.
//
// Le cas qui compte : un Yolo posé, puis « retiré » en enlevant la skill, se
// RALLUMAIT tout seul à la réassignation. Le propriétaire ne l'avait pas
// redemandé et ne l'avait pas vu affiché entre-temps. « Pas sélectionné » doit
// vouloir dire « pas d'approbation », pas « approbation en sommeil ».
//
// Cette fonction vit ici, dans `packages/db`, parce que TROIS chemins retirent
// une skill à un agent et doivent tous la traverser :
//   - `unassignSkillAction` (apps/web) — l'écran Skills ;
//   - `unassignLearnedSkillAction` (apps/web) — l'écran des skills apprises ;
//   - l'outil `detach_skill` (packages/tools) — un agent qui se réorganise.
// Le premier correctif ne couvrait que le premier, et les deux autres
// laissaient le trou grand ouvert. `packages/tools` ne peut pas importer
// `apps/web` : `packages/db` est le seul toit commun.
//
// La suppression d'un AGENT n'a pas besoin de passer par ici :
// `approval_rules.agent_id` porte `ON DELETE CASCADE`.

import { and, eq, inArray } from 'drizzle-orm';
import { approvalRules, agentSkills, agentSkillAssignments } from '../schema/index.ts';
import type { AnyDrizzleDb } from '../client.ts';

/**
 * Retire les règles d'approbation devenues sans objet parce qu'une skill vient
 * d'être détachée de cet agent.
 *
 * Deux bornes, et elles sont tout le correctif :
 *
 *  1. **Seuls les outils que CETTE skill débloquait.** Une règle sur un outil
 *     étranger n'a rien à voir avec elle, et l'effacer détruirait un réglage
 *     sans raison.
 *  2. **Et seulement s'ils ne sont plus débloqués par une AUTRE skill encore
 *     assignée.** Sinon l'agent garderait le pouvoir et perdrait sa posture —
 *     le même défaut, à l'envers.
 *
 * À appeler APRÈS la suppression de la ligne d'assignation : la seconde borne
 * interroge les skills qui restent, et compter la skill sortante fausserait le
 * calcul dans le sens dangereux (rien ne serait jamais nettoyé).
 *
 * Portée à l'agent. Une règle d'entité (`agent_id` NULL) vaut pour tout le
 * monde et ne se révoque pas en touchant un seul agent.
 *
 * @returns les noms d'outils dont la règle a été retirée — pour le journal de
 *   l'appelant, et pour qu'un test puisse asserter sur autre chose qu'un effet
 *   de bord.
 */
export async function dropApprovalRulesForDetachedSkill(
  db: AnyDrizzleDb,
  params: { entityId: string; agentId: string; skillId: string },
): Promise<string[]> {
  const [skillRetiree] = await db
    .select({ requiredBuiltins: agentSkills.requiredBuiltins })
    .from(agentSkills)
    .where(and(eq(agentSkills.id, params.skillId), eq(agentSkills.entityId, params.entityId)))
    .limit(1);

  const debloquesParLaSkill = skillRetiree?.requiredBuiltins ?? [];
  if (debloquesParLaSkill.length === 0) return [];

  const encoreDebloques = new Set(
    (
      await db
        .select({ requiredBuiltins: agentSkills.requiredBuiltins })
        .from(agentSkillAssignments)
        .innerJoin(agentSkills, eq(agentSkills.id, agentSkillAssignments.skillId))
        .where(
          and(
            eq(agentSkillAssignments.agentId, params.agentId),
            eq(agentSkillAssignments.entityId, params.entityId),
          ),
        )
    ).flatMap((r) => r.requiredBuiltins ?? []),
  );

  const aOublier = debloquesParLaSkill.filter((t) => !encoreDebloques.has(t));
  if (aOublier.length === 0) return [];

  await db
    .delete(approvalRules)
    .where(
      and(
        eq(approvalRules.entityId, params.entityId),
        eq(approvalRules.agentId, params.agentId),
        inArray(approvalRules.toolName, aOublier),
      ),
    );
  return aOublier;
}
