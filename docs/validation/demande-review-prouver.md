# Demande de review — « Prouver sans configurer »

## Ce que la PR affirme

La vérification système n'avait jamais tourné : `verification_runs` portait 0
ligne depuis l'origine, parce qu'un projet ne se vérifie que si son
propriétaire a saisi ET approuvé des commandes. Désormais l'agent qui construit
déclare comment on vérifie, et la finalisation exécute.

1. `declare_verification` écrit `verify_commands` ET le hash de manifeste qui
   les rend exécutables (migration 0102 : `verify_source`).
2. Aucune ligne du moteur ne change — `loadConfig` trouve `ready` comme pour une
   configuration approuvée.
3. Un livrable est ce qu'un outil a NOMMÉ (`addressed`), pas tout le périmètre
   d'un shell (migration 0103).
4. L'écran dit la provenance et ne demande plus rien.

## Questions, par priorité

### P0 — l'auto-approbation est-elle une porte dérobée ?

1. `declare_verification` écrit `verify_approved_manifest_hash` lui-même. Un
   agent peut donc faire exécuter une commande arbitraire à la finalisation.
   L'argument de la PR : il pouvait déjà l'exécuter via `run_command`, et
   l'outil porte le même `defaultApproval: 'require_approval'`. Cet argument
   tient-il ? En particulier : la commande déclarée s'exécute-t-elle avec les
   MÊMES restrictions que `run_command` (shell, env, cwd, timeout), ou avec
   d'autres ?
2. Un agent DÉLÉGUÉ peut-il déclarer la vérification d'un projet qu'il n'a pas
   produit ? L'outil ne vérifie que l'appartenance à l'entité.

### P1

3. `addressed` : la valeur par défaut est `true` (colonne et `MutationTarget`).
   Un outil mutant neuf qui oublie `scope` rend donc son livrable visible. Est-ce
   le bon défaut, ou faut-il l'inverse ?
4. Dans `resolveDeliverables` (intent.ts), les clés adressées sont calculées
   SANS `expandWorkspaceRoots`. Un cwd qui EST une racine attachée est-il alors
   marqué adressé, ou perdu ?
5. La migration 0103 met `addressed = true` par défaut sur les lignes
   existantes. Les vingt livrables du job `cfcf954c` restent donc visibles.
   Voulu (on ne masque pas rétroactivement) — ou incohérent avec le but ?

### P2

6. `ProjectVerificationPanel` : le propriétaire peut-il encore corriger une
   séquence déclarée par un agent, et son approbation repasse-t-elle bien
   `verify_source` à `owner` ? (Je ne crois pas l'avoir fait.)

## Hors périmètre

- Le `request_changes` d'un relecteur qui n'empêche pas d'annoncer « livré » —
  lot suivant, assumé.
- Le typage du livrable non-code (« Créer, c'est prouver »).

## Ce dont je doute moi-même

- Que l'agent déclare une commande qui prouve VRAIMENT quelque chose. Rien
  n'empêche `echo ok`. La description le lui interdit en toutes lettres, ce qui
  est une garde faible.
- Le point 6 ci-dessus : je crois avoir laissé une incohérence.
