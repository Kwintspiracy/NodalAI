// unassign-skill-clears-rules.test.ts — retirer une skill retire ses règles.
//
// Le bug que ce fichier verrouille : `unassignSkillAction` ne supprimait que la
// ligne d'assignation. Les règles d'approbation portant sur les outils que la
// skill débloquait restaient en base — invisibles, parce que l'écran Autonomie
// affiche des OUTILS et va chercher leur règle, jamais l'inverse : un outil sans
// ligne à l'écran est un outil dont la règle n'est rendue nulle part.
//
// Conséquence, et c'est elle qui compte : un `run_command → auto_approve` (le
// toggle Yolo) posé puis « retiré » en enlevant la skill se RALLUMAIT tout seul
// à la réassignation. Le propriétaire ne l'avait pas redemandé, et ne l'avait
// pas vu affiché entre-temps.
//
// Constaté en auditant l'écran d'autonomie après le run 20b73ed1 (10/09/2026),
// où Reviewer C portait une règle `code_task` pour une skill qu'il n'a pas.
//
// Assertions sur les LIGNES, jamais sur des compteurs d'appels (invariant #5).

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { spinUpTestDb, seedMinimal } from '@nodal-agents/db/test-utils';
import type { TestDb } from '@nodal-agents/db/test-utils';
import { eq, and, approvalRules, agentSkills, agentSkillAssignments } from '@nodal-agents/db';

let testDb: TestDb;
let seed: Awaited<ReturnType<typeof seedMinimal>>;

vi.mock('@/lib/server.ts', () => ({
  getDb: () => testDb,
  getAuthProvider: () => ({ name: 'local-trust' }),
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
      userId: 'mock-user-id',
      entityId: seed?.entityId ?? 'mock-entity-id',
    }),
  };
});

beforeAll(async () => {
  const result = await spinUpTestDb();
  testDb = result.db;
  seed = await seedMinimal(testDb);
});

/** Une skill qui débloque `run_command` — le cas du toggle Yolo. */
async function seedSkill(slug: string, requiredBuiltins: string[]): Promise<string> {
  const [row] = await testDb
    .insert(agentSkills)
    .values({
      entityId: seed.entityId,
      slug,
      name: slug,
      content: 'contenu de test',
      requiredBuiltins,
    })
    .returning({ id: agentSkills.id });
  if (!row) throw new Error('skill non créée');
  await testDb
    .insert(agentSkillAssignments)
    .values({ entityId: seed.entityId, agentId: seed.agentId, skillId: row.id });
  return row.id;
}

async function reglesDe(toolName: string) {
  return testDb
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

beforeEach(async () => {
  await testDb.delete(approvalRules).where(eq(approvalRules.entityId, seed.entityId));
  await testDb
    .delete(agentSkillAssignments)
    .where(eq(agentSkillAssignments.entityId, seed.entityId));
  await testDb.delete(agentSkills).where(eq(agentSkills.entityId, seed.entityId));
});

describe('unassignSkillAction — retirer une skill retire ses règles', () => {
  it('le Yolo posé sur un outil débloqué par la skill ne survit pas au retrait', async () => {
    const { unassignSkillAction } = await import('@/lib/actions.ts');
    const skillId = await seedSkill('exec-test', ['run_command']);
    await testDb.insert(approvalRules).values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      toolName: 'run_command',
      action: 'auto_approve',
    });
    expect(await reglesDe('run_command')).toHaveLength(1);

    const res = await unassignSkillAction({ skillId, agentId: seed.agentId });
    expect(res.ok).toBe(true);

    // La règle a disparu : réassigner repartira du défaut prudent, pas d'un
    // blanc-seing oublié.
    expect(await reglesDe('run_command')).toHaveLength(0);
  });

  it('un don sur un outil que la skill ne débloque PAS est laissé intact', async () => {
    // Les deux règles sont des DONS : seul le PÉRIMÈTRE est en jeu ici. La
    // distinction don/restriction est prouvée dans `packages/db`, où vit la
    // logique — ce fichier prouve que l'écran Skills l'APPELLE.
    const { unassignSkillAction } = await import('@/lib/actions.ts');
    const skillId = await seedSkill('exec-test-2', ['run_command']);
    await testDb.insert(approvalRules).values([
      {
        entityId: seed.entityId,
        agentId: seed.agentId,
        toolName: 'run_command',
        action: 'auto_approve',
      },
      {
        entityId: seed.entityId,
        agentId: seed.agentId,
        toolName: 'web_search',
        action: 'auto_approve',
      },
    ]);

    await unassignSkillAction({ skillId, agentId: seed.agentId });

    expect(await reglesDe('run_command')).toHaveLength(0);
    // `web_search` est toujours disponible : sa règle n'a rien à voir avec la
    // skill retirée, et l'effacer serait détruire un réglage sans raison.
    expect(await reglesDe('web_search')).toHaveLength(1);
  });

  it("un BLOCK du propriétaire survit — l'écran passe bien par la garde partagée", async () => {
    // La preuve que cet appelant hérite de l'asymétrie, et pas seulement la
    // fonction qu'il appelle : c'est ce chemin-là qu'un futur refactor pourrait
    // court-circuiter.
    const { unassignSkillAction } = await import('@/lib/actions.ts');
    const skillId = await seedSkill('exec-test-3', ['run_command']);
    await testDb.insert(approvalRules).values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      toolName: 'run_command',
      action: 'block',
    });

    await unassignSkillAction({ skillId, agentId: seed.agentId });

    const restantes = await reglesDe('run_command');
    expect(restantes).toHaveLength(1);
    expect(restantes[0]?.action).toBe('block');
  });

  it('un outil encore débloqué par une AUTRE skill assignée garde sa règle', async () => {
    const { unassignSkillAction } = await import('@/lib/actions.ts');
    const skillA = await seedSkill('exec-a', ['run_command']);
    await seedSkill('exec-b', ['run_command']);
    await testDb.insert(approvalRules).values({
      entityId: seed.entityId,
      agentId: seed.agentId,
      toolName: 'run_command',
      action: 'auto_approve',
    });

    await unassignSkillAction({ skillId: skillA, agentId: seed.agentId });

    // L'agent peut TOUJOURS lancer des commandes : effacer sa règle changerait
    // sa posture en silence, ce qui est exactement le défaut qu'on corrige.
    expect(await reglesDe('run_command')).toHaveLength(1);
  });

  it("la règle d'un AUTRE agent sur le même outil n'est pas touchée", async () => {
    const { unassignSkillAction } = await import('@/lib/actions.ts');
    const skillId = await seedSkill('exec-c', ['run_command']);
    // Règle portée par l'entité (agentId NULL) : elle vaut pour tous les agents,
    // et le retrait d'une skill sur UN agent ne peut pas la révoquer.
    await testDb.insert(approvalRules).values({
      entityId: seed.entityId,
      agentId: null,
      toolName: 'run_command',
      action: 'auto_approve',
    });

    await unassignSkillAction({ skillId, agentId: seed.agentId });

    const portéeEntité = await testDb
      .select()
      .from(approvalRules)
      .where(
        and(eq(approvalRules.entityId, seed.entityId), eq(approvalRules.toolName, 'run_command')),
      );
    expect(portéeEntité).toHaveLength(1);
    expect(portéeEntité[0]?.agentId).toBeNull();
  });
});
