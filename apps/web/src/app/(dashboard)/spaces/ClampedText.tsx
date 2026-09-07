'use client';

// ClampedText — un texte long se replie à quelques lignes et se déplie d'un
// clic. La demande d'une automatisation est un prompt entier : le fil la
// montre, il ne la déroule pas d'office (retour de Quentin, 06/09).
//
// Le contenu est passé en `children` (du markdown rendu, depuis P2bis) et le
// texte qui sert à MESURER en `plain`. C'est la source markdown : elle garde
// ses sauts de ligne, donc « plus de six lignes » veut encore dire quelque
// chose. `plainText()` replie tout sur une ligne — parfait pour un titre de
// page, inutilisable pour compter des lignes.

import { useState } from 'react';
import type { ReactNode } from 'react';
import TextButton from '@/components/ui/TextButton';

const LINES = 6;

export default function ClampedText({
  children,
  plain,
  className = '',
}: {
  children: ReactNode;
  /** Le texte source, pour décider si c'est long. */
  plain: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = plain.split('\n').length > LINES || plain.length > 600;
  return (
    <div className={className}>
      <div className={!open && long ? 'line-clamp-6' : ''}>{children}</div>
      {long && (
        <TextButton
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1 text-body-12 text-ink-3 hover:text-ink"
        >
          {open ? 'Show less' : 'Show more'}
        </TextButton>
      )}
    </div>
  );
}
