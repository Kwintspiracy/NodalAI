// Markdown.test.tsx — ce que le composant REND, lu dans le HTML : le gras est
// un `<strong>`, le titre un `<h2>`, la table une vraie table — et le HTML
// écrit dans le texte reste du texte.
//
// Rendu statique (`renderToStaticMarkup`) : pas de navigateur, comme le reste
// des tests de rendu de ce paquet.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown, { plainText, safeHref } from '../Markdown.tsx';

const render = (text: string, tone?: 'agent' | 'user'): string =>
  renderToStaticMarkup(tone ? <Markdown text={text} tone={tone} /> : <Markdown text={text} />);

describe('Markdown', () => {
  it('un titre devient un h2 de la rampe typographique, pas des dièses', () => {
    const html = render('## Ce que j’ai fait\n\nsuite');
    expect(html).toContain('<h2');
    expect(html).toContain('text-title-15');
    expect(html).toContain('Ce que j’ai fait');
    expect(html).not.toContain('## Ce que');
  });

  it('un titre profond reste modeste', () => {
    expect(render('#### Détail')).toContain('text-title-13');
  });

  it('le gras devient un strong et l’italique un em', () => {
    const html = render('Le **rapport** est *prêt*.');
    expect(html).toContain('<strong class="font-semibold text-ink">rapport</strong>');
    expect(html).toContain('<em class="italic">prêt</em>');
    expect(html).not.toContain('**rapport**');
  });

  it('le code en ligne devient un code, pas des backticks', () => {
    const html = render('Lance `pnpm test` avant.');
    expect(html).toContain('<code');
    expect(html).toContain('pnpm test');
    expect(html).not.toContain('`pnpm test`');
  });

  it('un bloc de code se rend en CodeBlock avec son langage et son contenu', () => {
    const html = render('```ts\nconst x = 1;\n```');
    expect(html).toContain('<pre');
    expect(html).toContain('const x = 1;');
    expect(html).toContain('>ts<');
    expect(html).toContain('text-mono-12');
  });

  it('une table GFM devient une vraie table avec ses en-têtes', () => {
    const html = render('| Poste | Coût |\n| --- | ---: |\n| Infra | 12400 |');
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('Poste');
    expect(html).toContain('Infra');
    expect(html).toContain('12400');
    expect(html).not.toContain('| Poste |');
  });

  it('une liste devient une liste', () => {
    const html = render('- un\n- deux');
    expect(html).toContain('<ul class="mb-3 list-disc');
    expect(html).toContain('<li');
    expect(html).toContain('deux');
  });

  it('une liste numérotée devient un ol', () => {
    expect(render('1. un\n2. deux')).toContain('<ol');
  });

  it('une case à cocher est un caractère, jamais un input', () => {
    const html = render('- [x] fait\n- [ ] à faire');
    expect(html).toContain('✓');
    expect(html).toContain('◻');
    expect(html).not.toContain('<input');
  });

  it('un lien externe s’ouvre à part, avec la protection du référent', () => {
    const html = render('Voir [le rapport](https://exemple.test/r).');
    expect(html).toContain('href="https://exemple.test/r"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('du HTML écrit dans le texte reste du TEXTE : rien ne s’exécute', () => {
    const html = render('Avant <script>alert(1)</script> après');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('alert(1)');
  });

  it('une balise img injectée ne devient pas une balise', () => {
    const html = render('<img src=x onerror="alert(1)">');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('une image markdown se rend en lien, jamais en img', () => {
    const html = render('![le schéma](https://exemple.test/a.png)');
    expect(html).not.toContain('<img');
    expect(html).toContain('href="https://exemple.test/a.png"');
    expect(html).toContain('le schéma');
  });

  it('un citation et une règle horizontale se dessinent avec les tokens', () => {
    const html = render('> cité\n\n---\n');
    expect(html).toContain('<blockquote class="mb-3 border-l-2 border-rule');
    expect(html).toContain('<hr class="my-4 border-rule-2"');
  });

  it('la prose de l’utilisateur est plus encrée que celle de l’agent', () => {
    expect(render('salut', 'user')).toContain('text-ink"');
    expect(render('salut', 'agent')).toContain('text-ink-2');
  });

  it('aucune taille en pixels ne sort du composant', () => {
    const html = render('# T\n\n**g** `c`\n\n- a\n\n| a |\n| - |\n| 1 |');
    expect(html).not.toMatch(/text-\[\d/);
  });
});

describe('plainText', () => {
  it('rend la première ligne, sans balisage', () => {
    expect(plainText('# **PRD**, Podium\n\nsuite')).toBe('PRD, Podium');
  });

  it('replie les espaces et saute les lignes vides de tête', () => {
    expect(plainText('\n\n  Un   titre  `long`  \n\nsuite')).toBe('Un titre long');
  });

  it('rend une chaîne vide pour un markdown vide', () => {
    expect(plainText('')).toBe('');
  });
});

describe('les adresses que le fil accepte de suivre', () => {
  it('http, https, mailto et les adresses relatives font un lien', () => {
    expect(safeHref('https://nodal.example/x')).toBe('https://nodal.example/x');
    expect(safeHref('HTTP://a.b')).toBe('HTTP://a.b');
    expect(safeHref('mailto:q@example.test')).toBe('mailto:q@example.test');
    expect(safeHref('/spaces/1')).toBe('/spaces/1');
    expect(safeHref('#ancre')).toBe('#ancre');
    expect(safeHref('docs/plan.md')).toBe('docs/plan.md');
  });

  it('javascript:, data:, vbscript: et tout schéma inconnu ne font PAS de lien', () => {
    for (const url of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,x',
      'vbscript:x',
      'file:///etc/passwd',
      'ftp://h/x',
      '  ',
    ]) {
      expect(safeHref(url), url).toBeNull();
    }
  });

  it('un lien markdown vers javascript: se rend en texte, sans href', () => {
    const html = render('[clique](javascript:alert(1)) et ![img](data:text/html,x)');
    expect(html).not.toContain('href="javascript');
    expect(html).not.toContain('href="data');
    expect(html).toContain('clique');
    expect(html).toContain('(javascript:alert(1))');
    expect(html).toContain('img');
  });

  it('un lien http reste un lien qui s’ouvre à part', () => {
    const html = render('[site](https://nodal.example)');
    expect(html).toContain('href="https://nodal.example"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
