# Demande de review — PR #46, passe 60 (la page d'un projet est sa conversation)

Périmètre : **le dernier commit de code** de la branche (« feat(spaces): ouvrir un projet, c'est
atterrir dans sa conversation »). Diff : `git diff <hash>^ <hash> -- apps/web` — le hash est donné
dans la consigne. L'arbre de travail est propre (hors docs).

## Ce que le commit affirme

1. **`/spaces/[id]`** est le fil de LA conversation du projet, saisie collée en bas, barre d'état
   dessous — la même page que `/chat/[id]`. Plus d'étagère, de table de conversations ni de
   bouton « New conversation » au-dessus du fil.
2. **`/spaces/[id]/files`** (route neuve, page serveur) porte ce qui était au-dessus : le dossier
   (chemin, copie), les fichiers, la preuve (`ProjectShelf`), les conversations qui portent un
   travail du projet (`ProjectConversations`) et « New conversation ». Le bouton « Files » de
   `WorkHeader` y mène (prop `filesHref` à la place de `projectId`), depuis la page du projet comme
   depuis un fil de chat ancré.
3. **`lib/project-landing.ts`** (pur, testé) choisit le fil : la conversation ouverte depuis la
   page du projet (`origin = 'project'`) si elle existe, sinon la plus récente des conversations
   qui portent un travail du projet, quel que soit son canal (on la lit). La saisie ne prolonge
   que ce à quoi le web sait répondre (`channel === 'dashboard'`, la règle de `canReply` dans
   `conversation-actions.ts`) ; sinon `composerConversationId = null` et le premier envoi crée la
   conversation du projet (`ProjectComposer.onBeforeSend`, inchangé).
4. **`ThreadComposer`** : la zone de texte est `block` (en ligne, elle laissait 5 px de descente
   dans son conteneur, le bouton se calait dessus), le bouton est centré dans une boîte de 36 px
   alignée en bas. Mesuré dans le navigateur : centres à 849 px des deux côtés.

## Questions, par priorité

1. **La conversation choisie peut être celle d'un AUTRE agent** : la plus récente qui porte un
   travail du projet peut venir de Telegram avec un autre agent que celui du projet. On la lit ;
   la saisie crée alors la conversation du projet (avec l'agent du projet). Le fil lu et la saisie
   ne parlent donc pas au même agent : est-ce dit à l'écran (placeholder « Reply to <agent du
   projet> » sous un fil d'un autre agent) ? Que faudrait-il montrer ?
2. **Après le premier envoi** sur un projet dont le fil lu était une conversation Telegram : la
   page relit et `projectLanding` choisit désormais la conversation propre (origin project) — le
   fil Telegram qu'on lisait DISPARAÎT de la page (il reste sur `/files`). Surprenant ? Faut-il
   préférer « la plus récente » tout court, ou garder la propre en priorité ?
3. **`getProjectPageAction`** lit toujours fichiers et preuve pour la page du projet, qui ne les
   affiche plus : coût inutile à chaque ouverture (lecture du dossier). Le dire, ou scinder
   l'action (une pour le fil, une pour les fichiers) ?
4. **Liens entrants** : quelque chose pointait-il vers l'ancienne organisation (un lien « Open in
   Chat » supprimé, un `/spaces/<id>` attendu comme page de fichiers depuis Code ou Scheduled) ?
   `WorkHeader` sur `/scheduled/[id]` n'a pas de `filesHref` : un run sans projet, normal.
5. **Tests** : `project-landing.test.ts` (5 cas), `WorkHeader.test` (lien `/files`),
   `ProjectThread.test` (inchangé), `ThreadComposer.test` (inchangé). Aucun test de la page
   serveur `/spaces/[id]` ni de `/files` : lesquels manqueraient le plus ?
6. Un point resté ouvert des passes 56 à 59 que ce commit ne couvre pas ?

## Hors périmètre

Le rendu au pixel face au Figma ; l'onglet Code.

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF ferme ce point.
