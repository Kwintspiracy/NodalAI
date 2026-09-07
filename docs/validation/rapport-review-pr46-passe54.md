## Constat neuf bloquant

### `dashboard_publish` n’est toujours pas reconnu comme une réponse

- Fichiers et lignes :
  - [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:397)
  - [dashboard-publish.ts](D:/APPS/NodalAI/packages/tools/src/builtin/dashboard-publish.ts:43)
  - [conversation-feed.test.ts](D:/APPS/NodalAI/apps/web/src/lib/__tests__/conversation-feed.test.ts:494)
- Ce qui casse : `lastAgentTurnSpoke` ne reconnaît que les cartes `sent` dont `presented.kind === 'message'`. Or le présentateur réel de `dashboard_publish` produit `kind: 'dashboard'`. Le test passe parce qu’il construit manuellement une charge impossible pour cet outil avec `kind: 'message'`.
- Scénario concret : un cron termine sans prose avec :
  - `dashboard_publish({ text: "Tout est prêt." })`
  - `return_result({ status: "success" })`

  En production, la carte est `{ card: 'sent', kind: 'dashboard' }`. Elle ne satisfait donc pas la condition ligne 398. `lastAgentTurnSpoke` renvoie `false` et [conversation-feed.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:705) ajoute encore `job.result`. Le lecteur voit toujours « Tout est prêt. » dans la carte puis dans l’item `answer`.

Correction proposée : reconnaître également le `kind: 'dashboard'` comme livraison textuelle, ou définir explicitement une propriété structurelle commune aux sortes de cartes qui rendent `input.text`. Le test doit obtenir la charge via le véritable présentateur de `dashboard_publish`, ou au minimum employer `kind: 'dashboard'`.

## Réponses aux deux questions

1. Un `telegram_send_message` sans `text` ou avec `text: ''` ne peut pas atteindre normalement le présentateur ni l’exécution : [telegram-send-message.ts](D:/APPS/NodalAI/packages/tools/src/communication/telegram-send-message.ts:21) impose un champ obligatoire `z.string().min(1)` à la ligne 28.

   Une chaîne composée uniquement d’espaces est techniquement acceptée, mais ce n’est pas un « texte vide » au sens du schéma. Durcir avec `.trim().min(1)` serait raisonnable, mais je n’en fais pas un constat bloquant propre à ce commit : le flux normal ne permet ni l’absence du champ ni `''`.

2. Confirmé : [showsAlone](D:/APPS/NodalAI/apps/web/src/lib/conversation-feed.ts:280) renvoie `false` dès que `step.outcome !== 'success'`, ligne 288. Une carte `sent` échouée reste donc dans les étapes repliées et n’est jamais ajoutée comme bloc `card`. Par conséquent, `lastAgentTurnSpoke` ne la compte pas et `job.result` peut rester affiché.

## EXÉCUTÉ

- Lecture de `demande-review-pr46-passe54.md` et `rapport-review-pr46-passe53.md`.
- Inspection de `git show f3611f2d`.
- Inspection par recherche statique de `lastAgentTurnSpoke`, `showsAlone`, `SentCard`, des schémas et des présentateurs de `dashboard_publish` et `telegram_send_message`.
- Vérification de l’état Git.
- Tentative d’exécution du test Vitest ciblé. Elle a été refusée par le profil d’exécution en lecture seule ; aucun test n’a donc effectivement tourné.

## DÉDUIT sans exécuter

- La duplication persistante de `dashboard_publish`, en confrontant la condition `kind === 'message'` à la charge réelle `kind: 'dashboard'`.
- Le caractère non représentatif du fixture ajouté.
- Le rejet des entrées Telegram absentes ou `''` par le schéma Zod.
- Le comportement des cartes échouées, par application de `showsAlone`.

## Constats bloquants neufs

1. **Le correctif ne traite pas le constat de la passe 53 : le vrai `dashboard_publish` produit `kind: 'dashboard'`, tandis que le code et le test supposent `kind: 'message'`.**