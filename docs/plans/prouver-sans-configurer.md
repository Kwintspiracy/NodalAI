<!-- artifact: https://claude.ai/code/artifact/34ee90de-3bd5-46e3-94c0-9e17e3028c62 -->

# Prouver sans configurer

> **MERGÉE le 09/09/2026** — PR #49, squash `6e92e558`. Six passes de revue
> Codex, plus douze sur la PR #48 dont elle dépendait.

| # | Lot | PR | État |
|---|-----|----|------|
| 1 | L'agent déclare comment on vérifie | #49 | ✅ mergée |
| 2 | Un livrable est ce qui a été VISÉ | #49 | ✅ mergée |
| 3 | L'écran MONTRE au lieu de DEMANDER | #49 | ✅ mergée |
| 4 | Un projet ne contient pas un autre projet | #49 | ✅ mergée (hors plan initial) |
| 5 | Constater les écritures réelles sur le disque | — | ⬜ backlog, lot à part |

## Ce que la vérification a corrigé DANS CE PLAN

C'est la partie la plus utile à relire : trois affirmations du plan initial se
sont révélées fausses à l'usage, et deux de mes propres correctifs sont devenus
le constat de la passe suivante.

**« Même `defaultApproval` que `run_command` suffit »** (§ Les questions, point
3) — FAUX, démontré passe 1. L'outil était absent de `CODE_EXECUTION_TOOL_NAMES`,
donc quatre gardes le manquaient : le mode autonome levait son approbation, une
règle wildcard la balayait, le frein global l'ignorait, et le refus des commandes
catastrophiques ne s'y appliquait pas. Fermé — puis rouvert dans l'AUTRE branche
d'autonomie (`destructive_gate`), fermé pour de bon passe 2.

**« Un livrable est ce qui a été écrit »** (lot 4) — la formulation était le
piège. Ce qu'on sait, c'est ce qu'un outil a NOMMÉ, pas ce qui a été écrit :
l'intention de mutation est posée AVANT l'exécution, délibérément. D'où deux
colonnes au lieu d'une : `addressed` (ce que l'écran montre) et `produced` (ce
qui autorise à déclarer une preuve), séparées passe 2 après qu'un `file_edit` au
`old_string` absent eut suffi à déclarer.

**« Le code de sortie dit si la commande a produit »** — jamais écrit dans le
plan, mais implicite dans mon correctif de la passe 3, et FAUX : `robocopy` rend
1 quand il A copié, un `build && test` sort non-zéro alors que le build a écrit.
Retiré passe 4. Le statut d'un processus ne dit rien de ce qui a touché le
disque — c'est ce qui fait du lot 5 un chantier à part.

**Question 3 (« faut-il une approbation la première fois ? ») : tranchée OUI.**
`declare_verification` porte `require_approval` et rejoint les outils
d'exécution de code, et une commande lourde dans une séquence déclarée gate la
déclaration entière — elle s'exécutera entière.

**Question 2 (`request_changes` qui n'empêche pas d'annoncer « livré ») :
toujours ouverte**, explicitement hors périmètre. Bloquer la fin d'un job change
le contrat de fin de travail.

**Décision de Quentin, 09/09** : un shell lancé à la racine d'un terrain ne
désigne aucun projet, et c'est voulu. Pour déclarer une preuve, l'agent lance sa
commande avec `cwd` sur le projet. Le refus l'enseigne — trois refus distincts,
un par cause.

## Ce qui reste, et pourquoi c'est un lot à part

`produced` répond « un outil a-t-il réussi à écrire ici ? » avec le meilleur
signal disponible : l'outil a nommé la cible, et il n'a pas déclaré d'échec. Ce
n'est pas la même chose que constater une écriture. Ni le code de sortie ni
l'instantané de checkpoint ne peuvent le dire — le second est pris une fois par
tour et exclut `dist/` et les fichiers ignorés, sous réserve du `.gitignore` de
chaque projet. Le faire vraiment demande de comparer l'état du disque avant et
après, et c'est un mécanisme entier.

Conséquence assumée : `echo ok` reste déclarable comme preuve. La description de
l'outil l'interdit en toutes lettres, ce qui est une garde faible et nommée
comme telle.

---

> Le plan tel qu'il était écrit AVANT la mise en œuvre suit. Il est conservé
> intact : c'est ce qui rend lisible ce que la vérification a corrigé.

## Le sujet, en une phrase

**Celui qui construit sait comment on vérifie. C'est donc lui qui le dit — pas
l'utilisateur.**

## Ce qui a été constaté, le 08/09/2026

Sur la base de Quentin, `verification_runs` porte **0 ligne**. Depuis toujours.
Aucun projet n'a de commandes de vérification, aucun n'a de manifeste approuvé.
118 états de livrables enregistrés, tous `dirty` (76) ou `not_configured` (42) —
jamais un vert, jamais un rouge, jamais même un `pending_approval`.

**La vérification système de Nodal n'a jamais tourné une seule fois.** Le moteur
existe et il est testé ; l'écran existe aussi (`/code`, panneau de vérification,
avec un bouton qui lit `package.json` pour proposer des commandes). Ce qui
manque est ailleurs : le produit demande à l'utilisateur une information qu'il
n'a pas et ne veut pas avoir.

Quentin, 08/09 : *« je sais pas quelle commande, je sais pas ce qu'il faut
taper. En fait ça m'intéresse pas de savoir ce qu'il faut taper. Je m'en fous.
Ce que je veux, c'est que Nodal fasse des tests et que ces tests soient décidés
par l'agent. »*

