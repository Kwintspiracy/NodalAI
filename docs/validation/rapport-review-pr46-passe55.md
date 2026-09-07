Aucun constat neuf bloquant sur `d9f1edda`. Le correctif traite correctement le constat de la passe 54.

## Réponses aux questions

1. Correspondance des présentateurs `sent` :

| Présentateur | `kind` produit | Texte affiché par `SentCard` via `input.text` |
|---|---|---|
| `dashboard-publish.ts:43` | `dashboard` | Oui |
| `telegram-send-message.ts:110` | `message` | Oui |
| `send-file.ts:126` | `file` | Non |
| `send-image.ts:117` | `image` | Non |
| `send-media.ts:83` | `video`, `audio` ou `voice` | Non |

L’ensemble `{ message, dashboard }` correspond donc exactement aux sortes dont le texte est rendu par [ConversationFeedView.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:573), lequel ne lit que `input.text`.

Les outils fichier/image/média acceptent éventuellement `input.caption`, mais `SentCard` ne rend pas ce champ. Une voix avec une légende ne devient donc pas une réponse textuelle déjà visible dans le fil. En outre, les adaptateurs Telegram et WhatsApp n’envoient pas de légende avec l’audio ou la voix.

2. Je n’ai trouvé aucun point bloquant antérieur encore ouvert que ce commit aurait dû couvrir. Le comportement des cartes `sent` échouées vérifié en passe 54 reste correct : elles ne sont pas présentées seules et ne masquent donc pas `job.result`.

## EXÉCUTÉ

- Lecture de `demande-review-pr46-passe55.md` et `rapport-review-pr46-passe54.md`.
- Inspection de `git show d9f1edda`.
- Inspection des cinq présentateurs, de `sentCard`, du schéma `SentCardSchema`, de `lastAgentTurnSpoke` et du rendu `SentCard`.
- Recherche des légendes dans les outils et adaptateurs de livraison.
- Consultation des rapports des passes précédentes pertinentes.
- `git diff d9f1edda^ d9f1edda --check` : aucune erreur.
- `git status --short` : arbre propre.

Les tests Vitest, le typecheck et le lint ont été demandés, mais leur lancement a été refusé par le profil d’exécution en lecture seule. Ils n’ont donc pas été exécutés.

## DÉDUIT sans exécuter

- Le scénario `dashboard_publish` est désormais reconnu grâce à `SENT_TEXT_KINDS.has('dashboard')`.
- Les envois `file`, `image`, `video`, `audio` et `voice` laissent correctement apparaître `job.result`.
- Une éventuelle `caption` de média n’est pas affichée par `SentCard`, qui ne lit que `input.text`.
- Le test modifié emploie désormais le véritable `kind: 'dashboard'`.

## Constats bloquants neufs

Aucun.