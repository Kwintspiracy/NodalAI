// DeliveryBlock.test.tsx — le récapitulatif de livraison (P2bis).
//
// L'enjeu du test n'est pas ce qu'il montre : c'est ce qu'il TAIT. La maquette
// porte six cellules ; deux n'ont pas de source. Un travail sans preuve n'a ni
// « Tests » ni « Checks », et surtout pas un « 0 / 0 » qui laisserait croire
// que les tests ont tourné.
//
// Et le calcul lui-même, dans le modèle : `deliverySummary` ne compte que les
// fichiers ÉCRITS, ramasse les délégués en relectures, et ne rend un verdict
// que si une preuve a tourné.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DeliveryBlock from '../DeliveryBlock.tsx';
import { buildConversationThread, type ThreadJob } from '@/lib/conversation-thread.ts';
import { lineCountsOfCall } from '@/lib/coding-changes.ts';
import type { ConversationFeed, DeliverySummary, FeedItem, Step } from '@/lib/conversation-feed.ts';
import type { ProductionVerdict } from '@/lib/chat-or-work.ts';

const EMPTY: DeliverySummary = {
  files: 0,
  lines: null,
  tests: null,
  durationMs: null,
  costUsd: null,
  reviews: [],
  checks: [],
  verdict: null,
};

const totals = (costUsd: number | null = null) => ({
  turns: 1,
  toolCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
  cacheCreationTokens: 0,
  costUsd,
  llmDurationMs: 0,
  models: [],
});

const travail: ProductionVerdict = {
  isWork: true,
  items: [],
  more: 0,
  uncertain: 0,
  unclassified: 0,
};

const tool = (over: Partial<Extract<Step, { kind: 'tool' }>>): Extract<Step, { kind: 'tool' }> => ({
  kind: 'tool',
  toolName: 'x',
  toolCallId: 'c',
  jobId: 'j1',
  card: null,
  presented: null,
  input: {},
  outputText: null,
  outcome: 'success',
  durationMs: null,
  lineCounts: {},
  question: null,
  ...over,
});

const turnWith = (...cards: Array<Extract<Step, { kind: 'tool' }>>): FeedItem => ({
  kind: 'turn',
  index: 1,
  turn: 1,
  turnSource: 'audit',
  agent: { name: 'Alfred', slug: 'alfred' },
  model: null,
  usage: null,
  blocks: cards.map((step) => ({ kind: 'card' as const, step })),
});

function summaryOf(over: Partial<ThreadJob> & { feed: ConversationFeed }): DeliverySummary {
  const job: ThreadJob = {
    jobId: 'j1',
    createdAt: null,
    completedAt: null,
    verdict: travail,
    project: null,
    proof: [],
    ...over,
  };
  const { items } = buildConversationThread({
    conversation: {
      id: 'c1',
      channel: 'telegram',
      chatId: '1',
      title: 't',
      agentName: 'Alfred',
      agentSlug: 'alfred',
      currentProject: null,
    },
    messages: [],
    jobs: [job],
  });
  const produced = items.find((i) => i.kind === 'produced');
  if (produced === undefined || produced.kind !== 'produced')
    throw new Error('pas d’item produced');
  return produced.summary;
}

