-- 0100 — un appel LLM sait de quelle CONVERSATION il vient.
--
-- Quentin, 07/09, devant un fil du tableau de bord : l'en-tête dit « 1 agent »,
-- la barre d'état dit « 0 agents, 0 tokens, n/a ». Les deux ont raison de leur
-- point de vue, et c'est le défaut : l'en-tête compte les agents qui ont PARLÉ
-- dans le fil, la barre agrège les lignes `llm_calls` d'un fil… par `job_id`.
--
-- Or une conversation du tableau de bord ne passe pas par un job : le runner
-- répond dans le tour de chat (`run-chat-turn.ts`), et écrit ses appels avec
-- `source = 'chat'` et `job_id = NULL`. Mesuré sur la base dev : les deux
-- appels de la conversation « tu es la ? » existent, 18 384 jetons d'entrée et
-- 0,0125 $ au total — invisibles, faute d'un lien vers leur conversation.
--
-- `set null`, comme `job_id` : une ligne d'audit survit à la suppression de la
-- conversation qu'elle traçait. L'index sert la lecture d'un fil, exactement
-- comme `idx_llm_calls_job`.
--
-- Les lignes ANTÉRIEURES gardent `NULL` : rien ne permet de les rattacher
-- après coup (aucune colonne ne dit à quelle conversation un appel de chat
-- appartenait). Un fil ancien continuera donc d'afficher zéro — c'est la
-- vérité de ce qu'on sait de lui, pas une invention.
ALTER TABLE llm_calls ADD COLUMN IF NOT EXISTS conversation_id uuid;
--> statement-breakpoint
ALTER TABLE llm_calls
  ADD CONSTRAINT llm_calls_conversation_id_fk
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_llm_calls_conversation
  ON llm_calls (conversation_id, created_at);
