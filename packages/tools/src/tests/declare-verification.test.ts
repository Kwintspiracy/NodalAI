// declare-verification.test.ts — celui qui construit dit comment on vérifie.
//
// Ce que ces tests protègent : après une déclaration, le projet est dans l'état
// que la finalisation appelle `ready` — donc la preuve TOURNERA. Tant que la
// configuration dépendait d'une saisie du propriétaire, elle n'a jamais tourné :
// 0 ligne dans `verification_runs` sur la base de référence, depuis l'origine.
//
// Règle de la maison : on assert les LIGNES réelles, pas des compteurs.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { spinUpTestDb, seedMinimal } from '@nodal-agents/db/test-utils';
import { codeProjects, eq } from '@nodal-agents/db';
import {
  hashVerificationManifest,
  projectKey,
  SHELL_POLICY_VERSION,
  ENV_ALLOWLIST_VERSION,
} from '@nodal-agents/shared';
import { declareVerificationTool } from '../builtin/declare-verification';
import type { ToolContext } from '../types';
import type { TestDb } from '@nodal-agents/db/test-utils';

let db: TestDb;
let seed: { userId: string; entityId: string; agentId: string; jobId: string };

const PROJET = 'C:/Users/kwint/Documents/Dev/recipes-app';

function ctx(): ToolContext {
  return {
    jobId: seed.jobId,
    agentId: seed.agentId,
    entityId: seed.entityId,
    db: db as unknown as ToolContext['db'],
    jobChatId: null,
  };
}

async function projet() {
  const [row] = await db
    .select({
      verifyCommands: codeProjects.verifyCommands,
      verifyApprovedManifestHash: codeProjects.verifyApprovedManifestHash,
      verifySource: codeProjects.verifySource,
      verifyDeclaredByJobId: codeProjects.verifyDeclaredByJobId,
      projectPath: codeProjects.projectPath,
    })
    .from(codeProjects)
    .where(eq(codeProjects.projectKey, projectKey(PROJET)));
  return row;
}

beforeAll(async () => {
  const res = await spinUpTestDb();
  db = res.db;
  seed = await seedMinimal(db);
});

beforeEach(async () => {
  await db.delete(codeProjects);
  await db.insert(codeProjects).values({
    entityId: seed.entityId,
    projectPath: PROJET,
    projectKey: projectKey(PROJET),
    displayName: 'Recipes',
    registeredAt: new Date(),
  });
});

describe('declare_verification', () => {
  it('écrit les commandes de l’agent, et les rend EXÉCUTABLES', async () => {
    const out = await declareVerificationTool.execute(
      {
        project_path: PROJET,
        commands: [
          { command: 'node --check app.js', timeout_seconds: 60 },
          { command: 'curl -sf -o NUL http://127.0.0.1:8765/index.html', timeout_seconds: 30 },
        ],
      },
      ctx(),
    );
    expect(out).toEqual({ declared: true, project: PROJET, commands: 2 });

    const row = await projet();
    expect(row?.verifyCommands).toEqual([
      { command: 'node --check app.js', timeoutSeconds: 60 },
      { command: 'curl -sf -o NUL http://127.0.0.1:8765/index.html', timeoutSeconds: 30 },
    ]);
    expect(row?.verifySource).toBe('agent');
    expect(row?.verifyDeclaredByJobId).toBe(seed.jobId);

    // LE point du lot : le hash enregistré est CELUI que le vérificateur
    // recalculera. S'ils diffèrent, la configuration reste `pending_approval`
    // et la preuve ne tourne jamais — c'est exactement l'état dans lequel ce
    // produit est resté depuis l'origine.
    const attendu = hashVerificationManifest({
      verifierConfig: row!.verifyCommands!,
      invariants: [],
      canonicalKey: projectKey(PROJET),
      cwd: row!.projectPath,
      shellPolicyVersion: SHELL_POLICY_VERSION,
      envAllowlistVersion: ENV_ALLOWLIST_VERSION,
    });
    expect(row?.verifyApprovedManifestHash).toBe(attendu);
  });

  it('une déclaration plus tard REMPLACE la précédente, hash compris', async () => {
    await declareVerificationTool.execute(
      { project_path: PROJET, commands: [{ command: 'node --check app.js' }] },
      ctx(),
    );
    const premier = (await projet())?.verifyApprovedManifestHash;

    await declareVerificationTool.execute(
      { project_path: PROJET, commands: [{ command: 'npm test' }] },
      ctx(),
    );
    const row = await projet();
    expect(row?.verifyCommands).toEqual([{ command: 'npm test', timeoutSeconds: 120 }]);
    // Le hash SUIT les commandes : sinon la nouvelle séquence tournerait sous
    // l'approbation de l'ancienne.
    expect(row?.verifyApprovedManifestHash).not.toBe(premier);
  });

  it('un projet non déclaré est refusé en le DISANT, sans rien écrire', async () => {
    const out = await declareVerificationTool.execute(
      { project_path: 'C:/Users/kwint/Documents/Dev/inconnu', commands: [{ command: 'true' }] },
      ctx(),
    );
    expect(out.declared).toBe(false);
    if (!out.declared) {
      expect(out.reason).toContain('No registered project');
      expect(out.reason).toContain('register_project');
    }
    // Le projet existant n'a pas bougé.
    expect((await projet())?.verifyCommands).toBeNull();
  });

  it('le délai par défaut est posé, pas laissé vide', async () => {
    await declareVerificationTool.execute(
      { project_path: PROJET, commands: [{ command: 'node --check app.js' }] },
      ctx(),
    );
    expect((await projet())?.verifyCommands).toEqual([
      { command: 'node --check app.js', timeoutSeconds: 120 },
    ]);
  });

  it('demande une approbation, comme la commande qu’elle fera tourner', () => {
    // La preuve s'exécute à la FIN, hors du flux d'approbation. Sans ce
    // réglage, déclarer serait un moyen détourné d'exécuter sans demander.
    expect(declareVerificationTool.defaultApproval).toBe('require_approval');
  });

  it('dit au modèle d’utiliser ce qu’il a DÉJÀ lancé', () => {
    // La description est ce que le modèle lit ; c'est elle qui décide s'il
    // déclare une vraie preuve ou une commande décorative.
    expect(declareVerificationTool.description).toContain('you ALREADY ran');
    expect(declareVerificationTool.description).toContain('exit 0');
    expect(declareVerificationTool.description).toContain('never declare a command that always');
  });
});
