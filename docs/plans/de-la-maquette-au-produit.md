<!-- artifact: https://claude.ai/code/artifact/1fd52dac-1542-4bfb-89c8-3d5aff9f248e -->

# De la maquette au produit — le plan des pierres

Objectif : l'espace de code tel que dessiné le 05/09 (artifact « L'espace de
code », `docs/design/espace-code/`) — une conversation où l'agent parle, demande,
travaille et montre ses résultats, avec une barre d'état permanente et une
étagère fixe. Vision : « Le livrable est la page »
(https://claude.ai/code/artifact/f2cd2ddd-639b-4a9b-9f85-4386cf45a574).

## Périmètre — fixé par Quentin le 05/09

**La barre latérale ne bouge pas.** Ses seize entrées restent telles quelles.
On ajoute UNE entrée, « Spaces », qui ouvre le nouvel espace. Fusionner Chat,
Runs et Code est une décision ultérieure, peut-être jamais prise : ce plan ne la
prépare pas et ne la présuppose pas.

**L'effort porte sur le déroulé du chat**, dans ce nouvel espace. Les écrans
existants (Runs, Code, Chat) ne sont pas touchés par le lot 1. Chat évolue au
lot 2, sur décision de Quentin du 06/09 (section suivante).

**Mis à jour le 06/09 :** Quentin a décidé de faire évoluer la page Chat et
d'ajouter une entrée « Scheduled » (voir la section suivante). Le reste de ce
périmètre tient.

**De la maquette, on garde le fil de conversation. Rien d'autre.** La barre
latérale, le header, le design system et les pages existantes ne changent pas.
La maquette est une intention ; là où elle diverge de l'existant, l'existant
gagne.

## Ce qui a été décidé le 06/09 — le cadre du lot 2

Après avoir vu le lot 1, Quentin a tranché ce que la maquette laissait ouvert.
Ce cadre remplace la section « Ce qui arrive par Telegram » du 05/09 et ses
alternatives.

**Trois objets.** Le **dossier attribué à un agent** est son terrain : ce qu'il a
le droit de toucher, pas un espace. Un **projet** est un sous-dossier de ce
terrain, identifié comme tel — créé depuis Spaces, ou déclaré par une
conversation qui y a produit ; un espace *est* un projet, et Spaces liste des
projets, pas des jobs. Une **conversation** est un fil continu, dans le dashboard
ou dans un canal, qui porte son projet courant dès qu'elle a créé ou touché un
projet.

**La frontière entre un chat et un travail : « quelque chose est sorti du
chat ».** Lire, chercher, consulter et noter la mémoire, répondre en texte sur
n'importe quel canal — le canal est transparent, un sous-agent qui n'a fait que
parler aussi — c'est du chat. Un fichier, un document, un projet de code, une
écriture dans une base externe, une pièce jointe envoyée, un email ou tout envoi
vers un destinataire qui n'est pas un canal de la conversation, le harnais de
code : c'est un travail. La règle est récursive sur les agents à qui on a passé la main.
Elle se lit sur les cartes de P1, jamais sur un nom d'outil ; pour les outils
tiers il faut persister leur niveau de risque.

**L'agent de recherche — tranché par Quentin le 06/09 au moment du go.** À
02:15 il avait cité « utilise l'agent de recherche et ne fait pas la recherche
lui-même » comme une production ; à 02:20 il avait posé qu'un sous-agent qui n'a
fait que parler reste du chat. En donnant le go il a confirmé la seconde lecture :
« si un sous-agent est utilisé, ça ne correspond pas forcément à un projet ; s'il
ne fait que répondre à un message dans le chat, ce n'est pas un projet ». La règle
est donc **récursive** : un agent de recherche qui a seulement répondu reste du
chat ; celui qui a produit un document est un travail, et l'encart remonte au tour
parent. La garde de P7 est écrite pour cette lecture.


**Chat accueille toutes les conversations**, dashboard et Telegram, Slack,
Discord. Tout y commence. Au tour où quelque chose sort du chat, un encart dit
ce qui a été produit, le projet où il vit (nom, dossier) et renvoie à sa page. La page Chat existante change de
nature : décision de Quentin du 06/09, qui lève la consigne du 05/09 sur ce
point.

**Telegram : une conversation par chat**, jusqu'à ce que l'utilisateur en ouvre
une autre. Plus de découpage par silences. Ce qu'on redonne à lire au modèle
reste un budget.

**Les runs d'automatisation ont leur propre entrée de menu, « Scheduled ».**
Distincte d'Automations, qui reste la configuration.

**La référence produit** est l'application Claude : un Chat où tout commence, un
Code rangé par projets dont chacun est un dossier choisi par l'utilisateur. Les
dossiers `~/.claude/projects` des outils en ligne de commande sont leur rangement
interne, pas ce que l'utilisateur voit.

Ce que Telegram impose, du 05/09, reste vrai : chaque tour de l'agent est
miroité dans le canal (prose telle quelle, questions en boutons via P10,
livrables en carte via `job_deliveries`) ; l'écran et Telegram montrent la
**même** conversation ; le canal ne montre ni diff, ni tableau, ni groupe
replié — il reçoit la prose, le fichier joint, et un lien vers le projet.

## Suivi

| # | Lot | Pierres | Ce que Quentin voit à la fin | État |
|---|-----|---------|------------------------------|------|
| 1 | **Rendre visible ce qui existe** | P1 contrat de rendu · P2 conversation · P3 cartes de preuve et d'envoi · P4 barre d'état et coût | Une entrée « Spaces » ouvre le nouvel espace ; sa page est la conversation dessinée, avec preuves, coûts, jetons. Runs, Code et Chat inchangés | ✅ **LOT 1 CLOS le 06/09** — P1 (passe 16), P2 (19), P3 (21), P4 (24-25 : « aucun constat neuf ») ; retours de Quentin traités (automatisations à part, fil nettoyé sur capture réelle, coût cache-aware) · ⚠️ à voir par Quentin dans son navigateur : /spaces et un fil récent |
| 2 | **Le projet et la conversation** | P5 registre des projets · P6 conversation continue et projet courant · P7 Chat pour toutes les conversations, encart · P8 Spaces = projets, nouveau projet, chat du projet · P9 Scheduled | Chat regroupe dashboard et Telegram ; un projet naît d'un clic ou d'une production ; les automatisations ont leur page | 🟡 **go de Quentin le 06/09** — ordre : P5 · P9 (en parallèle) → P6 → P7 → P8 ; chaque pierre codée par Opus, relue par moi, puis `codex review`. ✅ P9 (`b9ff0f1b`, passe 26 traitée) · ✅ P5 (`fd2293c3`, passe 27 : 2 constats traités) · ✅ P6 (`ea984c1b`, passe 28 traitée dans `8ab609f1`) · ✅ P7 (`55ec67eb`, passe 29 traitée : issue des appels, plafonds par la fin, réponse à l'agent du fil, titres sans préfixe de groupe, fils groupés, lignes d'avant P1 dites « non classées ») · ✅ P8 (livré, passe 30 à suivre). **Lot 2 codé en entier le 06/09** ; reste la passe Codex 30 et l'œil de Quentin sur /chat, /spaces, /scheduled. La CI de la PR, rouge depuis le lot 1 (lint web, test GLM, cycle d'import P4b), est réparée au passage |
| 3 | **L'agent qui demande et montre** | P5b registre automatique · P10 `ask_user` · P11 fichiers et diff · P12 le tableur rendu | Les projets de l'onglet Code sont dans Spaces sans un clic ; « Où écrire ? » avec boutons dans le chat et dans Telegram, pour les documents seulement ; diffs cliquables ; un classeur qui s'affiche | ✅ **CLOS côté code le 07/09 (passes Codex 32-48), CI VERTE sur `51bd3b4b` — attend l'œil de Quentin et les arbitrages ci-dessous** — ✅ P5b CLOSE (`16d1f574` ; passes 32-35 traitées dans `4491ae46`, `aefdcec3`, `934091d4`, `4f084c21`, `268f68ef` ; passe 36 : aucun constat bloquant, rien de neuf) · ✅ P10a `ask_user` (`5c7938a7` ; passes 37-38 traitées, `36dd5c92` ; P10a close sous réserve d'un arbitrage sur les textes de chrome) · ✅ P10b « où écrire ? » (`baea7599` ; passes 39-40 traitées dans `5921ba4f`, `147159ff` ; passe 41 traitée dans `5171c706` : la liaison texte tombe, `register_project` passe par l'approbation ; passe 44 : aucun constat bloquant — P10b CLOSE ; la ligne d'impact de la carte branchée dans `c301df1b`) · ✅ P11 fichiers et diff CLOSE (`e6713458` ; passes 42-43 traitées dans `ea6170ec`, `80ee7a8d` ; passe 45 : aucun constat bloquant) · ✅ P12 tableur rendu (`b4ac14b1` ; passe 46 : 3 P0 + 2 P1 vrais, traités dans `f790a051` — la même clé de document pour l'intention et la carte, texte riche lisible, largeur bornée à 20 colonnes, état lu par (job, clé), pied sans contradiction ; passe 47 : un P0 neuf, les cellules couvertes par une fusion répétaient la valeur du maître, corrigé dans `e9393c54` ; passe 48 : aucun constat neuf — **P12 CLOSE**) |
| 3bis | **Le fil tel que la maquette** | P2bis le rendu du fil, repris composant par composant depuis `Main.dc.html` avec le design system | Le fil de conversation ressemble à la maquette : prose lisible, un tour = une voix, groupes d'étapes parlants, délégation dépliable, cartes au format maquette, sans bruit système | ✅ **Session 1 CLOSE le 07/09** (`05d95510` → `d9f1edda` ; passes Codex 49 à 55 : liens sûrs, identité du tour fusionné, fils d'enfants bornés, réponse finale par règle de structure, sortes d'envoi textuel nommées dans shared ; passe 55 : aucun constat neuf) — captures clair/sombre sur trois conversations réelles · ✅ **Session 2 LIVRÉE le 07/09 sur le design Figma et CLOSE par Codex (passes 56-58)** — `3da375f3` (en-tête de travail, appels d'outil visibles, raisonnement replié, diff review avec compteurs `−a +b` par le module `coding-changes.ts` partagé avec la page Code, délégation, récapitulatif de livraison, composer) ; passe 56 : 4 constats vrais, traités dans `c4936dc5` (total « Lines » complet sur toute la descendance, rien sans ligne d'audit, suffixe ambigu → null, composer multi-ligne) ; passe 57 : 1 constat vrai, traité dans `3415aab1` (fichiers comptés sur leur chemin canonique, dossier partagé parmi les racines) ; passe 58 : aucun constat neuf. **L'œil de Quentin attendu** sur `/chat/b9c6149b…` (compteurs sur une écriture réelle) et les fils Telegram |
| 4 | **Ce qui reste cher** | P13 relecteurs (= PR④ de Vérifier & Corriger) · P14 aperçu vivant | Deux relecteurs cités ; l'application qui tourne au centre du projet | ⬜ |

## Verdict de faisabilité — vérifié dans le code le 05/09

Chaque ligne du dessin, et d'où vient sa donnée. Rien n'est supposé.

| Ce que le dessin montre | D'où ça vient | Vérifié |
|---|---|---|
| L'agent parle entre ses actions | `agent_jobs.messages` — chaque message assistant porte `reasoningParts`, une partie `text`, et les `toolCallParts` (`apps/runner/src/job/execute.ts:2857`) | oui |
| Le raisonnement | mêmes parties, avec leur signature de provider (`execute.ts:2795`). **Tous les modèles n'en émettent pas** : l'écran doit le dire | oui, partiel |
| Chaque outil : entrée, sortie, durée | `tool_calls` — écrit par `packages/tools/src/execute.ts:763` pour la boucle principale, et par `code-task/live-events.ts:142` pour les étapes du harnais de code | oui |
| Jetons, cache lu, cache écrit, coût, modèle demandé vs effectif, bascule | `llm_calls` (`packages/db/src/schema/llm-calls.ts`) | oui |
| Le harnais de code : session, version, coût, sortie | `cli_runs` | oui |
| Un sous-agent et SES actions | job enfant : `parent_job_id`, `delegation_depth` ; ses `tool_calls` et `llm_calls` portent SON `job_id` | oui |
| Une approbation avec boutons, depuis Telegram | `tool_approvals` + `apps/runner/src/approvals/notify.ts` (cartes neutres vis-à-vis du canal) | oui, déjà en prod |
| Preuve rouge / verte, extrait, durées | `verification_runs` + `job_deliverable_verification_state` — PR① | oui, livré cette semaine |
| Les commandes de preuve proposées | `discoverVerifyCommands` — v7-C, livré le 05/09 | oui |
| Envois partis / en attente | `job_deliveries` — PR① | oui |
| **Le diff des fichiers écrits par le harnais** | le sha de l'instantané est calculé (`checkpoints.ts:199`) mais **pas persisté** ; il vit dans le dépôt git des instantanés, étiqueté | **trou à combler** (P11) |
| L'agent pose une question avec des options | aucun outil — `ask_user` n'existe pas | **à construire** (P10) |
| Deux relecteurs cités | protocole non construit — PR④ du plan Vérifier & Corriger | **à construire** (P13) |
| L'application qui tourne | rien | **à construire, en dernier** (P14) |

**Conclusion.** Trois lots sur quatre sont une couche d'affichage sur des lignes
qui existent. Le quatrième est cher et peut se faire attendre sans que le reste
perde son sens.

## Ce qu'on garde, ce qu'on remplace, ce qu'on jette

| | Quoi | Pourquoi |
|---|---|---|
| **On garde** | Toute la PR① : intention de mutation, état par livrable, primitive terminale, outbox, `verification_runs`, écran de configuration | C'est le moteur. Sans elle, les cartes de preuve n'ont rien à afficher |
| **On garde** | v7-A : chaque outil déclare ce qu'il produit | C'est la graine du contrat de rendu (P1). On l'étend, on ne le refait pas |
| **On garde** | v7-C : la découverte des commandes | C'est le contenu du panneau « Vérifié » de l'étagère |
| **On garde** | Les primitives du design system : `Table`, `MonoMicroTag`, `PrimaryButton`, `Banner`, `EdRow` | La maquette les reprend au pixel |
| **On garde** | `JobMessages.blocksFromContent` (le lecteur des trois formats de messages) | Il sait déjà lire les parties ; on change ce qu'on en fait |
| **On ne touche pas** | Les écrans Runs et Code, et la barre latérale. **Mis à jour le 06/09** : Chat évolue au lot 2 (P7) ; la barre gagne « Scheduled » (P9) | Décision de Quentin le 05/09 : le nouvel espace vit à côté, derrière une entrée de plus. `JobMessages` reste en place ; son lecteur de messages est réutilisé par la conversation |
| **On jette** | Rien | Aucun travail livré n'est contredit par le dessin |

## Les pierres

Chaque pierre suit la discipline du dépôt : tests sur lignes réelles, une
mutation par garde, `codex review` en boucle jusqu'au retour vide. Tailles : S
moins d'un jour, M deux à trois jours, L une semaine, XL indéterminée.

### P1 · Le contrat de rendu — M → L

**Ce que ça pose.** Chaque outil déclare DEUX choses. Sa **carte** — comment son
résultat s'affiche, une parmi `text · read · search · files · table · terminal ·
sent · checks · question · delegation · generic` — et, pour toute carte à
structure, son **présentateur** `present()` : comment on tire de SA sortie la
charge utile de CETTE carte. La forme de chaque charge utile est écrite une
fois pour toutes (`packages/shared/src/tool-cards.ts`, schémas zod plafonnés) ;
les briques qui la construisent sont dans `packages/tools/src/presenters.ts`.
L'écran dispatche sur la carte et lit la charge utile, jamais le nom de l'outil.
C'est le modèle de DeepSeek Harness (`presentResult` + le `meta` de
présentation attaché au résultat), et la condition posée le 05/09 : sans lui,
l'écran doit être édité à chaque outil ajouté et il meurt.

**Où ça vit.** Carte et charge utile sont **persistées sur la ligne
`tool_calls`** (`card`, `presented` — migration 0092) au moment de
l'exécution, par `executeTool`. L'écran lit la ligne, jamais le registre ; une
ligne d'hier se dessine comme le jour où elle a été écrite. Les lignes
antérieures et celles de l'enregistreur vivant du CLI (`cli:*`, qui n'a qu'un
événement, pas une sortie) portent `presented = NULL` : l'écran montre
l'entrée et la sortie brutes et le dit.

**Sur quoi ça s'appuie.** `MutationTarget.deliverableType` (v7-A) est déjà une
déclaration par l'outil. Le contrat de rendu est son frère pour la lecture.

**Ce que la revue a corrigé dans cette pierre** (passes 11 à 13, dans l'ordre) :
une carte inventée était rabattue en silence sur `generic` → elle lève, et le
registre la refuse au démarrage ; `query_memory` était `text` alors que sa
sortie est tabulaire → `table` ; `code_task` était `files` alors qu'il ne rend
aucun fichier → `delegation` ; trois `list_*` requalifiés `table` par excès de
zèle → `text` (leur sortie est une enveloppe) ; et le constat qui a élargi la
pierre : **une étiquette sans forme oblige quand même à dispatcher par nom**
(`xlsx_read` rend `{ sheets }`, `query_memory` un tableau nu, même carte) → la
charge utile typée et le présentateur par outil.

**Garde.** `cards.test.ts` énumère le registre : tout outil déclare sa carte,
la table complète nom → carte est épinglée (72 outils), toute carte à structure
a son présentateur, et le registre refuse au démarrage une carte inventée ou
sans présentateur. Les présentateurs sont vérifiés sur de **vraies sorties**
(`file-ops`, `run-command`, `xlsx`, `execute` : la ligne `tool_calls` porte
carte et charge). Mutations mesurées : présentateur retiré → rouge au
démarrage, en nommant l'outil ; lignes décalées dans `xlsx_read` → rouge ;
charge non persistée → rouge.

**Hors périmètre.** Aucun rendu ici — c'est le contrat, pas les composants.
Les ~140 adaptateurs de connecteurs restent `generic` : leur qualification est
une pierre à part.

### P2 · La conversation — L

> **État au 06/09 : close (passe 19).** `conversation-feed.ts` (le modèle,
> pur), `app/(dashboard)/spaces/` (liste + fil), `getSpaceConversationAction`,
> entrée « Spaces » dans la barre latérale. Repli/carte décidé sur la carte
> persistée ET sur ce que la charge a à dessiner (`showsAlone`). La question de
> la passe 17 est tranchée : la frontière du fil est le DERNIER message `user`
> égal à `job.task` ; ce qui précède (l'historique Telegram préfixé par
> `thread-history.ts`) se rend comme des messages ordinaires, ce qui suit
> comme des rappels du runner. Vérification visuelle sans mot de passe : CSS
> compilé récupéré sur le serveur, rendu statique d'un vrai job, capture
> Playwright ; les retours de Quentin sur le fil ont été traités sur cette
> capture.

**Ce que ça pose.** La page du nouvel espace rend la conversation dessinée : les
messages de l'utilisateur, la prose de l'agent, les groupes d'actions repliés
(« Réflexion et recherche · 4 étapes · 9,4 s · 12 480 jetons »), les cartes
dispatchées par P1, les sous-agents en groupes indentés avec leur pastille.

**Sur quoi ça s'appuie.** `messages` pour la prose et le raisonnement ;
`tool_calls` joint sur `tool_call_id` pour les durées et sorties ; `llm_calls`
par tour pour les jetons de chaque groupe ; les jobs enfants par
`parent_job_id`.

**Origine.** Chaque message porte d'où il vient — Telegram, le dashboard, une
automatisation — et chaque envoi de Nodal vers un canal apparaît dans le fil,
pas seulement les messages reçus.

**Règle de groupage.** Une suite d'appels d'outils entre deux parties `text` de
l'agent forme un groupe. Le titre du groupe est déduit des cartes qu'il contient
(« 3 fichiers écrits », « Réflexion et recherche »), jamais écrit en dur.

**Garde.** Un transcript de test qui contient chaque sorte de partie rend chaque
sorte de carte ; aucune partie connue ne retombe sur `generic`. Mutation :
retirer une carte du dispatch fait rougir le test sur la partie correspondante.

**Ce qui reste hors de P2.** Le diff cliquable (P11), le tableur rendu (P12), la
question à boutons (P10) : leurs cartes affichent un état « pas encore rendu »
honnête en attendant.

### P2bis · Le fil tel que la maquette — L

**Pourquoi cette pierre existe.** Le 07/09, Quentin a vu le fil rendu et l'a
jugé « ignoble » : il attendait la maquette `Main.dc.html`, avec notre design
system. Les lots 1 à 3 avaient construit les DONNÉES du fil (cartes persistées,
modèle, diff, aperçu, question) sans jamais confronter le rendu à la maquette
par une capture : la règle « Playwright avant fini » n'a pas été tenue, et le
plan disait pourtant « chaque pierre sera validée à l'écran ». Diagnostic fait
sur deux conversations réelles : le markdown n'était pas rendu (`**gras**`,
`## titres`, backticks bruts jusque dans le titre de page) ; la réponse finale
paraissait deux fois (prose du tour + bloc « ANSWER ») ; une plaque blanche par
appel d'outil, sans ligne de résultat, avec un avatar et un nom même pour un
tour muet ; le bruit système (« Nodal reminded the agent · Older activity…
cannot be classified ») répété sous chaque tour ; la délégation réduite à une
ligne tronquée ; la carte « VERIFICATION · No proof ran » isolée en bas.

**Ce que ça pose.** La maquette devient la spec, composant par composant, sur
l'échelle du design system (aucune taille fractionnée : la correspondance est
écrite dans la spec de la session). Session 1 : (1) un rendu markdown sans HTML
brut (mdast → React, `unified` + `remark-gfm`, blocs de code avec en-tête et
« Copy ») appliqué à la prose, aux demandes, aux réponses, aux cartes et au
titre de page ; (2) une réponse, une fois — la prose du dernier tour EST la
réponse ; une demande dupliquée par deux jobs de même tâche n'est montrée qu'une
fois, après diagnostic dans les données ; (3) la compaction des tours : un tour
sans prose ni carte fusionne dans le précédent, l'en-tête du groupe porte
« N steps · durée · jetons · coût », le nom du tour ne porte que le modèle ;
(4) le bruit système hors du fil : une note « thread » paraît une fois par fil,
la section de preuve vide n'est plus rendue (la barre d'état dit déjà « no
proof ») ; (5) la délégation dépliable, au format groupe, avec la tâche et le
résultat en markdown et un lien vers le run ; (6) les cartes au format maquette
(question à bordure encre et boutons, échec, produit en lignes clé-valeur,
envoi) ; (7) le composer « Reply to Alfred… ». Session 2 : l'en-tête d'espace
(« Verified · The app · Files »), la preuve dans le fil au tour où elle a lieu,
les cartes fichiers/diff et relecture au pixel de la maquette.