describe('deliverySummary — ce que le modèle compte', () => {
  it('ne compte que les fichiers ÉCRITS, dédoublonnés, du job ET de ses délégués', () => {
    const filesCard = (paths: Array<[string, 'created' | 'modified' | 'listed']>) =>
      tool({
        card: 'files',
        presented: {
          card: 'files',
          total: paths.length,
          truncated: false,
          files: paths.map(([path, action]) => ({ path, action })),
        },
      });
    const summary = summaryOf({
      feed: {
        items: [
          turnWith(
            filesCard([
              ['src/a.ts', 'created'],
              ['src/b.ts', 'listed'],
            ]),
          ),
          {
            kind: 'child',
            job: {
              id: 'j2',
              agentName: 'Le Codeur',
              agentSlug: 'codeur',
              status: 'completed',
              task: 'écris le service',
              result: 'TokenService extrait',
              error: null,
              createdAt: null,
              completedAt: null,
              feed: {
                // Le même fichier, touché deux fois : un seul compte.
                items: [
                  turnWith(
                    filesCard([
                      ['src/a.ts', 'modified'],
                      ['src/c.ts', 'created'],
                    ]),
                  ),
                ],
                totals: totals(),
              },
            },
          },
        ],
        totals: totals(),
      },
    });
    expect(summary.files).toBe(2);
    expect(summary.reviews).toEqual([
      { name: 'Le Codeur', text: 'TokenService extrait', ok: true, isAgent: true },
    ]);
  });

  it('les lignes se somment sur le job ET ses délégués, cartes comprises ou non', () => {
    // Les compteurs viennent du même lecteur que la page Code : on les calcule
    // ici depuis l'entrée de l'appel, comme `buildConversationFeed` le fait.
    const write = (path: string, lines: string[]) =>
      tool({
        toolName: 'file_write',
        input: { path, content: lines.join('\n') },
        lineCounts: lineCountsOfCall('file_write', { path, content: lines.join('\n') }, null),
      });
    const summary = summaryOf({
      feed: {
        items: [
          {
            kind: 'turn',
            index: 1,
            turn: 1,
            turnSource: 'audit',
            agent: { name: 'Alfred', slug: 'alfred' },
            model: null,
            usage: null,
            blocks: [
              // Une écriture MINEURE, repliée dans un bloc d'étapes : elle a
              // écrit des lignes tout autant qu'une carte pleine.
              { kind: 'steps', steps: [write('src/a.ts', ['l1', 'l2'])] },
              {
                kind: 'card',
                step: tool({
                  toolName: 'file_edit',
                  card: 'files',
                  presented: {
                    card: 'files',
                    total: 1,
                    truncated: false,
                    files: [{ path: 'src/b.ts', action: 'modified' }],
                  },
                  lineCounts: { 'src/b.ts': { added: 5, removed: 2 } },
                }),
              },
            ],
          },
          {
            kind: 'child',
            job: {
              id: 'j2',
              agentName: 'Le Codeur',
              agentSlug: 'codeur',
              status: 'completed',
              task: null,
              result: 'fait',
              error: null,
              createdAt: null,
              completedAt: null,
              feed: {
                items: [
                  {
                    kind: 'turn',
                    index: 1,
                    turn: 1,
                    turnSource: 'audit',
                    agent: { name: 'Le Codeur', slug: 'codeur' },
                    model: null,
                    usage: null,
                    blocks: [{ kind: 'steps', steps: [write('src/c.ts', ['x', 'y', 'z'])] }],
                  },
                ],
                totals: totals(),
              },
            },
          },
        ],
        totals: totals(),
      },
    });
    expect(summary.lines).toEqual({ added: 10, removed: 2 });
  });

  it('sans preuve : ni tests, ni contrôles, ni verdict — jamais un « 0 / 0 »', () => {
    const summary = summaryOf({ feed: { items: [], totals: totals() } });
    expect(summary.lines).toBeNull();
    expect(summary.tests).toBeNull();
    expect(summary.checks).toEqual([]);
    expect(summary.verdict).toBeNull();
  });

  it('une preuve entièrement verte vaut « green » ; une seule qui lâche vaut « red »', () => {
    const vert = summaryOf({
      feed: { items: [], totals: totals() },
      proof: [
        { command: 'pnpm test', verdict: 'green' },
        { command: 'tsc --noEmit', verdict: 'green' },
      ],
    });
    expect(vert.verdict).toBe('green');
    expect(vert.tests).toEqual({ passed: 2, total: 2 });

    const rouge = summaryOf({
      feed: { items: [], totals: totals() },
      // Une erreur d'INFRA n'est pas un succès : elle compte comme un échec.
      proof: [
        { command: 'pnpm test', verdict: 'green' },
        { command: 'pnpm lint', verdict: 'infra_error' },
      ],
    });
    expect(rouge.verdict).toBe('red');
    expect(rouge.tests).toEqual({ passed: 1, total: 2 });
  });

  it('la durée court de l’ouverture du travail à sa fin ; inconnue tant qu’il court', () => {
    const fini = summaryOf({
      feed: { items: [], totals: totals(0.52) },
      createdAt: new Date('2026-09-07T10:00:00Z'),
      completedAt: new Date('2026-09-07T10:04:12Z'),
    });
    expect(fini.durationMs).toBe(252_000);
    expect(fini.costUsd).toBe(0.52);

    const encours = summaryOf({
      feed: { items: [], totals: totals() },
      createdAt: new Date('2026-09-07T10:00:00Z'),
    });
    expect(encours.durationMs).toBeNull();
  });

  it('un verdict d’outil de revue fait une ligne de relecture, sans avatar', () => {
    const summary = summaryOf({
      feed: {
        items: [
          turnWith(
            tool({
              toolName: 'cli:codex_review',
              card: 'checks',
              presented: {
                card: 'checks',
                verdict: 'fail',
                summary: 'Two blockers',
                total: 2,
                items: [],
              },
            }),
          ),
        ],
        totals: totals(),
      },
    });
    expect(summary.reviews).toEqual([
      { name: 'cli:codex_review', text: 'Two blockers', ok: false, isAgent: false },
    ]);
  });
});

