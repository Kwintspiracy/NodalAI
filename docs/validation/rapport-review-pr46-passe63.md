# Relecture PR #46 — passe 63 — commit `ba9cc99b`

## 1. Reste-t-il un texte demandant de « désigner » le ROOT ?

Oui, dans `apps/web`.

- [actions.ts:11170](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:11170), `createConversationAction`, renvoie encore :

  > `Designate a ROOT agent in Settings first.`

  Ce texte contredit la règle actuelle : Settings ne permet pas de désigner manuellement le ROOT. Il s’agit bien d’un message d’action potentiellement destiné à l’interface, même si [ConversationsList.tsx:48](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ConversationsList.tsx:48) masque actuellement ce message précis lorsqu’il reçoit le code `no_root_agent` et affiche sa propre bannière corrigée.

  Ce qui casse : le contrat de `createConversationAction` reste factuellement faux pour tout autre appelant qui déciderait d’afficher `result.message`. Le commit n’a donc pas supprimé « toute mention de Settings » du chemin de création d’une conversation.

Deux autres occurrences disent « designated », sans demander à l’utilisateur d’effectuer cette action :

- [actions.ts:10841](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:10841)
- [actions.ts:10865](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:10865)

Elles renvoient `No ROOT agent designated`. La formulation est périmée par rapport au modèle automatique, mais elle ne dirige pas l’utilisateur vers Settings.

Les autres résultats dans `apps/web` sont des commentaires ou des tests. Notamment [ConversationsList.tsx:90](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ConversationsList.tsx:90) cite l’ancien texte uniquement pour expliquer sa suppression.

Dans le runner, je n’ai trouvé aucune carte Telegram ni instruction utilisateur demandant de désigner un ROOT. Les occurrences sont des commentaires internes ou parlent d’un ROOT déjà configuré. [server.ts:261](D:/APPS/NodalAI/packages/mcp-server/src/server.ts:261) dit qu’un workspace « designates a root agent » dans une erreur technique de configuration invalide ; il ne demande pas à l’utilisateur de le désigner dans Settings.

## 2. Le premier orchestrateur devient-il automatiquement ROOT pour chaque entité ?

Oui dans le chemin séquentiel normal, y compris pour une entité créée après coup.

La règle est dans [agents.ts:113](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:113) :

- `createAgentRepo` reçoit explicitement l’`entityId` ;
- pour un agent de rôle `orchestrator`, il lit `entities.rootAgentId` pour cette entité aux [lignes 119–123](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:119) ;
- si celui-ci est absent, il place l’identifiant du nouvel orchestrateur dans `rootAgentId` aux [lignes 125–138](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:125) ;
- les orchestrateurs suivants sont rattachés au ROOT existant aux [lignes 139–145](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:139).

Le dashboard passe bien l’entité de la session à ce dépôt dans [actions.ts:913](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:913). La règle est donc par entité, et non limitée à l’entité initiale ou au mode local. Une nouvelle entité LAN sans ROOT en reçoit un lors de sa première création d’orchestrateur par ce chemin.

Le test existant protège le cas séquentiel :

- premier orchestrateur ROOT : [root-agent-designation.test.ts:71](D:/APPS/NodalAI/packages/db/src/tests/root-agent-designation.test.ts:71) ;
- second orchestrateur placé sous ce ROOT : [root-agent-designation.test.ts:92](D:/APPS/NodalAI/packages/db/src/tests/root-agent-designation.test.ts:92).

En revanche, l’affirmation « le premier reste ROOT » n’est pas garantie en cas de créations concurrentes. Les deux appels peuvent lire `rootAgentId = null` à [agents.ts:119](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:119), puis chacun exécuter une mise à jour sans condition `root_agent_id IS NULL` à [agents.ts:130](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:130). Le dernier `UPDATE` gagne, et aucun des deux appels ne passe par la branche qui crée l’assignation du second orchestrateur.

Ce qui casse : deux créations simultanées peuvent faire du second commit le ROOT, laisser l’autre orchestrateur au niveau supérieur et violer l’invariant « exactement un orchestrateur top-level ». La sélection devrait être atomique, par exemple avec un `UPDATE … WHERE root_agent_id IS NULL RETURNING`, puis rattacher le perdant au ROOT effectivement enregistré.

## 3. Points des passes 60 à 62 restant ouverts

Deux lacunes de couverture déjà relevées restent hors du commit :

- aucun test de la page serveur `/spaces/[id]` ne protège l’assemblage complet entre `projectLanding`, le fil chargé, `composerPresentation` et les propriétés données à `ProjectThread` ;
- aucun test ne protège le contrat de performance de `getProjectThreadPageAction`, à savoir l’absence de lecture du dossier et de `verification_runs`.

Ce ne sont pas des constats neufs.

Les deux blocages fonctionnels des passes précédentes sont corrigés par lecture :

- l’absence de ROOT retire maintenant la saisie et fournit un lien `/agents` dans [ProjectThread.tsx:82](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectThread.tsx:82) ;
- le rafraîchissement entre création de la conversation et premier envoi avait déjà été supprimé avant ce commit.

## Constats bloquants neufs

1. [actions.ts:11170](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:11170) conserve l’instruction erronée `Designate a ROOT agent in Settings first.` dans `createConversationAction`. L’affirmation selon laquelle le chemin de création de conversation ne mentionne plus Settings est donc fausse.

2. [agents.ts:119](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:119) puis [agents.ts:130](D:/APPS/NodalAI/packages/db/src/repos/agents.ts:130) implémentent l’attribution du premier ROOT par un `SELECT` suivi d’un `UPDATE` non conditionnel. Deux créations concurrentes peuvent écraser le ROOT et laisser deux orchestrateurs top-level.

## Ce que je n'ai pas pu vérifier

- Vitest : **NON EXÉCUTÉ**.
- Typecheck, lint, build et contrôles d’architecture : **NON EXÉCUTÉS**.
- Scénario réel de deux créations concurrentes d’orchestrateurs : **NON EXÉCUTÉ**.
- Rendu dans un navigateur du lien `/agents` et de la bannière de conversations : **NON EXÉCUTÉ**.
- Cartes Telegram générées dynamiquement ou messages provenant de données externes à ce dépôt : non vérifiables par la seule lecture du code.