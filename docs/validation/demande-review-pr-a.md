# Demande de review — PR A « le fil dit la vérité »

## Ce que la PR affirme

Quatre points du plan « Parler, c'est se souvenir » :

1. `telegram_send_message` rend `{sent: true}` au lieu de `{messageId}` — un
   agent avait lu le sien comme un message de l'utilisateur. Le rejoueur
   d'historique rend la même forme.
2. `ThreadScroller` : un fil s'ouvre en bas et suit, SEULEMENT si le lecteur y
   était déjà.
3. `/chat` en deux tableaux : les chats de canal repliés par chat, les
   conversations du dashboard en dessous.
4. Le nom d'un chat vient de l'allowlist, jamais d'un extrait de message.

Le cinquième point du plan (un envoi appartient au fil de son chat) est
DÉLIBÉRÉMENT hors de cette PR : il change ce qu'est un tour de conversation.

## Questions, par priorité

### P0

1. `packages/tools/src/communication/telegram-send-message.ts` ne rend plus
   `messageId`. Un appelant en production en dépendait-il ? Vérifier
   `apps/runner/src/delivery/outbox.ts` (le receipt vient-il bien de
   l'adaptateur et non de l'outil ?) et tout autre lecteur.
2. `apps/runner/src/job/thread-history.ts` rejoue désormais `{sent: true}` pour
   les tours passés. Un tour rejoué et un tour réel se ressemblent-ils
   exactement, ou reste-t-il une différence que le modèle peut lire ?

### P1

3. `apps/web/src/lib/chat-list.ts` — `groupChatLists` suppose que les lignes
   arrivent les plus récentes d'abord pour désigner le fil COURANT d'un chat.
   Cette garantie tient-elle chez tous les appelants ? (`listAllConversationsAction`
   trie par `updated_at desc`.) Que se passe-t-il si deux fils ont le même
   `updated_at` ?
4. `listChatNamesAction` (apps/web/src/lib/conversation-actions.ts) lit les
   allowlists de TOUS les agents de l'entité. Une fuite entre entités est-elle
   possible ? Le filtre passe par `agents.entity_id`.
5. `ThreadScroller` : le drapeau `selfScroll` est remis à false au PREMIER
   événement de défilement reçu. Un défilement programmatique peut-il émettre
   ZÉRO événement (si la position ne change pas) et laisser le drapeau armé,
   faisant ignorer le geste SUIVANT du lecteur ?

### P2

6. La suppression d'une conversation de canal n'est plus offerte sur /chat (le
   tableau du haut n'a ni sélection ni bouton). Régression assumée ou trou ?

## Hors périmètre

- Le rattachement des envois au fil de leur chat (PR suivante).
- Le nettoyage des vieux fils d'un chat (45 sur la base de test).
- L'aperçu d'un chat, qui montre le `result` brut d'un job (« [Delegated to
  Lead-Dev (failed) — actions: … ») : il vient de la même source qu'avant, et
  c'est la PR suivante qui lui donnera la bonne matière.

## Ce dont je doute moi-même

- `chatLabel` invente « Direct » quand l'allowlist ne nomme pas le chat. Est-ce
  un mensonge acceptable, ou faut-il montrer l'identifiant ?
- Le `#` devant un salon : convention Slack/Discord appliquée aussi à un groupe
  Telegram, où elle n'a pas cours.
