-- L'index qui sert la question « quels chats DEVRAIENT être listés ? »
--
-- `/chat` pose deux questions à la base, et elles ne se servent pas du même
-- index. La première — quel est le fil courant de chaque chat — est couverte
-- par `idx_conversations_thread_tiebreak` (migration 0105). La seconde, ajoutée
-- pour ne plus annoncer comme « écarté par le plafond » un chat qu'aucune
-- conversation listable ne remplit, filtre sur l'ORIGINE : aucun index ne la
-- porte (revue Codex, PR #48, passe 10).
--
-- Index PARTIEL : la prédicat reprend exactement les filtres de la requête —
-- une origine que la liste accepte, un canal qui n'est pas le dashboard, un
-- `chat_id` renseigné et non vide. Il ne couvre donc que les lignes qui peuvent
-- répondre, et reste petit là où la table grandit surtout par les fils qu'il
-- exclut.
--
-- Les colonnes sont celles du DISTINCT, dans l'ordre où la requête les
-- regroupe : `entity_id` d'abord (le filtre), puis le triplet qui identifie un
-- chat.
--
-- Cette migration vit sur la PR #49 alors qu'elle sert la #48, comme la 0105 :
-- les numéros libres sont ici, et renuméroter une migration déjà appliquée sur
-- la base de dev coûterait plus que d'attendre le merge.
CREATE INDEX IF NOT EXISTS idx_conversations_listable_chats
  ON conversations (entity_id, agent_id, channel, chat_id)
  WHERE origin IN ('user', 'project')
    AND channel <> 'dashboard'
    AND chat_id IS NOT NULL
    AND chat_id <> '';
