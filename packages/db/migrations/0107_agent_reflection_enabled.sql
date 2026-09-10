-- La réflexion par AGENT, pas seulement par propriétaire.
--
-- Elle était tout ou rien : `entities.reflection_enabled` ouvrait la boucle
-- d'apprentissage pour tous les agents d'un propriétaire à la fois. Sur le run
-- 20b73ed1 (09/09/2026), un relecteur qui venait de rendre « approve » sans un
-- seul constat a déclenché trois appels de réflexion à 0,041 $ — 12 % de la
-- facture du run — pour apprendre d'un travail qui n'avait rien à apprendre.
--
-- NULL = suivre le réglage du propriétaire. C'est le défaut, donc aucune
-- installation existante ne change de comportement. FALSE = jamais pour cet
-- agent. TRUE n'est pas un contournement : la porte de l'entité reste au-dessus.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS reflection_enabled boolean;