**Preuve exigée avant « fini ».** Captures Playwright des trois conversations
de référence (l'app single-screen Telegram `a6d23d0a…`, le PRD Podium
`d19ba7dc…`, et la conversation neuve `c1367d54…` ouverte le 07/09 avec l'accord
de Quentin pour voir les cartes du lot 3 en vrai), en clair ET en sombre, mises
face à la maquette ; tests de rendu (`renderToStaticMarkup`) et du modèle ;
lint, typecheck, prettier ; l'œil de Quentin ensuite.

**Livré le 07/09 (session 1 : `05d95510`, par opus-p2bis sur spec puis
complété ; liens durcis dans le commit suivant).** Vu sur trois conversations
réelles, en clair et en sombre : le markdown est rendu partout (titres, gras,
code, tables, listes), le titre de page aussi ; la réponse finale paraît une
fois, comme un tour de l'agent ; les tours muets se replient dans le précédent
et l'en-tête du groupe dit « N steps · durée · jetons · coût » ; la note
d'avant-cartes paraît une fois par fil ; la carte de preuve vide a disparu ;
la délégation est un groupe dépliable qui contient le fil du délégué, un
niveau — le classeur écrit par l'Officier, son aperçu, sa formule montrée
telle qu'écrite et son état de vérification se lisent depuis la conversation ;
la question a la forme de la maquette ; le composer dit « Reply to Alfred… ».
Corrigé au passage sur le banc d'essai : la table d'un `xlsx_read` rendait
« [object Object] » pour une formule fraîche (lecture alignée sur l'aperçu),
`xlsx_create` nommait le fichier par son chemin absolu, une feuille vide
demandait si sa première ligne était un en-tête. Un lien `javascript:` ou
`data:` écrit par un agent n'est plus un lien. *Non fait, et dit* : la demande
dupliquée de la conversation Telegram est un vrai renvoi de l'utilisateur
(deux jobs de tête, 75 minutes d'écart) — pas de dédoublonnage ; le fil d'un
petit-enfant ne s'assemble pas (un niveau).

**Ce que les passes Codex 49 à 52 ont corrigé.** Un lien `javascript:` ou
`data:` écrit par un agent devenait un `href` : liste blanche (`http`,
`https`, `mailto`, adresses relatives), caractères de contrôle retirés avant
de lire le schéma, protocole-relatif refusé. Un tour déduit qui absorbait un
tour audité affichait des jetons sous une identité non auditée : il prend
l'identité auditée. Le fil des délégués relisait la ligne entière de tous les
enfants d'une page : les vingt délégations les plus récentes ouvrent leur fil,
les autres gardent tâche, résultat et lien. Et la garde « la réponse est déjà
dite » a changé quatre fois de forme (`includes`, suffixe, paragraphe, lignes
jointes) sans tenir — la dernière fois parce que la prose est du markdown :
« **Tout est prêt.** » et « Tout est prêt. » diffèrent à l'octet, pas à
l'écran. Elle est remplacée par une **règle de structure**, que Codex
recommande : ce que l'agent a écrit EST sa réponse ; `job.result` ne se montre
que si le dernier tour de l'agent est muet. **Passes 53 à 55.** Un cron tout
en outils (`dashboard_publish` puis `return_result`) montrait son texte dans la
carte d'envoi puis une seconde fois en réponse : une carte d'envoi qui livre un
texte vaut réponse. Le premier correctif supposait `kind: 'message'` alors que
`dashboard_publish` présente `kind: 'dashboard'`, et son test passait avec une
charge que l'outil ne produit jamais : les sortes d'envoi textuel sont nommées
une fois dans `shared` (`SENT_TEXT_KINDS`), à côté du schéma, et le test emploie
la charge réelle. Passe 55 : aucun constat neuf — **session 1 close**.

**Correction de cap, 07/09.** Quentin, devant le résultat : « je ne vois pas
en quoi ça ressemble, même de loin, au design que je t'ai partagé ». Il avait
raison : la session 1 a travaillé sur `Main.dc.html` du 05/09, et son design
est ailleurs, dans Figma (`u5dvd5oAy53HQ1xuz1KyJs`, frame « Main Content »),
plus abouti : un en-tête d'espace sur une ligne (nom, chemin, pile d'avatars,
« Vérifié », « L'application », « Les fichiers »), la réflexion repliée à part
et **chaque appel d'outil visible** sur deux lignes (nom, argument, durée ;
puis le résultat), le bloc de code numéroté, la « Revue de diff » par fichier,
la délégation à filet vert, le « Récapitulatif de livraison » (stats, revues,
contrôles), la question à bordure bleue, le composer sur une ligne. Sa
consigne : le reproduire **avec notre design system**. La session 2 repart de
ce frame, lu par le MCP Figma (structure, mesures, textes), avec une table de
correspondance Figma → tokens (aucune taille fractionnée, aucune couleur
littérale) et une règle : ce que le design montre sans source dans la base
(couverture, « prêt à fusionner », « L'application ») n'apparaît pas.
`Main.dc.html` n'est plus la référence de rendu. *Corrigé par Quentin dans la
foulée* : j'avais rangé les compteurs « −2 +27 » par fichier parmi les données
sans source ; c'est faux, la page Code les affiche en bout de ligne depuis août
(`extractChange` dans `actions.ts`, le churn de l'entrée de l'appel). Le fil
les montre donc, avec la même lecture.

**Livré le 07/09 (session 2 : par opus-p2bis-s2 sur spec Figma, fini de ma
main après sa limite de session).** Vu en clair et en sombre sur quatre
conversations réelles et un run délégué : l'en-tête de travail sur une ligne
(nom, chemin, pile d'avatars, « Verified » seulement avec preuve, « Files »
seulement avec projet) ; la demande en carte « You · via Telegram » ; le
raisonnement replié (« N steps · durée · jetons · coût ») ; **chaque appel
d'outil sur deux lignes** (nom, extrait de l'entrée, durée ; puis résultat) ;
la carte « diff review » avec `−a +b` par fichier et en total, lus par
`lib/coding-changes.ts` — le module sorti d'`actions.ts`, pur et testé, que
la page Code emploie aussi : les deux écrans disent les mêmes nombres ; la
délégation en libellé vert et cadre teinté ; le « Delivery summary » (Files,
Lines, Tests, Duration, Cost — une stat sans source n'est pas rendue ;
Reviews ; Checks ; « Verified / Checks failed / Not verified ») ; la question à
bordure bleue ; le composer sur une ligne, Entrée envoie. `StepsGroup` et
`ProducedCard` sont tombés. Constat en base pendant la preuve : toutes les
écritures de fichiers enregistrées datent d'avant P1 (carte `null`), donc une
conversation neuve a été ouverte le 07/09 pour voir les compteurs sur une
écriture réelle. *Non fait, et dit* : `/scheduled/[id]` garde sa section de
vérification et ses livraisons à part (pas d'item `produced` sur un run) ;
couverture, « Prêt à fusionner », « L'application », « Open » par fichier,
coloration syntaxique et `effort` restent sans source.

**Ce que la passe Codex 56 a corrigé (`c4936dc5`).** Quatre constats
bloquants, tous vrais, chacun fermé par un test qui rougit sans le correctif :
(1) un chemin court qui correspondait à deux fichiers de l'appel (`a/index.ts`,
`b/index.ts`) prenait le premier compteur venu — il ne choisit plus, `null` ;
(2) la stat « Lines » était un total partiel sans le dire : lue sur le fil, qui
n'assemble qu'un niveau de délégués et vingt fils au plus, elle ignorait les
petits-enfants — le récapitulatif compte désormais fichiers et lignes sur les
lignes d'audit de TOUTE la descendance (`ThreadJob.audit`, déjà chargées pour
la frontière chat/travail), et le même fichier écrit en absolu puis en relatif
compte une fois (vu en vrai : « 2 files » pour un seul `notes/bonjour.html`) ;
(3) une écriture sans ligne d'audit passait pour exécutée — `executeTool`
avale l'échec de l'insertion et l'appel reste dans le transcript — et une
édition en attente d'approbation comptait déjà ses lignes (vu en vrai) : seul
un appel qui a eu lieu, avec sa ligne, compte ; (4) le composer d'une ligne
aplatissait un collage multi-ligne : c'est une zone de texte qui grandit avec
le texte, Entrée envoie, Maj+Entrée fait un retour. Non retenus par Codex, et
laissés tels quels : « diff review » sur un classeur (catégorie des
productions écrites, pas promesse d'un diff), le chevron global, `proofByRoot`
(vérifié juste). **Passe 57** : un constat bloquant neuf, vrai — le
dédoublonnage par suffixe que j'avais introduit fusionnait `index.ts` (racine)
et `a/index.ts`. Corrigé sans suffixe : les fichiers se comptent sur leur
chemin canonique (racine du dossier retirée), la règle de la page Code sortie
d'`actions.ts` et partagée ; et les racines connues incluent désormais le
dossier PARTAGÉ de l'entité, que le runner injecte sans le ranger en base —
sans lui, « Files 2 » pour un seul `notes/bonjour.html` (vu en vrai), « 1 »
après. Non retenus : `unknown` compte (ligne sans sortie = donnée ancienne,
jamais un appel en cours) ; cartes et récapitulatif divergent à dessein (le
récapitulatif = le travail entier). **Passe 58 : aucun constat bloquant neuf —
session 2 CLOSE par Codex (passes 56 à 58).** Deux limites dites, pas codées :
le web et le runner doivent lire le même `NODALAI_WORKSPACES_ROOT` (ou le même
dossier personnel), sinon la racine ne se retire pas et un fichier peut
compter deux fois — rien ne le vérifie ; et la casse n'est ignorée que sur un
chemin Windows, un volume macOS insensible à la casse pourrait scinder un
fichier en deux si un outil CLI en change la graphie. Une remarque traitée :
la zone de saisie se remesure vide après l'envoi (le DOM est vidé avant la
mesure). Et un commentaire corrigé : la page Code ne retient toujours que les
dossiers déclarés — le dossier partagé ne sert qu'au récapitulatif du fil.

