## 1. Entité sans agent ROOT

Constat confirmé.

[project-actions.ts:764](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:764) utilise un `innerJoin` entre `entities.rootAgentId` et `agents.id`. Sans ROOT, `rootRows` est vide et [project-actions.ts:804](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:804) renvoie `rootAgent: null`.

La page transforme alors cette absence en simple placeholder générique « Write… » à [page.tsx:68](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:68) et [page.tsx:73](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:73). Aucune note spécifique n’est rendue pour un projet neuf, puisque la note exige également `view !== null` à [page.tsx:76](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:76).

Ce qui casse : l’interface présente une saisie utilisable alors que toute création est condamnée. Ce n’est qu’après soumission que [createProjectConversationAction, ligne 970](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:970) renvoie `no_root_agent`.

Il faut annoncer l’absence du ROOT avant l’envoi, idéalement en désactivant la saisie ou en la remplaçant par « No ROOT agent: designate one in Settings ». Un simple placeholder ne suffit pas : il disparaît dès que l’utilisateur saisit du texte et ne décrit pas le blocage.

## 2. Coût de `loadProjectCore`

Le constat est partiellement confirmé.

Il n’y a pas cinq requêtes parallèles après la lecture du projet, mais :

1. une lecture initiale de `codeProjects` à [project-actions.ts:672](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:672) ;
2. quatre requêtes regroupées dans le `Promise.all` à [project-actions.ts:713](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:713).

La sous-requête `conversationIdsOfJobs` définie à [project-actions.ts:701](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:701) est incorporée à la requête des conversations ; ce n’est pas un aller-retour autonome.

La requête de comptage des travaux, [project-actions.ts:714](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:714), produit `jobsCount` et `lastActivityAt`, ensuite placés dans `project` à [project-actions.ts:789](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:789). Or `/spaces/[id]` n’utilise ni l’un ni l’autre : son en-tête ne consomme que le nom et le chemin, et sa barre d’état utilise les données de `view`, à [page.tsx:118](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:118).

Ce qui casse : chaque ouverture et chaque actualisation du fil paie une agrégation sur `agentJobs` sans résultat visible. La scission dossier/fil corrige bien le coût dominant — dossier et preuves — mais cette requête reste de trop pour la page du fil. Un cache n’est pas indispensable pour corriger ce point ; il vaut mieux donner au chargeur du fil une projection réellement minimale.

## 3. Double `router.refresh()`

Constat confirmé dans le flux de contrôle ; visibilité réelle non vérifiée.

Lors du premier envoi :

- [ProjectComposer.tsx:44](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectComposer.tsx:44) crée la conversation ;
- [ProjectComposer.tsx:51](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectComposer.tsx:51) appelle immédiatement `router.refresh()`, avant de rendre son identifiant à `ThreadComposer` ;
- `ThreadComposer` n’envoie le message qu’après le retour de `onBeforeSend`, à [ThreadComposer.tsx:66](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:66) puis [ThreadComposer.tsx:76](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:76) ;
- un second `router.refresh()` intervient après l’envoi à [ThreadComposer.tsx:91](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:91).

La première actualisation peut donc relire la conversation propre après sa création mais avant que son premier message soit enregistré. Si cette actualisation devient visible avant la fin de l’action d’envoi, elle remplace temporairement le fil Telegram par une conversation vide et fait disparaître la note.

C’est une course inutile et potentiellement visible. Le `router.refresh()` de `ProjectComposer` doit être supprimé : celui de `ThreadComposer`, après succès de l’envoi, suffit à afficher directement la conversation propre avec son message et sa réponse.

L’apparition effective de l’état vide dépend de l’ordonnancement de Next et du navigateur : **NON EXÉCUTÉ**.

## 4. Test du calcul page/recipient/note

Constat confirmé.

Le test ajouté à [ProjectThread.test.tsx:86](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/__tests__/ProjectThread.test.tsx:86) ne vérifie que le rendu de valeurs déjà calculées. Le comportement délicat reste dans la page, entre [page.tsx:67](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:67) et [page.tsx:83](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:83), sans test.

Sortir ce calcul dans `project-landing.ts` sous forme d’une fonction pure est approprié. Les cas minimaux à couvrir sont :

- conversation dashboard prolongée : destinataire du fil, placeholder implicite « Reply », aucune note ;
- aucun fil : destinataire ROOT, « Write to ROOT… », aucune note de transition ;
- fil Telegram, ROOT différent : note nommant le fil A puis la nouvelle conversation B ;
- fil Telegram, ROOT identique : le nom ne doit pas être répété ;
- fil Telegram sans nom d’agent ;
- ROOT absent : état bloqué explicite, pas seulement « Write… » ;
- conversation dashboard dont l’agent est inconnu : placeholder honnête « Reply… ».

Il faut conserver séparément les tests de `projectLanding`, qui choisissent les identifiants, et tester cette nouvelle fonction comme présentation dérivée de ce choix.

## 5. Point de la passe 60 restant ouvert

Deux éléments de couverture restent ouverts :

- aucun test de la page serveur `/spaces/[id]` ne vérifie l’assemblage entre `projectLanding`, le fil chargé, le ROOT et les props remises à `ProjectThread` ;
- aucun test ne garantit que `getProjectThreadPageAction` ne touche ni `readProjectFolder` ni `verification_runs`. La scission existe par lecture du code, mais sa propriété principale n’est pas protégée contre une régression.

Le problème fonctionnel principal de la passe 60 — faux destinataire sous un fil Telegram — est bien corrigé lorsque le ROOT existe. La note explique également avant l’envoi que le fil affiché sera remplacé par la conversation propre. Le commentaire périmé de `ScheduledSection.test.tsx` est corrigé.

## Constats bloquants neufs

1. [page.tsx:68](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/[id]/page.tsx:68) transforme l’absence de ROOT en une saisie « Write… » apparemment utilisable, alors que [project-actions.ts:970](D:/APPS/NodalAI/apps/web/src/lib/project-actions.ts:970) condamne nécessairement le premier envoi avec `no_root_agent`. Le blocage doit être annoncé avant soumission.

2. [ProjectComposer.tsx:51](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProjectComposer.tsx:51) déclenche une actualisation entre la création de la conversation et l’envoi de son premier message. Elle peut remplacer le fil lu par une conversation propre vide ; l’actualisation post-envoi de [ThreadComposer.tsx:91](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:91) rend la première inutile.

## Ce que je n'ai pas pu vérifier

- Vitest : **NON EXÉCUTÉ**.
- Typecheck, lint, build et contrôles d’architecture : **NON EXÉCUTÉS**.
- Affichage réel de la conversation vide pendant le double rafraîchissement : **NON EXÉCUTÉ** dans un navigateur.
- Comportement visuel des notes et placeholders : **NON EXÉCUTÉ**.
- Performances SQL réelles et coût du comptage `agentJobs` sur une base de production : **NON EXÉCUTÉS**.