J’ai relu le commit `05d95510` et vérifié le commit de dépendances `69a4223b`. Aucun fichier n’a été modifié.

## P0 — sécurité et exactitude

### 1. Injection

**EXÉCUTÉ**

Lecture du rendu mdast → React et grep ciblé.

- `<script>` et `<img onerror>` deviennent des nœuds `html`, rendus comme chaînes React aux lignes 158–162 : les balises sont échappées, donc non exécutées.
- Un `javascript:` écrit comme texte reste du texte.
- Une image Markdown devient un lien, jamais une balise `<img>`.

**Constat bloquant P0**

- Fichier : [Markdown.tsx](D:/APPS/NodalAI/apps/web/src/components/Markdown.tsx:133)
- Lignes : 133–153
- Ce qui casse : tout schéma conforme à la regex est considéré comme externe, puis `node.url` est placé directement dans `href`. Cela inclut `javascript:`, `data:`, `vbscript:` et les schémas inconnus. Le cas `image` est encore plus permissif : toute URL devient un lien.
- Scénario concret : un agent produit `[Ouvrir le rapport](javascript:alert(document.domain))`. Le composant construit un `<a href="javascript:…">` avec `target="_blank"`. React ou le navigateur peut neutraliser certains schémas selon la version, mais le composant lui-même ne garantit pas la sécurité demandée.

Il faut autoriser explicitement `http:`, `https:` et `mailto:`. Les URLs relatives et ancres peuvent rester internes si souhaité. Tout autre schéma doit être rendu en texte non cliquable. La même politique doit couvrir `link` et `image`.

**DÉDUIT sans exécution navigateur**

Je n’ai pas exécuté le clic dans un navigateur. Le risque est établi par le flux de données et l’absence de liste blanche ; le comportement défensif éventuel de React ne doit pas constituer la barrière de sécurité du composant.

### 2. `lastProseContains`

**EXÉCUTÉ**

Lecture de [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:376), notamment la comparaison ligne 387 et les branches terminales lignes 676–684.

**Constat d’exactitude**

- Fichier : [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:387)
- Ce qui casse : `includes(needle)` supprime une réponse courte trouvée accidentellement dans une prose plus longue.
- Scénario concret : dernière prose `La vérification est OK. Je poursuis l’analyse.` et résultat final `OK.`. L’item `answer` disparaît, alors que la prose ne constituait pas la réponse finale.

Une égalité normalisée, ou à défaut une comparaison de suffixe/bloc complet explicitement bornée, éviterait ce faux positif.

**Cas inverse confirmé**

Si le job échoue ou est annulé, `failure` est toujours ajouté par la branche séparée des lignes 683–684. Une prose contenant `job.result` ne masque donc pas l’échec.

**DÉDUIT sans exécution**

Les deux comportements ci-dessus découlent directement des branches. La suite ciblée n’a pas pu être lancée dans cet environnement en lecture seule.

### 3. `compactTurns`

**EXÉCUTÉ**

Lecture de `showsAlone` lignes 280–290, de la construction des blocs lignes 627–632, puis de `compactTurns` lignes 432–462.

Une question suspendue ayant une ligne `approval_requests` devient bien un bloc `card`. Comme le prédicat `mute` refuse tout tour possédant un bloc `card`, ce tour ne fusionne jamais.

**Constat bloquant d’exactitude**

- Fichier : [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:458)
- Lignes : 458–461
- Ce qui casse : lors de la fusion, l’objet conserve `turn` et `turnSource` du tour précédent via `...prev`, mais récupère le modèle et l’usage du tour audité suivant.
- Scénario concret : le tour 1 est `inferred`, `usage: null`; le tour 2, muet mais audité, porte 2 000 tokens. Après fusion, le tour affiché reste `turnSource: 'inferred'` et conserve le numéro du tour 1, tout en affichant les 2 000 tokens et éventuellement le modèle du tour 2. Les métriques sont donc attribuées à une identité de tour que le code déclare non auditée.

Il faut soit conserver les segments d’usage avec leur tour audité, soit promouvoir explicitement et de façon cohérente l’identité du tour fusionné.

## P1 — modèle et données

### 4. Fil des enfants

**EXÉCUTÉ**

Lecture des requêtes de [job-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/job-feed.ts:125) et du plafond `HEAD_JOBS_MAX = 100` dans [conversation-actions.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:159).

La première requête enfant est une projection limitée. En revanche, la seconde requête, ligne 230, sélectionne bien `job: agentJobs`, donc notamment le JSONB `messages`, pour tous les enfants directs.

**DÉDUIT sans mesure DB**

Le volume est non borné par le nombre d’octets :

`100 têtes × nombre moyen d’enfants × taille moyenne de messages`

