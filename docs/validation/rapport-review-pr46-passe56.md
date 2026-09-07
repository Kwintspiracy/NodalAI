# Rapport de review — PR #46, passe 56

Périmètre relu : `git diff d9f1edda..HEAD -- apps/web packages/shared`.

## 1. `findLineCounts` par suffixe

Constat confirmé.

[apps/web/src/lib/coding-changes.ts:208](D:/APPS/NodalAI/apps/web/src/lib/coding-changes.ts:208) renvoie immédiatement la première entrée satisfaisant la comparaison par suffixe, lignes 215–218.

Avec :

```ts
{
  "a/index.ts": { added: 2, removed: 0 },
  "b/index.ts": { added: 9, removed: 1 }
}
```

et une carte nommant seulement `index.ts`, les deux entrées correspondent. La première dans l’ordre d’insertion de l’objet gagne. L’ordre est déterministe pour un objet donné, mais le résultat n’est pas juste : aucune information ne permet de choisir le bon fichier.

Le test [coding-changes.test.ts:162](D:/APPS/NodalAI/apps/web/src/lib/__tests__/coding-changes.test.ts:162) couvre deux chemins distincts complets, pas l’ambiguïté d’un basename commun.

Ce qui casse : [ConversationFeedView.tsx:502](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:502) peut afficher sur `index.ts` le compteur d’un autre fichier.

Correction attendue : ne renvoyer un résultat suffixe que s’il est unique ; sinon `null`.

## 2. Lignes des délégués dans `deliverySummary`

Constat confirmé, avec une seconde borne non annoncée.

[conversation-thread.ts:141](D:/APPS/NodalAI/apps/web/src/lib/conversation-thread.ts:141) ne compte les lignes d’un enfant que lorsque `item.job.feed` existe, lignes 167–175. Or :

- [job-feed.ts:123](D:/APPS/NodalAI/apps/web/src/lib/job-feed.ts:123) fixe `CHILD_FEED_DEPTH = 1` ;
- [job-feed.ts:240](D:/APPS/NodalAI/apps/web/src/lib/job-feed.ts:240) n’ouvre que les 20 délégations les plus récentes avec `CHILD_FEEDS_MAX`.

Le total exclut donc :

- tous les petits-enfants ;
- les enfants directs au-delà des 20 fils ouverts.

En revanche, les preuves remontent depuis toute la descendance collectée par [job-feed.ts:63](D:/APPS/NodalAI/apps/web/src/lib/job-feed.ts:63). Une même livraison peut ainsi afficher toutes ses preuves mais seulement une partie de ses lignes.

Ce qui casse : « Lines » est présenté comme un total sans indication de troncature.

Il faut soit agréger les compteurs depuis les lignes d’audit de tous les `relevantIds`, soit limiter clairement la métrique au job de tête. Un simple libellé « partial » nécessiterait aussi une donnée permettant de savoir qu’une partie manque.

## 3. Écriture sans ligne d’audit

Constat confirmé et atteignable.

[conversation-feed.ts:685](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:685) accepte l’absence de `row`. Dans ce cas :

- `row?.toolOutput` vaut `undefined` ;
- `outcomeOfToolOutput` rend `unknown` ;
- `wrote` vaut `true`, lignes 689–697 ;
- [conversation-feed.ts:709](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:709) compte alors le contenu de l’entrée.

Ce cas n’est pas seulement historique. [_writeToolCall](D:/APPS/NodalAI/packages/tools/src/execute.ts:972) intercepte une erreur d’insertion de la ligne d’audit et se limite à `console.warn`, tandis que l’appel d’outil reste présent dans le transcript. Pour une demande d’approbation, le résultat `awaiting_approval` est écrit via cette même fonction après création de la demande. Si cette insertion échoue, le fil voit un appel sans ligne et le compte comme exécuté.

Ce qui casse : une écriture en attente ou refusée peut contribuer à « Lines » alors qu’elle n’a jamais eu lieu.

Les appels non écrivants comme `return_result` ou `assign_*` restent sans effet parce que `extractChange` renvoie `null`; ils ne compensent pas le cas des outils d’écriture.

## 4. `proofByRoot` / `rootOf`

Le constat soupçonné est faux : le routage couvre correctement toutes les têtes chargées et leurs descendants.

- [conversation-actions.ts:405](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:405) construit `headIds` depuis tous les jobs de tête retenus.
- [conversation-actions.ts:406](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:406) collecte leur descendance à toute profondeur.
- [conversation-actions.ts:410](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:410) initialise chaque tête comme sa propre racine puis affecte chaque descendant à son `rootId`.
- La requête des preuves est bornée à `entityId` et `relevantIds` aux lignes 510–515.
- [conversation-actions.ts:594](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:594) ignore encore toute ligne sans racine connue.

Un run appartenant à un job hors fil est donc exclu par la requête, puis défensivement ignoré par le regroupement.

Limite de couverture : je n’ai trouvé aucun test ciblé prouvant plusieurs racines, une preuve de petit-enfant et une preuve hors fil dans le même scénario.

## 5. `FileDiff` / `FilesCard` pour un classeur

Le comportement décrit existe, mais je ne le retiens pas comme rupture fonctionnelle.

[ConversationFeedView.tsx:501](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:501) choisit « diff review » dès qu’une entrée n’est pas `listed`, indépendamment de la présence de compteurs. [ConversationFeedView.tsx:519](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:519) masque correctement le delta lorsque celui-ci vaut `null`.

