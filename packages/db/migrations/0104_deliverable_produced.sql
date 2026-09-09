-- produced — un outil a-t-il RÉUSSI à écrire dans ce livrable, pendant ce job ?
--
-- `addressed` dit ce qu'un outil a NOMMÉ. Il ne peut pas dire ce qu'il a
-- produit : l'intention de mutation est posée AVANT l'exécution, délibérément
-- (« le projet est sale avant d'être écrit »), et une tentative qui échoue la
-- laisse en place — c'est la bonne garde, une preuve doit être invalidée par
-- ce qui a été tenté.
--
-- Mais `declare_verification` s'en servait comme d'une AUTORISATION : « ce job
-- a produit ce projet, il peut donc déclarer comment on le vérifie ». Un
-- `file_edit` dont l'`old_string` est absent ne modifie rien et laisse pourtant
-- la trace : un agent délégué pouvait ainsi viser un projet qu'il n'a pas
-- produit, puis remplacer la séquence de preuve que le propriétaire avait
-- approuvée (revue Codex, PR #49, passe 2).
--
-- D'où deux colonnes pour deux questions. `addressed` reste ce que l'écran
-- montre ; `produced` est ce qui autorise à déclarer une preuve.
--
-- Défaut `false`, à l'inverse de `addressed` : une autorisation ne se présume
-- pas.
ALTER TABLE job_deliverable_verification_state
  ADD COLUMN IF NOT EXISTS produced boolean NOT NULL DEFAULT false;

-- Les jobs ENCORE EN VOL gardent le droit qu'ils avaient.
--
-- Le défaut `false` était juste pour les jobs terminés — ils ne déclareront
-- plus rien — et FAUX pour un job qui a réellement écrit avant la migration et
-- qui attend une approbation : à la reprise, sans nouvelle mutation, il se
-- serait vu refuser sa déclaration par un « this job did not produce anything »
-- qui aurait menti (revue Codex, PR #49, passe 3).
--
-- Ces lignes n'ont aucune trace du succès : la colonne n'existait pas quand
-- elles ont été écrites. Entre deux réponses également invérifiables, on garde
-- celle qui ne CHANGE pas le comportement d'un travail commencé sous l'ancienne
-- règle — et on la borne aux seules cibles qu'un outil avait nommées, pour un
-- job non terminal. Le nombre de lignes concernées se compte sur une main : ce
-- sont les jobs en cours à l'instant de la migration.
UPDATE job_deliverable_verification_state s
   SET produced = true
  FROM agent_jobs j
 WHERE j.id = s.job_id
   AND s.addressed = true
   AND (j.status IS NULL OR j.status NOT IN ('completed', 'failed', 'cancelled'));
