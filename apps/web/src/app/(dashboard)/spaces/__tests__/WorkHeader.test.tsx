// WorkHeader.test.tsx — l'en-tête d'un fil (P2bis) : ce qu'il montre, et
// surtout ce qu'il TAIT quand la donnée n'existe pas.
//
// Rendu statique côté serveur (renderToStaticMarkup), comme les autres tests
// d'écran de ce dossier : pas de navigateur, on lit le HTML.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WorkHeader from '../WorkHeader.tsx';
import { threadAgents } from '../format.ts';
import type { FeedItem } from '@/lib/conversation-feed.ts';

const turn = (name: string, slug: string | null): FeedItem => ({
  kind: 'turn',
  index: 1,
  turn: 1,
  turnSource: 'audit',
  agent: { name, slug },
  model: null,
  blocks: [],
  usage: null,
});

const child = (name: string, slug: string | null, nested: FeedItem[] = []): FeedItem => ({
  kind: 'child',
  job: {
    id: `job-${slug ?? name}`,
    agentName: name,
    agentSlug: slug,
    status: 'completed',
    task: null,
    result: null,
    error: null,
    createdAt: null,
    completedAt: null,
    ...(nested.length > 0
      ? {
          feed: {
            items: nested,
            totals: {
              turns: 0,
              toolCalls: 0,
              inputTokens: 0,
              outputTokens: 0,
              cachedTokens: 0,
              cacheCreationTokens: 0,
              costUsd: null,
              llmDurationMs: 0,
              models: [],
            },
          },
        }
      : {}),
  },
});

describe('threadAgents', () => {
  it("garde l'ordre d'apparition et dédoublonne par slug, pas par nom", () => {
    const agents = threadAgents([
      turn('Alfred', 'alfred'),
      child('Le Relecteur', 'relecteur'),
      // Le même agent, renommé entre deux jobs : un seul avatar.
      turn('Alfred Le Grand', 'alfred'),
      // Deux agents distincts qui portent le même nom : deux avatars.
      child('Le Relecteur', 'relecteur-2'),
    ]);
    expect(agents.map((a) => a.key)).toEqual(['alfred', 'relecteur', 'relecteur-2']);
    expect(agents[0]?.name).toBe('Alfred');
  });

  it('descend dans le fil des délégués et ignore un agent sans nom ni slug', () => {
    const agents = threadAgents([
      turn('Alfred', 'alfred'),
      child('Le Codeur', 'codeur', [turn('Le Testeur', 'testeur')]),
      turn(null as unknown as string, null),
    ]);
    expect(agents.map((a) => a.key)).toEqual(['alfred', 'codeur', 'testeur']);
  });
});

describe('WorkHeader', () => {
  it('montre le nom, le chemin, le compte d’agents et le bouton Files du projet', () => {
    const html = renderToStaticMarkup(
      <WorkHeader
        name="auth-service"
        path="D:/APPS/auth-service"
        agents={[
          { key: 'alfred', name: 'Alfred' },
          { key: 'relecteur', name: 'Le Relecteur' },
        ]}
        proofVerdict="green"
        projectId="proj-1"
      />,
    );
    expect(html).toContain('auth-service');
    expect(html).toContain('D:/APPS/auth-service');
    expect(html).toContain('2 agents');
    expect(html).toContain('Verified');
    expect(html).toContain('/spaces/proj-1');
    expect(html).toContain('Files');
    // Aucune taille de police en pixels : que des tokens de l'échelle typo.
    // (`text-[#0a0a0a]` d'AvatarStack est une COULEUR du DS, pas une taille.)
    expect(html).not.toMatch(/text-\[\d/);
  });

  it('dit « 1 agent » au singulier', () => {
    const html = renderToStaticMarkup(
      <WorkHeader name="x" path="" agents={[{ key: 'a', name: 'Alfred' }]} />,
    );
    expect(html).toContain('1 agent');
    expect(html).not.toContain('1 agents');
  });

  it('sans preuve, aucune pastille ; sans projet, aucun bouton Files', () => {
    const html = renderToStaticMarkup(
      <WorkHeader name="Une conversation" path="via Telegram" agents={[]} />,
    );
    expect(html).toContain('via Telegram');
    expect(html).not.toContain('Verified');
    expect(html).not.toContain('Checks failed');
    expect(html).not.toContain('Files');
    // Aucun agent : pas de « 0 agents ».
    expect(html).not.toContain('agents');
  });

  it('une preuve rouge dit que les contrôles ont échoué, jamais « Verified »', () => {
    const html = renderToStaticMarkup(
      <WorkHeader name="x" path="y" agents={[]} proofVerdict="red" />,
    );
    expect(html).toContain('Checks failed');
    expect(html).not.toContain('Verified');
  });

  it('un verdict que l’écran ne connaît pas ne rend aucune pastille', () => {
    const html = renderToStaticMarkup(
      <WorkHeader name="x" path="y" agents={[]} proofVerdict="infra_error" />,
    );
    expect(html).not.toContain('Verified');
    expect(html).not.toContain('Checks failed');
  });
});
