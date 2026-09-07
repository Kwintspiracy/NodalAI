// conversation-title.test.ts — nommer une conversation d'après l'échange.
//
// Ce qui compte : ce que le module REFUSE. Un modèle rend volontiers un titre
// entre guillemets, préfixé de « Title: », ou carrément un paragraphe. Un
// paragraphe n'est pas un titre : mieux vaut garder la première phrase de
// l'utilisateur que d'afficher une phrase coupée au milieu d'un mot.

import { describe, it, expect } from 'vitest';
import { cleanTitle, titlePrompt, TITLE_MAX_CHARS } from '../../chat/conversation-title.ts';

describe('cleanTitle', () => {
  it('garde un titre court tel quel', () => {
    expect(cleanTitle('Quick hello')).toBe('Quick hello');
    expect(cleanTitle('Budget de septembre')).toBe('Budget de septembre');
  });

  it('retire les guillemets, le préfixe et la ponctuation finale', () => {
    expect(cleanTitle('"Quick hello"')).toBe('Quick hello');
    expect(cleanTitle('« Budget de septembre »')).toBe('Budget de septembre');
    expect(cleanTitle('Title: Quick hello')).toBe('Quick hello');
    expect(cleanTitle('Titre : Budget de septembre.')).toBe('Budget de septembre');
    // Le point d'interrogation porte du sens : il reste.
    expect(cleanTitle('Où écrire le rapport ?')).toBe('Où écrire le rapport ?');
  });

  it('ne garde que la première ligne', () => {
    expect(cleanTitle('Quick hello\n\nHere is why I chose it.')).toBe('Quick hello');
  });

  it('refuse le vide, et refuse un PARAGRAPHE — un titre coupé au milieu ment', () => {
    expect(cleanTitle('')).toBeNull();
    expect(cleanTitle('   \n  ')).toBeNull();
    expect(cleanTitle('"" ')).toBeNull();
    expect(cleanTitle('x'.repeat(TITLE_MAX_CHARS * 2 + 1))).toBeNull();
  });

  it('coupe un titre un peu trop long, avec des points de suspension', () => {
    const long = 'a'.repeat(TITLE_MAX_CHARS + 10);
    const out = cleanTitle(long);
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(TITLE_MAX_CHARS + 1);
    expect(out!.endsWith('…')).toBe(true);
  });
});

describe('titlePrompt', () => {
  it('donne au modèle la QUESTION et la RÉPONSE — « bonjour » seul ne dit rien du sujet', () => {
    const p = titlePrompt({ userMessage: 'tu es la ?', agentReply: 'Oui, je suis là !' });
    expect(p).toContain('tu es la ?');
    expect(p).toContain('Oui, je suis là !');
    expect(p.trimEnd().endsWith('Title:')).toBe(true);
  });

  it('borne ce qu’il envoie : un pavé ne fait pas un prompt de 100 000 caractères', () => {
    const p = titlePrompt({ userMessage: 'u'.repeat(5000), agentReply: 'a'.repeat(5000) });
    expect(p.length).toBeLessThan(3200);
  });
});