Un classeur écrit apparaît donc sous « diff review » sans diff textuel. C’est sémantiquement imprécis, mais la carte peut encore fournir l’aperçu tabulaire et son statut de vérification aux lignes 457–480. « diff review » fonctionne ici comme catégorie des productions écrites, pas comme promesse qu’un diff ligne à ligne existe.

## 6. `ThreadComposer` mono-ligne

Régression confirmée.

[ThreadComposer.tsx:18](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:18) remplace `TextArea` par `TextInput`. Ce dernier rend un véritable `<input>` dans [TextInput.tsx:39](D:/APPS/NodalAI/apps/web/src/components/ui/TextInput.tsx:39), dont la valeur ne peut conserver les retours à la ligne.

Par conséquent :

- un texte multi-ligne collé est aplati ;
- `Shift+Entrée` n’offre pas de nouvelle ligne, malgré la condition de [ThreadComposer.tsx:78](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:78) ;
- il devient impossible de rédiger un message structuré ou un bloc de code dans le composeur.

Ce qui casse : une capacité existante du chat disparaît sans solution de remplacement. La géométrie mono-ligne peut être conservée visuellement avec un `textarea` auto-extensible.

Aucun test de `ThreadComposer` n’a été trouvé.

## 7. `PageShell` et chevron global

Pas de régression fonctionnelle démontrée par lecture.

[PageShell.tsx:56](D:/APPS/NodalAI/apps/web/src/components/ui/PageShell.tsx:56) conserve le chemin historique `title`/`subtitle` lorsqu’aucun `header` personnalisé n’est fourni. Les autres pages qui utilisent encore `title` suivent donc le même rendu de `PageHeader`.

Le changement de `DisclosureButton` est bien global :

- ancien chevron texte `▾`/`▸` remplacé par `CaretDown`/`CaretRight` ;
- largeur réservée passée de `w-3` à `w-3.5` ;
- position initiale conservée par défaut grâce à `chevron = 'start'`.

Voir [DisclosureButton.tsx:34](D:/APPS/NodalAI/apps/web/src/components/ui/DisclosureButton.tsx:34). Cela peut produire une variation visuelle mineure dans `/code`, `/agents`, les historiques, les projets et les écrans de configuration, mais les rôles, clics et `aria-expanded` restent identiques.

Aucun test ciblé de non-régression pour `PageShell`, `PageHeader` ou `DisclosureButton` n’a été trouvé.

## 8. Résistance des tests aux trois mutations

Tests : **NON EXÉCUTÉS**. Leur lancement a été refusé avant démarrage par le sandbox en lecture seule.

Par inspection des assertions :

- Si `lineCountsOfCall` renvoie toujours `{}`, le test direct rougirait à [coding-changes.test.ts:99](D:/APPS/NodalAI/apps/web/src/lib/__tests__/coding-changes.test.ts:99) et [coding-changes.test.ts:129](D:/APPS/NodalAI/apps/web/src/lib/__tests__/coding-changes.test.ts:129). Les assertions de rendu `+2`, `+3`, `+5` rougiraient aussi dans [ConversationFeedView.test.tsx:378](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/__tests__/ConversationFeedView.test.tsx:378). Le résumé attendu à [DeliveryBlock.test.tsx:237](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/__tests__/DeliveryBlock.test.tsx:237) passerait de `10/2` à `8/2` et rougirait.

- Si `findLineCounts` renvoie toujours `null`, les tests directs rougiraient à [coding-changes.test.ts:153](D:/APPS/NodalAI/apps/web/src/lib/__tests__/coding-changes.test.ts:153) et ligne 159. Les trois assertions de rendu de `ConversationFeedView` rougiraient également.

- Si `sumLineCounts` renvoie toujours zéro, le test direct rougirait à [coding-changes.test.ts:186](D:/APPS/NodalAI/apps/web/src/lib/__tests__/coding-changes.test.ts:186), et le résumé attendu à [DeliveryBlock.test.tsx:237](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/__tests__/DeliveryBlock.test.tsx:237) deviendrait `null`.

Les trois fonctions disposent donc chacune d’au moins une assertion directe sur leur résultat réel. Cela ne couvre toutefois ni l’ambiguïté de `findLineCounts`, ni les compteurs partiels causés par `CHILD_FEEDS_MAX`/`CHILD_FEED_DEPTH`, ni l’absence d’une ligne d’audit.

## 9. Point ouvert des passes précédentes

Je n’en ai pas trouvé. Le rapport de la passe 55 conclut explicitement qu’aucun point bloquant antérieur ne restait ouvert, et les commits présents commencent après son commit de référence `d9f1edda`.

## Constats bloquants neufs

1. `findLineCounts` attribue arbitrairement le premier compteur lorsqu’un chemin court correspond à plusieurs fichiers homonymes.

2. « Lines » est un total partiel non signalé : il exclut les petits-enfants et les enfants au-delà des 20 fils ouverts.

3. Une écriture sans ligne d’audit est considérée comme réussie ; c’est atteignable lorsque l’insertion de `tool_calls` échoue, y compris pour une demande restée en attente d’approbation.

4. Le composeur mono-ligne détruit les retours à la ligne collés et supprime la saisie de messages structurés.

## Ce que je n'ai pas pu vérifier

- Vitest : **NON EXÉCUTÉ**, commande refusée par le sandbox avant lancement.
- Typecheck, lint et build : **NON EXÉCUTÉS**.
- Comportement réel du collage multi-ligne dans chacun des navigateurs pris en charge : non testé en navigateur ; la perte de structure découle statiquement de l’emploi d’un `<input>`.
- Rendu visuel des chevrons sur les autres pages : non testé par capture.
- Rendu au pixel face au Figma et onglet Code, explicitement hors périmètre.