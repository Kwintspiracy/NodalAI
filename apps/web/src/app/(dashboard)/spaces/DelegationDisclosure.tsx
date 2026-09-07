'use client';

// DelegationDisclosure — la coquille dépliable d'une délégation (P2bis).
//
// Une délégation était une ligne tronquée : « Delegated to Lead-Dev » suivi du
// début de son résultat, coupé au milieu d'un mot. C'est pourtant le moment le
// plus intéressant du fil — un autre agent a travaillé. Elle prend donc la
// forme d'un GROUPE, comme les étapes : un en-tête qui dit qui et combien de
// temps, et le détail sous le chevron.
//
// Seule la bascule est cliente. Ce qui est dedans (la consigne et le résultat,
// rendus en markdown) arrive en `children` depuis le serveur : le fil ne
// bascule pas dans le navigateur pour un chevron.

import { useState } from 'react';
import type { ReactNode } from 'react';
import DisclosureButton from '@/components/ui/DisclosureButton';

export default function DelegationDisclosure({
  head,
  aside,
  children,
}: {
  /** L'en-tête, à gauche du chevron : avatar, titre, état. */
  head: ReactNode;
  /** Ce qui se lit à droite : durée, coût. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="max-w-[720px] overflow-hidden rounded-lg border border-rule-2 bg-paper">
      <DisclosureButton open={open} onClick={() => setOpen((v) => !v)} className="py-2">
        {head}
        {aside !== undefined && (
          <span className="ml-auto shrink-0 text-mono-11 text-ink-4">{aside}</span>
        )}
      </DisclosureButton>
      {open && <div className="border-t border-rule-2">{children}</div>}
    </div>
  );
}
