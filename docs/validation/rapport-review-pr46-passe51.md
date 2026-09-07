J’ai relu le commit `df7100d3`. Aucun fichier n’a été modifié.

## 1. Frontière du paragraphe

### EXÉCUTÉ

- Lecture de `git show df7100d3`.
- Inspection de [return-result.ts](D:/APPS/NodalAI/packages/tools/src/builtin/return-result.ts).
- Inspection de [dashboard-publish.ts](D:/APPS/NodalAI/packages/tools/src/builtin/dashboard-publish.ts).
- Inspection de la finalisation dans [execute.ts](D:/APPS/NodalAI/apps/runner/src/job/execute.ts:4068).

Le runner ne recopie plus un texte fourni à `return_result` : cet outil ne transporte que `status` et éventuellement `reason`. Le contenu de `job.result` est écrit séparément, notamment par `dashboard_publish`. Par ailleurs, la prose libre `response.text` est conservée dans le transcript, y compris lorsqu’elle accompagne les appels à `dashboard_publish` et `return_result`.

### DÉDUIT sans exécution d’un LLM réel

Le modèle peut donc produire une prose et un `dashboard_publish.text` légèrement différents. Cependant, cela ne contredit pas le choix d’une égalité exacte : ignorer la ponctuation, les mots ou les émojis réintroduirait des collisions sémantiques semblables à `PAS OK.` / `OK.`.

Exemple acceptablement affiché deux fois :

- prose : `Tout est prêt ✅`
- `dashboard_publish.text` : `Tout est prêt.`
- les textes ne sont pas identiques ; conserver l’item `answer` évite de supprimer arbitrairement la valeur canonique de `job.result`.

Aucun constat neuf sur cette première question.

## 2. Séparateur de paragraphes

### EXÉCUTÉ

Inspection de [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:379) et des tests de [conversation-feed.test.ts](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-feed.test.ts:356).

Les tests, le typecheck et le lint ont été demandés, mais leur lancement a été refusé par le profil d’exécution en lecture seule. Ils n’ont donc pas été exécutés.

### DÉDUIT sans exécution des tests

**Constat neuf bloquant — un résultat répété après un simple saut de ligne reste affiché deux fois.**

- Fichier : [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:379)
- Ligne : 379
- Ce qui casse : `split(/\n\s*\n/)` ne crée une frontière qu’en présence d’une ligne vide. Un simple `\n` est ensuite absorbé par `normalizeText`, de sorte que la dernière ligne ne peut jamais correspondre seule au dernier paragraphe.
- Scénario concret :
  - prose conservée dans `response.text` : `Voici le bilan :\nTout est prêt.`
  - `dashboard_publish.text`, donc `job.result` : `Tout est prêt.`
  - `paragraphsOf(prose)` produit `["Voici le bilan : Tout est prêt."]`
  - `paragraphsOf(result)` produit `["Tout est prêt."]`
  - la comparaison échoue et `{ kind: "answer", text: "Tout est prêt." }` est ajouté, alors que cette réponse apparaît déjà exactement sur la dernière ligne.

Cette forme est permise par le flux réel : prose et publication sont deux champs produits séparément dans la même réponse du modèle. Les modèles utilisant couramment un simple saut de ligne, ce cas ne constitue pas seulement une variation typographique hypothétique.

## Constats bloquants neufs

1. **P1 — duplication lorsque la réponse publiée est déjà la dernière ligne de la prose, séparée par un seul saut de ligne**, dans [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:379).