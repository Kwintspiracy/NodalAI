-- verify_source — QUI a décidé comment ce projet se vérifie.
--
-- Jusqu'ici, une seule voie : le propriétaire saisit des commandes et les
-- approuve. Personne ne l'a jamais fait — 0 preuve produite sur la base de
-- référence depuis l'origine, parce que le produit demandait une information
-- que l'utilisateur n'a pas (« je sais pas quelle commande, ça m'intéresse pas
-- de savoir ce qu'il faut taper », 08/09/2026).
--
-- L'agent qui construit, lui, SAIT : il venait de lancer `node --check` et un
-- serveur HTTP pour éprouver ce qu'il livrait. Cette colonne dit d'où vient la
-- séquence de preuve, pour que l'écran l'affiche sans mentir sur son origine.
ALTER TABLE code_projects
  ADD COLUMN IF NOT EXISTS verify_source text,
  ADD COLUMN IF NOT EXISTS verify_declared_by_job_id uuid;

ALTER TABLE code_projects
  DROP CONSTRAINT IF EXISTS code_projects_verify_source_check;
ALTER TABLE code_projects
  ADD CONSTRAINT code_projects_verify_source_check
  CHECK (verify_source IS NULL OR verify_source IN ('owner', 'agent'));