Exemple concret : 100 têtes, 5 enfants chacune et 1 Mio de transcript par enfant entraînent environ **500 Mio** de JSONB relu, avant les lignes d’outils, appels LLM, allocations Drizzle et rendu serveur. Même avec 100 Kio par enfant, on atteint environ 50 Mio par ouverture de page.

- Fichier : [job-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/job-feed.ts:230)
- Ce qui casse : latence, mémoire du serveur et risque d’expiration sur une conversation longue.
- Scénario concret : une conversation au plafond contenant plusieurs délégations avec de gros résultats d’outils dans `messages`.

Le masquage est bien appliqué aux enfants : l’appel récursif repasse par `assembleJobFeeds`, puis par `redactTranscriptForDisplay` ligne 262. Il intervient toutefois après le transfert intégral depuis PostgreSQL.

### 5. `dedupeNotes`

**EXÉCUTÉ**

Lecture de [conversation-thread.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-thread.ts:175) et de l’ordre d’assemblage.

Pas de constat neuf : `olderTurnsNote` est placé en tête, puis `UNCLASSIFIED_NOTE` est produit immédiatement après le premier job affiché réellement concerné. La déduplication conserve cette première occurrence. Elle ne déplace donc pas une note provenant d’un job tronqué sur un tour affiché classé.

### 6. Demande Telegram dupliquée

**EXÉCUTÉ**

Recherche de tous les inserts de `agentJobs`, puis lecture du chemin Telegram.

Une autre lecture existe :

- Fichier : [handler.ts](D:/APPS/NodalAI/apps/runner/src/telegram/handler.ts:254)
- Lignes : 254–255 et 277–298
- Chemin : `/new <même tâche>` ouvre une nouvelle conversation, retire `/new`, puis persiste `rest` comme tâche d’un nouveau job de tête.
- Scénario concret : le premier message est `Analyse ce dossier`; 75 minutes après, l’utilisateur envoie `/new Analyse ce dossier`. La base contient deux jobs de tête dont `task` est exactement `Analyse ce dossier`, sans que cela prouve un renvoi littéralement identique ni une relance automatique.

Je n’ai trouvé aucun chemin automatique « après échec » qui recrée un job Telegram de tête avec la même tâche. Les reprises de délégation mettent à jour/reprennent le parent ; elles ne correspondent pas à ce doublon de tête.

## P2 — design system

### 7. Classes hors échelle

**EXÉCUTÉ**

Grep effectué uniquement sur les lignes ajoutées du commit.

- Aucun `text-[Npx]`.
- Aucune couleur hexadécimale/littérale ajoutée.
- Aucun `shadow` ajouté.
- Géométrie arbitraire explicitement acceptée :
  - [QuestionCard.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/QuestionCard.tsx:75) : `max-w-[620px]`, `px-[18px]`.
- Espacements fractionnés ajoutés :
  - [ProducedCard.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ProducedCard.tsx:58) : `gap-3.5`, `py-1.5`.
  - [QuestionCard.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/QuestionCard.tsx:82) : `mt-3.5`.
  - Même fichier, lignes 96 et 101 : `mt-3.5`, `px-3.5`.
  - [Markdown.tsx](D:/APPS/NodalAI/apps/web/src/components/Markdown.tsx:83) : `mb-1.5`.
  - Même fichier, ligne 93 : `py-0.5`.

Ces valeurs appartiennent à l’échelle Tailwind déjà utilisée dans le design system ; je ne les classe pas comme rupture. Les géométries `h-[30px]` et `rounded-[5px]` réemploient également des dimensions établies par les composants UI.

### 8. Copy

**EXÉCUTÉ**

Grep des ajouts pour les caractères français et les tirets cadratins, en séparant commentaires/tests et contenu rendu.

Aucun tiret cadratin ni texte français utilisateur nouveau n’a été trouvé dans la copy d’interface. Les occurrences françaises sont dans les commentaires et descriptions de tests.

## Vérifications exécutées et limite

Exécuté :

- lecture intégrale du brief ;
- `git show 05d95510` et inspection ciblée des fichiers ;
- vérification de `69a4223b` ;
- grep des classes ajoutées, de la copy et des chemins d’insertion de jobs ;
- inspection de la maquette et des usages existants du design system pertinents.

Non exécuté :

- suites Vitest : leur lancement a été refusé par le profil d’exécution en lecture seule ;
- clic navigateur sur les liens malveillants ;
- mesure réelle des octets PostgreSQL.

## Constats bloquants neufs

1. **P0 — URLs Markdown sans liste blanche**, dans `Markdown.tsx` lignes 133–153.
2. **P0 exactitude — réponse courte supprimée par `includes`**, dans `conversation-feed.ts` ligne 387.
3. **Exactitude des métriques — usage audité attribué à un tour restant `inferred`**, dans `conversation-feed.ts` lignes 458–461.
4. **P1 performance — chargement non borné des transcripts de tous les enfants**, dans `job-feed.ts` ligne 230.