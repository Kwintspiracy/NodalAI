# Demande de review — PR #46, passe 64 (correctifs de la passe 63)

Périmètre : **le dernier commit de code** de la branche (« fix: passe Codex 63 — plus un texte qui
« désigne » le ROOT ; le premier orchestrateur le devient sans course »). Diff : `git diff <hash>^
<hash> -- apps/web packages/db` — le hash est donné dans la consigne.

## Ce que le commit affirme

1. **Textes** : `createConversationAction` (`actions.ts`) rend « No ROOT agent yet. Create an
   orchestrator agent first: the first one you create becomes this workspace's ROOT. » ; les deux
   « No ROOT agent designated » deviennent « No ROOT agent yet ». Plus aucune occurrence de
   `Designate` dans `apps/web/src` hors commentaires et tests.
2. **Course sur le premier ROOT** (`packages/db/src/repos/agents.ts`, `createAgentRepo`) : le
   choix est un seul `UPDATE entities SET root_agent_id = <nouveau> … WHERE id = <entité> AND
   root_agent_id IS NULL RETURNING` ; si aucune ligne ne revient, l'entité a déjà un ROOT (ou
   vient d'en prendre un) et le nouvel orchestrateur est rattaché sous lui. Test
   (`root-agent-designation.test.ts`) : deux créations en `Promise.all`, exactement un ROOT, l'autre
   sous lui, le ROOT sous personne. Mutation locale (condition retirée) : rouge.

## Questions

1. **La transaction** : `createAgentRepo` insère l'agent puis fait l'UPDATE conditionnel — deux
   ordres, sans transaction. Si l'UPDATE échoue (panne), l'agent existe sans être ROOT ni
   rattaché : un orchestrateur de tête de plus. Était-ce déjà le cas avant ? Faut-il envelopper
   dans une transaction, et `createAgentRepo` reçoit-il un `db` transactionnel ailleurs ?
2. **Le perdant sous le gagnant** : entre l'UPDATE perdu et le SELECT du ROOT, le ROOT peut-il
   être RETIRÉ (une suppression d'agent qui remet `root_agent_id` à NULL) ? Alors
   `ent.rootAgentId` est null et le perdant reste de tête. Existe-t-il un chemin qui remet le ROOT
   à NULL, et que fait-il des orchestrateurs rattachés ?
3. **`returning` sur pglite et sur Postgres** : le test tourne sur pglite ; `RETURNING` est
   standard Postgres, rien à signaler ? Le pilote `postgres` (prod) rend-il bien `[]` quand
   aucune ligne n'est mise à jour ?
4. Un point resté ouvert des passes 60 à 63 que ce commit ne couvre pas ?

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF ferme ce point.
