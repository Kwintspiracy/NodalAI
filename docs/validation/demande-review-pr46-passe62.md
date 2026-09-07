# Demande de review — PR #46, passe 62 (correctifs de la passe 61)

Périmètre : **le dernier commit de code** de la branche (« fix(spaces): passe Codex 61 — pas de
saisie sans ROOT, pas de relecture avant le premier message »). Diff : `git diff <hash>^ <hash> --
apps/web` — le hash est donné dans la consigne.

## Ce que le commit affirme

1. **Sans ROOT, pas de saisie** : `composerPresentation` (`lib/project-landing.ts`, pur) rend
   `{ kind: 'blocked', message }` quand la saisie devrait créer et que l'entité n'a pas de ROOT ;
   `ProjectThread` rend alors le message (« No ROOT agent yet. Designate one in Settings to write
   here. ») et AUCUN champ. Un fil qu'on prolonge n'a pas besoin de ROOT (`reply`).
2. **Plus de `router.refresh()` dans `ProjectComposer.onBeforeSend`** : `ThreadComposer` relit
   après l'envoi ; la conversation neuve n'est jamais montrée vide entre sa création et son
   premier message.
3. **Le calcul du destinataire est pur et testé** : `composerPresentation({ continues,
   threadAgentName, threadOrigin, rootAgentName })` → `reply` (agent du fil, éventuellement
   inconnu → « Reply… »), `start` (« Write to ROOT… », note seulement si un fil est affiché, nom du
   ROOT répété seulement s'il diffère), `blocked`. Sept cas testés (la liste de la passe 61).
   `ProjectThread` prend `composer: ComposerPresentation` et ne déduit plus rien du fil.
4. **La page du fil ne compte plus les travaux** : `loadProjectCore` ne fait plus l'agrégat sur
   `agent_jobs` ; `getProjectPageAction` (pour `/files`) le fait dans son `Promise.all`.
   `ProjectThreadPageView.project` est `ProjectSummary` (sans `jobsCount`/`lastActivityAt`).

## Questions, par priorité

1. **`blocked` et `thread === null`** : un projet neuf sans ROOT montre « Nothing said here yet »
   puis le message bloqué — deux lignes qui disent chacune une absence. Faut-il n'en garder
   qu'une ? Et le lien vers Settings : le message est du texte ; faut-il un lien `/settings` ?
   (Vérifier que la route existe et qu'on y désigne le ROOT.)
2. **`ProjectSummary` = `Omit<…>`** : `ProjectShelf` reçoit `ProjectPageView['project']` (avec
   activité) sur `/files` — inchangé ; `WorkHeader` sur le fil ne lit que `name`/`path`. Un
   composant partagé attendait-il l'activité sur la page du fil ?
3. **Le premier envoi depuis un fil Telegram** : après `createProjectConversationAction` puis
   `sendChatMessageAction` puis `router.refresh()`, `projectLanding` choisit la conversation
   propre : la page montre le message et la réponse. Le fil Telegram lu disparaît de la page (il
   reste sur `/files`) ; la note l'avait dit. Reste-t-il une course (la réponse du runner est
   synchrone dans l'action d'envoi, donc non) ?
4. **Tests** : `project-landing.test.ts` (5 + 7 cas), `ProjectThread.test.tsx` (5 cas dont
   `blocked`). Toujours aucun test de la page serveur ni de « le chargeur du fil ne lit pas le
   dossier » (par construction : `getProjectThreadPageAction` n'appelle que `loadProjectCore`, qui
   n'importe ni `readProjectFolder` ni `verification_runs` — mais rien ne l'empêche demain). Un
   test d'architecture (le scanner de `@nodal-agents/test-kit`) pourrait-il l'exiger ? Dire si ça
   vaut le coût.
5. Un point resté ouvert des passes 60-61 que ce commit ne couvre pas ?

## Hors périmètre

Le rendu au pixel ; l'onglet Code.

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF ferme ce point.
