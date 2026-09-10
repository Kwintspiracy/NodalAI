// skill-approval-rules.test.ts — retirer une skill retire ses règles, par
// QUEL QUE SOIT le chemin.
//
// Le premier correctif (PR #50) vivait dans `unassignSkillAction`, côté web.
// Il en manquait deux : `unassignLearnedSkillAction` et l'outil `detach_skill`,
// que les agents appellent eux-mêmes. Une règle nettoyée par un écran et
// laissée par un autre, c'est pire qu'un trou franc : le comportement dépend de
// l'endroit où l'on a cliqué.
//
// La logique vit donc ici, dans `packages/db`, seul toit commun entre
// `apps/web` et `packages/tools`. Ce fichier prouve la logique ; les tests des
// deux paquets prouvent qu'ils l'appellent.
//
// Assertions sur les LIGNES (invariant #5).

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { spinUpTestDb, seedMinimal } from '../tests/helpers.ts';
import type { TestDb } from '../tests/helpers.ts';
import { and, eq } from 'drizzle-orm';
import { approvalRules, agentSkills, agentSkillAssignments, agents } from '../schema/index.ts';
import { dropApprovalRulesForDetachedSkill } from '../queries/skill-approval-rules.ts';

let db: TestDb;
let seed: Awaited<ReturnType<typeof seedMinimal>>;

beforeAll(async () => {
  const res = await spinUpTestDb();
  db = res.db;
  seed = await seedMinimal(db);
});

beforeEach(async () => {
  await db.delete(approvalRules).where(eq(approvalRules.entityId, seed.entityId));
  await db.delete(agentSkillAssignments).where(eq(agentSkillAssignments.entityId, seed.entityId));
  await db.delete(agentSkills).where(eq(agentSkills.entityId, seed.entityId));
});

/** Une skill assignée qui débloque des builtins. */
async function poserSkill(slug: string, builtins: string[]): Promise<string> {
  const [row] = await db
    .insert(agentSkills)
    .values({
      entityId: seed.entityId,
      slug,
      name: slug,
      content: 'contenu de test',
      requiredBuiltins: builtins,
    })
    .returning({ id: agentSkills.id });
  if (!row) throw new Error('skill non créée');
  await db
    .insert(agentSkillAssignments)
    .values({ entityId: seed.entityId, agentId: seed.agentId, skillId: row.id });
  return row.id;
}

/** Ce que fait tout appelant : retirer l'assignation, PUIS nettoyer. */
async function detacher(skillId: string): Promise<string[]> {
  await db
    .delete(agentSkillAssignments)
    .where(
      and(
        eq(agentSkillAssignments.skillId, skillId),
        eq(agentSkillAssignments.agentId, seed.agentId),
      ),
    );
  return dropApprovalRulesForDetachedSkill(db, {
    entityId: seed.entityId,
    agentId: seed.agentId,
    skillId,
  });
}

async function reglesDe(toolName: string) {
  return db
    .select()
    .from(approvalRules)
    .where(
      and(
        eq(approvalRules.entityId, seed.entityId),
        eq(approvalRules.agentId, seed.agentId),
        eq(approvalRules.toolName, toolName),
      ),
    );
}

describe('dropApprovalRulesForDetachedSkill', () => {
  it('le Yolo posé sur un outil débloqué par la skill ne survit pas au détachement', async () => {
    const skillId = await poserSkill('exec', ['run_command']);
    await db.insert(approvalRules).values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      toolName: 'run_command',
      action: 'auto_approve',
    });

    const retires = await detacher(skillId);

    expect(retires).toEqual(['run_command']);
    expect(await reglesDe('run_command')).toHaveLength(0);
  });

  it('une règle sur un outil que la skill ne débloque PAS reste intacte', async () => {
    const skillId = await poserSkill('exec', ['run_command']);
    await db.insert(approvalRules).values([
      { entityId: seed.entityId, agentId: seed.agentId, toolName: 'run_command', action: 'block' },
      {
        entityId: seed.entityId,
        agentId: seed.agentId,
        toolName: 'web_search',
        action: 'auto_approve',
      },
    ]);

    await detacher(skillId);

    expect(await reglesDe('run_command')).toHaveLength(0);
    expect(await reglesDe('web_search')).toHaveLength(1);
  });

  it('un outil encore débloqué par une AUTRE skill assignée garde sa règle', async () => {
    const skillA = await poserSkill('exec-a', ['run_command']);
    await poserSkill('exec-b', ['run_command']);
    await db.insert(approvalRules).values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      toolName: 'run_command',
      action: 'auto_approve',
    });

    const retires = await detacher(skillA);

    // L'agent peut TOUJOURS lancer des commandes : effacer sa règle changerait
    // sa posture en silence — le défaut qu'on corrige, à l'envers.
    expect(retires).toEqual([]);
    expect(await reglesDe('run_command')).toHaveLength(1);
  });

  it("une règle d'ENTITÉ n'est pas révocable en touchant un seul agent", async () => {
    const skillId = await poserSkill('exec', ['run_command']);
    await db.insert(approvalRules).values({
      entityId: seed.entityId,
      agentId: null,
      toolName: 'run_command',
      action: 'auto_approve',
    });

    await detacher(skillId);

    const portéeEntité = await db
      .select()
      .from(approvalRules)
      .where(
        and(eq(approvalRules.entityId, seed.entityId), eq(approvalRules.toolName, 'run_command')),
      );
    expect(portéeEntité).toHaveLength(1);
    expect(portéeEntité[0]?.agentId).toBeNull();
  });

  it('une skill sans requiredBuiltins ne touche à rien', async () => {
    const skillId = await poserSkill('guidance', []);
    await db.insert(approvalRules).values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      toolName: 'run_command',
      action: 'auto_approve',
    });

    expect(await detacher(skillId)).toEqual([]);
    expect(await reglesDe('run_command')).toHaveLength(1);
  });

  it("la règle d'un AUTRE agent sur le même outil n'est pas touchée", async () => {
    // Deuxième agent de la même entité, avec son propre Yolo. Retirer la skill
    // au premier ne doit rien lui faire.
    const [autre] = await db
      .insert(agents)
      .values({
        entityId: seed.entityId,
        name: 'Autre',
        slug: `autre-${Date.now()}`,
        personality: 'x',
      })
      .returning({ id: agents.id });
    const skillId = await poserSkill('exec', ['run_command']);
    await db.insert(approvalRules).values([
      {
        entityId: seed.entityId,
        agentId: seed.agentId,
        toolName: 'run_command',
        action: 'auto_approve',
      },
      {
        entityId: seed.entityId,
        agentId: autre!.id,
        toolName: 'run_command',
        action: 'auto_approve',
      },
    ]);

    await detacher(skillId);

    expect(await reglesDe('run_command')).toHaveLength(0);
    const chezLAutre = await db
      .select()
      .from(approvalRules)
      .where(and(eq(approvalRules.agentId, autre!.id), eq(approvalRules.toolName, 'run_command')));
    expect(chezLAutre).toHaveLength(1);
  });
});
