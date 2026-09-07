// ConversationFeedView.test.tsx — le fil rendu en HTML depuis un feed qui
// contient chaque sorte de bloc : chaque carte se dessine depuis sa charge
// utile (jamais depuis le nom de l'outil), une action mineure se replie, une
// ligne sans charge se montre brute en le disant.
//
// Rendu statique côté serveur (renderToStaticMarkup) : pas de navigateur, pas
// de bibliothèque de test de composants dans ce dépôt — on lit le HTML.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ConversationFeedView from '../ConversationFeedView.tsx';
import { summarizeSteps } from '../format.ts';
import { compactTurns } from '@/lib/conversation-feed.ts';
import type { ConversationFeed, Step } from '@/lib/conversation-feed.ts';

const tool = (over: Partial<Extract<Step, { kind: 'tool' }>>): Extract<Step, { kind: 'tool' }> => ({
  kind: 'tool',
  toolName: 'x',
  toolCallId: 'c',
  jobId: 'job-1',
  card: null,
  presented: null,
  input: {},
  outputText: null,
  outcome: 'success',
  durationMs: 10,
  question: null,
  ...over,
});

const feed: ConversationFeed = {
  items: [
    {
      kind: 'history',
      exchanges: [
        { role: 'user', text: 'Quoi de neuf hier ?' },
        { role: 'agent', text: 'Deux nouveautés hier.' },
      ],
    },
    {
      kind: 'request',
      text: 'Prépare la revue',
      origin: { channel: 'cron', scheduleName: 'Revue mensuelle', chatId: null },
      at: null,
    },
    {
      kind: 'turn',
      index: 1,
      turn: 1,
      turnSource: 'audit',
      agent: { name: 'Alfred', slug: 'alfred' },
      model: 'claude-opus-5',
      usage: {
        inputTokens: 12000,
        outputTokens: 480,
        cachedTokens: 9000,
        cacheCreationTokens: 0,
        costUsd: 0.048,
        durationMs: 9400,
        calls: 1,
      },
      blocks: [
        { kind: 'prose', text: 'Je reprends le **format** du mois dernier.' },
        {
          kind: 'steps',
          steps: [
            { kind: 'reasoning', text: 'la mémoire devrait avoir le format' },
            tool({
              toolName: 'query_memory',
              card: 'table',
              presented: {
                card: 'table',
                tables: [
                  {
                    columns: ['fact'],
                    header: 'columns',
                    rows: [],
                    total: 0,
                    truncated: false,
                    clipped: false,
                  },
                ],
              },
            }),
            tool({
              toolName: 'mcp_x__fetch',
              card: 'generic',
              presented: { card: 'generic' },
              outputText: 'brut',
            }),
          ],
        },
        {
          kind: 'card',
          step: tool({
            toolName: 'xlsx_read',
            card: 'table',
            presented: {
              card: 'table',
              tables: [
                {
                  name: 'Synthèse',
                  columns: [],
                  header: 'unknown',
                  rows: [
                    ['Poste', 'Juillet', 'Août'],
                    ['Infrastructure', 12400, 14100],
                  ],
                  total: 2,
                  truncated: false,
                  clipped: false,
                },
              ],
            },
          }),
        },
        {
          kind: 'card',
          step: tool({
            toolName: 'telegram_send_message',
            card: 'sent',
            input: { text: 'La revue est prête.' },
            presented: { card: 'sent', channel: 'telegram', kind: 'message', target: '42' },
          }),
        },
        {
          kind: 'card',
          step: tool({
            toolName: 'run_command',
            card: 'terminal',
            presented: {
              card: 'terminal',
              command: 'pnpm test',
              exitCode: 1,
              timedOut: false,
              stdoutTail: '1 failed',
              stdoutTruncated: true,
              stderrTail: '',
              stderrTruncated: false,
            },
          }),
        },
        {
          kind: 'card',
          step: tool({
            toolName: 'legacy_tool',
            card: 'files',
            presented: null,
            input: { path: 'a.md' },
            outputText: '{"ok":true}',
          }),
        },
      ],
    },
    { kind: 'note', text: 'Tu es sur Telegram. Livre ta réponse.', origin: 'runner' },
    { kind: 'note', text: 'Older turns are not shown (2 shown).', origin: 'thread' },
    { kind: 'answer', text: 'La revue d’août est prête et envoyée.' },
  ],
  totals: {
    turns: 1,
    toolCalls: 5,
    inputTokens: 12000,
    outputTokens: 480,
    cachedTokens: 9000,
    cacheCreationTokens: 0,
    costUsd: 0.048,
    llmDurationMs: 9400,
    models: ['claude-opus-5'],
  },
};

