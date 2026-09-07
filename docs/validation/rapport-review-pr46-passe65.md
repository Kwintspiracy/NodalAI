## Réponses aux questions

### 1. `h-screen` et le mobile

Constat confirmé.

- [layout.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/layout.tsx:88) fixe le dashboard avec `h-screen`, donc `height: 100vh`.
- Sur Safari iOS, cette hauteur peut inclure l’espace occupé par les barres du navigateur. Comme le même élément porte `overflow-hidden`, la partie inférieure n’est pas récupérable par le défilement du document : le composeur ou la barre d’état peuvent être masqués.
- Tailwind 4.3 est bien installé dans [package.json](D:/APPS/NodalAI/apps/web/package.json:65). Il permet `h-dvh`; `h-[100dvh]` fonctionnerait également, mais `h-dvh` est la classe native préférable.
- [Sidebar.tsx](D:/APPS/NodalAI/apps/web/src/components/Sidebar.tsx:200) est `fixed` avec `h-full`. Étant sortie du flux du conteneur racine, elle ne « suit » pas automatiquement un passage de celui-ci à `h-dvh`. Elle doit elle aussi recevoir une hauteur dynamique, par exemple `h-dvh`.

Ce point casse potentiellement l’accès au bas des écrans de fil sur mobile. Je le considère bloquant pour ce lot, puisque le commit transforme précisément ces pages en écrans non défilants.

### 2. Position initiale du fil

Constat confirmé.

[ThreadScreen.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/[id]/ThreadScreen.tsx:29) crée seulement un conteneur `overflow-y-auto`. Il n’existe dans les composants de fil aucun `scrollTop`, `scrollIntoView`, ancrage terminal, `flex-col-reverse` ou effet de montage positionnant le fil en bas. Un fil long s’ouvre donc au début.

Ce n’est pas une preuve de casse technique : le comportement attendu n’est pas encodé dans les critères fournis. C’est une décision produit à poser explicitement, particulièrement pour les fils de travaux où « reprendre à la dernière réponse » et « lire depuis le début » sont deux comportements défendables. Il faut aussi décider si les rafraîchissements automatiques doivent suivre le bas seulement lorsque l’utilisateur y était déjà.

### 3. Effet sur les éléments `sticky`

Le soupçon général est faux : il ne reste pas plusieurs en-têtes de tableaux ou composeurs `sticky`.

La seule classe `sticky` effective trouvée dans `apps/web/src` est la barre de sauvegarde de [AgentComposer.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/agents/[id]/edit/AgentComposer.tsx:3756), avec `sticky bottom-4`.

Elle se réfère désormais au conteneur de contenu défilant de [layout.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/layout.tsx:115), et non au document. C’est cohérent avec sa fonction : rester au bas de la zone visible du dashboard pendant l’édition. Je n’ai trouvé aucun `sticky` qui se collerait manifestement au mauvais bord.

En revanche, les commentaires de [layout.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/layout.tsx:103) parlent encore de l’ancien composeur `sticky bottom-7` et de l’ancienne barre `sticky bottom-0`. Ils sont devenus inexacts, mais cela ne casse pas l’exécution.

### 4. Rattachement des anciennes lignes de `llm_calls`

Le refus de backfill est justifié.

La migration [0100_llm_calls_conversation.sql](D:/APPS/NodalAI/packages/db/migrations/0100_llm_calls_conversation.sql:18) laisse volontairement les anciennes lignes à `NULL`. Les anciennes lignes fournissent au mieux l’entité, l’agent, `source = 'chat'` et un horodatage. Plusieurs conversations du même agent peuvent se chevaucher, et l’écriture du sink est asynchrone. Un rapprochement par proximité avec `chat_messages.created_at` serait donc heuristique et pourrait attribuer des coûts au mauvais fil.

Sans identifiant de requête ou relation préexistante, conserver `NULL` est plus exact qu’un backfill probabiliste.

### 5. Autres chemins de chat et `makeLlmCallSink`

Les appelants cités ne posent pas le problème annoncé :

- [execute.ts](D:/APPS/NodalAI/apps/runner/src/job/execute.ts:1005) écrit des appels rattachés par `jobId`.
- [deliver-results.ts](D:/APPS/NodalAI/apps/runner/src/cron/deliver-results.ts:419) est une synthèse cron, pas un tour de conversation directe.

En revanche, il existe bien un autre chemin de tour de chat qui reste orphelin : le runtime CLI.

[run-chat-turn.ts](D:/APPS/NodalAI/apps/runner/src/chat/run-chat-turn.ts:304) bifurque vers `runCliRuntimeChatTurn` avant la création du sink enrichi située ligne 331. Ce chemin écrit sa consommation dans `cli_runs`, comme l’indique [run-chat.ts](D:/APPS/NodalAI/apps/runner/src/cli-runtime/run-chat.ts:270), mais `cli_runs` ne possède ni `conversation_id` ni autre relation durable vers la conversation. `conversationKey` existe seulement dans `cli_sessions`.

Or [conversation-actions.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-actions.ts:497) construit les compteurs du fil exclusivement depuis `llm_calls`. Résultat : une conversation avec un agent runtime CLI affiche encore zéro jeton, coût inconnu et zéro durée modèle malgré un appel effectivement facturé.

C’est un constat bloquant neuf : la correction annoncée ne couvre pas tous les tours de chat.

### 6. Deux comptes d’agents subsistent-ils ?

Le soupçon d’un double compteur affiché est faux.

- L’en-tête affiche explicitement `threadAgents(...).length`, par exemple dans [page.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/[id]/page.tsx:78).
- [StatusBar.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/StatusBar.tsx:45) exploite toujours `cost.byAgent`, mais n’affiche plus son nombre. Le panneau détaille une ligne par agent ayant des coûts ; il ne présente pas un second total « N agents ».

Les populations peuvent toujours différer — notamment pour le runtime CLI décrit ci-dessus ou après l’échec asynchrone d’un insert d’audit — mais deux nombres concurrents ne sont plus imprimés sur l’écran.

## Constats bloquants neufs

1. Les tours de chat des agents runtime CLI restent absents des compteurs du fil : bifurcation avant `makeLlmCallSink`, consommation écrite dans `cli_runs` sans relation avec la conversation, lecture limitée à `llm_calls`.

2. `h-screen` conserve le risque de masquer le composeur et la barre d’état sur Safari mobile. Le conteneur principal et la sidebar fixe doivent être traités ensemble avec une hauteur dynamique.

## Ce que je n'ai pas pu vérifier

- Tests Vitest ciblés : **NON EXÉCUTÉS**. Les deux tentatives de lancement ont été refusées par la politique du sandbox en lecture seule avant la création du processus. Je ne déduis donc aucun résultat de test.
- Comportement réel sur Safari iOS et variation des barres du navigateur : **NON EXÉCUTÉ**.
- Mesures visuelles annoncées à 1360 × 900 et comportement de défilement dans un navigateur : **NON EXÉCUTÉS**.