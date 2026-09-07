// WorkHeader — l'en-tête d'un fil (P2bis, plan « De la maquette au produit »).
//
// Il remplace le gros titre de page et son sous-titre sur les trois écrans qui
// montrent un fil. Un fil n'a pas de titre : il a un LIEU (le projet, son
// dossier), des GENS (les agents qui y ont travaillé) et un ÉTAT (la
// vérification a-t-elle passé). C'est ce que cette ligne dit, et rien d'autre.
//
// Ce qu'elle ne dit PAS, faute de source : « L'application » de la maquette,
// qui ouvrirait l'app produite — rien en base ne sait où elle tourne (P14).
// Un bouton qui n'ouvre rien est pire que pas de bouton (inv. #4).

import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react/dist/ssr';
import type { ReactNode } from 'react';
import AvatarStack from '@/components/ui/AvatarStack';
import PrimaryButton from '@/components/ui/PrimaryButton';
import StatusPill from '@/components/ui/StatusPill';
import type { ThreadAgent } from './format.ts';

/**
 * Le verdict de la preuve pour TOUT le fil : celui de la dernière séquence.
 * `null` = aucune preuve n'a tourné — la pastille ne paraît pas, elle ne dit
 * pas « non vérifié » (l'en-tête n'est pas le lieu de cet aveu, le
 * récapitulatif de livraison le porte).
 */
export type ProofVerdict = string | null;

export default function WorkHeader({
  back,
  name,
  path,
  agents,
  status,
  proofVerdict = null,
  filesHref = null,
}: {
  /**
   * D'où l'on vient, à gauche du nom : une seule ligne d'identité pour tout
   * l'écran. La flèche vivait sous l'en-tête, dans une seconde ligne qui ne
   * ressemblait à rien d'autre dans l'application (Quentin, 07/09 : « la
   * flèche de retour ne correspond pas aux autres »).
   */
  back?: { label: string; href: string };
  /** L'état du travail (Idle, Running…), à droite — plus sur une ligne à part. */
  status?: ReactNode;
  /** Le nom du projet courant, sinon le titre de la conversation. */
  name: string;
  /** Le dossier du projet, sinon d'où vient la conversation. */
  path: string;
  agents: readonly ThreadAgent[];
  proofVerdict?: ProofVerdict;
  /**
   * Où le bouton « Files » mène : la page des fichiers du projet
   * (`/spaces/<id>/files` — dossier, fichiers, preuve, autres conversations).
   * null : pas de projet, pas de bouton. Un lien plutôt qu'un id : la page
   * d'un projet le pointe vers SES fichiers, un fil vers ceux de son projet.
   */
  filesHref?: string | null;
}) {
  return (
    <div className="flex w-full min-w-0 items-center gap-4">
      {back !== undefined && (
        <Link
          href={back.href}
          className="flex shrink-0 items-center gap-1.5 text-mono-11 text-ink-4 hover:text-ink-2"
        >
          <CaretLeft size={12} weight="bold" />
          {back.label}
        </Link>
      )}
      <div className="flex min-w-0 items-baseline gap-3">
        <span className="truncate text-title-15 text-ink">{name}</span>
        {path !== '' && <span className="truncate text-mono-11 text-ink-4">{path}</span>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {status}
        {agents.length > 0 && (
          <span className="flex items-center gap-2.5">
            <AvatarStack avatars={agents.map((a) => ({ id: a.key, name: a.name }))} max={4} />
            <span className="text-mono-11 text-ink-3">
              {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
            </span>
          </span>
        )}
        {proofVerdict === 'green' && <StatusPill variant="done" label="Verified" />}
        {proofVerdict === 'red' && <StatusPill variant="warn" label="Checks failed" />}
        {filesHref !== null && (
          <PrimaryButton variant="neutral" size="sm" href={filesHref}>
            Files
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
