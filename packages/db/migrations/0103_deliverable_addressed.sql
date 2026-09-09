-- addressed — ce livrable a-t-il été NOMMÉ par un outil, ou entre-t-il dans le
-- périmètre par précaution ?
--
-- `run_command` déclare conservativement tout ce qu'un shell pourrait écrire :
-- le dossier courant ET toutes les racines attachées, dépliées en
-- sous-dossiers. C'est la bonne garde — un shell écrit où il veut — et la
-- mauvaise liste : le 08/09/2026, une application de recettes s'affichait avec
-- vingt livrables non vérifiés, dont `shared/_archive`, `shared/notes` et
-- `waterapp-animation-qwen3.827b`.
--
-- Défaut `true` : les lignes déjà écrites restent visibles. Masquer
-- rétroactivement des livrables serait pire que le bruit qu'on corrige.
ALTER TABLE job_deliverable_verification_state
  ADD COLUMN IF NOT EXISTS addressed boolean NOT NULL DEFAULT true;
