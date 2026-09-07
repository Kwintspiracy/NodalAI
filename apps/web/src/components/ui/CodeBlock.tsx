// CodeBlock — un bloc de code du markdown, dessiné comme une carte du fil
// (P2bis). L'en-tête porte la langue en pastille, le nom du fichier et la
// copie ; le corps numérote ses lignes, garde les espaces et défile.
//
// PAS DE COLORATION SYNTAXIQUE. Le design en montre une ; aucune bibliothèque
// de coloration ne vit dans ce dépôt, et en ajouter une pour un bloc de code
// embarquerait un parseur par langage dans le fil. Les numéros de ligne et la
// gouttière font déjà l'essentiel du travail : on sait qu'on lit du code, et
// on peut en citer une ligne.
//
// Composant serveur : le seul morceau interactif est `CopyButton`, qui est
// déjà un composant client. Le rendre ici évite de faire basculer tout le fil
// côté navigateur pour un bouton.

import { MonoMicroTag } from './MonoMicroTag';
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
  // La dernière ligne d'un bloc de code se termine presque toujours par un
  // saut : le compter donnerait un numéro de plus que de lignes écrites.
  const lines = code.replace(/\n$/, '').split('\n');
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-rule-2 bg-canvas">
      <div className="flex h-[36px] items-center gap-2.5 border-b border-rule-2 px-3.5">
        {lang !== null && lang !== '' && <MonoMicroTag tone="ink">{lang}</MonoMicroTag>}
        {filename !== null && filename !== '' && (
          <span className="min-w-0 truncate text-mono-12 text-ink">{filename}</span>
        )}
        <CopyButton
          value={code}
          className="ml-auto h-auto border-0 bg-transparent px-0 text-mono-11 text-ink-4"
        />
      </div>
      <div className="max-h-[480px] overflow-auto">
        <div className="grid grid-cols-[36px_1fr] py-2">
          <div className="pr-2 text-right text-mono-13 text-ink-4 select-none" aria-hidden>
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="pr-4 text-mono-13 text-ink">{lines.join('\n')}</pre>
        </div>
      </div>
    </div>
  );
}
