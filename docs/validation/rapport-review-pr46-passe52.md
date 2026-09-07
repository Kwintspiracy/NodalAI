J’ai relu l’état final après `4ba39b73` puis `b69a76be`. Aucun fichier modifié.

## Constat neuf bloquant — le Markdown contourne encore la garde

- Fichiers :
  - [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:390)
  - [ConversationFeedView.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:162)
  - [ConversationFeedView.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:220)
- Ligne déterminante : `conversation-feed.ts:411`.
- Ce qui casse : la garde compare le Markdown source normalisé, tandis que les deux textes sont affichés par le composant `Markdown`. Deux sources différentes peuvent donc produire exactement le même texte visible.

Scénario réel `response.text` + `dashboard_publish.text` :

```text
response.text = "Voici le bilan :\n**Tout est prêt.**"
dashboard_publish.text = "Tout est prêt."
```

Calcul de la garde :

```text
needle = "Tout est prêt."
said = ["Voici le bilan :", "**Tout est prêt.**"]
k = 1 → tail = "**Tout est prêt.**" ≠ "Tout est prêt."
```

La boucle s’arrête également immédiatement, car le `tail` brut est plus long que `needle`. Un item `answer` est donc ajouté.

À l’écran, le Markdown de la prose affiche pourtant :

```text
Tout est prêt.
```

Puis l’item `answer` affiche à nouveau :

```text
Tout est prêt.
```

Le lecteur voit bien deux fois le même texte. Le même défaut existe avec d’autres constructions Markdown, par exemple :

```text
response.text = "Conclusion :\n[Tout est prêt.](https://example.com)"
dashboard_publish.text = "Tout est prêt."
```

## Changement de forme recommandé

Oui : le changement annoncé par l’orchestrateur est préférable dès maintenant.

Le cas Markdown montre que toute comparaison des chaînes brutes — caractères, paragraphes ou lignes jointes — demeure dissociée de ce que voit réellement le lecteur. Aplatir le Markdown avant comparaison déplacerait seulement le problème et pourrait introduire des collisions sémantiques, notamment en supprimant les destinations de liens.

La règle structurelle proposée est plus solide :

- si le dernier tour contient une prose, cette prose est la réponse affichée ;
- `job.result` n’est ajouté que si le dernier tour pertinent est muet.

Elle repose sur le rôle des champs dans le flux, pas sur une heuristique textuelle reformée une quatrième fois.

## EXÉCUTÉ

- Lecture intégrale des deux documents demandés.
- `git show` séparé de `4ba39b73` et `b69a76be`.
- Inspection de la garde finale et de ses tests.
- Inspection du rendu de la prose et de l’item `answer` par le composant Markdown.
- Vérification de l’arbre de travail : propre.

La commande Vitest ciblée a été tentée, mais refusée par le profil d’exécution en lecture seule ; les tests n’ont donc pas été exécutés.

## DÉDUIT sans exécuter

- Le résultat exact du scénario Markdown ci-dessus, par application directe des lignes 390–412.
- La duplication visuelle, à partir des deux appels au composant `Markdown`.
- La supériorité de la règle structurelle proposée par l’orchestrateur.

## Constats bloquants neufs

1. **La comparaison travaille sur le Markdown source et laisse passer des réponses visuellement identiques**, dans [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:411).