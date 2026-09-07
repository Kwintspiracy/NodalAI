J’ai relu les commits `61a85710`, `af95bcc3` et `10c4d05e`. Aucun fichier n’a été modifié.

## 1. `safeHref` — P0

### EXÉCUTÉ

- Lecture des trois `git show`.
- Inspection de [Markdown.tsx](D:/APPS/NodalAI/apps/web/src/components/Markdown.tsx:81) et des tests associés.
- Recherche des consommateurs de `safeHref`.
- La tentative d’exécuter Vitest a été refusée par le profil d’exécution en lecture seule.

Le correctif final retire les caractères `U+0000` à `U+0020` et `U+007F` avant d’identifier le schéma, puis refuse les URLs commençant par `//`.

Résultat attendu pour les chaînes exactes :

| Entrée reçue par `safeHref` | Résultat |
|---|---|
| `javascript:alert(1)` | refusée |
| `JavaScript:alert(1)` | refusée |
| `java\nscript:alert(1)` | devient `javascript:alert(1)`, puis refusée |
| `java script:alert(1)` | devient `javascript:alert(1)`, puis refusée |
| `\tjavascript:alert(1)` | devient `javascript:alert(1)`, puis refusée |
| `  javascript:alert(1)` | devient `javascript:alert(1)`, puis refusée |
| `data:text/html,x` | refusée |
| `vbscript:x` | refusée |
| `file:///etc/passwd` | refusée |
| `ftp://evil.test/x` | refusée |
| `//evil.test/x` | refusée |
| `/spaces/1` | acceptée comme relative |
| `docs/plan.md` | acceptée comme relative |
| `#ancre` | acceptée |
| `https://evil.test/x` | acceptée et explicitement externe |
| `mailto:q@example.test` | acceptée et explicitement externe |

Une URL protocole-relative comme `//evil.test/x` quitterait effectivement le site si elle devenait un `href`. Le commit `10c4d05e` la refuse désormais.

### DÉDUIT sans exécution du parseur ou du navigateur

Dans une destination Markdown, `&#106;avascript:alert(1)` est décodée par la chaîne Markdown en `javascript:alert(1)` avant le rendu du nœud `link`. `safeHref` reçoit donc cette dernière chaîne et la refuse.

Je n’ai identifié aucun contournement permettant à un schéma actif interdit d’atteindre `href`.

Aucun constat neuf sur ce point.

## 2. Comparaison par suffixe — P0

### EXÉCUTÉ

Inspection de [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:392) et du test ajouté pour `La vérification est OK. Je poursuis l’analyse.`.

Le cas de la passe 49 est corrigé : cette prose ne se termine pas par `OK.`, donc la réponse finale demeure affichée.

### DÉDUIT sans exécution

**Constat neuf bloquant — collision sémantique de suffixe**

- Fichier : [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:392)
- Ligne : 392
- Ce qui casse : `said.endsWith(needle)` ne vérifie aucune frontière sémantique. Une phrase exprimant le contraire de la réponse peut néanmoins finir par exactement la même chaîne.
- Scénario concret :
  - dernière prose : `Résultat : PAS OK.`
  - réponse finale : `OK.`
  - `normalizeText("Résultat : PAS OK.").endsWith("OK.")` vaut `true`
  - l’item final `{ kind: "answer", text: "OK." }` est supprimé.

La prose et la réponse disent ici réellement des choses opposées. Le résultat final affirmatif disparaît au profit de la prose négative.

## 3. `CHILD_FEEDS_MAX` — P1

### EXÉCUTÉ

Inspection de [job-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/job-feed.ts:144) et [job-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/job-feed.ts:240).

La requête ordonne bien tous les enfants par `agentJobs.createdAt` croissant. `childRows.slice(-20)` sélectionne donc les vingt enfants les plus récents de la page, indépendamment de l’âge de leur tête.

### DÉDUIT sans exécution DB

Scénario :

- tête ancienne A, créée le 1er septembre ;
- tête récente B, créée le 7 septembre ;
- enfant de B créé à `2026-09-07T10:00:00Z` ;
- enfant tardif de A créé à `2026-09-07T11:00:00Z`.

À capacité atteinte, l’enfant de A est préféré à celui de B parce que `11:00:00Z` est plus récent. Son fil se trouve plus haut dans la page, sous A, tandis que celui placé sous B reste fermé.

C’est une conséquence cohérente de la politique documentée « délégations les plus récentes toutes têtes confondues ». Je n’ai trouvé aucun invariant fonctionnel imposant de favoriser les enfants des têtes récentes, ni aucun problème de données ou d’attribution.

Aucun constat neuf sur ce point.

## 4. Identité promue et `index` — P1

### EXÉCUTÉ

- Inspection de [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:467).
- Recherche globale des lectures de `FeedItem.index`, `turn` et `turnSource`.
- Inspection de [ConversationFeedView.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:105).

`index` est documenté comme le rang d’affichage dans le job, tandis que `turn` est le compteur audité du runner. Ils n’ont donc pas à être égaux.

Le rendu ne présente et ne compare ni `item.index` ni `item.turn`. Les valeurs servent actuellement à la construction du modèle et aux assertions de tests. Je n’ai trouvé aucun consommateur supposant `index === turn`.

### DÉDUIT sans exécution

Après fusion :

- `index` reste la position du premier tour visible ;
- `turn` devient l’identité du tour audité qui fournit les métriques.

Cette dissociation correspond aux significations documentées des deux champs. Aucun constat neuf.

## Constats bloquants neufs

1. **P0 — une collision de suffixe peut masquer une réponse finale sémantiquement opposée**, dans [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:392), par exemple prose exacte `Résultat : PAS OK.` et réponse exacte `OK.`.