# Demande de review — PR #46, passe 63 (correctif de la passe 62)

Périmètre : **le dernier commit de code** de la branche (« fix(spaces): passe Codex 62 — sans
ROOT, le vrai geste : créer un orchestrateur, vers Agents »). Diff : `git diff <hash>^ <hash> --
apps/web` — le hash est donné dans la consigne.

## Ce que le commit affirme

1. `composerPresentation` rend, sans ROOT, `{ kind: 'blocked', message, action: { label, href:
   '/agents' } }` ; `ProjectThread` rend le message et le lien (mêmes classes que l'état vide de
   `RootAgentSection`). Plus aucune mention de Settings.
2. Les deux textes périmés hors du diff précédent sont alignés : l'erreur `no_root_agent` de
   `createProjectConversationAction` et la bannière `noRoot` de `ConversationsList` (lien vers
   `/agents`, « Create an orchestrator agent — the first one you create becomes this workspace's
   ROOT »).
3. Tests : `project-landing.test.ts` (le cas bloqué exige `href: '/agents'` et un libellé qui
   nomme le ROOT), `ProjectThread.test.tsx` (lien `/agents`, pas de « Settings »),
   `project-actions.test.ts` (le message d'erreur).

## Questions

1. **Reste-t-il un texte qui dit de « désigner » le ROOT** dans `apps/web` (grep `Designate`,
   `designate`), ou dans le runner (un message d'outil, une carte Telegram) ?
2. **Le premier orchestrateur devient ROOT automatiquement** — est-ce vrai pour une entité créée
   après coup (multi-entités, LAN) ? Si une entité peut exister sans jamais recevoir de ROOT par
   ce chemin, le message « create an orchestrator » serait faux pour elle. Où est la règle ?
3. Un point resté ouvert des passes 60 à 62 que ce commit ne couvre pas ?

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF ferme ce point.
