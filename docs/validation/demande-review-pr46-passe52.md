# Demande de review — PR #46, passe 52 (P2bis : correctif de la passe 51)

Périmètre : **un commit**, le dernier de la branche (« fix(feed): passe Codex 51 — la réponse déjà
dite se compare par LIGNES »), qui traite le seul constat de la passe 51
(`docs/validation/rapport-review-pr46-passe51.md`). L'arbre de travail est propre.

## Ce que le commit affirme

`lastProseContains` compare par LIGNES (chaque ligne normalisée, lignes vides retirées) : la réponse
est « déjà dite » si ses lignes sont, une à une, les dernières lignes de la dernière prose de
l'agent. Couvre le simple saut de ligne (« Voici le bilan :⏎Tout est prêt. »), garde les cas des
passes 49 (« OK. » au milieu) et 50 (« Résultat : PAS OK. » ≠ « OK. »). Test ajouté.

## Ce que l'orchestrateur dit lui-même

Cette garde a changé de forme trois fois (passes 49, 50, 51 : `includes` → suffixe → paragraphe →
ligne). Si cette passe trouve encore un cas, la forme est mauvaise et sera changée : la prose de
l'agent est TOUJOURS la réponse quand le dernier tour en a une, et `job.result` ne se montre que
lorsque le dernier tour est muet — plus de comparaison de texte du tout. Dire si ce changement de
forme serait préférable dès maintenant, avec le cas qui le justifie.

## Question

1. Un cas réel du flux (`response.text` + `dashboard_publish.text`, ou un canal Telegram avec
   `telegram_send_message` puis `return_result`) où la comparaison par lignes échoue encore alors que
   le lecteur voit deux fois le même texte ? Avec la chaîne exacte des deux champs.

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF clôt la session 1 de P2bis.
