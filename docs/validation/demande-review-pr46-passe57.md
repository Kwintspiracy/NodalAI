# Demande de review — PR #46, passe 57 (P2bis session 2 : correctifs de la passe 56)

Périmètre : **le dernier commit de code** de la branche (« fix(feed): passe Codex 56 — … »), qui
traite les quatre constats bloquants de `docs/validation/rapport-review-pr46-passe56.md`. Diff à
lire : `git diff HEAD~1 -- apps/web`. L'arbre de travail est propre (hors docs).

## Ce que le commit affirme

1. **`findLineCounts` (coding-changes.ts)** : un chemin court qui correspond à PLUSIEURS entrées
   de l'appel ne choisit pas — `null`. Test : `a/index.ts` + `b/index.ts` avec `index.ts` → null ;
   `b/index.ts` → sa valeur. `isSameFile(a, b)` est la règle nommée (barres obliques normalisées,
   suffixe sur frontière de segment), partagée avec le récapitulatif.
2. **Total complet (conversation-thread.ts, conversation-actions.ts)** : `ThreadJob.audit` porte
   les lignes `tool_calls` de la tête ET de toute sa descendance (`rowsByRoot`, déjà chargées pour
   la frontière chat/travail, toute profondeur, sans plafond de 20). `deliverySummary` compte
   fichiers (charge `files`, `action ≠ listed`, dédoublonnés par `isSameFile`) et lignes
   (`lineCountsOfCall` par ligne) depuis `audit`, plus jamais depuis le fil. Reviews et Checks
   continuent de venir du fil. Tests : audit seul, fil vide → files 2, lines {4,0} ; deux
   orthographes du même fichier → files 1.
3. **Rien sans ligne d'audit (conversation-feed.ts, tool-card-payload.ts)** :
   `callHappened(outcome)` = ni `error`, ni `blocked`, ni `awaiting_approval` ; une étape SANS
   ligne d'audit (`row === undefined`) n'a aucun compteur — dans le fil (`Step.lineCounts`) comme
   dans le récapitulatif (une ligne absente n'y est pas). Test : cinq appels, quatre lignes
   (attente, blocage, erreur, succès) + un sans ligne → seul le succès compte.
4. **Composer (ThreadComposer.tsx)** : `TextArea` (`bare`, `rows={1}`) qui grandit avec le texte
   jusqu'à 200 px puis défile ; Entrée envoie, Maj+Entrée fait un retour ; test jsdom : un collage
   multi-ligne arrive à l'action TEL QUEL (retours compris), Maj+Entrée n'envoie pas, vide n'envoie
   pas.

## Questions, par priorité

1. **`isSameFile` pour le dédoublonnage des fichiers** : `a/index.ts` écrit puis `b/index.ts` —
   aucun n'est suffixe de l'autre, deux fichiers : bon. Mais `index.ts` seul (une carte qui ne
   nomme que la base) puis `a/index.ts` → un seul fichier compté. Le cas est-il atteignable avec
   les présentateurs du dépôt (`file_write`, `file_edit`, `cli:*` → chemins complets ou relatifs
   au dossier, jamais la base seule) ?
2. **`rowsByRoot` comme source du récapitulatif** : les lignes sont bornées par `entityId` et
   `relevantIds` (têtes + `collectDescendants`, toute profondeur). Un plafond quelque part sur
   `collectDescendants` ou sur la requête `tool_calls` (limite de lignes) rendrait le total
   partiel à nouveau — en existe-t-il un ?
3. **`callHappened` + `unknown`** : une ligne SANS sortie (`toolOutput` null) compte (`unknown`).
   Quelles lignes réelles ont `tool_output` null aujourd'hui — un appel encore en cours ? Si oui,
   une écriture EN COURS compterait pendant quelques secondes : acceptable, ou faut-il exclure
   `unknown` ?
4. **Le fil et le récapitulatif peuvent diverger** : la carte « diff review » d'un tour montre les
   compteurs de SES appels (fil, un niveau), le récapitulatif ceux de toute la descendance. Un
   lecteur qui additionne les cartes n'obtient pas la stat « Lines ». Est-ce à dire à l'écran, ou
   est-ce le comportement attendu (le récapitulatif = le travail entier) ?
5. **Composer** : `fitToContent` lit `scrollHeight` — au premier rendu avec un brouillon non vide
   (aucun aujourd'hui : l'état part vide), la hauteur serait-elle fausse ? Et `items-end` sur le
   cadre : le bouton « Send » reste-t-il aligné sur la dernière ligne quand la zone grandit ?
6. **Tests** : lesquels rougissent si `callHappened` rend toujours `true`, si `ThreadJob.audit`
   est ignoré (`[]`), si `findLineCounts` rend le premier candidat ? (Chacun a été éprouvé par
   mutation en local : rouge.)
7. Un point resté ouvert de la passe 56 que ce commit ne couvre pas ?

## Hors périmètre

Le rendu au pixel face au Figma (captures Playwright) ; l'onglet Code ; les constats non
bloquants de la passe 56 acceptés tels quels (« diff review » comme catégorie des productions
écrites, chevron global, `proofByRoot` vérifié juste).

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF clôt la session 2 de P2bis.