describe('ConversationFeedView', () => {
  const html = renderToStaticMarkup(<ConversationFeedView feed={feed} />);

  it('la demande dit d’où elle vient ; les jetons descendent dans le groupe d’étapes', () => {
    expect(html).toContain('Prépare la revue');
    expect(html).toContain('via automation “Revue mensuelle”');
    expect(html).toContain('Alfred');
    // P2bis — la ligne du nom ne porte plus que le modèle quand le tour a un
    // groupe d'étapes ; le coût vit dans l'en-tête du groupe, à droite.
    expect(html).not.toContain('claude-opus-5 · 12,480 tokens');
    expect(html).toContain('>claude-opus-5<');
    // Une seule durée : celle des étapes. La durée des appels LLM (9.4 s) ne
    // se met plus à côté — deux temps sans étiquette ne se lisaient pas.
    expect(html).toContain('3 steps · 20 ms · 12,480 tokens · $0.05');
    expect(html).not.toContain('12,480 tokens · 9.4 s');
  });

  it('le titre d’un groupe nomme jusqu’à deux outils sans carte ; au-delà, il les compte', () => {
    const named = (n: number): Step[] =>
      Array.from({ length: n }, (_, i) =>
        tool({ toolName: `tool_${i}`, card: null, presented: null, outcome: 'success' }),
      );
    expect(summarizeSteps(named(2))).toBe('tool_0 · tool_1');
    expect(summarizeSteps([{ kind: 'reasoning', text: 'x' }, ...named(4)])).toBe(
      'reasoning · 4 tool calls',
    );
  });

  it('le markdown de la prose est RENDU : plus d’astérisques à l’écran', () => {
    expect(html).toContain('<strong class="font-semibold text-ink">format</strong>');
    expect(html).not.toContain('**format**');
  });

  it('la réponse finale est un tour de l’agent, jamais une plaque « Answer »', () => {
    expect(html).toContain('La revue d’août est prête et envoyée.');
    expect(html).not.toContain('>Answer<');
    // Une seule fois : la prose du dernier tour ne la répète pas.
    expect(html.split('La revue d’août est prête et envoyée.')).toHaveLength(2);
  });

  it('un rappel du runner se nomme ; un aveu du fil parle en son nom', () => {
    expect(html).toContain('Nodal reminded the agent · Tu es sur Telegram.');
    expect(html).toContain('Older turns are not shown (2 shown).');
    expect(html).not.toContain('Nodal reminded the agent · Older turns');
  });

  it('un tour sans prose ni carte fusionne dans le précédent', () => {
    const muet = {
      kind: 'turn' as const,
      index: 2,
      turn: 2,
      turnSource: 'audit' as const,
      agent: { name: 'Alfred', slug: 'alfred' },
      model: 'claude-opus-5',
      usage: null,
      blocks: [{ kind: 'steps' as const, steps: [tool({ toolName: 'file_read' })] }],
    };
    const compact = compactTurns([feed.items[2]!, muet]);
    const rendu = renderToStaticMarkup(
      <ConversationFeedView feed={{ items: compact, totals: feed.totals }} />,
    );
    // Un seul « Alfred » : un seul tour à l'écran.
    expect(rendu.split('>Alfred<')).toHaveLength(2);
    expect(rendu).toContain('4 steps');
    // Et plus jamais l'aveu d'un tour vide.
    expect(rendu).not.toContain('No visible action this turn');
  });

  it('les actions mineures sont repliées sous un titre déduit des CARTES, pas des noms', () => {
    const summary = summarizeSteps(
      feed.items[2]!.kind === 'turn' ? (feed.items[2].blocks[1] as { steps: Step[] }).steps : [],
    );
    expect(summary).toBe('reasoning · 1 table · fetch'); // le brut est nommé, pas compté
    expect(html).toContain(summary);
    expect(html).toContain('3 steps');
    // Replié par défaut : le détail des étapes n'est pas dans le HTML initial.
    expect(html).not.toContain('la mémoire devrait avoir le format');
  });

  it('la carte table dessine les cellules et dit que l’en-tête est inconnu', () => {
    expect(html).toContain('Synthèse');
    expect(html).toContain('Infrastructure');
    expect(html).toContain('14100');
    expect(html).toContain('first row may or may not be a header');
  });

  it('la carte d’envoi dit le canal, le destinataire et le message parti', () => {
    expect(html).toContain('Sent to telegram');
    expect(html).toContain('to 42');
    expect(html).toContain('La revue est prête.');
  });

  it('la carte terminal montre la commande, le code de sortie et la coupe', () => {
    expect(html).toContain('pnpm test');
    expect(html).toContain('exit 1');
    expect(html).toContain('earlier output not kept');
  });

  it('une carte de résultat sans charge utile se montre brute et le dit', () => {
    expect(html).toContain('legacy_tool');
    expect(html).toContain('files · raw');
    expect(html).toContain('&quot;path&quot;: &quot;a.md&quot;');
  });

  it("l'historique de la conversation est là, replié, et dit combien de messages il porte", () => {
    expect(html).toContain('Earlier in this conversation');
    expect(html).toContain('2 messages');
    // Replié : le texte des anciens échanges n'est pas dans le HTML initial…
    expect(html).not.toContain('Deux nouveautés hier.');
    // …et il précède la demande.
    expect(html.indexOf('Earlier in this conversation')).toBeLessThan(
      html.indexOf('Prépare la revue'),
    );
  });

  it('la réponse ferme le fil, après l’envoi', () => {
    expect(html.lastIndexOf('La revue d’août est prête et envoyée.')).toBeGreaterThan(
      html.indexOf('Sent to telegram'),
    );
  });
});
