<!-- artifact: https://claude.ai/code/artifact/a7bc52c8-b9e9-4561-a44d-5ec1c78dca81 -->

# Parler, c'est se souvenir — deux PR

> Une PR, un lot, mergée dans la semaine. Deux lots ici, donc deux PR : ce qui
> tient l'état d'une routine, et ce qui tient le fil d'une conversation.

## Le sujet, en une phrase

**Alfred a parlé dans le fil de Quentin sans y écrire, il a republié une
annonce déjà faite dix jours plus tôt, et il a répondu aux accusés de réception
de ses propres messages.**

Les trois constats viennent de la nuit du 07 au 08/09, sur le fil Telegram
`a7aa39e4` (chat `199791464`) et la routine
`Check-Nodal-Agents-GitHub-Updates`. Tous les trois sont lus en base, pas
déduits. **Aucun n'est un défaut du modèle.**

## Suivi

| # | PR | Ce qui change | Taille |
|---|----|---------------|--------|
| 1 | B — la routine | Une routine a un état à elle, pas un souvenir | M |
| 2 | A — le fil | Ce qu'un agent dit dans un chat appartient au fil de ce chat | M |
| 3 | A — le fil | Un envoi rend « envoyé », pas un identifiant à interpréter | S |
| 4 | A — le fil | La page Chat sépare les canaux des conversations | M |

## Les trois preuves

### Le doublon Discord

La routine tourne 2 à 3 fois par jour. Sa consigne dit :
*« Read the last-known announced version with query_memory. This memory IS your
stored state. »*

- Runs du 07/09 à 01:00, 06:01 et 15:00 : `query_memory` rend en tête le fait
  `ab46445c` — « v0.8.8 (Aug 28), announced on Discord #announcements ».
  Verdict : rien de nouveau. Correct.
- Run du 08/09 à 01:00 : **la même requête rend en tête un fait sur le vault
  Obsidian HP AI Training**. L'agent conclut « aucune version précédente en
  mémoire (premier run) », poste l'annonce sur `#announcements`
  (`conversationId 1511202553420054671`, message `1546686789001945099`) et
  enregistre un fait neuf.

Le fait `ab46445c` **n'est plus dans la table**. Pas archivé : supprimé. Les
chemins de suppression ont été vérifiés un par un — le curateur archive et ne
supprime jamais (`packages/memory/src/curator.ts:10`), `mark_memory_outdated`
archive, `save_memory` n'écrase rien. Le seul code qui supprime pour de bon est
`deleteMemory`, appelé uniquement par la page Memories et la page Root context.
**Aucun agent ne peut l'avoir fait.**

### Le trou dans le fil

Colonne `messages` du job de 01:23, 28 entrées. Les tours rejoués au modèle :

1. « Fais-moi une app en HTML… IGDB » (26/08)
2. « Mets en ligne sur cloudflare »
3. « Je peux pas juste m'authentifier avec mon compte steam »
4. « Fais l'option la plus simple »
5. « T'en est où ? »
6. « Allo ? »
7. « Quelle url utiliser pour accéder à nodal en lan ! » (26/08)
8. « Je comprend pas. Elle est déjà publiée la 0.8.8 » (08/09)

L'annonce n'y est pas. Le prompt système (54 804 caractères) ne contient ni
`0.8.8`, ni `changelog`, ni `announce` — les trois ont été cherchés. Le
raisonnement du modèle, enregistré : *« User confused — replying to "0.8.8"? …
Context unclear. Ask clarifying question. »*

Pourquoi : `thread-history.ts:192` construit le fil avec
`WHERE conversation_id = …`. Le job de la routine porte `conversation_id NULL`,
alors qu'il a écrit sur `chat_id 199791464` — le fil de Quentin. Telegram
affiche un fil continu ; Nodal en relit un troué.

### Les accusés de réception pris pour des réponses

Dans ce même job, après l'envoi qui rend `{messageId: "2311"}` :

> *« User replied "2311"? That's odd — messageId "2311" means it came from a
> different chat? … likely they mean port 2311? Earlier I said port 3000 »*

Puis la même chose avec « 2312 ». Trois tours menés contre ses propres
identifiants, et plusieurs messages décousus envoyés pour une seule question.

Le `messageId` ne sert à rien au modèle : il est consommé par l'outbox
(`apps/runner/src/delivery/outbox.ts:453`, accusé de réception), et
`thread-history.ts:297` rejoue d'ailleurs `{messageId: 'history'}` pour tous les
tours passés — la valeur réelle n'a jamais été utile.

