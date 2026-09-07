# Demande de review — PR #46, passe 53 (P2bis : la réponse finale, règle de structure)

Périmètre : **un commit**, le dernier de la branche (« fix(feed): passe Codex 52 — la réponse
finale suit une règle de structure, plus de comparaison de texte »), qui suit la recommandation de
la passe 52 (`docs/validation/rapport-review-pr46-passe52.md`). L'arbre de travail est propre.

## Ce que le commit affirme

`lastProseContains` (quatre formes en quatre passes) est REMPLACÉE par `lastAgentTurnSpoke` :
l'item `answer` (`job.result`) n'est poussé que si le dernier tour de l'agent — en remontant à
travers tours muets, notes, délégations, encarts, jusqu'à la demande — ne porte AUCUNE prose. Quand
l'agent a parlé, sa prose est la réponse ; `job.result` ne se compare plus à rien. Tests : prose
présente (identique, différente, markdown, opposée) → aucun `answer` ; dernier tour muet →
`answer` ; résultat vide → rien.

## Questions

1. **Perte d'information** : quand `job.result` dit AUTRE chose que la prose (« Je regarde. » puis
   `result` = « Tout est prêt. »), le lecteur ne voit plus « Tout est prêt. ». Dans le flux réel
   (`dashboard_publish.text` écrit `job.result` ; le chat du dashboard relit `job.result` pour la
   bulle de réponse ? — vérifier `conversation-thread.ts` et le chemin `chat_messages`), ce texte
   est-il affiché ailleurs dans le fil (bulle assistant du dashboard, message Telegram envoyé et
   sa carte `sent`) ? Si non, dire où il devrait paraître.
2. **Le fil d'un JOB seul** (`/scheduled/[id]`, `ProjectThread`) passe par le même
   `buildConversationFeed` : même règle. Un cas où un run cron sans prose finale (tout en outils)
   perdrait sa réponse ? (Il devrait au contraire la montrer : dernier tour muet.)

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF clôt la session 1 de P2bis.
