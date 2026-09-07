# Demande de review — PR #46, passe 54 (P2bis : correctif de la passe 53)

Périmètre : **un commit**, le dernier de la branche (« fix(feed): passe Codex 53 — une carte
d'envoi vaut réponse »), qui traite le seul constat de la passe 53
(`docs/validation/rapport-review-pr46-passe53.md`). L'arbre de travail est propre (hors docs).

## Ce que le commit affirme

`lastAgentTurnSpoke` compte comme réponse, sur le dernier tour de l'agent, une PROSE ou une carte
d'ENVOI DE MESSAGE (`presented.card === 'sent' && presented.kind === 'message'`) : la carte
« Sent to … » montre déjà le texte livré (`SentCard` rend `input.text`), l'item `answer` ne le
répète plus. Un envoi de FICHIER (`kind: 'file'`) ne compte pas : il ne porte pas de phrase, et
`job.result` reste montré. Toujours une règle de structure (la sorte de carte et son `kind`),
jamais une comparaison de texte. Tests : cron tout en outils (`dashboard_publish` +
`return_result`) → une carte `sent`, aucun `answer` ; `send_file` seul → `answer` montré.

## Questions

1. **Un `telegram_send_message` dont l'input n'a pas de `text`** (ou un texte vide) mais dont la
   charge dit `kind: 'message'` : `SentCard` n'affiche aucun texte, et `job.result` n'est plus
   montré. Ce cas existe-t-il dans le flux réel (voir l'outil et son présentateur dans
   `packages/tools/src/communication`) ? Si oui, scénario et correction proposée (par exemple :
   compter l'envoi seulement si `input.text` non vide — c'est encore de la structure, pas du texte
   comparé).
2. **Une carte `sent` qui a ÉCHOUÉ** : `showsAlone` exige `outcome === 'success'` pour une carte
   de résultat, donc un envoi raté reste une étape repliée et ne compte pas — confirmer sur
   `showsAlone` (`conversation-feed.ts`).

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF clôt la session 1 de P2bis.