describe('DeliveryBlock — ce que l’écran dessine', () => {
  it('un travail sans rien de prouvé dit qu’il n’est pas vérifié, et n’a aucune section', () => {
    const html = renderToStaticMarkup(<DeliveryBlock summary={EMPTY} />);
    expect(html).toContain('Delivery summary');
    expect(html).toContain('Not verified');
    expect(html).not.toContain('Tests');
    expect(html).not.toContain('Checks<');
    expect(html).not.toContain('Reviews');
    // Sans écriture textuelle, pas de cellule « Lines » ; « Coverage » n'a de
    // toute façon aucune source.
    expect(html).not.toContain('Lines');
    expect(html).not.toContain('Coverage');
  });

  it('les cellules PRÉSENTES sont celles qui ont une source', () => {
    const html = renderToStaticMarkup(
      <DeliveryBlock
        summary={{
          ...EMPTY,
          files: 3,
          lines: { added: 27, removed: 2 },
          tests: { passed: 6, total: 6 },
          durationMs: 252_000,
          costUsd: 0.52,
          verdict: 'green',
          checks: [
            { command: 'pnpm test', ok: true },
            { command: 'pnpm lint', ok: true },
          ],
          reviews: [
            { name: 'Le Relecteur', text: 'Approved, one minor note', ok: true, isAgent: true },
          ],
        }}
      />,
    );
    expect(html).toContain('Files');
    expect(html).toContain('>3<');
    expect(html).toContain('Lines');
    expect(html).toContain('+27 −2');
    expect(html).toContain('6 / 6');
    expect(html).toContain('4 min 12');
    expect(html).toContain('$0.52');
    expect(html).toContain('Verified');
    expect(html).toContain('Le Relecteur');
    expect(html).toContain('Approved, one minor note');
    expect(html).toContain('pnpm lint');
    expect(html).not.toMatch(/text-\[\d/);
  });

  it('une preuve rouge dit que les contrôles ont échoué, et marque la commande fautive', () => {
    const html = renderToStaticMarkup(
      <DeliveryBlock
        summary={{
          ...EMPTY,
          tests: { passed: 1, total: 2 },
          verdict: 'red',
          checks: [
            { command: 'pnpm test', ok: true },
            { command: 'pnpm lint', ok: false },
          ],
        }}
      />,
    );
    expect(html).toContain('Checks failed');
    expect(html).not.toContain('Verified');
    expect(html).toContain('text-err');
  });
});
