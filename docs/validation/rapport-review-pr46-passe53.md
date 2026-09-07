## Réponses

1. **Le texte différent de `job.result` n’est pas perdu dans le flux normal de livraison.**

`chat_messages` ne contient que la réponse immédiate du chat — par exemple « Je regarde. » — écrite dans [run-chat-turn.ts](D:/APPS/NodalAI/apps/runner/src/chat/run-chat-turn.ts:530). Il n’existe pas de seconde bulle assistant créée lorsque le job se termine.

En revanche, `dashboard_publish({ text: "Tout est prêt." })` et `telegram_send_message({ text: "Tout est prêt." })` deviennent des cartes `sent`. Leur champ `text` est affiché par `SentCard` dans [ConversationFeedView.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:564), précisément à la ligne [588](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:588). Le fil ajoute les items du job après l’accusé du chat dans [conversation-thread.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-thread.ts:274).

Scénario concret :

- bulle assistant de `chat_messages` : « Je regarde. » ;
- appel `dashboard_publish({text: "Tout est prêt."})` ;
- carte visible : « Sent to dashboard », contenant « Tout est prêt. » ;
- aucun item `answer`, mais aucune perte d’information.

Le bon emplacement est donc déjà la carte de livraison. Si un `job.result` était écrit hors de tout outil de livraison et différait de la prose, il serait effectivement masqué ; je n’ai pas trouvé ce chemin dans le flux normal examiné.

2. **Un cron sans prose finale ne perd pas sa réponse.**

À la ligne [690 de conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:690), l’absence de prose fait ajouter `job.result` comme item `answer`. Si le cron utilise Telegram, le texte envoyé reste également visible dans sa carte `sent`.

J’ai cependant trouvé un cas neuf où la réponse est affichée deux fois.

## Constat neuf bloquant — un cron `dashboard_publish` tout en outils duplique la réponse

- Fichiers :
  - [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:380)
  - [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:690)
  - [ConversationFeedView.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:588)
- Ce qui casse : `lastAgentTurnSpoke` considère uniquement la prose. Une carte `sent` contenant déjà le texte de `dashboard_publish` ne compte donc pas comme une réponse affichée. `job.result` est ensuite ajouté en plus.
- Scénario concret : un cron répond dans un unique tour avec :
  - `dashboard_publish({text: "Tout est prêt."})`
  - `return_result({status: "success"})`
  - aucune prose.

Le lecteur voit alors :

1. la carte « Sent to dashboard » contenant « Tout est prêt. » ;
2. l’item `answer` contenant de nouveau « Tout est prêt. ».

Le test ajouté à [conversation-feed.test.ts](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-feed.test.ts:438) ne couvre pas ce flux réel : il fournit un `job.result`, mais seulement un appel `return_result`, sans la carte `dashboard_publish` qui a normalement produit ce résultat.

## EXÉCUTÉ

- Lecture de `demande-review-pr46-passe53.md` et du rapport de passe 52.
- Inspection de `git show 09698ab1`.
- Inspection des chemins `conversation-thread`, `chat_messages`, `dashboard_publish`, Telegram, `ProjectThread`, `/scheduled/[id]` et du rendu `SentCard`.
- Vérification de l’arbre : une modification préexistante est présente dans `docs/plans/de-la-maquette-au-produit.md` ; je ne l’ai pas touchée.
- Tentative du test Vitest ciblé, refusée par le profil d’exécution en lecture seule. Les tests n’ont donc pas été exécutés.

## DÉDUIT sans exécuter

- L’absence de perte dans les flux `dashboard_publish` et Telegram, par traçage de leur champ `text` jusqu’à `SentCard`.
- La duplication du cron dashboard tout en outils, par application de `lastAgentTurnSpoke` puis du rendu de la carte et de l’item `answer`.

## Constats bloquants neufs

1. **Un tour sans prose utilisant `dashboard_publish` affiche son texte dans la carte `sent`, puis une seconde fois dans l’item `answer`.**