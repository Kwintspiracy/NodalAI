## 1. État `blocked` sans fil

Le double message n’est pas contradictoire :

- [ProjectThread.tsx:67](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectThread.tsx:67) affiche « Nothing said here yet » pour décrire le contenu du projet ;
- [ProjectThread.tsx:71](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectThread.tsx:71) affiche ensuite la raison pour laquelle aucune saisie n’est proposée.

Ils décrivent donc deux états distincts : fil vide et création impossible. Les fusionner allégerait l’interface, mais je ne relève pas de défaut fonctionnel à conserver les deux.

En revanche, le texte bloquant est factuellement faux. [project-landing.ts:50](D:/APPS/NodalAI/apps/web/src/lib/project-landing.ts:50) demande de « Designate one in Settings ». Or Settings ne permet pas de désigner le ROOT :

- [RootAgentSection.tsx:49](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/settings/RootAgentSection.tsx:49) précise qu’il est désigné automatiquement ;
- [RootAgentSection.tsx:91](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/settings/RootAgentSection.tsx:91) dirige vers `/agents` ;
- [RootAgentSection.tsx:94](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/settings/RootAgentSection.tsx:94) demande de créer un orchestrateur ;
- [RootAgentSection.tsx:96](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/settings/RootAgentSection.tsx:96) explique que le premier devient automatiquement ROOT.

Ce qui casse : l’utilisateur suit l’instruction vers Settings, mais n’y trouve aucun contrôle permettant d’effectuer l’action annoncée. Ajouter un lien `/settings` renforcerait cette fausse piste. Il faut plutôt indiquer « Create an orchestrator agent » et rendre `/agents` cliquable, comme le fait déjà l’état vide de Settings.

Le même texte périmé existe hors du diff dans [project-actions.ts:980](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:980) et [ConversationsList.tsx:89](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ConversationsList.tsx:89).

## 2. `ProjectSummary`

Constat valide, aucune rupture trouvée.

[project-actions.ts:638](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:638) retire uniquement `jobsCount` et `lastActivityAt` du modèle destiné au fil. Sur cette page, [page.tsx:83](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:83) et [page.tsx:84](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:84) ne transmettent à `WorkHeader` que `name` et `path`.

`ProjectShelf` n’est rendu que sur `/files`, à [files/page.tsx:71](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/files/page.tsx:71), avec le résultat complet de `getProjectPageAction`. Aucun composant partagé de la page du fil ne lit les deux propriétés retirées.

À noter : `ProjectShelf` ne consomme actuellement lui-même ni `jobsCount` ni `lastActivityAt`; cela ne crée toutefois aucune incompatibilité de type ou de rendu.

## 3. Premier envoi depuis un fil Telegram

Le constat de course restante est faux dans le flux visible par lecture.

[ProjectComposer.tsx:35](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectComposer.tsx:35) crée la conversation et retourne son identifiant sans rafraîchir. `ThreadComposer` :

- attend cet identifiant à [ThreadComposer.tsx:66](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:66) ;
- attend entièrement `sendChatMessageAction` à [ThreadComposer.tsx:76](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:76) ;
- n’appelle `router.refresh()` qu’à [ThreadComposer.tsx:90](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:90).

Il n’existe donc plus de relecture cliente entre création et envoi. Après le rafraîchissement, [project-landing.ts:80](D:/APPS/NodalAI/apps/web/src/lib/project-landing.ts:80) privilégie bien la conversation propre : le fil Telegram disparaît de cette page conformément à la note, mais reste listé sur `/files`.

L’affichage réel du message et de la réponse après cette transition : **NON EXÉCUTÉ** dans un navigateur.

## 4. Tests et protection du chargeur léger

Les nombres annoncés sont exacts par lecture :

- cinq cas `projectLanding` et sept cas `composerPresentation` dans [project-landing.test.ts](D:/APPS/NodalAI/apps/web/src/lib/__tests__/project-landing.test.ts:11) ;
- cinq cas de rendu dans [ProjectThread.test.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/__tests__/ProjectThread.test.tsx:42), dont `blocked` à la ligne 79.

Deux lacunes restent :

- aucun test de la page serveur ne protège l’assemblage `projectLanding` → chargement du fil → `composerPresentation` → `ProjectThread`;
- aucun test ne protège la propriété de performance de `getProjectThreadPageAction`.

Par construction actuelle, [getProjectThreadPageAction à project-actions.ts:806](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:806) n’appelle que `loadProjectCore`. La lecture du dossier et celle de `verification_runs` restent dans `getProjectPageAction`, notamment [project-actions.ts:889](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:889).

Le scanner d’architecture existant ne peut pas imposer cette propriété : [architecture.test.ts:22](D:/APPS/NodalAI/apps/web/src/tests/architecture.test.ts:22) ne vérifie que les slugs, UUID, imports de pilotes DB, copies de `projectKey` et écritures terminales. Ajouter un simple scanner textuel propre à cette fonction serait fragile. La protection vaut néanmoins le coût si ce chargeur léger est un contrat durable : idéalement en séparant physiquement le chargeur du fil et les lectures dossier/preuve, puis en faisant respecter cette frontière par les imports ou dependency-cruiser. À défaut, un test ciblé de requêtes/dépendances reste utile.

Tests concernés : **NON EXÉCUTÉS**.

## 5. Points des passes 60–61

Les deux blocages de la passe 61 sont corrigés :

- plus de saisie lorsque la création nécessite un ROOT absent ;
- plus de `router.refresh()` entre création et premier message.

Le calcul du destinataire a bien été extrait et couvre les sept cas demandés. L’agrégat `jobsCount`/`lastActivityAt` est sorti de `loadProjectCore` et exécuté uniquement par la page `/files`, à [project-actions.ts:891](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:891).

Les deux lacunes de couverture déjà signalées restent ouvertes, mais elles ne sont pas neuves. Le seul défaut neuf trouvé est l’instruction erronée vers Settings.

## Constats bloquants neufs

1. [project-landing.ts:50](D:/APPS/NodalAI/apps/web/src/lib/project-landing.ts:50) dit à l’utilisateur de désigner un ROOT dans Settings, alors que [RootAgentSection.tsx:49](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/settings/RootAgentSection.tsx:49) établit que le ROOT est désigné automatiquement lors de la création du premier orchestrateur et [RootAgentSection.tsx:91](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/settings/RootAgentSection.tsx:91) renvoie vers `/agents`. L’action corrective affichée est donc inexécutable telle qu’écrite ; un lien `/settings` serait également incorrect.

## Ce que je n'ai pas pu vérifier

- Vitest : **NON EXÉCUTÉ**.
- Typecheck, lint, build et contrôles d’architecture : **NON EXÉCUTÉS**.
- Transition réelle Telegram → conversation propre et rendu de la réponse dans Next : **NON EXÉCUTÉS** dans un navigateur.
- Requêtes SQL et performances réelles du chargeur : **NON EXÉCUTÉES**.
- Rendu au pixel et onglet Code : hors périmètre.