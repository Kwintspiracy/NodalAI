# Demande de review — PR #46, passe 58 (P2bis session 2 : correctif de la passe 57)

Périmètre : **le dernier commit de code** de la branche (« fix(feed): passe Codex 57 — … »), qui
traite le constat bloquant de `docs/validation/rapport-review-pr46-passe57.md` (le dédoublonnage
par suffixe fusionnait `index.ts` et `a/index.ts`). Diff à lire : `git diff <hash>^ <hash> --
apps/web` — le hash est donné dans la consigne. L'arbre de travail est propre (hors docs).

## Ce que le commit affirme

1. **Plus de suffixe nulle part.** `isSameFile` est supprimée. Le récapitulatif compte les
   fichiers sur leur chemin CANONIQUE : `canonicalChangePath(path, workspaceRoots)` — la règle de
   la page Code depuis août (barres obliques, racine connue retirée, insensible à la casse sur
   Windows), SORTIE d'`actions.ts` dans `coding-changes.ts` (pur, testé) et importée par la page
   Code comme par le fil. Égalité stricte ensuite : `index.ts` et `<racine>/a/index.ts` font deux
   fichiers.
2. **Les racines** : `workspace-roots.ts` (neuf) — `entityWorkspaceRoots(db, entityId)` sortie
   d'`actions.ts`, qui ajoute désormais le **dossier partagé** de l'entité
   (`sharedWorkspacePath` = `<NODALAI_WORKSPACES_ROOT | ~/.nodalai/workspaces>/<entité>/shared`,
   le calcul du runner, `apps/runner/src/lib/workspaces-root.ts`), que le runner injecte à chaque
   job sans le ranger en base. Sans lui, le chemin résolu présenté par `file_write` ne se ramenait
   jamais au relatif — vu en vrai : « Files 2 » pour un seul `notes/bonjour.html`, « 1 » après.
   `getSettingsAction` emploie le même calcul (une copie de moins). `ThreadJob.workspaceRoots`
   porte les racines jusqu'au module pur.
3. **`findLineCounts` sans suffixe** : `counts` et `path` viennent du MÊME appel ; un appel qui
   n'a écrit qu'un fichier n'a qu'un compteur, et tout chemin de sa carte le désigne ; un appel à
   plusieurs fichiers (`cli:file_change`) présente les mêmes chemins que ses compteurs, donc
   égalité ; sinon `null`.
4. Tests : `canonicalChangePath` (racine Windows insensible à la casse, POSIX, relatif, hors
   racine, `index.ts` ≠ `a/index.ts`), `entityWorkspaceRoots` (dossier partagé ajouté, plus
   longues d'abord, sans doublon, entité sans dossier d'agent), récapitulatif (`index.ts` +
   `/root/a/index.ts` → 2 ; absolu + relatif du même fichier → 1). Éprouvés par mutation en local
   (racine non retirée → rouge ; premier compteur venu → rouge).

## Questions, par priorité

1. **La page Code change-t-elle de comptage ?** `entityWorkspaceRoots` inclut maintenant le
   dossier partagé : un fichier écrit par un outil Nodal dans `shared/` et présenté en absolu se
   canonicalise désormais en relatif sur la page Code aussi. Un groupe de la liste des sessions ou
   du panneau Changes peut-il se scinder ou fusionner autrement qu'avant, et est-ce juste ?
2. **`sharedWorkspacePath` et le runner** : le runner lit `NODALAI_WORKSPACES_ROOT` au moment du
   job ; le web au moment de la lecture. Un déploiement où les deux processus n'ont pas le même
   environnement (LAN, pack) casserait le recollage silencieusement — comment le dire ?
3. **`findLineCounts` à un seul compteur** : un appel `cli:file_change` avec UN changement dont
   la carte présente un chemin différent de la clé (résolution CLI) — le compteur se colle par la
   règle « un seul » : correct par construction ? Un appel à un compteur peut-il présenter DEUX
   fichiers dans sa carte (un seul écrit, un autre listé) ? Alors le listé n'a pas de compteur
   (`action === 'listed'` n'appelle pas `findLineCounts`) — vérifier.
4. **`canonicalChangePath` insensible à la casse seulement sur Windows** : une racine POSIX avec
   une casse différente du chemin présenté (macOS, système insensible) reste non retirée : deux
   fichiers pour un. Atteignable avec les présentateurs du dépôt ?
5. Un point resté ouvert de la passe 57 que ce commit ne couvre pas ? (Le point non bloquant du
   composer — hauteur après envoi mesurée avant réconciliation — est traité : `fitToContent` est
   appelé sur la zone vidée dans le même geste ; dire si c'est suffisant.)

## Hors périmètre

Le rendu au pixel face au Figma ; l'onglet Code au-delà de la question 1.

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF clôt la session 2 de P2bis.
