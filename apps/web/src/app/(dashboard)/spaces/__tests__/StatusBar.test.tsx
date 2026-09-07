// StatusBar.test.tsx — la barre du bas dit la preuve, les modèles, les agents,
// les jetons et leur part de cache, le coût, la durée, les envois en attente ;
// et un coût partiel se dit « partial », un coût inconnu « n/a ».

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StatusBar from '../StatusBar.tsx';
import type { SpaceCostView } from '@/lib/space-cost.ts';

const cost: SpaceCostView = {
  byAgent: [
    {
      agentId: 'a',
      agentName: 'Alfred',
      models: ['claude-opus-5'],
      calls: 7,
      inputTokens: 148_200,
      outputTokens: 4_100,
      cachedTokens: 96_000,
      cacheCreationTokens: 18_000,
      costUsd: 0.71,
      unpricedCalls: 0,
    },
    {
      agentId: 'b',
      agentName: 'Analyste',
      models: ['gpt-5'],
      calls: 3,
      inputTokens: 96_400,
      outputTokens: 2_200,
      cachedTokens: 0,
      cacheCreationTokens: 0,
      costUsd: 0.38,
      unpricedCalls: 1,
    },
  ],
  totals: {
    calls: 10,
    inputTokens: 244_600,
    outputTokens: 6_300,
    cachedTokens: 96_000,
    cacheCreationTokens: 18_000,
    costUsd: 1.09,
    unpricedCalls: 1,
    llmDurationMs: 312_000,
    durationMs: 18 * 60_000 + 4_000,
    humanWaitMs: 192_000,
    proofMs: 401_000,
  },
};

describe('StatusBar', () => {
  const html = renderToStaticMarkup(
    <StatusBar
      cost={cost}
      proofVerdict="green"
      proofSequences={2}
      pendingDeliveries={1}
      live={false}
    />,
  );

  it('dit la preuve et les modèles ; le compte d’agents est dans l’EN-TÊTE, pas ici', () => {
    expect(html).toContain('proof green');
    expect(html).toContain('claude-opus-5, gpt-5');
    // Deux comptes d'agents dans le même écran disaient deux nombres
    // différents sous la même réponse (Quentin, 07/09) : celui de l'en-tête,
    // avec les visages, est le seul.
    expect(html).not.toContain('agents');
  });

  it('dit les jetons avec la part de cache, le coût avec « partial » quand un appel n’a pas de prix, la durée, l’envoi en attente', () => {
    expect(html).toContain('250,900 tokens · 39 % cached');
    expect(html).toContain('$1.09 · partial');
    // Le temps que les MODÈLES ont passé à répondre (312 s), pas le temps
    // écoulé depuis l'ouverture du fil (18 min 04) — une conversation laissée
    // ouverte n'a rien coûté de plus (Quentin, 07/09).
    expect(html).toContain('5 min 12 thinking');
    expect(html).not.toContain('18 min 04');
    expect(html).toContain('1 delivery pending');
  });

  it('AUCUN appel connu : le fil le DIT — jamais « 0 tokens · n/a », qui se lit « gratuit »', () => {
    const empty = renderToStaticMarkup(
      <StatusBar
        cost={{
          byAgent: [],
          totals: {
            ...cost.totals,
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
            cachedTokens: 0,
            costUsd: null,
            unpricedCalls: 0,
          },
        }}
        proofVerdict={null}
        proofSequences={0}
        pendingDeliveries={0}
        live={true}
      />,
    );
    expect(empty).toContain('no proof');
    // Un fil d'avant la migration 0100, ou un agent en runtime CLI dont la
    // consommation vit ailleurs : ne rien savoir se dit (revue Codex, passe 65).
    expect(empty).toContain('no usage recorded');
    expect(empty).not.toContain('0 tokens');
    expect(empty).not.toContain('n/a');
    expect(empty).not.toContain('thinking');
    expect(empty).toContain('running…');
    expect(empty).not.toContain('$0');
    expect(empty).not.toContain('cached');
  });
});
