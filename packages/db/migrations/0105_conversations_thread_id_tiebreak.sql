-- L'index du fil courant couvre l'ordre ENTIER, départage compris.
--
-- `idx_conversations_thread` (migration 0094) porte
-- `(entity_id, agent_id, channel, chat_id, created_at DESC)`. C'est l'ordre de
-- `resolveConversation` — sauf sa dernière colonne : `id DESC`, qui départage
-- deux fils créés au même instant. Sans elle, le moteur doit trier ce qui reste
-- après l'index (revue Codex, PR #48, passe 7).
--
-- Deux lectures s'en servent, et ce sont les deux chemins chauds du chat :
-- `resolveConversation` sur chaque message entrant, et la désignation du fil
-- courant de `/chat` (`listCurrentThreadByChatAction`), dont le `DISTINCT ON`
-- porte exactement cette clé.
--
-- L'ancien index est remplacé, pas doublé : il devient un préfixe de celui-ci,
-- et deux index dont l'un préfixe l'autre coûtent deux écritures pour un seul
-- service.
--
-- Cette migration vit sur la PR #49 alors qu'elle sert la #48 : le numéro 0104
-- était déjà pris par `deliverable_produced`, déjà appliqué sur la base de dev.
-- Renuméroter une migration appliquée coûtait plus que d'attendre le merge.
CREATE INDEX IF NOT EXISTS idx_conversations_thread_tiebreak
  ON conversations (entity_id, agent_id, channel, chat_id, created_at DESC, id DESC);

DROP INDEX IF EXISTS idx_conversations_thread;
