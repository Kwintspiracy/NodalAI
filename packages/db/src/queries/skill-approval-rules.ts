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
 * Retire les DONS d'approbation devenus sans objet parce qu'une skill vient
 * d'être détachée de cet agent.
 *
 * Trois bornes, et elles sont tout le correctif :
 *
 *  1. **Seuls les `auto_approve`.** Un `auto_approve` est un DON — le toggle
 *     Yolo — et il se reprend avec la skill. Un `block` ou un
 *     `require_approval` est une RESTRICTION posée par le propriétaire :
 *     l'effacer n'est pas « revenir au défaut prudent », c'est LEVER une
 *     interdiction.
 *
 *     Cette asymétrie n'est pas de la prudence décorative. `detach_skill` et
 *     `attach_skill` tournent sans approbation pour un ROOT qui porte les
 *     droits de gestion sous `destructive_gate` : une version qui supprimait
 *     toutes les règles donnait à cet agent un moyen d'effacer le `block` d'un
 *     worker — détacher, rattacher, déléguer — et de lui rendre un shell
 *     auto-exécuté que personne n'avait rouvert (revue Codex, PR #50, passe 5,
 *     P1). Une restriction dormante sur un outil que l'agent n'a plus ne coûte
 *     rien, et reprend son effet si la skill revient : c'est exactement ce que
 *     le propriétaire a voulu.
 *
 *  2. **Seuls les outils que CETTE skill débloquait.** Une règle sur un outil
 *     étranger n'a rien à voir avec elle, et l'effacer détruirait un réglage
 *     sans raison.
 *  3. **Et seulement s'ils ne sont plus débloqués par une AUTRE skill encore
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

  const candidats = debloquesParLaSkill.filter((t) => !encoreDebloques.has(t));
  if (candidats.length === 0) return [];

  // `action = 'auto_approve'` dans le WHERE, pas un filtre après coup : une
  // seule requête, et aucune restriction ne peut disparaître par un chemin
  // qu'on aurait oublié de relire.
  const retirees = await db
    .delete(approvalRules)
    .where(
      and(
        eq(approvalRules.entityId, params.entityId),
        eq(approvalRules.agentId, params.agentId),
        eq(approvalRules.action, 'auto_approve'),
        inArray(approvalRules.toolName, candidats),
      ),
    )
    .returning({ toolName: approvalRules.toolName });
  return retirees.map((r) => r.toolName);
}
