# Demande de review — PR #46, passe 50 (P2bis : correctifs des passes 49)

Périmètre : **deux commits de code** après `05d95510` (relu en passe 49) : `61a85710`
(`safeHref` : seuls `http`, `https`, `mailto` et les adresses relatives font un `href` ; le reste se
rend en texte, l'adresse entre parenthèses — liens ET images) et le dernier commit de la branche
(« fix(feed): passe Codex 49 — … » : `lastProseContains` par égalité ou suffixe ; `compactTurns`
promeut l'identité du tour audité absorbé par un tour déduit ; `CHILD_FEEDS_MAX = 20` dans
`job-feed.ts`, les délégations les plus récentes de la page ouvrent leur fil). Rapport précédent :
`docs/validation/rapport-review-pr46-passe49.md`. L'arbre de travail est propre.

## Questions

### P0

1. **`safeHref`** (`apps/web/src/components/Markdown.tsx`) : la regex de schéma
   `^([a-z][a-z0-9+.-]*):` — un contournement passe-t-il ? (`java\nscript:`, espaces ou tabulations
   de tête après `trim`, `&#106;avascript:` — le markdown a déjà décodé les entités ou non ?, une URL
   protocole-relative `//evil.test` acceptée comme « relative » : est-ce voulu, et le lien s'ouvre-t-il
   alors hors du site ?). Dire ce qui passe et ce qui ne passe pas, avec la chaîne exacte.
2. **Suffixe** : `said.endsWith(needle)` — une prose « Résultat : OK. » et une réponse « OK. » :
   supprimée (voulu). Une prose qui se termine par la réponse mais dit autre chose AVANT — c'est le cas
   « Voici le bilan : … Tout est prêt. » et il est voulu. Un cas où le suffixe efface une réponse qui
   dit VRAIMENT autre chose ?

### P1

3. **`CHILD_FEEDS_MAX`** : `childRows.slice(-20)` suppose `childRows` trié par `created_at`
   croissant (la requête l'ordonne). Les 20 plus récents TOUTES têtes confondues : sur une page à
   100 têtes, les délégations des premières têtes n'ouvrent jamais leur fil — dit dans le commentaire.
   Un chemin où un enfant récent d'une VIEILLE tête serait pris à la place d'un enfant plus ancien
   d'une tête récente (c'est le comportement, par date) pose-t-il un problème de lecture ?
4. **Identité promue** : après fusion, `index` (rang d'affichage) reste celui du précédent alors que
   `turn` devient celui de l'audité. Un test ou un affichage qui suppose `index`/`turn` cohérents ?

## Ce qui n'est PAS attendu

Le style, le nommage. Un constat déjà traité n'est pas à redire — une passe sans constat NEUF clôt
la session 1 de P2bis.
