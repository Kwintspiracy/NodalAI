// ToolBlock.test.tsx — un appel d'outil, visible (P2bis) : son nom court, son
// argument, la pastille de son issue, et la ligne de ce qu'il a rendu.
//
// Et le bloc de réflexion, qui est tout ce qui reste replié dans un tour.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ToolBlock, { excerptOfInput, hasResultLine } from '../ToolBlock.tsx';
import ThinkingBlock from '../ThinkingBlock.tsx';
import type { Step } from '@/lib/conversation-feed.ts';

type ToolStep = Extract<Step, { kind: 'tool' }>;

const tool = (over: Partial<ToolStep>): ToolStep => ({
  kind: 'tool',
  toolName: 'x',
  toolCallId: 'c',
  jobId: 'job-1',
  card: null,
  presented: null,
  input: {},
  outputText: null,
  outcome: 'success',
  durationMs: 300,
  lineCounts: {},
  question: null,
  ...over,
});

describe('excerptOfInput', () => {
  it('rend la valeur seule quand l’entrée n’a qu’un champ texte', () => {
    expect(excerptOfInput({ query: 'session' })).toBe('session');
  });

  it('rend des paires clé=valeur quand il y a plusieurs champs', () => {
    expect(excerptOfInput({ pattern: 'session', path: 'src/auth' })).toBe(
      'pattern=session path=src/auth',
    );
  });

  it('coupe à 60 caractères et replie les sauts de ligne', () => {
    const long = excerptOfInput({ text: 'a\nb'.padEnd(200, 'c') });
    expect(long).toHaveLength(60);
    expect(long?.endsWith('…')).toBe(true);
    expect(long).not.toContain('\n');
  });

  it('rend null sur une entrée vide — il n’y a rien à mettre entre parenthèses', () => {
    expect(excerptOfInput({})).toBeNull();
    expect(excerptOfInput(null)).toBeNull();
    expect(excerptOfInput({ text: '   ' })).toBeNull();
  });
});

describe('hasResultLine', () => {
  it('un appel réussi qui n’a RIEN à dire n’a pas de seconde ligne', () => {
    expect(hasResultLine(tool({ input: {}, outputText: null, presented: null }))).toBe(false);
  });

  it('une erreur a toujours sa ligne, même sans sortie', () => {
    expect(hasResultLine(tool({ outcome: 'error', input: {}, outputText: null }))).toBe(true);
  });
});

describe('ToolBlock', () => {
  it('montre le nom court, l’argument entre parenthèses, la durée et le résultat', () => {
    const html = renderToStaticMarkup(
      <ToolBlock
        step={tool({
          toolName: 'mcp_files__grep',
          card: 'search',
          input: { query: 'session', path: 'src/auth' },
          presented: {
            card: 'search',
            query: 'session',
            total: 12,
            hits: [],
            truncated: false,
          },
          durationMs: 300,
        })}
      />,
    );
    expect(html).toContain('>grep<'); // le préfixe de serveur MCP est retiré
    expect(html).toContain('(query=session path=src/auth)');
    expect(html).toContain('300 ms');
    expect(html).toContain('12 matches');
    // Réussi : la pastille est verte, pas rouge.
    expect(html).toContain('bg-ok');
    expect(html).not.toContain('bg-err');
    expect(html).not.toMatch(/text-\[\d/);
  });

  it('un appel en échec peint sa ligne de résultat en err', () => {
    const html = renderToStaticMarkup(
      <ToolBlock step={tool({ outcome: 'error', outputText: 'ENOENT: no such file' })} />,
    );
    expect(html).toContain('text-err');
    expect(html).toContain('ENOENT: no such file');
    expect(html).toContain('bg-err');
  });

  it('une approbation en attente porte la pastille bleue', () => {
    const html = renderToStaticMarkup(<ToolBlock step={tool({ outcome: 'awaiting_approval' })} />);
    expect(html).toContain('bg-run');
    expect(html).toContain('awaiting approval');
  });

  it('un appel muet ne laisse pas une seconde ligne vide', () => {
    const html = renderToStaticMarkup(
      <ToolBlock step={tool({ input: {}, outputText: null, durationMs: null })} />,
    );
    expect(html).not.toContain('border-t');
  });
});

describe('ThinkingBlock', () => {
  it('sans raisonnement, il n’y a pas de bloc', () => {
    expect(renderToStaticMarkup(<ThinkingBlock steps={[]} />)).toBe('');
  });

  it('compte SES étapes, dit la méta du tour, et garde le texte replié', () => {
    const html = renderToStaticMarkup(
      <ThinkingBlock
        steps={['il faut lire session.ts', 'puis le corriger']}
        meta="7.2 s · 9,120 tokens"
      />,
    );
    expect(html).toContain('Reasoning');
    expect(html).toContain('2 steps · 7.2 s · 9,120 tokens');
    expect(html).not.toContain('il faut lire session.ts');
    expect(html).not.toMatch(/text-\[\d/);
  });

  it('dit « 1 step » au singulier, et se passe de méta quand le tour n’en a pas', () => {
    const html = renderToStaticMarkup(<ThinkingBlock steps={['une pensée']} />);
    expect(html).toContain('1 step<');
    expect(html).not.toContain('1 steps');
  });
});
