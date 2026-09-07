## 1. Conversation provenant d’un autre agent

Constat confirmé, mais le placeholder ne dit pas « Reply to \<agent du projet\> ».

[ProjectThread.tsx:77](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectThread.tsx:77) privilégie systématiquement `thread.data.conversation.agentName` dès qu’un fil est affiché. Pour une conversation Telegram portée par un autre agent, le champ affiche donc « Reply to \<agent Telegram\> ».

Or, lorsque `composerConversationId` vaut `null`, [ProjectComposer.tsx:35](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectComposer.tsx:35) appelle `createProjectConversationAction()`. Cette action affecte la nouvelle conversation au ROOT de l’entité, et non nécessairement à l’agent du fil ou même à l’agent attaché au projet : [project-actions.ts:870](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:870) lit `entities.rootAgentId`, puis [project-actions.ts:888](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:888) l’enregistre dans `conversations.agentId`.

Ce qui casse : sous un fil Telegram de l’agent A, « Reply to A… » déclenche en réalité une nouvelle conversation avec le ROOT B. L’écran affirme donc un destinataire faux.

Le problème existe aussi sur un projet sans fil : [spaces/[id]/page.tsx:84](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:84) passe `project.agentName`, alors que la conversation créée utilisera le ROOT. Si ces agents diffèrent, le placeholder ment également.

Il faut afficher explicitement les deux contextes, par exemple : « Viewing a Telegram conversation with A. Your message will start the project conversation with B. » Le nom B doit provenir de la même source que `createProjectConversationAction`, pas de `codeProjects.agentId`.

## 2. Disparition du fil Telegram après le premier envoi

Constat confirmé.

[project-landing.ts:37](D:/APPS/NodalAI/apps/web/src/lib/project-landing.ts:37) donne priorité à `projectConversationId`. Avant le premier envoi, celui-ci est absent et `rows[0]` — éventuellement Telegram — est affiché. Le premier envoi crée une conversation `origin = 'project'` dans [project-actions.ts:888](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:888). Au rafraîchissement, cette conversation devient `projectConversationId` et remplace immédiatement le fil Telegram à l’écran.

Cette transition est surprenante sans explication, d’autant que l’utilisateur pense répondre au fil visible.

Je garderais néanmoins la conversation propre en priorité : choisir toujours la plus récente ferait de nouveau varier le fil principal lorsqu’une activité Telegram ou une production externe met une autre conversation à jour. La bonne correction est d’annoncer avant l’envoi qu’une nouvelle conversation va être ouverte, puis de rendre la transition explicite. L’historique Telegram reste consultable dans `/files`.

## 3. Lecture inutile des fichiers et de la preuve

Constat confirmé.

La page principale appelle toujours l’action complète à [spaces/[id]/page.tsx:31](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:31). Celle-ci :

- charge les séquences de preuve dans le `Promise.all` à [project-actions.ts:707](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:707) ;
- lit effectivement le dossier avec `readProjectFolder(path)` à [project-actions.ts:783](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:783) ;
- construit encore `files` et `proof`, bien que `/spaces/[id]` les ignore.

Ce qui casse : chaque ouverture et chaque `router.refresh()` du fil paie une lecture du système de fichiers et les requêtes de preuve destinées uniquement à `/spaces/[id]/files`. Sur un dossier volumineux ou lent, ce coût touche directement la conversation.

Il faut scinder l’action : une lecture légère projet + conversations pour `/spaces/[id]`, et une lecture dossier + preuve pour `/spaces/[id]/files`.

## 4. Liens entrants

Aucun lien entrant cassé trouvé dans `apps/web`.

