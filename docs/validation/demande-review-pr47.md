# Demande de review — PR #47 « Une routine a un état à elle »

## Ce que la PR affirme

Une routine (cron) peut désormais écrire son état dans `schedule_state`
(clé/valeur, migration 0101) et le relit TEL QUEL au début du run suivant, dans
le bloc `## Runtime` du prompt système. L'outil `save_routine_state` n'est
offert qu'aux jobs portant un `schedule_id`.

Contexte : le 08/09, une routine dont l'état vivait dans `agent_memory` a
republié une annonce sur Discord parce que `query_memory` n'a pas rendu le bon
fait (il avait été supprimé de la table).

## Questions, par priorité

### P0 — la garantie centrale peut-elle être mise en défaut ?

1. `writeScheduleState` (packages/db/src/repos/schedule-state.ts) : le plafond
   de clés est vérifié par un SELECT puis appliqué par un INSERT séparé. Deux
   runs concurrents de la MÊME routine peuvent-ils dépasser
   `SCHEDULE_STATE_MAX_KEYS` ? Si oui, est-ce grave (les contraintes de la
   table tiennent-elles quand même) ?
2. Le bloc `## Runtime` fait partie de la moitié VOLATILE ou STABLE du prompt
   (voir `SYSTEM_PROMPT_CACHE_BOUNDARY` dans packages/shared) ? L'état change
   entre deux runs : s'il tombait dans la moitié stable, une routine pourrait
   relire un état PÉRIMÉ servi par le cache. Vérifier où `runtimeBlock` est
   concaténé dans `buildSystemPrompt`.
3. `apps/runner/src/job/execute.ts` réutilise `job.systemPrompt` quand il est
   déjà écrit (reprise après approbation, resume). Un job de routine repris
   après une approbation relit-il un état figé au premier tour ? Est-ce un
   problème pour l'usage visé ?

### P1 — la disponibilité de l'outil

4. `routineStateToolNames` est ajouté à `alwaysOn` dans la branche worker ET à
   `toolDefs` dans la branche orchestrateur. Un worker DÉLÉGUÉ par un job de
   routine hérite-t-il du `schedule_id` ? S'il l'hérite, il obtient l'outil et
   peut écrire l'état de la routine — voulu ou pas ?

### P2 — l'écran

5. `listRoutineStatesAction` (apps/web/src/lib/actions.ts) filtre par
   `agentSchedules.entityId = session.entityId`. Une routine dont
   `entity_id` est NULL (la colonne est nullable) laisse-t-elle son état
   invisible, ou pire, visible à un autre espace ?
6. `ScheduledSection` indexe l'état par `g.key`, qui vaut
   `scheduleId ?? scheduleName ?? task`. Un groupe sans `scheduleId` peut-il
   afficher l'état d'une AUTRE routine par collision de clé ?

## Hors périmètre

- Le rangement des mémoires-journaux existantes (assumé non fait, dit dans la PR).
- La consigne de la routine de l'utilisateur, qui parle encore de `query_memory`
  (donnée, pas code).
- Le point 1b du plan (filtre de la page Memories).

## Ce qui n'est PAS attendu

Style, nommage, préférences de formulation. Les commentaires en français sont
la convention de ce dépôt.

## Ce dont je doute moi-même

- Le choix d'ajouter l'état au bloc `## Runtime` plutôt qu'à un bloc dédié :
  économie de jetons contre lisibilité. Si le bloc Runtime est mis en cache
  comme moitié stable, ce choix est FAUX et il faut le dire.
- Le plafond de 20 clés et la borne de 2000 caractères sont posés sans donnée
  empirique.
