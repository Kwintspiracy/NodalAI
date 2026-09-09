// chat-list.test.ts — les canaux d'un côté, les conversations de l'autre.
//
// Le cas qui a motivé ce découpage : sur la base de Quentin, le 08/09/2026, un
// SEUL chat Telegram portait 45 conversations, une par fil ouvert au fil des
// mois. Elles noyaient les dix conversations du dashboard, et chacune
// s'affichait sous le titre de son premier message.

import { describe, it, expect } from 'vitest';
import { groupChatLists } from '../chat-list.ts';
import type { ConversationListRow } from '../conversation-actions.ts';

const row = (over: Partial<ConversationListRow> & { id: string }): ConversationListRow => ({
  channel: 'dashboard',
  chatId: null,
  title: 'un titre',
  agentId: 'a1',
  agentName: 'Alfred',
  agentSlug: 'alfred',
  agentAvatarUrl: null,
  updatedAt: new Date('2026-09-08T01:00:00Z'),
  createdAt: new Date('2026-08-26T13:50:00Z'),
  currentProject: null,
  turns: 3,
  lastPreview: null,
  ...over,
});

describe('groupChatLists', () => {
  it('un chat qui porte 45 fils tient sur UNE ligne', () => {
    const rows = Array.from({ length: 45 }, (_, i) =>
      row({ id: `c${i}`, channel: 'telegram', chatId: '199791464' }),
    );

    const { channels, dashboard } = groupChatLists(rows);
    expect(channels).toHaveLength(1);
    expect(channels[0]?.conversationCount).toBe(45);
    expect(dashboard).toHaveLength(0);
  });

  it('la ligne ouvre le fil COURANT — le dernier OUVERT, pas le dernier remué', () => {
    const { channels } = groupChatLists([
      row({
        id: 'recent',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-08T10:00:00Z'),
      }),
      row({
        id: 'ancien',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-01T10:00:00Z'),
      }),
    ]);
    expect(channels[0]?.currentConversationId).toBe('recent');
  });

  it('un fil ANCIEN remué par un rattachement n’usurpe pas le fil courant', () => {
    // Revue Codex PR #48, passe 5. La séquence, vécue en une minute :
    //
    //   1. un travail tourne dans le fil A ;
    //   2. l'utilisateur tape `/new` — le runner ouvre B, qui devient le fil
    //      de ce chat : `resolveConversation` choisit par `created_at DESC` ;
    //   3. le travail de A se termine et rattache sa production à un projet —
    //      `attach.ts` touche l'`updated_at` de A ;
    //   4. l'action trie par `updated_at DESC` : A repasse devant B.
    //
    // Prendre le premier reçu désignait alors A. La ligne ouvrait donc le fil
    // que le prochain message N'ALIMENTERAIT PAS — et le regroupement, en
    // repliant B dans le compteur, lui retirait la ligne par laquelle on
    // pouvait encore le rejoindre.
    const { channels } = groupChatLists([
      row({
        id: 'A-remue',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-08T09:00:00Z'),
        updatedAt: new Date('2026-09-08T09:30:00Z'),
      }),
      row({
        id: 'B-courant',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-08T09:15:00Z'),
        updatedAt: new Date('2026-09-08T09:16:00Z'),
      }),
    ]);
    expect(channels[0]?.currentConversationId).toBe('B-courant');
  });

  it('le fil courant emporte SON aperçu et SES tours, pas ceux du fil remué', () => {
    // `lastPreview` et `turns` décrivent le fil courant : les laisser sur la
    // première ligne reçue ferait dire à la ligne du chat le dernier mot d'un
    // AUTRE fil que celui qu'elle ouvre.
    const { channels } = groupChatLists([
      row({
        id: 'A-remue',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-08T09:00:00Z'),
        lastPreview: 'le dernier mot du vieux fil',
        turns: 12,
      }),
      row({
        id: 'B-courant',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-08T09:15:00Z'),
        lastPreview: 'le dernier mot du fil courant',
        turns: 1,
      }),
    ]);
    expect(channels[0]?.lastPreview).toBe('le dernier mot du fil courant');
    expect(channels[0]?.turns).toBe(1);
  });

  it('la RÉCENCE de la ligne reste celle du chat, pas celle du fil courant', () => {
    // Ce que la liste trie, c'est « quel chat a bougé en dernier » — un fil
    // ancien remué a bel et bien fait bouger ce chat. Rabattre la ligne sur
    // l'`updatedAt` du seul fil courant ferait descendre un chat actif.
    const { channels } = groupChatLists([
      row({
        id: 'A-remue',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-08T09:00:00Z'),
        updatedAt: new Date('2026-09-08T09:30:00Z'),
      }),
      row({
        id: 'B-courant',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-08T09:15:00Z'),
        updatedAt: new Date('2026-09-08T09:16:00Z'),
      }),
    ]);
    expect(channels[0]?.updatedAt).toEqual(new Date('2026-09-08T09:30:00Z'));
  });

  it('à dates de création ÉGALES, le fil courant reste le même d’un chargement à l’autre', () => {
    // Revue Codex PR #48, constat 3 : une date seule ne départage pas deux fils
    // posés à la même seconde — un backfill, ou deux `/new` en rafale. Le lien
    // de la ligne pouvait alors désigner l'un ou l'autre selon l'humeur du plan
    // d'exécution. Le départage est l'`id` décroissant, celui de
    // `resolveConversation` : il ne dépend plus de l'ordre de réception.
    const meme = new Date('2026-09-08T01:00:00Z');
    const rows = [
      row({ id: 'bbb', channel: 'telegram', chatId: '199791464', createdAt: meme }),
      row({ id: 'aaa', channel: 'telegram', chatId: '199791464', createdAt: meme }),
    ];
    expect(groupChatLists(rows).channels[0]?.currentConversationId).toBe('bbb');
    expect(groupChatLists([...rows].reverse()).channels[0]?.currentConversationId).toBe('bbb');
  });

  it('un fil sans date de création ne prend jamais la place du fil courant', () => {
    // `created_at` est nullable côté lecture. Un `null` est traité comme le
    // plus ancien : il ne peut pas usurper la ligne, et il ne la fait pas non
    // plus disparaître quand il est seul.
    const { channels } = groupChatLists([
      row({ id: 'sans-date', channel: 'telegram', chatId: '199791464', createdAt: null }),
      row({
        id: 'date',
        channel: 'telegram',
        chatId: '199791464',
        createdAt: new Date('2026-09-01T10:00:00Z'),
      }),
    ]);
    expect(channels[0]?.currentConversationId).toBe('date');

    const seul = groupChatLists([
      row({ id: 'sans-date', channel: 'telegram', chatId: '199791464', createdAt: null }),
    ]);
    expect(seul.channels[0]?.currentConversationId).toBe('sans-date');
  });

  it('un chat par CHAT, pas par canal : le privé et le groupe restent deux lignes', () => {
    const { channels } = groupChatLists([
      row({ id: 'p', channel: 'telegram', chatId: '199791464' }),
      row({ id: 'g', channel: 'telegram', chatId: '-1003782553674' }),
    ]);
    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.chatId).sort()).toEqual(['-1003782553674', '199791464']);
  });

  it('deux canaux qui partagent un identifiant ne se confondent pas', () => {
    const { channels } = groupChatLists([
      row({ id: 'a', channel: 'telegram', chatId: '42' }),
      row({ id: 'b', channel: 'discord', chatId: '42' }),
    ]);
    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.key).sort()).toEqual(['a1:discord:42', 'a1:telegram:42']);
  });

  it('deux AGENTS sur le même chat gardent chacun leur fil', () => {
    // Le runner identifie un fil par (entité, agent, canal, chat) — voir
    // `resolveConversation`. Grouper sur le seul couple canal/chat fusionnait
    // deux bots parlant au même utilisateur, et le second fil disparaissait de
    // l'écran (revue Codex, PR #48, passe 2).
    const { channels } = groupChatLists([
      row({ id: 'f1', channel: 'telegram', chatId: '199791464', agentId: 'alfred' }),
      row({ id: 'f2', channel: 'telegram', chatId: '199791464', agentId: 'hermes' }),
    ]);
    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.currentConversationId).sort()).toEqual(['f1', 'f2']);
  });

  it('le nom vient de l’allowlist, jamais du premier message', () => {
    const { channels } = groupChatLists(
      [
        row({
          id: 'g',
          channel: 'telegram',
          chatId: '-1003782553674',
          title: 'Fais-moi une app en HTML, en récupérant l’API de IGDB',
        }),
      ],
      { 'telegram:-1003782553674': { name: 'Mathilde', kind: 'group' } },
    );
    expect(channels[0]?.name).toBe('Mathilde');
  });

  it('la NATURE du chat remonte : elle distingue deux homonymes', () => {
    // Sur Discord et Slack, l'allowlist enregistre le même `requester_name`
    // pour le privé et pour le salon d'une même personne. Sans le `kind`, deux
    // lignes portaient exactement le même libellé (constaté à l'écran).
    const { channels } = groupChatLists(
      [
        row({ id: 'p', channel: 'discord', chatId: '1525500444439220334' }),
        row({ id: 's', channel: 'discord', chatId: '1511202553420054671' }),
      ],
      {
        'discord:1525500444439220334': { name: 'Kwintspiracy', kind: 'private' },
        'discord:1511202553420054671': { name: 'Kwintspiracy', kind: 'channel' },
      },
    );
    expect(channels.map((c) => c.kind).sort()).toEqual(['channel', 'private']);
  });

  it('sans nom connu : null — l’écran montrera l’identifiant, qui est au moins vrai', () => {
    const { channels } = groupChatLists([
      row({ id: 'p', channel: 'telegram', chatId: '199791464' }),
    ]);
    expect(channels[0]?.name).toBeNull();
  });

  it('les conversations du dashboard restent entières et dans leur ordre', () => {
    const { channels, dashboard } = groupChatLists([
      row({ id: 'd1' }),
      row({ id: 't1', channel: 'telegram', chatId: '199791464' }),
      row({ id: 'd2' }),
    ]);
    expect(channels).toHaveLength(1);
    expect(dashboard.map((d) => d.id)).toEqual(['d1', 'd2']);
  });

  it('une conversation de canal SANS chat ne disparaît pas : elle reste en bas', () => {
    // Elle ne peut être rattachée à aucun chat. La perdre serait pire que la
    // ranger au mauvais endroit.
    const { channels, dashboard } = groupChatLists([
      row({ id: 'orphelin', channel: 'telegram', chatId: null }),
    ]);
    expect(channels).toHaveLength(0);
    expect(dashboard.map((d) => d.id)).toEqual(['orphelin']);
  });
});
