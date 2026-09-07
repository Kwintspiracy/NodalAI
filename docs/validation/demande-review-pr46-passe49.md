# Demande de review — PR #46, passe 49 (P2bis : le fil tel que la maquette, session 1)

Périmètre : **un commit de code**, le dernier de la branche dont le titre commence par
« feat(feed): P2bis — le fil tel que la maquette, session 1 » (29 fichiers, `git show` pour le
détail), précédé de `69a4223b` (dépendances `unified`, `remark-parse`, `remark-gfm`,
`mdast-util-to-string`, `@types/mdast` déclarées dans `apps/web`, lockfile mis à jour). Codé par
un agent Opus sur spec puis complété par l'orchestrateur ; vérifié par suites, typecheck, lint,
prettier et captures Playwright (clair et sombre) de trois conversations réelles face à la
maquette `docs/design/espace-code/Main.dc.html`. L'arbre de travail ne porte que le plan (docs).

## Ce que le commit affirme

1. **`apps/web/src/components/Markdown.tsx`** : `unified().use(remarkParse).use(remarkGfm).parse()`
   → arbre mdast → React par `switch` sur `node.type`. Aucun `dangerouslySetInnerHTML`, aucun
   rehype : un nœud `html` se rend comme TEXTE (React échappe), une `image` devient un lien texte,
   un lien externe (schéma `xxx:`) porte `target="_blank" rel="noopener noreferrer"`. Tables GFM
   par le composant DS `Table`. `plainText()` = premier bloc, première ligne, espaces repliés.
   `ui/CodeBlock.tsx` (en-tête + `CopyButton`, corps `pre` mono-12, `max-h-[480px]`), ajouté à
   `KNOWN_GAPS` de `scripts/check-figma-drift.mjs`.
2. **`conversation-feed.ts`** : `normalizeText`, `lastProseContains` (remonte à travers tours
   muets, notes, enfants, `produced`/`handoff` ; s'arrête à `request`/`history`), l'item `answer`
   n'est poussé que si la dernière prose ne contient pas la réponse ; `compactTurns` (un tour sans
   prose ni carte fusionne dans le précédent du même agent, usage additionné, `costUsd` null+x=x) ;
   `note.origin: 'runner' | 'thread'` ; rappels consécutifs identiques fusionnés.
3. **`conversation-thread.ts`** : `dedupeNotes` (UNCLASSIFIED une fois par fil ; notes
   consécutives identiques fusionnées) puis `compactTurns` sur le fil entier (`settle`).
4. **`job-feed.ts`** : `assembleJobFeeds(db, entityId, inputs, depth = 0)` assemble aussi le fil
   des enfants DIRECTS (`CHILD_FEED_DEPTH = 1`) par une requête groupée sur tous les enfants de
   tous les jobs, et le pose sur `FeedChildJob.feed`.
5. **`ConversationFeedView.tsx`** : `FeedItems` (items sans cadre, réutilisé sous la délégation),
   markdown partout, `answer` rendu comme un tour, méta du tour = modèle seul quand un groupe
   d'étapes existe (le groupe porte `N steps · durée des étapes · tokens · coût`, PAS la durée
   LLM), `DelegationGroup` (disclosure client `DelegationDisclosure`, contenu serveur) qui rend le
   fil du délégué SANS ses items `request`/`history` (la consigne est sous « Task ») et sans
   répéter `result`/`error` quand le fil existe ; `TableBody` ne dit plus « first row may be a
   header » sur une feuille vide.
6. **`StepsGroup.tsx`** : prop `meta`, lignes de résultat `sent`/`question`/`delegation`/
   `terminal`/`checks` ; **`format.ts`** : `summarizeSteps` nomme ≤ 2 outils sans carte, au-delà
   « N tool calls ».
