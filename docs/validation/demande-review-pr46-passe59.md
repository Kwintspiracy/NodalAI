# Demande de review — PR #46, passe 59 (le composer collé au bas de l'écran)

Périmètre : **un commit d'une ligne**, `4584b39a` (« fix(web): le composer et la barre d'état se
collent enfin au bas de l'écran »). Diff : `git diff 4584b39a^ 4584b39a`.

## Ce que le commit affirme

Dans `apps/web/src/app/(dashboard)/layout.tsx`, le conteneur du contenu passe de
`overflow-x-hidden` à `overflow-x-clip`. Raison : `overflow-x: hidden` force `overflow-y: auto`
(spécification CSS : si un axe n'est pas `visible`, l'autre ne peut pas l'être), ce bloc devenait
le conteneur de défilement de référence de tout `position: sticky` en dessous — alors que c'est le
document qui défile. Le composer du fil (`sticky bottom-7`), la barre d'état (`sticky bottom-0`)
et la barre de sauvegarde de l'édition d'agent (`sticky bottom-4`) ne se collaient jamais. Mesuré
dans le navigateur : le composer passe de 1582 px à 813 px du haut pour un viewport de 900 px.

## Questions

1. **Ce que `overflow-x-clip` perd** : `hidden` permettait un défilement horizontal programmatique
   (`scrollLeft`) ; `clip` non. Un écran du tableau de bord s'en servait-il (un tableau large, un
   bloc de code qui défile par lui-même a son propre `overflow-x-auto`, donc non concerné) ?
2. **Débordement horizontal réel** : avec `clip`, un enfant plus large que le conteneur est coupé
   sans barre de défilement, comme avant. Un écran dont un contenu large comptait sur le défilement
   du DOCUMENT (page qui défile horizontalement) ? Il n'y en a pas à ma connaissance.
3. **Les éléments `sticky` réactivés** (`AgentComposer.tsx:3756`, `StatusBar.tsx:51`,
   `ThreadComposer.tsx`) : un d'eux masque-t-il un contenu qu'il ne devrait pas — un pied de page,
   un bouton en bas d'un formulaire ? Le composer est en flux (il occupe sa place en fin de fil),
   donc le dernier message reste lisible en bas de page.
4. **Compatibilité** : `overflow: clip` est pris en charge par tous les navigateurs courants depuis
   2022 (Chrome 90, Firefox 81, Safari 16). Un navigateur cible du projet en deçà ?

## Ce qui n'est PAS attendu

Le style, le nommage. Une passe sans constat NEUF ferme ce point.