Et l'agent SAIT. Sur le job `cfcf954c` (l'app « Mes Recettes »), sans que
personne ne le lui demande :

| Ce qu'il a lancé | Résultat |
|---|---|
| `node --check app.js` | exit 0 — la syntaxe tient |
| un serveur HTTP, puis `curl` sur les trois fichiers | `index:200 css:200 js:200`, titre « Mes Recettes » présent |

Trois preuves d'exécution, produites spontanément, et **aucune enregistrée** :
elles sont passées par `run_command`, qui n'écrit jamais dans
`verification_runs`. Seule une commande CONFIGURÉE y écrit, et
`finalize.ts:409` saute tout ce qui n'est pas `ready`.

## Suivi

| # | Ce qui change | Taille |
|---|---|---|
| 1 | L'agent déclare comment vérifier ce qu'il vient de produire | M |
| 2 | Le système l'exécute à la fin et l'enregistre comme preuve | M |
| 3 | L'écran des commandes MONTRE au lieu de DEMANDER | S |
| 4 | Un livrable est ce qui a été écrit, pas ce qui aurait pu l'être | M |

## Ce que Quentin verra changer

**Il ne tapera plus jamais une commande de test.** À la fin d'un travail qui
produit quelque chose, l'écran dira « vérifié » avec ce qui a été lancé et ce
que ça a donné, ou « rouge » avec la sortie qui l'explique.

**Une app livrée ne comptera plus vingt livrables.** Aujourd'hui `run_command`
déclare conservativement tout ce qu'un shell POURRAIT écrire — le cwd plus tous
les dossiers attachés, développés en sous-dossiers (12 par racine,
`intent.ts:167`). C'est le bon périmètre pour une GARDE de sécurité, et le
mauvais pour une liste de livrables : l'écran affichait `shared/_archive`,
`shared/notes` et `waterapp-animation-qwen3.827b` comme des livrables non
vérifiés d'une app de recettes.

## Les points

### 1 · L'agent déclare sa vérification — M

Un outil, appelé quand il a fini de produire : *voici comment on vérifie ce que
je viens de faire*. Une ou plusieurs commandes, avec le dossier où les lancer.

**Ce n'est pas un pouvoir nouveau**, et c'est ce qui rend la brique possible :
ces commandes, l'agent les a DÉJÀ exécutées pendant son travail, via
`run_command`, sous les règles d'autorisation que le propriétaire lui a fixées.
Déclarer sa propre vérification n'ouvre aucune porte — cela garde une trace de
ce qui était déjà fait.

*Preuve* : un job qui a lancé `node --check` puis un `curl` déclare ces deux
commandes ; la déclaration est relue à l'identique.

### 2 · Le système exécute et enregistre — M

`finalize` exécute la séquence déclarée et écrit une ligne par commande dans
`verification_runs` — la table est déjà faite pour ça : `command`, `exit_code`,
`stdout_tail`, `stderr_tail`, `duration_ms`, `verdict`. Rien à changer au
schéma.

Le verdict du livrable devient `green` ou `red` au lieu de `not_configured`.

⚠️ **À trancher avant de coder** : `finalize.ts:409` ignore aujourd'hui tout
livrable dont la configuration n'est pas `ready` — l'état `ready` suppose des
commandes approuvées par le propriétaire, via un hash de manifeste. Une
vérification déclarée par l'agent n'a pas ce hash. Faut-il un troisième état,
ou la déclaration de l'agent vaut-elle configuration ?

### 3 · L'écran MONTRE au lieu de DEMANDER — S

Le panneau de vérification d'un projet ne présente plus un champ à remplir. Il
affiche ce que l'agent a décidé de lancer, et ce que ça a donné. Le propriétaire
peut corriger ; il n'a jamais à écrire.

### 4 · Un livrable est ce qui a été écrit — M

Le périmètre déclaré par `run_command` reste ce qu'il est : une garde, large
exprès. Ce que l'écran liste devient autre chose — les chemins RÉELLEMENT
touchés. La distinction manque aujourd'hui, et c'est elle qui produit les dix-
neuf livrables fantômes.

*Preuve* : le job `cfcf954c` rejoué déclare un livrable, `recipes-app`, et pas
vingt.

## Les questions que je ne sais pas trancher

1. **Une vérification qui échoue à s'exécuter** (`infra_error` : commande
   introuvable, timeout) est-elle un échec du livrable, ou un silence ?
2. **Un `request_changes` d'un relecteur doit-il empêcher d'annoncer
   « livré » ?** Sur le job `cfcf954c`, DEUX relecteurs ont rendu
   `request_changes` — tri Z→A qui n'inverse pas, injection résiduelle dans
   l'attribut `src`, crash possible à l'édition, quota `localStorage` ignoré —
   et le job s'est terminé en annonçant « application livrée ».
3. **Faut-il une approbation la première fois ?** L'argument du point 1 dit non
   (aucun pouvoir nouveau). Mais la vérification tourne à la FIN, hors du flux
   d'approbation : si l'agent est en « approbation requise » pour
   `run_command`, laisser passer sa vérification sans approbation contournerait
   la règle que le propriétaire a posée.

## Ce que ça ne contient pas

- **Le typage du livrable et le vérificateur de document** — c'est « Créer,
  c'est prouver », qui reste valable et vient après : il traite ce qui n'est PAS
  un projet de code (un skill, une note, un classeur).
- **Le rattachement des envois au fil de leur chat** — PR séparée, déjà prévue.