- La liste des projets mène toujours vers le fil via [ProjectsTable.tsx:45](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectsTable.tsx:45), ce qui correspond à la nouvelle organisation.
- Le lien de projet depuis la liste Chat mène également à `/spaces/<id>` dans [ConversationsList.tsx:153](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ConversationsList.tsx:153). Son sens devient « ouvrir la conversation principale du projet », cohérent avec l’affirmation du commit.
- Les runs Scheduled utilisent `/scheduled/<jobId>` dans [ScheduledSection.tsx:45](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/scheduled/ScheduledSection.tsx:45).
- Aucun lien vers `/spaces/<id>` n’a été trouvé dans les écrans Code inspectés.
- Le bouton Files d’un chat ancré vise bien `/spaces/<id>/files` à [chat/[id]/page.tsx:77](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/[id]/page.tsx:77).

Seul le commentaire de [ScheduledSection.test.tsx:2](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/scheduled/__tests__/ScheduledSection.test.tsx:2) parle encore de `/spaces/<id>`, alors que les assertions vérifient correctement `/scheduled/<id>`. C’est une documentation périmée, pas une rupture fonctionnelle.

## 5. Tests manquants

Tests : **NON EXÉCUTÉS**.

Les couvertures les plus importantes à ajouter sont :

1. Un test de `ProjectThread` avec fil Telegram de l’agent A, conversation à créer avec l’agent B, vérifiant que l’écran n’annonce pas A comme destinataire. Le test actuel à [ProjectThread.test.tsx:68](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/__tests__/ProjectThread.test.tsx:68) ne couvre que le cas où fil affiché et destination sont supposés identiques.

2. Un test de la page serveur `/spaces/[id]` vérifiant ensemble :
   - la conversation choisie ;
   - l’identifiant réellement prolongé ou créé ;
   - le destinataire affiché ;
   - le bouton `/files` ;
   - la barre d’état issue du fil choisi.

3. Un test de transition Telegram → conversation propre après création, car les tests purs de [project-landing.test.ts](D:/APPS/NodalAI/apps/web/src/lib/__tests__/project-landing.test.ts:12) vérifient séparément les deux états, pas la rupture visible entre eux.

4. Un test de `/spaces/[id]/files` vérifiant le dossier, la preuve, les conversations, « New conversation » et le lien retour.

5. Après scission des actions, un test établissant que le chargeur du fil ne lit ni le dossier ni les séquences de preuve.

## 6. Points des passes 56 à 59

Je ne trouve aucun point antérieur encore ouvert que ce commit devait couvrir.

Le dernier point du composeur signalé aux passes 57–58 est corrigé : [ThreadComposer.tsx:76](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:76) vide désormais explicitement `box.current.value` avant de remesurer. La passe 59 ne laissait aucun blocage ouvert.

Tests et rendu réel du correctif : **NON EXÉCUTÉS**.

## Constats bloquants neufs

1. [ProjectThread.tsx:77](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectThread.tsx:77) annonce l’agent du fil affiché, alors que [ProjectComposer.tsx:35](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectComposer.tsx:35) peut créer une autre conversation attribuée au ROOT par [project-actions.ts:870](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:870). Le placeholder peut donc désigner un faux destinataire, notamment sous un fil Telegram.

2. [spaces/[id]/page.tsx:31](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:31) utilise encore le chargeur complet, qui lit le dossier à [project-actions.ts:783](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:783) et les preuves à chaque ouverture ou rafraîchissement du fil, alors que ces données ne sont plus rendues sur cette route.

## Ce que je n'ai pas pu vérifier

- Vitest : **NON EXÉCUTÉ**.
- Typecheck, lint, build et tests d’architecture : **NON EXÉCUTÉS**.
- Transition réelle après le premier envoi et ordre des rafraîchissements Next : **NON EXÉCUTÉS** dans un navigateur.
- Alignement annoncé à 849 px et rendu visuel du composeur : **NON EXÉCUTÉS**.
- Liens provenant de favoris, intégrations externes ou documents hors du dépôt : non vérifiables par la seule lecture de `apps/web`.
- Rendu au pixel face au Figma et onglet Code : hors périmètre demandé.