---

## PR B — la routine se souvient de ce qu'elle a fait

**Une routine a un état à elle.** Une clé, une valeur, écrite et relue sans
LLM, portée par la routine et visible sur son écran. Pas un fait en langage
naturel, noyé dans 37 souvenirs, retrouvé par recherche floue et effaçable d'un
clic depuis une page qui ne dit nulle part qu'une routine en dépend.

`agent_schedules` n'a aujourd'hui aucune colonne libre pour ça (vérifié :
`packages/db/src/schema/schedules.ts`).

*Preuve* : vider entièrement `agent_memory`, lancer la routine — elle ne
republie pas. Poser un état différent de la version du dépôt — elle republie
une fois, une seule.

**Ce que ça ne change pas** : la mémoire reste ce qu'elle est, pour ce à quoi
elle sert (ce que l'agent sait de Quentin). On lui retire seulement un rôle
qu'elle ne pouvait pas tenir.

## PR A — le fil dit la vérité

### 1 · Ce qu'un agent dit dans un chat appartient au fil de ce chat — M

Aujourd'hui un tour de fil est un job. Un job de routine n'appartient à aucun
fil, et **un même run peut parler dans plusieurs chats** — celui du 08/09 a
écrit sur Discord *et* sur Telegram. Le tour ne peut donc pas être le job : il
doit être l'**envoi**, rattaché au fil du chat où il part.

`resolveConversation` sait déjà désigner le fil d'un chat. Ce qui manque, c'est
que l'envoi l'appelle et laisse une trace lisible par `thread-history`.

⚠️ **À vérifier avant de coder** : ce que ça fait des routines qui écrivent dans
un chat sans que personne n'y réponde jamais — un fil qui grossit d'un tour par
jour sans interlocuteur. Le budget de relecture doit rester borné.

*Preuve* : après un run de routine qui annonce quelque chose, le tour suivant de
l'utilisateur dans ce chat rejoue l'annonce. Aujourd'hui il ne la rejoue pas —
c'est la mutation qui doit rougir.

### 2 · Un envoi rend « envoyé » — S

Le modèle reçoit `{sent: true}`. L'identifiant reste côté runner, où il sert
(receipt de l'outbox). Rien de ce que le modèle reçoit ne doit ressembler à un
message.

*Preuve* : rejouer le tour du 08/09 — le modèle ne produit plus de tour sur
« 2311 ».

### 3 · La page Chat sépare les canaux des conversations — M

Deux tableaux, l'un au-dessus de l'autre.

- **En haut, les canaux.** Une ligne **par chat**, pas par canal : Telegram peut
  avoir un privé et des groupes, Discord plusieurs salons. Pas de titre tiré
  d'un message — le nom du chat (on sait déjà le lire : `list_conversations`
  rend « #announcements »), sinon l'identifiant. Ces fils ne se ferment jamais
  et ne se nettoient pas.
- **En bas, les conversations du dashboard.** Jetables, créées par « New
  conversation », renommées par l'IA.

Ça règle du même coup le titre figé : un fil Telegram de dix jours s'appelait
« Fais-moi une app en HTML, en récupérant l'API de IGDB » parce que
`touchConversation` (`conversation-id.ts:167`) pose le titre au premier message
et ne le change jamais. Nommé par son chat, le problème disparaît — et le
titrage IA, qui ne couvre que le dashboard (`run-chat-turn.ts:577`), n'a pas à
être étendu aux canaux.

## L'ordre, et pourquoi

**B avant A.** Le doublon est le seul des trois qui soit visible par d'autres
que Quentin : il a laissé deux annonces identiques dans un Discord public. B est
aussi la plus petite et la plus autonome.

Puis A. À l'intérieur de A : le point 2 d'abord (une heure), puis 1, puis 3.

**Et cette pierre passe avant « Créer, c'est prouver »** : un agent qui
republie une annonce publique coûte plus cher qu'un nom de fichier tronqué.

## Ce que ça ne contient pas

- **Le coût d'un tour de chat.** Toujours la PR d'après.
- **Une alerte quand on supprime une mémoire dont dépend une routine.** Après
  B, plus aucune routine n'en dépend : l'alerte n'aurait plus d'objet.
- **`/new` découvrable depuis un canal.** Une fois les canaux séparés dans
  l'écran, la question se repose différemment — à trancher ensuite.
