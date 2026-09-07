## Relecture du commit `3415aab1`

### 1. La page Code change-t-elle de comptage ?

Le constat annoncé est faux pour le dossier partagé injecté uniquement par le runner.

Dans [actions.ts](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:11953), la page Code construit d’abord un `ChangeRef` avec les seuls workspaces issus de `agent_workspaces`, puis exige `isInsideWorkspace(...)` à la ligne 11957. Or [isInsideWorkspace](D:/APPS/NodalAI/apps/web/src/lib/code-projects.ts:311) ne reconnaît que les workspaces attachés au pipeline.

Le nouveau dossier partagé est ajouté uniquement à la liste utilisée ensuite par `canonicalChangePath`, dans [workspace-roots.ts](D:/APPS/NodalAI/apps/web/src/lib/workspace-roots.ts:48). Il n’est pas ajouté aux `WorkspaceRef` servant au filtrage.

Conséquence : une écriture située seulement dans `<root>/<entity>/shared` reste rejetée avant d’atteindre la canonicalisation de [actions.ts](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:11961). Même comportement dans le détail, avec le filtre aux lignes [12514–12520](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:12514).

Donc :

- les groupes Code déjà admis peuvent théoriquement utiliser la nouvelle racine ;
- mais un fichier du workspace partagé non déclaré en base ne devient pas admissible grâce à ce commit ;
- le changement effectif recherché concerne le récapitulatif du fil, qui ne passe pas par `isInsideWorkspace`.

Il n’y a donc pas, dans le cas décrit par la demande, de nouvelle scission ou fusion sur la page Code. Le commentaire affirmant une règle réellement partagée entre Code et le fil est trompeur.

### 2. Désaccord d’environnement entre le web et le runner

Le risque est réel et silencieux.

Le runner calcule sa racine depuis son propre `process.env['NODALAI_WORKSPACES_ROOT']` dans [workspaces-root.ts](D:/APPS/NodalAI/apps/runner/src/lib/workspaces-root.ts:16). Le web refait indépendamment ce calcul au moment de la lecture dans [workspace-roots.ts](D:/APPS/NodalAI/apps/web/src/lib/workspace-roots.ts:26).

Si les deux processus n’ont pas la même variable — ou pas le même `homedir()` — le chemin absolu persisté par le runner ne commence pas par la racine calculée par le web. [canonicalChangePath](D:/APPS/NodalAI/apps/web/src/lib/coding-changes.ts:235) ne retire alors rien et renvoie le chemin absolu.

Ce qui casse : dans le récapitulatif, l’écriture absolue et une autre présentation relative du même fichier deviennent deux clés distinctes dans le `Set` de [conversation-thread.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-thread.ts:170), donc « Files 2 » peut réapparaître.

Il faut le formuler comme une contrainte de déploiement : `NODALAI_WORKSPACES_ROOT` et le répertoire personnel de repli doivent être identiques entre runner et web. Le code ne vérifie ni ne signale cette cohérence.

### 3. `findLineCounts` avec un seul compteur

Pour les présentateurs présents dans le dépôt, la règle est correcte par construction.

[findLineCounts](D:/APPS/NodalAI/apps/web/src/lib/coding-changes.ts:212) procède ainsi :

- égalité exacte si la clé existe ;
- sinon, si la carte n’a qu’un compteur, attribution de ce compteur au chemin présenté ;
- sinon `null`.

Les outils textuels unitaires `file_write` et `file_edit` utilisent `writtenFile`, qui construit une carte contenant exactement un fichier dans [presenters.ts](D:/APPS/NodalAI/packages/tools/src/presenters.ts:142). Le chemin peut être résolu dans la sortie alors qu’il était relatif dans l’entrée, mais il désigne bien cette unique écriture.

