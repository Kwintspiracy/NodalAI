# Relecture PR #46 — passe 64 — commit `c9a7bcb0`

## 1. Atomicité de `createAgentRepo`

Le constat est vrai, mais le défaut existait déjà avant ce commit.

[agents.ts:69](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:69) insère l’agent, puis plusieurs écritures indépendantes peuvent encore échouer :

- insertion des sous-agents à [agents.ts:104](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:104) ;
- attribution du ROOT à [agents.ts:129](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:129) ;
- rattachement sous le ROOT à [agents.ts:149](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:149) ;
- rattachement demandé par l’appelant à [agents.ts:177](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:177).

Une panne après l’insertion laisse donc un agent partiellement créé. Pour un orchestrateur, un échec de l’`UPDATE entities` laisse notamment un orchestrateur top-level qui n’est ni ROOT ni rattaché.

Ce n’est pas une régression propre à `c9a7bcb0` : la version précédente insérait déjà l’agent avant le `SELECT`, l’`UPDATE` du ROOT et les insertions d’assignations, sans transaction.

Il faut néanmoins regrouper ces écritures dans une transaction si `createAgentRepo` promet une création cohérente. La validation préalable des `subAgentIds` peut rester hors transaction, mais l’insertion de l’agent, la réclamation du ROOT et toutes les assignations doivent réussir ou être annulées ensemble.

Je ne trouve aucun appel de production qui fournisse actuellement une transaction existante :

- le dashboard transmet directement `getDb()` à [actions.ts:913](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:913) ;
- le méta-outil transmet directement `ctx.db` à [create-agent.ts:107](D:/APPS/NodalAI/packages/tools/src/builtin/meta-ops/create-agent.ts:107).

Le type utilisé reste compatible avec une transaction Drizzle : `AnyDrizzleDb` est un `PgDatabase` à [client.ts:17](D:/APPS/NodalAI/packages/db/src/client.ts:17), et `PgTransaction` étend `PgDatabase` dans la version locale de Drizzle. Il serait donc possible de séparer une primitive interne acceptant `db | tx` d’un wrapper ouvrant la transaction. Aucun risque actuel de transaction imbriquée n’est visible dans les appelants recensés.

## 2. Suppression concurrente du ROOT

Le constat est vrai.

Le dashboard expose une suppression directe à [actions.ts:941](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:941), puis supprime l’agent à [actions.ts:954](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:954), sans interdire la suppression du ROOT.

La migration définit `entities.root_agent_id → agents.id ON DELETE SET NULL` à [0021_entities_root_agent_grants.sql:12](D:/APPS/NodalAI/packages/db/migrations/0021_entities_root_agent_grants.sql:12). Supprimer le ROOT remet donc réellement `rootAgentId` à `NULL`.

Le scénario suivant est possible dans le code du commit :

1. un nouvel orchestrateur perd l’`UPDATE … WHERE root_agent_id IS NULL` à [agents.ts:129](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:129) ;
2. le ROOT gagnant est supprimé ;
3. la clé étrangère remet `rootAgentId` à `NULL` ;
4. le perdant relit l’entité à [agents.ts:143](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:143) ;
5. la condition de [agents.ts:148](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:148) est fausse et aucun rattachement n’est créé.

Ce qui casse : le nouvel orchestrateur reste top-level alors que l’entité n’a plus de ROOT.

Les assignations existantes dont le ROOT est `orchestratorId` sont supprimées en cascade : la clé étrangère `agent_assignments.orchestrator_id → agents.id` utilise `ON DELETE CASCADE` dans [0000_flashy_clea.sql:429](D:/APPS/NodalAI/packages/db/migrations/0000_flashy_clea.sql:429). Les orchestrateurs auparavant placés sous le ROOT deviennent donc eux aussi top-level.

Une transaction autour de la création corrige les états partiels en cas de panne, mais elle ne suffit pas à définir la succession après suppression. Il faut aussi une règle explicite, par exemple interdire la suppression du ROOT tant qu’un successeur n’est pas choisi, ou réattribuer atomiquement le ROOT et reconstruire les rattachements. Au minimum, si la relecture trouve `NULL`, le créateur ne doit pas réussir silencieusement : il doit retenter la réclamation ou échouer clairement.

Ce risque de suppression concurrente n’est toutefois pas entièrement neuf : avant le commit, un ROOT pouvait déjà être supprimé entre le `SELECT` et l’insertion de l’assignation, laissant l’agent préalablement inséré après l’échec.

## 3. `RETURNING` avec PGlite et PostgreSQL/postgres.js

Rien d’anormal dans la forme SQL.

À [agents.ts:137](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:137), l’`UPDATE` est filtré par `root_agent_id IS NULL`, puis [agents.ts:138](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:138) demande `RETURNING root_agent_id`.

PostgreSQL ne retourne que les lignes effectivement mises à jour. Si le prédicat devient faux après l’attente d’un verrou concurrent, le résultat contient zéro ligne. Drizzle matérialise ce résultat comme un tableau ; `claimed.length === 0` à [agents.ts:140](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:140) est donc le test attendu avec PGlite comme avec le pilote postgres.js.

Le pilote de production ne devrait pas produire `undefined` dans ce chemin : zéro ligne retournée est représenté par un tableau vide. Vérification dynamique contre un PostgreSQL de production : **NON EXÉCUTÉE**.

À noter : le test PGlite de [root-agent-designation.test.ts:181](D:/APPS/NodalAI/packages/db/src/tests/root-agent-designation.test.ts:181) protège le résultat fonctionnel et la forme de l’algorithme, mais ne prouve pas le comportement sous deux connexions PostgreSQL réellement concurrentes. PGlite sérialise davantage les opérations qu’un serveur PostgreSQL multi-connexion.

## 4. Points des passes 60 à 63 encore ouverts

Le commit ferme bien les deux blocages neufs de la passe 63 :

- le message de `createConversationAction` ne demande plus de désigner le ROOT dans Settings à [actions.ts:11172](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:11172) ;
- l’attribution initiale utilise désormais un `UPDATE` conditionnel atomique à [agents.ts:129](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:129).

La recherche dans `apps/web/src` ne trouve plus `Designate` que dans des commentaires. L’affirmation textuelle du commit est donc vraie.

Deux lacunes de couverture déjà relevées aux passes 61–63 restent ouvertes et ne sont pas traitées par ce commit :

- aucun test de la page serveur `/spaces/[id]` ne protège l’assemblage complet entre `projectLanding`, le fil chargé, `composerPresentation` et `ProjectThread` ;
- aucun test ne protège le contrat de performance de `getProjectThreadPageAction`, à savoir l’absence de lecture du dossier et de `verification_runs`.

Elles ne constituent pas des constats neufs.

## Constats bloquants neufs

Aucun.

L’absence de transaction et le comportement lors de la suppression du ROOT sont des défauts réels, mais leurs formes générales existaient déjà avant `c9a7bcb0`. Le commit corrige correctement la course précise signalée à la passe 63 sans introduire de nouveau blocage démontré.

## Ce que je n'ai pas pu vérifier

- Vitest, notamment `root-agent-designation.test.ts` : **NON EXÉCUTÉ**.
- Mutation retirant la condition `root_agent_id IS NULL` : **NON EXÉCUTÉE**.
- Typecheck, lint, build et contrôles d’architecture : **NON EXÉCUTÉS**.
- Course sur deux connexions PostgreSQL réelles : **NON EXÉCUTÉE**.
- Suppression concurrente du ROOT pendant une création : **NON EXÉCUTÉE**.
- Comportement dynamique exact de postgres.js sur un PostgreSQL de production : **NON EXÉCUTÉ**.