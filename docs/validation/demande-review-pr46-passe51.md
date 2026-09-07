# Demande de review — PR #46, passe 51 (P2bis : correctif de la passe 50)

Périmètre : **un commit**, le dernier de la branche (« fix(feed): passe Codex 50 — la réponse déjà
dite se compare par PARAGRAPHES »), qui traite le seul constat neuf de la passe 50
(`docs/validation/rapport-review-pr46-passe50.md`). Les correctifs des passes 49 et 50 sont
inchangés. L'arbre de travail est propre.

## Ce que le commit affirme

`lastProseContains` (`apps/web/src/lib/conversation-feed.ts`) ne compare plus un suffixe de
caractères : la réponse (`job.result`) est « déjà dite » si SES paragraphes (séparés par une ligne
vide, chacun normalisé) sont, un à un, les DERNIERS paragraphes de la dernière prose de l'agent.
« Résultat : PAS OK. » / « OK. » → réponse gardée ; « Voici le bilan : ⏎⏎ Tout est prêt. » /
« Tout est prêt. » → dite ; réponse égale au texte entier → dite ; réponse de deux paragraphes
égale aux deux derniers → dite. Tests ajoutés pour les trois cas.

## Questions

1. **Frontière du paragraphe** : un `result` qui reprend la dernière prose à un mot près (« Tout
   est prêt » sans le point final, ou avec un émoji en plus) est maintenant montré deux fois. C'est
   le prix d'une règle exacte ; un cas RÉEL du dépôt (le runner recopie-t-il `result` depuis la
   prose, ou l'agent le réécrit-il ?) contredit-il ce choix ? Voir `return_result` et la
   finalisation dans `apps/runner`.
2. **Séparateur** : `split(/\n\s*\n/)` — une prose dont les paragraphes sont séparés par UN seul
   saut de ligne (fréquent chez les modèles) forme un seul paragraphe ; une réponse égale à sa
   dernière ligne est alors montrée deux fois. Constat ou choix acceptable ?

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF clôt la session 1 de P2bis.
