## Réponses aux questions

### 1. `isSameFile` et dédoublonnage

Le postulat « les présentateurs ne produisent jamais la base seule » est faux.

- [`file-edit.ts:35`](D:/APPS/NodalAI/packages/tools/src/builtin/file-ops/file-edit.ts:35) accepte tout chemin relatif non vide, donc `index.ts`.
- [`file-edit.ts:69`](D:/APPS/NodalAI/packages/tools/src/builtin/file-ops/file-edit.ts:69) présente directement `input.path`.
- [`file-write.ts:65`](D:/APPS/NodalAI/packages/tools/src/builtin/file-ops/file-write.ts:65) présente au contraire `output.path`, chemin résolu.
- [`coding-changes.ts:229`](D:/APPS/NodalAI/apps/web/src/lib/coding-changes.ts:229) considère identiques deux chemins dès que l’un est un suffixe segmenté de l’autre.
- [`conversation-thread.ts:143`](D:/APPS/NodalAI/apps/web/src/lib/conversation-thread.ts:143) emploie cette relation pour dédupliquer tout l’audit.

Cas atteignable : `file_edit({path: "index.ts"})` modifie le fichier à la racine, tandis qu’un autre appel écrit `a/index.ts`. Les cartes peuvent alors porter `index.ts` et un chemin résolu finissant par `/a/index.ts`. Ce sont deux fichiers différents, mais `isSameFile` les fusionne et « Files » affiche 1 au lieu de 2.

Le test ajouté à [`conversation-thread.test.ts:184`](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-thread.test.ts:184) ne couvre que deux orthographes réellement équivalentes.

### 2. Exhaustivité de `rowsByRoot`

La requête `tool_calls` n’a pas de limite de lignes :

- [`conversation-actions.ts:425`](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:425) sélectionne tous les appels appartenant à `relevantIds`;
- [`conversation-actions.ts:438`](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:438)–[`443`](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:443) ne contient aucun `.limit()`.

Il existe toutefois un plafond explicite dans la collecte :

- [`job-feed.ts:75`](D:/APPS/NodalAI/apps/web/src/lib/job-feed.ts:75) s’arrête à `ROLLUP_MAX_DEPTH`;
- cette constante vaut 8 dans [`coding-rollup.ts:22`](D:/APPS/NodalAI/apps/web/src/lib/coding-rollup.ts:22).

Ce plafond ne rend pas le total partiel dans le fonctionnement autorisé actuel : l’invariant du runtime borne la délégation à trois niveaux. Il laisse même une marge jusqu’à huit. La formulation « toute profondeur » est donc techniquement inexacte, mais je ne constate pas de rupture atteignable tant que la garde de profondeur reste ≤ 8.

### 3. `callHappened('unknown')`

Une ligne en cours d’exécution n’est pas enregistrée avec `tool_output = null`.

- Pour les outils Nodal, [`execute.ts:954`](D:/APPS/NodalAI/packages/tools/src/execute.ts:954) reçoit obligatoirement une sortie `string`, puis l’insère à [`execute.ts:1004`](D:/APPS/NodalAI/packages/tools/src/execute.ts:1004), après l’exécution.
- Pour les outils CLI live, la ligne n’est créée qu’à réception de l’événement résultat; [`live-events.ts:163`](D:/APPS/NodalAI/packages/tools/src/builtin/code-task/live-events.ts:163) remplace même une sortie absente par `''`.

`unknown` correspond donc aux données anciennes ou aux lignes construites hors de ces chemins actuels, pas à une écriture momentanément en cours. Compter `unknown` préserve les anciennes écritures dont l’issue n’était pas enveloppée. Je ne recommande pas de l’exclure sur le motif proposé.

### 4. Divergence entre cartes et récapitulatif

La divergence est réelle et intentionnelle :

- le fil calcule les compteurs de chaque étape à [`conversation-feed.ts:708`](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:708);
- le récapitulatif agrège toutes les lignes de la racine et de ses descendants à [`conversation-thread.ts:146`](D:/APPS/NodalAI/apps/web/src/lib/conversation-thread.ts:146).