7. **`QuestionCard.tsx`** : `prompt: ReactNode` (markdown composé côté serveur), cadre
   `border-ink` sans en-tête, `StatusPill run "Waiting"`, boutons `PrimaryButton neutral sm`,
   option retenue en pastille `bg-ok-bg text-ok`. **`ProducedCard`** en lignes clé-valeur.
   **`ClampedText`** : `children` + `plain`. **`ThreadComposer`/`ProjectComposer`** : `agentName`,
   `rows=2`. Pages : titre par `plainText`, `VerificationSection` rendue seulement si elle a
   quelque chose à dire.
8. **`packages/tools/.../xlsx.ts`** : `xlsx_read` convertit chaque cellule par `previewCellValue`
   (formule fraîche → `=…`, texte riche joint, cellule couverte par une fusion → null) ;
   `stringifyCellValue` (find_cells, largeurs) suit les mêmes règles ; `xlsx_create.present` nomme
   le fichier par `input.path`.

## Questions, par priorité

### P0 — sécurité du rendu et exactitude

1. **Injection.** Un texte d'agent ou d'outil contenant `<script>`, `<img onerror>`, `javascript:`
   en URL de lien, ou un `[texte](javascript:alert(1))` : que rend `Markdown.tsx` ? Le lien
   `javascript:` passe-t-il le test `external` et devient-il un `<a href="javascript:…">` cliquable ?
   Si oui, c'est un P0 : dire quelle liste de schémas autoriser (`http`, `https`, `mailto`) et ce
   qu'il faut faire des autres (texte nu).
2. **`lastProseContains`** : la comparaison est `includes` sur le texte normalisé. Une réponse
   COURTE (« OK. ») contenue par hasard dans une longue prose antérieure disparaît-elle à tort ?
   Le cas inverse : la prose dit la réponse puis le job ÉCHOUE — `failure` est-il encore poussé ?
3. **`compactTurns`** : un tour muet dont le groupe d'étapes contient une QUESTION (`ask_user`
   suspendue, carte `question` ⇒ `showsAlone` vrai) n'est pas muet — confirmer qu'il ne fusionne
   jamais. Et un tour muet qui porte un `usage` alors que le précédent est `inferred` (usage null) :
   l'addition attribue-t-elle des jetons au bon tour ?

### P1 — modèle et données

4. **Fil des enfants (`job-feed.ts`)** : la requête des enfants sélectionne `agentJobs` entier
   (`messages` compris) pour TOUS les enfants de tous les jobs de tête d'une page (plafond de têtes
   `HEAD_JOBS_MAX`). Une conversation à 100 têtes × plusieurs délégués : ordre de grandeur des
   octets relus ? Le `redactTranscriptForDisplay` est-il bien appliqué aux enfants (même chemin
   `assembleJobFeeds`, donc oui — confirmer) ?
5. **`dedupeNotes`** : UNCLASSIFIED une fois par fil — mais si le fil est TRONQUÉ en tête
   (`olderTurnsNote`), la note d'avant-cartes peut concerner un tour non montré ; est-elle alors
   posée au bon endroit ou sur un tour qui, lui, est classé ?
6. **Demande dupliquée non traitée** (a6d23d0a) : deux jobs de tête Telegram de même tâche à
   75 min d'écart. L'agent a conclu à un renvoi par l'utilisateur. Une autre lecture existe-t-elle
   dans le code (un chemin qui recrée un job de tête avec la même tâche : relance après échec,
   `/new`, escalade) ? Si oui, laquelle, avec fichier et ligne.

### P2 — design system

7. Classes hors échelle : `text-[Npx]`, couleurs littérales, `shadow`, tailles fractionnées dans
   les fichiers du commit ? (`grep` attendu, pas une impression.) `px-[18px]` et `max-w-[620px]`
   viennent de la maquette : acceptés comme géométrie, pas comme typographie.
8. Copy : un tiret cadratin ou du français dans un texte d'interface du commit ?

## Ce qui n'est PAS attendu

Le style, le nommage, la maquette elle-même. Un constat désigne un fichier, une ligne, et ce qui
casse, avec un scénario. Distinguer ce qui est EXÉCUTÉ de ce qui est DÉDUIT.
