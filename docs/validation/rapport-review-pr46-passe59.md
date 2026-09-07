## Relecture du commit `4584b39a`

Le diff fonctionnel porte uniquement sur [layout.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/layout.tsx:99) : `overflow-x-hidden` devient `overflow-x-clip`.

### 1. Perte du défilement horizontal programmatique

Le constat redouté est faux dans le périmètre inspecté.

- Aucune utilisation de `scrollLeft` n’existe dans `apps/web`.
- Le seul défilement programmatique trouvé est `transcriptRef.current?.scrollTo(...)` dans `apps/web/src/app/onboarding/OnboardingFlow.tsx:329`. Cette page est hors du layout dashboard concerné.
- Les contenus larges du dashboard possèdent leur propre conteneur horizontal, notamment :
  - [Table.tsx](D:/APPS/NodalAI/apps/web/src/components/ui/Table.tsx:46)
  - [Markdown.tsx](D:/APPS/NodalAI/apps/web/src/components/Markdown.tsx:231)
  - [ConversationFeedView.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/ConversationFeedView.tsx:409)
  - [CodeProcessDetail.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/code/[id]/CodeProcessDetail.tsx:621)
  - [VerificationSection.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/code/[id]/VerificationSection.tsx:182)
  - [LogsTable.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/logs/LogsTable.tsx:133)

Aucun écran identifié ne dépend donc de la capacité du wrapper global à modifier `scrollLeft`.

### 2. Contenu comptant sur le défilement horizontal du document

Aucun cas trouvé.

Le pane principal est réductible grâce à `min-w-0` dans [layout.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/layout.tsx:88). Le contenu explicitement plus large que son viewport est contenu par un `overflow-x-auto` local. Le cas le plus manifeste est la grille `min-w-[560px]` de [CodeProcessDetail.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/code/[id]/CodeProcessDetail.tsx:622), immédiatement précédée de son wrapper horizontal à la ligne 621.

Les autres largeurs minimales relevées concernent des contrôles ou des éléments internes, sans mécanisme indiquant que le document doit défiler horizontalement.

### 3. Contenu masqué par les éléments `sticky` réactivés

Aucun masquage incorrect établi par la structure du DOM.

- Le composer est en flux à [ThreadComposer.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:94).
- Dans [chat/[id]/page.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/[id]/page.tsx:90), l’ordre est : fil, composer aux lignes 96–102, puis barre d’état aux lignes 103–110.
- Le composer utilise `bottom-7`, soit la hauteur `h-7` de la barre d’état dans [StatusBar.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/spaces/StatusBar.tsx:51). Les deux zones sont donc positionnées bord à bord, pas l’une sur l’autre.
- La barre d’état reste elle aussi en flux et vient après le contenu.
- La barre de sauvegarde est le dernier élément du formulaire dans [AgentComposer.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/agents/[id]/edit/AgentComposer.tsx:3756). Son conteneur possède `pb-24` à la ligne 3100, ce qui laisse une réserve inférieure supérieure à la hauteur de la barre.

Le chevauchement temporaire propre au comportement `sticky` pendant le défilement est voulu ; aucun bouton ou pied de formulaire rendu définitivement inaccessible n’a été identifié.

### 4. Compatibilité navigateur

Le dépôt ne déclare aucune cible navigateur minimale (`browserslist` ou configuration équivalente). Je ne trouve donc aucun navigateur cible ancien permettant de réfuter l’emploi de `overflow: clip`.

La couverture E2E ne valide toutefois que Chromium, dans [playwright.config.ts](D:/APPS/NodalAI/apps/web/playwright.config.ts:48). La compatibilité effective sous Firefox et Safari n’est pas couverte par la configuration de test du projet.

## Constats bloquants neufs

Aucun.

## Ce que je n'ai pas pu vérifier

- Tests unitaires, typecheck, lint et E2E : **NON EXÉCUTÉS** — sandbox en lecture seule.
- Comportement visuel réel des trois éléments sticky dans un navigateur : **NON EXÉCUTÉ**.
- Rendu sous Firefox et Safari : **NON EXÉCUTÉ** ; Playwright ne configure qu’un projet Chromium.
- La mesure annoncée de 1582 px à 813 px n’a pas pu être reproduite.