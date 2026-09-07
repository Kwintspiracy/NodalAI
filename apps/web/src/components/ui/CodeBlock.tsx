// CodeBlock — un bloc de code du markdown, dessiné comme une carte du fil
// (P2bis). L'en-tête dit ce que c'est (nom de fichier, sinon langage) et
// porte le bouton de copie ; le corps garde les espaces et défile.
//
// Composant serveur : le seul morceau interactif est `CopyButton`, qui est
// déjà un composant client. Le rendre ici évite de faire basculer tout le fil
// côté navigateur pour un bouton.

import CopyButton from './CopyButton';

export default function CodeBlock({
  code,
  lang = null,
  filename = null,
}: {
  code: string;
  lang?: string | null;
  filename?: string | null;
}) {
  return (
    <div className="mb-3 max-w-[760px] overflow-hidden rounded-lg border border-rule-2 bg-paper">
      <div className="flex items-center gap-2 border-b border-rule-2 bg-sidebar px-4 py-2">
        <span className="min-w-0 flex-1 truncate text-mono-11 text-ink-4">
          {filename ?? lang ?? 'code'}
        </span>
        <CopyButton value={code} />
      </div>
      <pre className="max-h-[480px] overflow-auto px-4 py-3 text-mono-12 text-ink-2">{code}</pre>
    </div>
  );
}