**Retour de Quentin, 07/09 : « dans quel monde tu fais scroller le user pour
qu'il tape ? »** Il avait raison, et la cause était en amont du fil : le
conteneur du contenu du tableau de bord portait `overflow-x-hidden`, qui force
`overflow-y: auto` et fait de ce bloc le conteneur de défilement de référence
pour tout `position: sticky` — alors que c'est le document qui défile. Le
composer (`sticky bottom-7`), la barre d'état (`sticky bottom-0`) et la barre
de sauvegarde de l'édition d'agent ne se collaient donc JAMAIS ; les captures
pleine page ne pouvaient pas le montrer, une capture pleine page dessine un
élément collant à sa place naturelle. Corrigé par `overflow-x-clip` (coupe
sans créer de conteneur), mesuré dans le navigateur : le composer passe de
1582 px à 813 px du haut pour un viewport de 900 px, visible à l'ouverture et
au défilement. *Leçon pour la preuve* : une capture du VIEWPORT à l'ouverture
et au milieu du fil, en plus de la pleine page. Passe Codex 59 sur ce
correctif : aucun constat neuf — aucun écran ne dépendait du défilement
horizontal du document, les trois éléments collants sont en flux et ne
masquent rien de définitif ; seule réserve, Playwright ne couvre que Chromium.

