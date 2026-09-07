# Demande de review — PR #46, passe 56 (P2bis session 2 : le fil sur le design Figma)

Périmètre : **les commits depuis `d9f1edda`** (fin de la session 1 de P2bis, passe 55 : « aucun
constat neuf »). Diff à lire : `git diff d9f1edda..HEAD -- apps/web packages/shared`. L'arbre de
travail est propre (hors docs).

## Ce que la session affirme

Le fil de conversation (`/chat/[id]`, `/spaces/[id]`, `/scheduled/[id]`) est redessiné d'après le
frame Figma « Main Content » de Quentin, **avec les tokens du design system existant** (aucune
taille en pixels hors hauteurs de lignes, aucune couleur littérale, échelle typo `text-*`).
Interface en anglais.

1. **`apps/web/src/lib/coding-changes.ts` (neuf, pur, testé)** : `extractFilePath`,
   `isRefusedToolCall`, `extractChange` sont SORTIS de `actions.ts` (qui les importe désormais) ;
   `lineCountsOfCall(toolName, input, output)` rend `{ [path]: { added, removed } }` — le churn
   que la page Code affiche depuis août (lignes du nouveau texte / de l'ancien), `{}` sur un
   appel refusé ou un outil sans texte (classeur) ; `cli:file_change` compte tous ses fichiers ;
   `findLineCounts` recolle les deux orthographes d'un même fichier (relatif ↔ absolu, par
   suffixe sur frontière de segment) ; `sumLineCounts` totalise.
2. **`conversation-feed.ts`** : chaque étape d'outil porte `lineCounts` (lu par
   `lineCountsOfCall`). **`conversation-thread.ts`** : `deliverySummary(job)` = fichiers écrits
   (jamais `listed`), lignes sommées sur TOUTES les étapes d'outil du job et de ses délégués
   (un niveau), tests = lignes de preuve du job de tête (`proof`), revues = délégués + verdicts
   `checks` du job lui-même, durée, coût, verdict. `conversation-actions.ts` range les
   `verification_runs` sous le job de tête par `rootOf`.
3. **Écran** : `WorkHeader` (nom, chemin, pile d'avatars dédoublonnée par slug, « Verified » /
   « Checks failed » seulement avec preuve, bouton « Files » seulement avec projet) dans la barre
   de `PageShell` (prop `header`) ; `ThinkingBlock` (raisonnement replié : « N steps · durée ·
   jetons · coût ») ; `ToolBlock` (nom, extrait de l'entrée, durée ; puis ligne de résultat) ;
   `FilesCard` « diff review » avec `−a +b` par fichier et total (`LineDelta`, zéro tu) ;
   `DelegationDisclosure` (libellé vert, cadre `border-ok/25`, pastille d'état) ;
   `DeliveryBlock` (stats Files / Lines / Tests / Duration / Cost — une stat absente n'est pas
   rendue ; Reviews ; Checks) ; `QuestionCard` bordure `run` ; `ThreadComposer` sur une ligne,
   Entrée envoie. `StepsGroup` et `ProducedCard` supprimés.
4. **Ce que le design montre et que l'écran ne montre PAS, faute de source** : couverture,
   « Prêt à fusionner », bouton « L'application », bouton « Open » par fichier, coloration
   syntaxique, `effort`.

## Questions, par priorité

1. **`findLineCounts` par suffixe** : deux fichiers homonymes dans deux dossiers d'un même appel
   (`a/index.ts`, `b/index.ts`) ou une carte qui nomme `index.ts` seul — un compteur peut-il se
   coller au mauvais fichier ? Le premier trouvé gagne : est-ce déterministe et juste ?
2. **`deliverySummary` : lignes des délégués dans le récapitulatif du job de tête** — une écriture
   faite par un délégué (fil enfant, un niveau) compte dans « Lines » du parent, mais un
   petit-enfant (non assemblé, `CHILD_FEED_DEPTH = 1`) ne compte pas. Le total peut donc être
   partiel sans le dire. Faut-il l'assumer (dire « partial ») ou ne compter que le job de tête ?
3. **`lineCountsOfCall` sur une étape sans ligne d'audit** (`row` absent : `return_result`,
   `assign_*`, lignes d'avant 0092) : `toolOutput` undefined → jamais « refusé » → une écriture
   refusée dont la ligne manque compterait. Est-ce atteignable ?
4. **`proofByRoot` / `rootOf`** : une `verification_run` d'un délégué remonte au job de tête —
   vérifier que `rootOf` couvre les délégués de TOUS les jobs de tête du fil, pas seulement du
   dernier, et qu'un run d'un job hors fil est bien ignoré.
5. **`FileDiff` / `FilesCard`** : « diff review » s'affiche dès qu'un fichier est écrit, même sans
   compteur (classeur) — un `xlsx_create` sous « diff review » sans diff textuel : incohérence ou
   acceptable ?
6. **`ThreadComposer`** : un champ d'une ligne (`TextInput`) remplace le `textarea` : un collage
   multi-ligne perd ses retours ? Une régression d'usage à signaler.
7. **`PageShell` prop `header` / `DisclosureButton` chevron** : les autres pages qui les
   utilisent (`/skills`, `/agents`, `/code`…) gardent-elles leur rendu ? Le changement de chevron
   est global.
8. **Tests** : lesquels passeraient encore si l'on cassait `lineCountsOfCall` (retour `{}`),
   `findLineCounts` (retour `null`), `sumLineCounts` (retour zéro) ? Le test doit rougir.
9. Un point resté ouvert des passes précédentes que ces commits ne couvrent pas ?

## Hors périmètre

Le rendu au pixel face au Figma (vérifié par captures Playwright, clair et sombre, sur quatre
conversations réelles) ; l'onglet Code.

## Ce qui n'est PAS attendu

Le style, le nommage. « Ça a l'air bien » ne vaut pas verdict : un constat tient, ou il est faux.
