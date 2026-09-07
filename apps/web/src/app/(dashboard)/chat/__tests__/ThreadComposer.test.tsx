// ThreadComposer.test.tsx — la saisie en bas d'un fil (P7, redessinée en
// P2bis). Ce qui se prouve : c'est une ZONE de texte (un collage multi-ligne
// garde ses retours, Maj+Entrée en ajoute un), Entrée envoie le texte tel
// quel à l'action, et le champ redevient vide après l'envoi.
//
// Rendu dans jsdom et TAPÉ, pas seulement rendu : l'assertion porte sur
// l'ARGUMENT reçu par l'action mockée (invariant #5).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ThreadComposer from '../ThreadComposer.tsx';

const sendChatMessageAction = vi.hoisted(() => vi.fn(async () => ({ ok: true as const })));
const refresh = vi.hoisted(() => vi.fn());

vi.mock('@/lib/actions.ts', () => ({ sendChatMessageAction }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

let container: HTMLDivElement;
let root: Root;

async function render(node: React.ReactElement): Promise<void> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
}

function textarea(): HTMLTextAreaElement {
  const el = container.querySelector('textarea');
  if (!el) throw new Error('no textarea rendered');
  return el;
}

/** Tape un texte comme un collage : la valeur entière, d'un coup. */
async function type(text: string): Promise<void> {
  const el = textarea();
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    setter?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function press(key: string, shiftKey = false): Promise<void> {
  await act(async () => {
    textarea().dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
  });
}

beforeEach(() => {
  sendChatMessageAction.mockClear();
  refresh.mockClear();
});

describe('ThreadComposer', () => {
  it('est une zone de texte d’une ligne à vide, qui nomme l’agent', async () => {
    await render(<ThreadComposer conversationId="conv-1" agentName="Alfred" />);
    const el = textarea();
    expect(el.rows).toBe(1);
    expect(el.placeholder).toBe('Reply to Alfred…');
    // Pas de champ d'une ligne : il aplatirait un collage (revue Codex, passe 56).
    expect(container.querySelector('input')).toBeNull();
  });

  it('Entrée envoie le texte TEL QUEL, retours à la ligne compris, puis vide le champ', async () => {
    await render(<ThreadComposer conversationId="conv-1" agentName="Alfred" />);
    await type('Première ligne\nDeuxième ligne\n\n```ts\nconst x = 1;\n```');
    await press('Enter');
    expect(sendChatMessageAction.mock.calls).toEqual([
      [
        {
          conversationId: 'conv-1',
          message: 'Première ligne\nDeuxième ligne\n\n```ts\nconst x = 1;\n```',
        },
      ],
    ]);
    expect(textarea().value).toBe('');
    expect(refresh).toHaveBeenCalled();
  });

  it('Maj+Entrée n’envoie pas : c’est un retour à la ligne', async () => {
    await render(<ThreadComposer conversationId="conv-1" />);
    await type('en cours');
    await press('Enter', true);
    expect(sendChatMessageAction.mock.calls).toEqual([]);
    expect(textarea().value).toBe('en cours');
  });

  it('un texte vide ne part pas', async () => {
    await render(<ThreadComposer conversationId="conv-1" />);
    await type('   ');
    await press('Enter');
    expect(sendChatMessageAction.mock.calls).toEqual([]);
  });
});