**Retour de Quentin, 07/09, sur la page d'un projet : « quand j'ouvre mon
projet, je veux atterrir dans le feed de la conversation directement » ; « ce
que je vois, c'est des réglages de mon projet » ; et la saisie « même pas
centrée verticalement ».** La page P8 empilait le dossier, les fichiers, la
preuve, une table « Conversations » et, en bas, une saisie qui aurait ouvert
une conversation de plus — parce que « la conversation du projet » n'était que
celle ouverte depuis sa page, jamais celle qui existait déjà. Refait : la page
d'un projet EST le fil de sa conversation (celle ouverte depuis la page, sinon
la plus récente qui porte un travail du projet, même venue de Telegram — on la
lit, et la saisie ouvre alors celle du projet au premier envoi), saisie collée
en bas, barre d'état dessous, comme `/chat/[id]`. Le dossier, les fichiers, la
preuve, les autres conversations et « New conversation » sont sur
`/spaces/[id]/files`, derrière le bouton « Files » de l'en-tête, qui y mène
aussi depuis un fil de chat. « New conversation » est gardé là, pas sur le fil :
Quentin en questionne l'utilité, et je ne lui vois qu'un usage, repartir de
zéro sur le même dossier — à retirer s'il le dit. La saisie : la zone de texte
était en ligne dans son conteneur et laissait 5 px de descente sous elle, le
bouton se calait dessus ; en bloc, avec le bouton centré dans une boîte de la
hauteur d'une ligne, les centres tombent au même pixel (mesuré). **Passe
Codex 60 : deux constats bloquants, vrais.** (1) La saisie nommait l'agent du
fil affiché alors que, quand elle va créer la conversation du projet, celle-ci
est attribuée au ROOT de l'entité — sous un fil Telegram de Lead-Dev, « Reply
to Lead-Dev… » aurait ouvert une conversation avec Alfred. La page décide
désormais du destinataire (l'agent du fil prolongé, ou le ROOT lu à la même
source que la création), le placeholder dit « Write to Alfred… » quand elle
crée, et une ligne au-dessus du champ le dit avant l'envoi : « You're reading
a conversation via Telegram with Lead-Dev. Writing here starts this project's
own conversation with Alfred, shown here instead. » (2) La page du fil lisait
encore le dossier et la preuve à chaque ouverture et à chaque rafraîchissement
sans les montrer : le chargeur est scindé, un cœur commun (projet,
conversations, conversation propre, ROOT) pour le fil, le dossier et la preuve
en plus pour `/files` seulement. Codex garde la conversation propre en priorité
(« la plus récente » ferait changer le fil tout seul), ce que le plan retient.
**Passe 61 : deux constats bloquants, vrais.** Sans agent ROOT, la saisie
« Write… » paraissait utilisable alors que toute création échoue : elle n'est
plus rendue, un mot dit pourquoi. Et la page se relisait entre la création de
la conversation et son premier message : la conversation neuve VIDE remplaçait
un instant le fil lu — cette relecture tombe. Recommandé et fait : le calcul du
destinataire, du placeholder et de la note est un module pur, sept cas testés ;
la page du fil ne compte plus les travaux du projet. **Passe 62 : un
constat bloquant, vrai** — le message sans ROOT disait « Designate one in
Settings » alors que le ROOT naît avec le premier orchestrateur créé et que
Settings renvoie vers Agents : l'instruction menait à une action qui n'existe
pas. Le message dit le geste et le lien mène à Agents ; les deux autres textes
périmés du dépôt (l'erreur de création, la bannière de Chat) suivent. **Passe
63 : deux constats, vrais.** Un dernier texte « Designate a ROOT agent in
Settings » restait dans la création d'une conversation de Chat : aligné. Et
un défaut plus ancien que ce plan, trouvé en cherchant où naît le ROOT : le
premier orchestrateur le devenait par un SELECT puis un UPDATE sans condition,
si bien que deux orchestrateurs créés en même temps pouvaient tous deux rester
de tête — le choix est atomique désormais, un test de création concurrente le
prouve (rouge sans la condition). **Passe 64 : aucun constat bloquant neuf —
la page d'un projet est close par Codex (passes 60 à 64).** Deux défauts plus
anciens que ce plan, dits et non codés ici : la création d'un agent n'est pas
une transaction (une panne entre l'insertion et le rattachement laisse un
orchestrateur de tête ni ROOT ni rattaché), et supprimer le ROOT remet
l'entité sans ROOT et libère ses orchestrateurs rattachés, sans règle de
succession. Ils sont au backlog du harnais.

**Retour de Quentin, 07/09 au soir, capture à l'appui : « est-ce que t'as
sincèrement déjà vu une application fonctionner comme ça ? »** Sur une
conversation courte, la saisie était au MILIEU de l'écran et descendait à
mesure qu'on écrivait ; la barre d'état flottait au milieu, à la largeur du
contenu ; l'en-tête disait « 1 agent » et la barre « 0 agents » ; « 41,6 s »
pour une réponse de deux lignes qui affichait « 0 tokens ». Réponse honnête à
sa dernière question : non, je n'avais pas regardé — mes captures étaient en
pleine page, ce qui déroule le fil et masque exactement cela.

*La charpente.* La fenêtre ne défile plus : seule la zone de contenu défile.
Les trois écrans de fil sont une colonne de hauteur pleine — en-tête, fil qui
défile, saisie ancrée, barre d'état pleine largeur. `sticky` ne collait que si
le fil dépassait l'écran, ce qui n'arrive jamais sur une conversation qui
commence.

*L'identité.* Une seule ligne : retour, nom, chemin, état, agents, preuve. La
flèche vivait sur une seconde ligne qui ne ressemblait à rien d'autre.

*Les chiffres.* Un tour de chat du tableau de bord ne passe pas par un job :
ses appels LLM étaient bien enregistrés mais rattachables à rien, et le fil
sautait tous ses compteurs d'un bloc dès qu'il n'y avait aucun job. Migration
0100 (`llm_calls.conversation_id`), écrite par le runner, lue par le fil. Le
compte d'agents ne vit plus qu'en haut, avec les visages. La durée est le
temps de calcul, pas le temps écoulé depuis l'ouverture du fil — une
conversation laissée ouverte ne coûte rien.


**Ce que la vérification a corrigé dans le plan lui-même.** La ligne « la
maquette est une intention, pas une spécification au pixel » des limites
restait vraie sur le fond mais servait d'excuse : la maquette est bien la spec
du rendu, seules ses tailles se rabattent sur l'échelle.

### P3 · Les cartes de preuve et d'envoi — S

> **État au 06/09 : close** — `VerificationSection` (le composant existant du détail Code) réutilisé tel quel sous le fil, alimenté par la même lecture (preuves du job et de TOUS ses descendants, trace D8, livrables non configurés) ; `DeliveriesCard` neuf depuis `job_deliveries`. Passes Codex 20-21.

**Ce que ça pose.** La carte de preuve (rouge : commandes, extrait, séquence
arrêtée ; verte : commandes, durées, fraîcheur) depuis `verification_runs`. La
carte d'envoi depuis `job_deliveries`. Le panneau « Vérifié » de l'étagère
depuis `code_projects` et la découverte v7-C, avec les six dernières preuves.

**Sur quoi ça s'appuie.** Cent pour cent PR① et v7-C.

**Garde.** Les tests existants de `VerificationSection` migrent vers la carte ;
un `verification_runs` rouge rend l'extrait, un vert ne le rend pas.

### P4 · La barre d'état et le coût — M

> **État au 06/09 : close (passes 24-25).** P4a : `ModelPricing.cacheReadPerMillionUsd` / `cacheWritePerMillionUsd` par modèle (source OpenRouter `GET /api/v1/models`, relevé le 06/09 — le rapport n'est pas universel : Anthropic 0,1×/1,25×, DeepSeek 0,5×, Kimi ≈ 0,17×), `estimateCallCostUsd` cache-aware dans `call-sink` et `execute.ts`, dix prix in/out rafraîchis ; un modèle sans prix de cache est facturé plein et le dit (`hasCachePricing`). P4b : `aggregateSpaceCost` (par agent, attente humaine, temps de preuve), `StatusBar` permanente + panneau « What this work cost ». La garde « au dixième / 1,25× » tient pour Anthropic ; pour les autres vendeurs c'est LEUR prix, pas un facteur.
>
> **Dépendance découverte le 06/09, résolue par P4a** : la garde (« cache lu au dixième, cache écrit 1,25× ») suppose un estimateur cache-aware. Or `estimateModelCostUsd` (`packages/shared/src/model-catalog.ts`) calcule `input × prix + output × prix` et ignore `cachedTokens` / `cacheCreationTokens` ; seul OpenRouter rapporte un coût déjà cache-aware. P4 se scinde donc : (a) la barre d'état depuis `llm_calls` tel quel (jetons, part de cache, coût rapporté, durée, envois en attente) ; (b) l'estimateur cache-aware, travail moteur à part (backlog « cache-aware »), sans lequel le coût des fournisseurs natifs reste surestimé.

**Ce que ça pose.** La barre du bas, permanente : preuve, modèle actif, agents,
jetons avec part de cache, coût, durée, envois en attente. Le panneau « Ce que
ce travail coûte » avec des **phrases** avant les chiffres, puis le détail par
agent, la répartition cache lu / cache écrit / effectif / sortie, le temps
d'attente humaine, le temps de preuve.

**Sur quoi ça s'appuie.** Agrégat sur `llm_calls` (`cost_usd`, `input_tokens`,
`cached_tokens`, `cache_creation_tokens`, `output_tokens`) et `cli_runs`, par
`job_id` puis par espace ; l'attente humaine = `tool_approvals.resolved_at −
requested_at`.

**Garde.** L'agrégat est comparé au centime à un jeu de lignes semé ; le cache
lu est bien facturé au dixième et le cache écrit à 1,25×, sinon le test rougit.

**Lot 2 · Le projet et la conversation**

### P5 · Le registre des projets — M

**Ce que ça pose.** Une table des projets : nom, dossier racine, sorte (`code` ou `documents`), agent responsable, créé par toi depuis Spaces ou déclaré par une conversation qui y a produit. Le **dossier racine d'un projet est un sous-dossier du terrain d'un agent** (`agent_workspaces`) : le terrain est un droit, le projet est un objet. Un sous-dossier qui n'est pas au registre n'est pas un projet.

**La règle.** Une production qui atterrit dans un projet enregistré s'y rattache sans rien demander. Hors de tout projet, l'agent demande **où** avant d'écrire (P10) ; la réponse crée le projet. Rien ne se crée en silence.

**Sur quoi ça s'appuie.** `agent_workspaces` (libellé + chemin, déjà par agent), `code_projects` et `PROJECT_MARKERS` (Vérifier & Corriger) pour la sorte `code`, les intentions de mutation et leurs clés canoniques pour savoir où une production a atterri.

**Garde.** Un `file_write` dans `terrain/projet-x/` d'un projet enregistré rattache le job à ce projet ; le même écrit dans `terrain/vrac/` sans projet ne crée rien et déclenche la question ; un chemin hors terrain reste refusé, comme aujourd'hui.

**À vérifier.** La sorte `documents` n'a pas de marqueur : créée à la main ou par la question, jamais devinée.

**Livré le 06/09 (`fd2293c3`, passe Codex 27).** Le registre est `code_projects` étendu (`registered_at` NULL = ligne de comptabilité, NOT NULL = projet ; `kind`, `agent_id`, `registered_from`, `registered_job_id`) et `agent_jobs.project_id`. Le rattachement lit les cibles de l'intention de mutation (contenance, le plus niché gagne, le premier projet du job gagne). Deux décisions prises en chemin, **à valider par Quentin** :

- *Le terrain lui-même peut être le projet* (`subfolder` vide dans « Nouveau projet ») : le cas d'un dépôt attaché tel quel. Codex note qu'un terrain-projet englobe alors TOUT ce que l'agent y écrit, `terrain/vrac` compris, et que sur le chemin du harnais de code (dont la cible est le terrain entier) chaque session s'y rattache. Si Quentin tient à « projet = sous-dossier strict », il suffit de refuser le sous-dossier vide.
- *Le rattachement se fait après le succès de l'écriture*, pas avant (contrairement à l'intention de mutation, qui reste conservatrice) : un outil qui échoue ne « produit » rien dans le projet.

### P6 · La conversation continue et son projet courant — M

**Ce que ça pose.** Une conversation est un fil : un par chat Telegram, Slack ou Discord, un par conversation du dashboard. Il dure **jusqu'à ce que tu en ouvres une autre** (un bouton dans le dashboard, une commande dans le canal, à nommer). Elle porte un **projet courant**, posé quand une production atterrit dans un projet ou quand elle naît depuis la page d'un projet, et redit au modèle à chaque tour.

**Ce qui change.** Le découpage par silences disparaît comme identité de conversation (décision du 06/09). Il reste un **budget de relecture** : ce qu'on redonne au modèle. La conversation peut avoir trois mois, le prompt non — deux choses différentes, l'identité du fil et la mémoire qu'on en relit.

**Sur quoi ça s'appuie.** `conversations` + `chat_messages` (dashboard), `agent_jobs.conversation_id` (285 jobs Telegram sur 286 le portent, mesuré le 06/09), `resolveConversationId` et `thread-history.ts` pour la relecture.

**Garde.** Deux messages Telegram à une semaine d'écart sont dans la même conversation ; « nouvelle conversation » en ouvre une autre, la précédente reste lisible ; une production dans un projet pose le projet courant et le tour suivant le voit dans son prompt ; la relecture reste sous le budget quelle que soit la longueur du fil.

**Livré le 06/09 (commit P6, passe Codex 28 à suivre).** `conversations` est la table de TOUS les canaux (migration 0094 : `channel`, `chat_id`, `current_project_id`, backfill d'une ligne par conversation de canal existante — 54 sur la base dev) ; **pas de clé étrangère** depuis `agent_jobs.conversation_id` (95 jobs de la base dev portent l'uuid d'une conversation supprimée, la page Runs perdrait leur regroupement). La commande est **`/new`** (nu : la tâche reste `/new`, le prompt dit « premier tour » ; suivi d'un texte : c'est le texte) ; un fil neuf ne reprend pas le projet courant du précédent. La relecture lit les jobs de tête de la conversation sous `MAX_TURNS` et `BUDGET_CHARS` ; le silence de 4 h a disparu. Le bloc `## Conversation` du prompt dit le nombre de tours précédents et le projet courant (nom, dossier, sorte). Un job né dans une conversation ancrée porte son `project_id` dès l'insert (canaux et escalade `run_task`). Un tour de chat du runtime CLI pose le projet courant sans job. Hors périmètre, à faire plus tard : l'ancienne variable `THREAD_IDLE_RESET_MINUTES` ne survit que dans le script de backfill 0059.

### P7 · Chat, la maison de toutes les conversations — L

**Ce que ça pose.** La page Chat liste **toutes** les conversations, tous canaux, avec leur origine. En ouvrir une rend le fil de P2, le même code. Au tour où quelque chose est sorti du chat, un **encart** dit ce qui a été produit, le projet où il vit (nom, dossier) et le lien vers sa page. Répondre depuis le web dans une conversation venue d'un canal passe par l'outil d'envoi de ce canal.

**La frontière.** Chat : lire, chercher, consulter **et noter** la mémoire, répondre en texte sur n'importe quel canal de la conversation (le canal est transparent), déléguer à un agent qui n'a fait que parler. Travail : un fichier, un document, un projet de code, une écriture dans une base externe, une pièce jointe envoyée, un email ou tout envoi vers un destinataire qui n'est pas un canal de la conversation, le harnais de code. **Récursif** sur les descendants. Se lit sur les cartes de P1 ; les outils tiers (`generic`) exigent de persister leur niveau de risque sur `tool_calls`, une colonne de plus. Les outils natifs se classent par leur **carte**, jamais par leur niveau de risque : `save_memory` est `write` pour la garde d'exécution mais `text` pour la carte, donc chat ; le niveau de risque ne sert qu'aux outils tiers, qui n'ont que `generic`.

**Hors périmètre.** La page Runs et son classificateur `classifyJob` (qui compte une recherche web comme une tâche) restent tels quels.

**Garde.** Un « bonjour » : sans encart. Une recherche web répondue dans le chat : sans encart. Un `save_memory` : sans encart. Un `file_write` dans un projet : encart avec le lien. Un email avec les résultats : encart. Un connecteur en écriture : encart ; en lecture : sans. Un sous-agent qui n'a fait que parler : sans ; un sous-agent qui a écrit : encart sur le tour parent.

**Tranché par Quentin le 06/09 (au go du lot 2).** **L'agent de recherche** suit la règle récursive : seul ce que le sous-agent a produit compte. « S'il ne fait que répondre à un message dans le chat, ce n'est pas un projet. » La garde « un sous-agent qui n'a fait que parler : sans encart » est donc la bonne ; déléguer n'est jamais en soi une production.

**À vérifier.** **Deux sources pour un fil.** Une conversation du dashboard vit dans `conversations` + `chat_messages` ; le contrat du schéma dit qu'un tour pur ne crée pas de job et qu'un tour devenu action porte `jobId`. Le fil de P2 lit un job : P7 doit lire les deux (les tours dans `chat_messages`, les actions par leur job) — à vérifier dans le code du chat avant de découper P7. Et répondre depuis le web dans un fil Telegram, Slack, Discord : canal par canal, ce que l'outil d'envoi permet aujourd'hui.

**Livré le 06/09 (commit P7, passe Codex 29 à suivre).** `/chat` = la liste de TOUTES les conversations (origine, agent, titre ou première demande, projet courant, tours, dernière activité ; recherche, suppression, « New conversation ») ; `/chat/[id]` = le fil de P2 sur toute la conversation (`conversation-thread.ts` : les jobs de tête d'un canal, ou les `chat_messages` du dashboard avec le job escaladé sous chaque tour, sans les `history` préfixés, la consigne passée au job repliée en « handoff »), la preuve et les envois de tous les jobs, la barre d'état sur tout le fil, et la saisie en bas pour le dashboard. La frontière chat / travail (`chat-or-work.ts`) se lit sur les cartes : `files`, `sent` hors du canal de la conversation, `terminal`, `cli:*`, `generic` avec `risk_level` `write`/`destructive` (migration 0095, écrit par `executeTool`) ; `read` = chat ; sans niveau = incertain, dit tel quel ; récursive sur les descendants (lecture (b)). L'encart « Produced » nomme les fichiers (plafond 8), le projet (`agent_jobs.project_id`) et renvoie à `/spaces/<id>` (page de P8). Le chat à deux volets et ses trois actions de lecture ont disparu. **Limites** : les lignes d'avant P1 n'ont pas de carte, donc les fils anciens n'ont pas d'encart ; répondre depuis le web dans un fil venu d'un canal reste hors périmètre (le fil le dit).

### P8 · Spaces : la liste des projets et la page du projet — L

**Ce que ça pose.** Spaces liste des **projets**, plus des jobs : nom, dossier, sorte, agent, dernière activité, état de la preuve. Un bouton **Nouveau projet** : nom, dossier sous un terrain, sorte. La page du projet : l'étagère (dossier, fichiers, preuve, le panneau existant), ses conversations, et **la saisie en bas**, une conversation dédiée au projet, comme le panneau de chat d'un IDE. Un job créé depuis là naît avec le projet courant.

**Ce qui change.** La page `/spaces/[id]` actuelle (le fil d'un job) devient le fil d'une conversation, lue depuis Chat ou depuis le projet. Rien du rendu ne se perd : P2 à P4 sont le fil, la preuve, la barre d'état.

**Sur quoi ça s'appuie.** P2-P4 ; `ChatClient` et `sendChatMessageAction` pour la saisie ; P5 pour le registre ; P6 pour le projet courant.

**Garde.** Créer un projet crée la ligne et son dossier ; parler depuis la page crée un job dont le prompt porte le projet ; un job venu de Telegram qui a produit dans ce dossier apparaît dans les conversations du projet.

**Livré le 06/09 (commit P8, passe Codex 30 à suivre).** `/spaces` liste les projets enregistrés (nom, sorte, agent, dossier, travaux, dernière activité, dernier verdict de preuve par clé d'identité) ; « New project » = une modale non dismissable (agent → terrain → sous-dossier avec aperçu du chemin final, sorte). `/spaces/[id]` = l'étagère (dossier, fichiers sur un niveau avec `.git`/`node_modules` comptés, preuve : configuration déclarée + dernières séquences), les conversations du projet (celles de ses travaux et celles ancrées par `current_project_id`), puis le fil de la conversation du projet et la saisie en bas — le premier envoi crée cette conversation, ancrée au projet, agent ROOT. Le fil d'un run a déménagé vers `/scheduled/[id]` ; `listSpacesAction` et la table des jobs de Spaces ont disparu. **Deux arbitrages pour Quentin** : le lien d'une délégation dans un fil pointe vers `/scheduled/<jobId>` faute de route neutre pour le fil d'un job (un délégué n'est pas un run) ; la configuration de la preuve n'a pas d'URL propre (elle vit dans la table de l'écran Code), l'étagère renvoie vers `/code`. **Passe Codex 30, traitée** : un échec de lecture du fil est dit et retire la saisie ; la preuve ne charge que ses trois dernières séquences ; un dossier illisible dit sa cause (absent, pas un dossier, permission) ; **la conversation du projet est celle ouverte depuis sa page** (`origin = 'project'`, migration 0097), pas la plus récente ancrée ; un lien symbolique est listé comme tel, sans être suivi ; la troncature du fil lit N + 1. Reporté au lot 3 : la conversation du projet naît avec le ROOT, pas avec l'agent responsable du projet. **Passe Codex 31** : un seul constat, sans population — une conversation de projet créée avant 0097 ne serait plus reconnue, mais l'action qui en crée et la migration partent dans la même PR, et la base dev n'a aucune conversation ancrée (mesuré) ; dit dans la migration. Le lot 2 est clos côté code ; il attend l'œil de Quentin.

### P9 · Scheduled — S

**Ce que ça pose.** Une entrée de menu **Scheduled** : les automatisations et leurs runs, une ligne par automatisation, repliée, ses runs dessous — ce que la section Scheduled de Spaces fait aujourd'hui, à sa place. Un lien vers Automations pour la configuration. Plus aucun run d'automatisation dans Spaces ni dans Chat.

**Sur quoi ça s'appuie.** `listSpacesAction` (deux requêtes, deux limites), `groupSpaces`, `ScheduledSection` : le code existe, il change de page.

**Garde.** Aucun run cron dans Spaces ni dans Chat ; un run ouvre son fil.

**Livré le 06/09 (`b9ff0f1b`, passe Codex 26 → `0cb5889b`).** Entrée « Scheduled » (icône `CalendarCheck`), page `/scheduled`, `listScheduledRunsAction` ; Spaces sans cron (garde mutée). La passe 26 a fait remonter deux dettes du lot 1, corrigées : l'id d'une automatisation supprimée survit désormais dans la provenance du job (deux homonymes supprimées restaient une seule ligne), et les trois `<button>` bruts de ClampedText/StatusBar sont passés par le DS. **Décision à valider par Quentin** : le contrat documenté de `TextButton` a été élargi à la *disclosure inline* (« Show more », les segments jetons/coût de la barre d'état) plutôt que de créer un composant DS de disclosure compact (qui exigerait sa parité Figma) ; « Back to the conversation » est un `RowActionButton`.

**Lot 3 · L'agent qui demande et montre**

### P5b · Le registre se remplit tout seul — S

**Ce que ça pose.** Question de Quentin le 06/09 au soir : « en quoi les projets qui sont dans le menu Code n'ont pas leur place dans la page Spaces ? » Réponse : ils y ont leur place, la séparation venait de mon découpage (P5 a livré « créé depuis Spaces » et reporté « déclaré par une conversation qui y a produit » à P10, alors que l'onglet Code fait déjà cette seconde moitié à sa façon). **Une seule définition** : un dossier où une production de code atterrit et qui porte un manifeste est un projet, déclaré par cette conversation. Le registre se remplit au rattachement (racine dérivée par la règle de l'intention, manifeste présent → ligne enregistrée, origine « conversation », agent = celui qui produit, job = celui qui a produit) ; un backfill au démarrage du runner enregistre ce que l'onglet Code montre déjà ; le chemin CLI lit les chemins édités par le harnais. « Rien ne se crée en silence » ne vise plus qu'un dossier sans manifeste : la question de P10 se restreint aux documents.

**Garde.** Un `file_write` dans `terrain/app/src/` avec `terrain/app/package.json` enregistre `terrain/app` et y rattache le job ; le même dans `terrain/vrac/` n'enregistre rien ; une ligne de comptabilité avec preuve devient le projet sans perdre sa preuve ; un projet rangé s'enregistre en restant rangé ; le backfill est idempotent.

**Reste à part.** L'onglet Code lit encore sa dérivation ; le faire lire le registre est une pierre ultérieure.

**Livré le 06/09 (`16d1f574`, puis `4491ae46` et `aefdcec3` pour la passe Codex 32, `934091d4` pour la passe 33, `4f084c21` pour la passe 34).** Codé par moi : l'agent Opus est tombé sur sa limite de session au premier geste (reset 19h10), et Sonnet est interdit (Quentin, 06/09 : « tu as interdiction d'utiliser sonnet à la place de opus »). Ce qui est en place : `projects/markers.ts` (le manifeste et les chemins réels, partagés entre l'intention et le registre), `projects/register.ts` (`INSERT … ON CONFLICT DO UPDATE … WHERE registered_at IS NULL`, une instruction, `display_name` et `hidden` jamais touchés), la déclaration dans `attach.ts` AVANT la recherche du projet contenant, le chemin CLI qui lit les chemins écrits par le harnais, le backfill au boot du runner (`REGISTRY_BACKFILL`). Sur la base dev : 3 projets déclarés (`podium-app`, `igdb-app`, `notes-app`), 5 jobs rattachés ; les 9 autres « projets » de l'onglet Code sont `Dev` lui-même (sans manifeste) et huit dossiers du coffre Obsidian, masqués et sans manifeste — des documents, pas des projets.

**Ce que la passe Codex 32 a corrigé dans la règle.** (1) *Seules les cibles fichier déclarent* : un tour CLI réussi sans édition (« je vais d'abord analyser », en mode écriture) déclarait le dossier attaché à manifeste ; une cible dossier est un périmètre, pas une production — elle rattache à un projet déjà déclaré, elle n'en déclare aucun. (2) *Déclaration et rattachement en une transaction* : sans job et sans conversation trouvée, la déclaration est annulée ; deux racines tombent ensemble. (3) `agent_id` = l'unique détenteur, sinon NULL (l'ordre des lignes ne désigne personne). (4) `registered_at` = l'instant de la déclaration (Spaces l'affiche comme date d'ajout), et pour que la page d'un projet montre son activité, *le backfill rattache l'historique* (`agent_jobs.project_id`) — aussi pour un projet déclaré d'un clic. (5) Les chemins du harnais se résolvent sans le disque (un fichier écrit puis supprimé reste une production). (6) Compteurs du backfill par raison. **Passe 33** (aucun constat bloquant, les huit constats de 32 confirmés traités) : la course entre l'enregistreur d'événements de la CLI (insertions jamais attendues) et la lecture des chemins écrits — les écritures d'audit en vol sont attendues avant de lire ; et `realPathOf` d'un chemin disparu remonte à l'ancêtre existant (un fichier écrit puis supprimé sous un alias retombe sous sa racine réelle). **Passe 34** : un P0 vrai — l'attente des écritures d'audit n'avait pas de borne, une connexion figée gelait un tour déjà terminé ; bornée à 5 s, dite par un code ; le test de la course est dit temporel (fenêtre 1,5 s et preuve que le tour a attendu) ; la remontée de `realPathOf` s'arrête au partage d'un chemin UNC, jamais le serveur seul. **Passe 35** : le test de la course est refait SANS horloge (`268f68ef`) ; le P0 restant — une insertion figée n'est pas annulée à la borne et garde sa connexion — n'est pas propre à P5b : c'est la robustesse du client de base (`statement_timeout` exclu à dessein, keepalive TCP 60 s, `lock_timeout` 30 s), la même exposition pour toute requête du runner et pour les insertions d'audit d'avant P5b. Arbitrage ci-dessous. **Passe 36** : Codex confirme les deux points (le test rougit par causalité, sans horloge ; aucun chemin de P5b n'aggrave l'état d'avant) — aucun constat bloquant, **P5b close**.




**Arbitrages pour Quentin.** *Un nouveau projet depuis la conversation = une approbation* (P10b, Codex passes 39-41) : « où ranger ? » (la question) puis « créer ce dossier ? » (la carte d'approbation) — deux clics pour un nouveau projet. L'alternative, pour n'en garder qu'un, est une autorisation STRUCTURÉE portée par l'option de la question (l'option déclare ce qu'elle crée) : une pierre à part, pas un correctif. *Textes de chrome dans le runner* (P10a, Codex passes 37-38) : « ❓ X asks: », « Tap an option below », « Pick an option. », « ✅ Answered: … » sont écrits par le runner, comme « ⏳ Approbation requise » et « Already approved. » de la carte d'approbation existante ; Codex lit l'invariant #2 au pied de la lettre (aucun texte utilisateur dans le runner : le chrome doit venir de l'adaptateur de livraison, du web, ou d'une configuration en base) et je le lis comme « jamais à la place de l'agent ». Trancher : garder le chrome où il est (et l'écrire dans CLAUDE.md), ou ouvrir une pierre qui déplace TOUT le chrome des approbations et des questions hors du runner. *Connexions figées* : Codex (passe 35) pointe qu'une requête sur une connexion morte sans RST tient sa connexion du pool jusqu'aux sondes keepalive de l'OS ; ce n'est pas P5b, c'est le client — poser un `statement_timeout` par session (sauf backfills), ou un délai de lecture socket, est une décision d'infrastructure à prendre à part. *Jonctions* : deux dossiers attachés qui pointent vers le même dépôt physique donnent deux projets (c'est D10 du plan « Vérifier & Corriger », toujours ouvert) — interdire les racines qui se recouvrent, ou accepter deux identités. *Historique borné* : le rattachement des jobs passés lit la fenêtre du scan (1 500 dernières écritures) ; les jobs plus anciens restent sans projet. *Un tour de chat CLI ne déclare jamais* (sans job, l'audit ne dit pas quelles écritures sont les siennes) : un dépôt attaché à un agent en runtime CLI attend un tour de JOB pour apparaître dans Spaces.

### P10 · `ask_user` — M

**Ce que ça pose.** Un outil qui pose une question avec des options. Dans la conversation : la carte à boutons. Dans le canal d'origine : la même carte, via l'infrastructure des approbations (`notify.ts`, préfixe de rappel propre). La réponse reprend le job exactement comme une approbation le fait. **Premier usage : « où écrire ? »** quand une production sort du chat hors de tout projet (P5).

**Ce que ça absorbe.** La seconde moitié de v7-C (approbation des commandes de preuve dans le canal) est un cas de `ask_user`. Une plomberie, deux usages.

**Garde.** Un `ask_user` suspend le job ; un clic dans le canal le reprend avec la réponse dans le transcript ; une réponse hors options est refusée ; la réponse à « où écrire ? » crée le projet et pose le projet courant.

**Découpée en deux le 06/09 (soir).** *P10a — la plomberie* (**livrée le 06/09, `5c7938a7`**, par opus-p10a sur spec, relue, 10 mutations rouges, migration 0098 appliquée en dev ; **passe Codex 37** : deux P0 vrais corrigés dans `36dd5c92` — une question sans id d'appel est refusée au lieu d'être suspendue (sinon reposée à l'infini), et `ask_user` ne rentre jamais dans le pré-passage parallèle (deux questions d'un tour auraient eu deux lignes et la réponse au mauvais appel) ; le P2 « textes de plateforme » répondu : le runner ne parle jamais à la place de l'agent, mais porte son chrome comme la carte d'approbation existante. **Passe 38** : les deux P0 confirmés traités ; un P0 hors demande VRAI — deux fichiers du chantier P10b (une suppression et deux fichiers vides) étaient entrés dans le commit par l'index d'un agent en cours, HEAD ne compilait plus côté web ; rétablis aussitôt (`5d583c1e` et le commit `chore(web)` qui suit) ; le P2 « textes de chrome dans le runner » reste un DÉSACCORD avec Codex, consigné en arbitrage ci-dessous) : l'outil `ask_user` (2 à 6 options, `card: 'question'`), un troisième plancher dans la porte d'approbation (`asksUser` : ni une règle `auto_approve` ni l'autonomie ne sautent une question), `approval_requests.kind ('approval'|'question')` + `answer` (migration 0098), la résolution qui refuse une réponse hors options, la carte Telegram à un bouton par option (`apr:<id>:o<n>`), la page Approvals et la carte `QuestionCard` dans le fil des trois pages, avec la réponse une fois donnée. *P10b — « où écrire ? »* (**livrée le 06/09, `baea7599`**, par opus-p10b sur spec, relue, 7 mutations rouges dont un cas ajouté — une ligne renommée depuis l'onglet Code garde son nom en devenant projet. **Passe Codex 39** : un P0 vrai, que j'avais posé en doute — n'importe quelle question répondue du job déverrouillait la création (« Quelle couleur ? » → « Bleu » suffisait) ; corrigé dans `5921ba4f` : l'option CHOISIE doit nommer le projet (son nom ou son dossier, accents et casse repliés), sinon la carte d'approbation ordinaire ; plus le rollback de la ligne et du dossier si le rattachement échoue, et « cinq projets pertinents au plus » dans la consigne. **Passes 40-41** : la liaison par le texte de l'option a été resserrée (`147159ff` : égalité stricte au lieu de la sous-chaîne) puis mise en défaut une troisième fois (un projet EXISTANT proposé par son nom d'affichage, non unique, déverrouille une autre destination) — trois passes sur la même garde, c'est la forme qui est mauvaise : **la liaison texte est abandonnée, `register_project` passe par l'approbation ordinaire** (une carte « créer ce dossier ? », relâchée par une règle explicite du propriétaire ou une autonomie qui laisse passer le non-destructif). Un clic de plus pour un nouveau projet, zéro devinette. Arbitrage ci-dessous) : `register_project` (un projet de documents déclaré depuis la conversation, rattaché aussitôt), la guidance du prompt système (demander avant d'écrire hors de tout projet déclaré et hors manifeste), et `computeApproval` de `register_project` qui exige une question répondue dans le même job — sauf autonomie totale.

### P11 · Fichiers et diff — M

**Ce que ça pose.** La carte « 12 fichiers » : la liste cliquable, le diff de la sélection.

**Sur quoi ça s'appuie.** Pour `file_edit`, `tool_input` porte l'ancien fragment (`old_string`) et le nouveau : le diff se rend directement. Pour `file_write`, l'entrée ne porte que le chemin et le **nouveau** contenu (vérifié le 06/09, `file-write.ts`) : l'état antérieur doit venir de l'instantané du tour. Pour le harnais de code comme pour `file_write`, il faut donc le sha de l'instantané : **il n'est pas en base.** Deux pièces : persister `(job_id, turn, sha, workspace)` quand `takeCheckpointForTurn` le calcule (aujourd'hui seulement journalisé), puis `git diff` dans le dépôt des instantanés.

**Limite.** Hors d'un dépôt git, il n'y a pas de diff pour ce que le harnais écrit ni pour un `file_write` qui écrase : la carte dit alors « fichiers écrits, sans diff ». Seul `file_edit` rend son diff partout.

**Garde.** Un `file_edit` semé rend son diff exact ; un instantané semé puis un second rendent le diff git attendu ; un `file_write` qui écrase dans un dossier sans git rend l'état « sans diff » et pas une erreur.

### P12 · Le tableur rendu — S

**Ce que ça pose.** La carte `table` pour un `office_file` : les premières lignes de la feuille demandée, les contrôles v7-B en pied. Un tableau de valeurs, pas Excel : ni formules, ni fusion, ni mise en forme, dit tel quel. La charge utile de P1 dit déjà si la première ligne est un en-tête (`header: 'unknown'` pour un classeur lu) : la carte le demande ou le dit, elle ne devine pas.

**Sur quoi ça s'appuie.** `xlsx_read` et sa carte `table` (P1).

**Livré le 06/09 (`b4ac14b1`, par opus-p12 sur spec, relue, 5 mutations rouges ; passe Codex 46 lancée).** Ce qui est en place : une entrée de la carte `files` peut porter un `preview` (la même forme qu'une table) et la clé canonique du document ; les 14 outils d'écriture xlsx relisent la feuille touchée dans le classeur qu'ils ont en mémoire (valeurs brutes ; une formule fraîche se montre comme formule, exceljs ne calcule pas) ; la carte montre les premières lignes sous le fichier, dit « values only » et l'en-tête inconnu, et en pied l'état de vérification du document lu par sa clé — `not_configured` → « Not verified: no checks exist for documents yet », le cas d'aujourd'hui puisque v7-B n'existe pas ; jamais un vert inventé. Un bug de `tableCard` corrigé au passage (`truncated` ignorait `total`).

**Ce que la passe Codex 46 a corrigé dans la pierre (`f790a051`, 07/09).** Cinq constats, tous vérifiés vrais à la source. (1) La *limite dite* ci-dessus n'était pas une limite mais un défaut : la clé de la carte (chemin réel) et celle de l'intention (chemin lexical) sont maintenant calculées par **une seule fonction** (`office-file-key.ts`), appelée des deux côtés — sous une jonction, la carte retrouve sa ligne d'état. C'était aussi la cause de la CI Windows rouge sur `9dd89c2a` : le dossier temporaire y est en forme courte 8.3, la clé réelle ne le valait pas. (2) Le texte riche, un hyperlien riche et une formule partagée sans résultat s'affichaient « [object Object] » : la cellule se lit par `formula`/`result` (formule partagée traduite), le texte riche se joint, le repli épelle l'objet. (3) Le pied disait « values only: no formulas » sous une formule montrée telle qu'écrite : il dit maintenant « no formatting or merged cells; uncomputed formulas shown as written ». (4) La carte n'était bornée qu'en lignes : `CARD_COLS_MAX` (20) au schéma, au présentateur et à l'aperçu, et « showing 20 of 35 columns » quand il y a plus. (5) L'état d'un document était « le plus récent du fil, toutes conversations de jobs confondues » : un job qui finit de vérifier SA génération après qu'un autre a réécrit le fichier posait « Verified » sur la mauvaise carte. L'état se lit par **(job, clé)** — la carte d'une écriture porte l'état du job qui l'a faite, une ligne par la contrainte d'unicité, rien à départager. *Ce que ça ne dit pas encore* : un job qui écrit deux fois le même fichier a deux cartes sur une seule ligne d'état ; dater chaque carte d'une génération est l'affaire du vérificateur de documents (v7-B), pas de cette pierre. Le parcours complet de la feuille pour un `total` exact est accepté et dit dans le code. *Dégradation acceptée* : une carte `table` déjà persistée avec plus de 20 colonnes ne passe plus le schéma à l'écran, qui montre alors la sortie brute.

**Passes 47 et 48 (`e9393c54`, 07/09).** Un seul constat neuf en 47, vrai : une cellule couverte par une fusion rend la valeur de son maître, et « Q1 » fusionné sur A1:C2 paraissait six fois — six valeurs là où le classeur n'en tient qu'une. La valeur paraît maintenant une fois, au maître, les cellules couvertes restent vides (le maître est toujours en haut à gauche de la plage : l'aperçu ne peut pas montrer une cellule couverte sans son maître). Les sept autres questions de la passe 47 ont tenu (double rebasage idempotent, racines normalisées, formule partagée traduite après sauvegarde, résultat 0 montré 0, la carte lit le job de l'intention, lignes anciennes rendues brutes). Passe 48 : aucun constat neuf — **P12 close, et avec elle le lot 3 côté code**.

**Lot 4 · Ce qui reste cher**

### P13 · Les relecteurs — L

**Ce que ça pose.** C'est la PR④ de Vérifier & Corriger, inchangée. Ici seulement sa carte : deux relecteurs, leur verdict, leur citation. Rien à planifier de neuf, une dépendance à nommer.

### P14 · L'aperçu vivant — XL

**Ce que ça pose.** Lancer et tenir un serveur de développement par projet, l'afficher, gérer ports et arrêts. C'est le produit entier de Lovable. **Dernier, et sans promesse.** Tant qu'il n'existe pas, le centre du projet montre le dernier diff, et le bouton « L'application » ouvre l'URL locale dans un onglet.

## Ce que ça fait aux seize onglets

Deux entrées de plus, « Spaces » et « Scheduled ». Et une page qui change de
nature : **Chat**, qui accueille désormais toutes les conversations — décision
de Quentin du 06/09. Runs et Code restent tels qu'ils sont ; les fusionner un
jour est une décision de Quentin, pas une conséquence de ce plan.

## Ce que ça fait au plan Vérifier & Corriger

Il continue. Ce plan est la **surface** ; l'autre est le **moteur**. Les points
de contact : v7-B nourrit la carte du tableur (P12) ; la seconde moitié de v7-C
est absorbée par P10 ; les intentions de mutation disent où une production a
atterri (P5) ; le niveau de risque déclaré par les outils, persisté sur
`tool_calls`, sert la frontière chat / travail (P7) ; PR④ est P13.
L'observation, la garde et le runtime CLI ne bougent pas.

## Les limites, dites avant de commencer

- Le raisonnement n'est visible que pour les modèles qui l'émettent ; l'écran
  le dira au lieu de faire semblant.
- Le diff du harnais de code n'existe que dans un dépôt git.
- Le tableur rendu est un tableau de valeurs.
- L'aperçu vivant peut ne jamais ressembler au dessin.
- La maquette est une intention, pas une spécification au pixel : chaque pierre
  sera validée à l'écran, par Playwright, avant d'être dite finie.
- La frontière chat / travail dépend du niveau de risque que les outils tiers
  déclarent : un connecteur qui se déclare mal se classe mal — et l'écran dira
  d'où vient la classification.
- Répondre depuis le web dans un fil venu d'un canal dépend de l'outil d'envoi
  de ce canal ; à vérifier canal par canal avant de le promettre.