L’écran appelle ce bloc « Delivery summary » et la métrique « Lines » dans [`DeliveryBlock.tsx:43`](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/DeliveryBlock.tsx:43)–[`47`](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/DeliveryBlock.tsx:47). Dans ce contexte, le total du travail entier est cohérent. Les cartes ne sont pas présentées comme les termes exhaustifs de cette somme, notamment parce que les petits-enfants ne sont pas tous affichés. Je ne retiens pas de défaut fonctionnel.

### 5. Composer

Le premier rendu ne pose pas de problème aujourd’hui : [`ThreadComposer.tsx:48`](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:48) initialise toujours le message à `''` et aucune prop de brouillon n’existe. Si un brouillon initial était ajouté plus tard, il faudrait appeler `fitToContent` après montage ou changement de valeur.

L’alignement demandé est correct : [`ThreadComposer.tsx:87`](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:87) emploie `items-end`, donc le bouton reste aligné sur le bas de la zone, c’est-à-dire sa dernière ligne.

Point distinct : après un envoi réussi, [`ThreadComposer.tsx:74`](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:74) appelle `setMessage('')`, puis mesure immédiatement l’ancien DOM à la ligne 75. React n’a pas nécessairement réconcilié la valeur avant cette mesure. Une zone devenue haute peut donc rester haute après avoir été vidée, jusqu’à la saisie suivante. Le test vérifie la valeur vide, mais pas la hauteur. Défaut visuel neuf, non classé bloquant.

### 6. Résistance des tests aux mutations

Tests : **NON EXÉCUTÉS**.

Par inspection uniquement :

- Mutation `callHappened() => true` : les assertions de [`conversation-feed.test.ts:844`](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-feed.test.ts:844)–[`851`](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-feed.test.ts:851) exigent des compteurs vides pour attente, blocage et erreur. [`conversation-thread.test.ts:235`](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-thread.test.ts:235) exige également zéro fichier et aucune ligne.
- Mutation `ThreadJob.audit => []` : [`conversation-thread.test.ts:215`](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-thread.test.ts:215)–[`232`](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-thread.test.ts:232) construit un fil vide et exige deux fichiers et `{added: 4, removed: 0}` provenant uniquement de l’audit.
- Mutation « premier candidat » dans `findLineCounts` : [`coding-changes.test.ts:160`](D:/APPS/NodalAI/apps/web/src/lib/__tests__/coding-changes.test.ts:160)–[`169`](D:/APPS/NodalAI/apps/web/src/lib/__tests__/coding-changes.test.ts:169) exige explicitement `null` pour `index.ts` face à deux candidats.

Ces assertions ciblent bien les trois mutations annoncées. Leur résultat effectif reste **NON EXÉCUTÉ**.

### 7. Point ouvert de la passe 56

Les quatre blocages de la passe 56 ont bien reçu une correction :

- ambiguïté de `findLineCounts`;
- total issu de l’audit descendant;
- absence de ligne d’audit exclue des compteurs;
- retour au `textarea` multiligne.

Le point nouveau sur le dédoublonnage par suffixe n’était pas un point ouvert : il est introduit par la généralisation d’`isSameFile` au total de fichiers dans ce commit.

## Constats bloquants neufs

1. [`coding-changes.ts:229`](D:/APPS/NodalAI/apps/web/src/lib/coding-changes.ts:229)–[`235`](D:/APPS/NodalAI/apps/web/src/lib/coding-changes.ts:235) fusionne des fichiers distincts lorsqu’une carte présente un basename comme `index.ts` et une autre un chemin finissant par `/a/index.ts`. Ce cas est atteignable parce que `file_edit` présente directement son chemin relatif. Le récapitulatif sous-compte alors les fichiers livrés.

## Ce que je n'ai pas pu vérifier

- Vitest : **NON EXÉCUTÉ**.
- Typecheck, lint, build et `pnpm deps:check` : **NON EXÉCUTÉS**.
- Hauteur réelle du composeur après envoi et alignement visuel dans un navigateur : **NON EXÉCUTÉS**.
- Rendu au pixel face au Figma et onglet Code : hors périmètre demandé.