Je n’ai trouvé aucun présentateur du dépôt mélangeant dans une même carte une écriture et d’autres fichiers `listed`. Les outils de liste produisent seulement des entrées `listed`, notamment [file-list.ts](D:/APPS/NodalAI/packages/tools/src/builtin/file-ops/file-list.ts:87). De plus, `listed` n’est pas spécialement exclu lors de l’appel à `findLineCounts`, mais ces appels de lecture ont une carte de compteurs vide, donc la fonction rend `null`.

Pour `cli:file_change`, le runner développe un changement multifichier en une ligne d’audit par fichier dans [codex-turn.ts](D:/APPS/NodalAI/apps/runner/src/cli-runtime/codex-turn.ts:265). Les lignes CLI n’ont par ailleurs pas de charge `presented` structurée dans le chemin d’enregistrement observé ; elles ne créent donc pas le scénario « carte à deux fichiers dont un seul écrit » décrit dans la question.

La forme problématique reste autorisée par le type générique `filesCard`, mais aucun producteur actuel ne l’émet.

### 4. Sensibilité à la casse sur POSIX/macOS

Le constat technique est vrai.

[canonicalChangePath](D:/APPS/NodalAI/apps/web/src/lib/coding-changes.ts:232) ne rend la comparaison insensible à la casse que lorsque `isWindowsPath(p)` reconnaît le chemin comme Windows. Pour `/Users/Quentin/App` face à `/users/quentin/app`, la racine n’est pas retirée.

Le risque est atteignable sur un macOS utilisant un volume insensible à la casse si deux producteurs conservent des graphies différentes :

- un chemin relatif résolu depuis la racine configurée garde la casse de cette racine ;
- un chemin absolu CLI peut conserver une autre casse pourtant acceptée par le système de fichiers.

La page Code peut alors séparer deux écritures du même fichier, puisque le regroupement utilise directement la valeur canonique dans [actions.ts](D:/APPS/NodalAI/apps/web/src/lib/actions.ts:12520).

Pour les outils Nodal unitaires, le risque est beaucoup plus faible : le chemin présenté est issu de la résolution faite avec le workspace injecté, donc sa casse devrait suivre cette racine. Le chemin CLI est la voie concrète permettant la divergence. Le dépôt indique toutefois que la forme réelle de `file_change` Codex n’a pas été observée sur la machine de développement, dans [codex-turn.ts](D:/APPS/NodalAI/apps/runner/src/cli-runtime/codex-turn.ts:222).

### 5. Points de la passe 57 et composer

Le problème `index.ts` contre `a/index.ts` est bien fermé dans le récapitulatif : après canonicalisation, le `Set` de [conversation-thread.ts](D:/APPS/NodalAI/apps/web/src/lib/conversation-thread.ts:170) utilise une égalité stricte. Aucun suffixe ne subsiste dans `coding-changes.ts`.

En revanche, le correctif du composer n’est pas suffisant. Dans [ThreadComposer.tsx](D:/APPS/NodalAI/apps/web/src/app/(dashboard)/chat/ThreadComposer.tsx:74), le code enchaîne :

```ts
setMessage('');
if (box.current) fitToContent(box.current);
```

`setMessage` ne modifie pas synchroniquement la valeur DOM du `<textarea>` contrôlé. Lors de l’appel immédiat à `fitToContent`, `box.current.scrollHeight` peut donc encore correspondre au texte envoyé. La zone n’est pas nécessairement mesurée « vidée dans le même geste » ; il faudrait effectuer la mesure après la réconciliation, ou vider explicitement la valeur DOM avant la mesure.

C’est le point non bloquant déjà ouvert en passe 57, pas un constat neuf propre à `3415aab1`.

## Constats bloquants neufs

Aucun.

## Ce que je n'ai pas pu vérifier

- Tests Vitest, typecheck, lint et build : **NON EXÉCUTÉS** — sandbox en lecture seule.
- Comportement réel de `cli:file_change` sur macOS avec une casse différente : non reproductible par lecture seule et explicitement non observé par les commentaires du dépôt.
- Cohérence effective de `NODALAI_WORKSPACES_ROOT` entre les processus web et runner des différents modes de déploiement : elle dépend de la configuration d’exécution, absente du diff.