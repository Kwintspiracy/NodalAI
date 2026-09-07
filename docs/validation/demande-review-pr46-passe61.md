# Demande de review — PR #46, passe 61 (correctifs de la passe 60)

Périmètre : **le commit `e02a3b73`** (« fix(spaces): passe Codex 60 — la saisie nomme son vrai
destinataire, le fil ne lit plus le dossier »). Diff : `git diff e02a3b73^ e02a3b73 -- apps/web`.

## Ce que le commit affirme

1. **Le destinataire de la saisie est décidé par la page** (`spaces/[id]/page.tsx`) : quand elle
   prolonge le fil affiché, l'agent de ce fil ; quand elle va CRÉER la conversation du projet, le
   ROOT de l'entité — lu par `loadProjectCore` à la même source que
   `createProjectConversationAction` (`entities.rootAgentId`). `ProjectThread` ne déduit plus rien
   du fil ; il reçoit `agentName`, `placeholder` (« Write to X… » quand la saisie crée) et `note`,
   dite AVANT l'envoi au-dessus du champ : « You're reading a conversation via Telegram with A.
   Writing here starts this project's own conversation[ with B], shown here instead. » (le nom du
   destinataire ne se répète que s'il change). `ThreadComposer` et `ProjectComposer` acceptent
   `placeholder`. Vérifié dans le navigateur sur les trois projets de la base dev.
2. **Le chargeur est scindé** : `loadProjectCore(db, entityId, id)` (projet, compte de travaux,
   conversations, conversation propre, ROOT — un `Promise.all`) ; `getProjectThreadPageAction`
   (neuve, pour `/spaces/[id]`) rend le cœur seul ; `getProjectPageAction` (pour `/files`) rend le
   cœur plus le dossier lu et les trois dernières séquences de preuve. La page du fil ne lit plus
   `readProjectFolder` ni `verification_runs`.
3. Le commentaire périmé de `ScheduledSection.test.tsx` est corrigé.

## Questions, par priorité

1. **`rootAgent` par `innerJoin` sur `entities.rootAgentId`** : une entité SANS root (colonne
   nulle) rend `rootRows` vide → `rootAgent: null` → placeholder « Write… » et note sans nom. Puis
   le premier envoi échoue avec `no_root_agent` (« Designate a ROOT agent in Settings first »).
   Faut-il le dire avant l'envoi (une note « No ROOT agent: designate one in Settings ») plutôt
   qu'un placeholder muet ?
2. **`loadProjectCore` refait les mêmes requêtes pour les deux pages** ; aucun cache. Est-ce
   acceptable ? Un `Promise.all` de quatre requêtes plus la lecture du projet — cinq allers-retours
   — pour ouvrir un fil : y a-t-il une requête de trop pour la page du fil (le compte de travaux
   `jobsCount`/`lastActivityAt` ne sert qu'à `project`, que le fil affiche par le nom et le
   chemin) ?
3. **La note** est calculée à la page (serveur) et rendue par `ProjectThread` : après le premier
   envoi, `router.refresh()` relit la page, `projectLanding` choisit la conversation propre, la note
   disparaît et le fil change. Le composant `ProjectComposer` appelle `router.refresh()` lui-même
   APRÈS `createProjectConversationAction` puis `ThreadComposer` l'appelle encore après l'envoi :
   deux relectures ; la première montre-t-elle brièvement la conversation propre VIDE avant que le
   message n'y soit ? Est-ce un défaut visible ?
4. **Le test de `ProjectThread`** vérifie le placeholder et la note tels que passés ; aucun test ne
   vérifie que la PAGE calcule `recipient`/`note` correctement (page serveur, sans test). Le
   calcul est dans `page.tsx` : faut-il le sortir dans `project-landing.ts` (pur) pour le tester ?
   (Je pense que oui — dire si un cas manquerait.)
5. Un point resté ouvert de la passe 60 que ce commit ne couvre pas ?

## Hors périmètre

Le rendu au pixel ; l'onglet Code.

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF ferme ce point.
