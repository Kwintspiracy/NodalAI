# Demande de review — PR #46, passe 65 (un fil est un écran, et ses chiffres disent la vérité)

Périmètre : **le commit `bd493364`**. Diff : `git diff bd493364^ bd493364 -- apps packages`.

## Ce que le commit affirme

1. **La fenêtre ne défile plus.** `(dashboard)/layout.tsx` : `min-h-screen` → `h-screen
   overflow-hidden`, et la zone de contenu devient `min-h-0 flex-1 overflow-x-clip overflow-y-auto`.
   Vérifié dans le navigateur : `/agents`, `/skills`, `/chat`, `/settings` défilent toujours dans
   cette zone ; `document.documentElement` ne défile plus.
2. **`PageShell` prop `fill`** : l'en-tête ne défile pas, le corps est une colonne de hauteur
   pleine, l'enfant place ce qui défile. Les pages sans `fill` sont inchangées (même arbre).
3. **`chat/[id]/ThreadScreen.tsx`** (neuf) : fil dans `min-h-0 flex-1 overflow-y-auto`, saisie
   `shrink-0`, barre d'état après. Les trois écrans de fil l'utilisent (`/chat/[id]`,
   `/spaces/[id]` via `ProjectThread`, `/scheduled/[id]`).
4. **`ThreadComposer` et `StatusBar` ne sont plus `sticky`** : ils sont hors de la zone qui défile.
   `StatusBar` perd `-mx-8` (elle s'arrêtait à la largeur du corps `max-w-6xl`) et devient pleine
   largeur. Mesuré : sur un fil de deux lignes, viewport 900 — saisie 814→860, barre 872→900,
   largeur 1116 = 1360 − 244 (la barre latérale).
5. **`WorkHeader` prend `back` et `status`** : une seule ligne d'identité ; les trois pages
   perdent leur `toolbar` « ← X / pastille ».
6. **Migration 0100 — `llm_calls.conversation_id`** (`set null`, index) : écrite par
   `run-chat-turn.ts` (`makeLlmCallSink({ conversationId })`), lue par `getConversationThreadAction`.
   La requête des appels SORT du bloc `relevantIds.length === 0 ? [[], …]`, qui sautait tous les
   compteurs d'un fil sans job. Le harnais de test (`packages/db/src/tests/helpers.ts`) crée la
   colonne. Test : un fil de chat pur (aucun job, deux appels `source = 'chat'`) rend
   18 384 / 63 jetons, 0,0125 $, 6 187 ms, un agent — rouge par mutation (requête bornée aux jobs).
7. **La barre d'état ne compte plus les agents** (l'en-tête le fait, avec les visages : les deux
   disaient deux nombres sous la même réponse) et affiche `llmDurationMs` (« 6.2 s thinking »), pas
   le temps écoulé depuis l'ouverture du fil.

## Questions, par priorité

1. **`h-screen` et le mobile** : `h-screen` vaut `100vh`, qui sur iOS Safari inclut la barre
   d'adresse — la zone de contenu peut dépasser l'écran et la saisie passer sous la barre du
   navigateur. Faut-il `h-[100dvh]` ? Tailwind 4 le propose-t-il ici, et la barre latérale mobile
   (`fixed`, `h-full`) suit-elle ?
2. **Le fil ne se positionne pas en bas à l'ouverture** : un fil long s'ouvre en haut, alors qu'une
   application de chat ouvre sur le dernier message. Est-ce un défaut à corriger dans ce lot, ou
   une décision produit à poser (le fil d'un travail se lit du début) ?
3. **`overflow-y-auto` sur la zone de contenu et `position: sticky` ailleurs** : quels éléments
   `sticky` restent dans l'application, et lesquels se réfèrent désormais à cette zone plutôt qu'au
   document ? (`AgentComposer` barre de sauvegarde, en-têtes de tableaux ?) Un qui collerait au
   mauvais bord ?
4. **La migration 0100 sur une base existante** : les lignes anciennes gardent `conversation_id`
   nul et resteront à zéro — dit dans la migration. Un chemin qui pourrait les rattacher après
   coup (chat_messages ↔ llm_calls par horodatage) serait-il plus juste, ou est-ce une
   reconstruction hasardeuse qu'il vaut mieux refuser ?
5. **`makeLlmCallSink({ conversationId })`** : les autres appelants (`execute.ts`,
   `deliver-results.ts`) ne le passent pas — leurs appels ont un job. Un chemin où un tour de chat
   passerait par un autre sink et resterait donc orphelin ?
6. **Le compte d'agents de l'en-tête** (`threadAgents`, ceux qui ont pris un tour) vs la table du
   panneau de coût (par agent qui a coûté) : deux nombres subsistent-ils quelque part ?

## Hors périmètre

Le rendu au pixel face au Figma ; l'onglet Code ; les tests
`apps/runner/src/tests/concurrency/*.pg.test.ts` (rouges en suite complète, verts en isolation,
antérieurs à ce commit).

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF ferme ce point.
