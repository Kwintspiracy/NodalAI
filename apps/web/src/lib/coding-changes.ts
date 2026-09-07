// coding-changes.ts — LIRE UNE ÉCRITURE DANS UN APPEL D'OUTIL.
//
// Ce que ce module sait faire : reconnaître, dans l'entrée d'un appel d'outil,
// qu'un fichier a été écrit, quel fichier, et avec quel texte avant/après.
// C'est de là que sortent les compteurs « −a +b » — de la page Code depuis
// 2026-08, et du fil depuis P2bis.
//
// EXTRAIT DE `actions.ts` (P2bis). Il y vivait, non exporté, parce que ce
// fichier est `'use server'` : tout export y doit être une fonction async, et
// exporter un helper synchrone casse le BUILD sans que tsc ni la suite ne le
// voient. Le fil avait besoin de la même lecture ; la recopier aurait fait
// diverger deux écrans sur le même nombre au premier outil ajouté. Le module
// est PUR (aucune requête, aucun texte d'interface), donc testable seul — ce
// que la version enfouie dans `actions.ts` ne pouvait pas être.
//
// LE COMPTE EST DU CHURN, PAS UN DIFF. « +17 −2 » veut dire « dix-sept lignes
// écrites, deux lignes remplacées », pas le résultat d'une comparaison ligne à
// ligne : au moment où l'appel est enregistré, personne n'a comparé quoi que
// ce soit. C'est ce que la page Code affiche depuis toujours, et le fil dit la
// même chose avec les mêmes nombres.

/**
 * Une écriture lue dans UN appel d'outil, pour le panneau Changes du détail
 * Code. `cli:MultiEdit` applique plusieurs paires avant/après au même fichier :
 * elles sont concaténées (et non fusionnées en un vrai diff multi-hunk) pour
 * que la carte montre chaque sous-édition. `cli:NotebookEdit` ne rend presque
 * jamais d'`old_source` (le CLI n'envoie que le nouveau contenu) : il passe
 * alors pour une écriture.
 */
export type CodingChangeView = {
  filePath: string;
  kind: 'edit' | 'write';
  oldText: string | null;
  newText: string | null;
};

/** Les lignes écrites et remplacées par une écriture. */
export type LineCounts = { added: number; removed: number };

/** file_path (cli:Edit/Write/MultiEdit), notebook_path (cli:NotebookEdit), or path (file_edit/file_write). */
export function extractFilePath(input: Record<string, unknown> | null): string | null {
  if (!input) return null;
  if (typeof input['file_path'] === 'string') return input['file_path'];
  if (typeof input['notebook_path'] === 'string') return input['notebook_path'];
  if (typeof input['path'] === 'string') return input['path'];
  return null;
}

/**
 * True when a recorded tool call was REFUSED and therefore changed nothing.
 * The CLI returns a `<tool_use_error>` envelope for a tool it removed from the
 * palette — e.g. a read-only runtime agent attempting a write gets
 * "No such tool available: Write. Write is disabled for this session".
 *
 * Nodal recorded those exactly like successful calls, so the Code tab counted
 * files that were never written, showed their content in Changes, and even
 * qualified a pipeline as a "coding session" on writes that never happened.
 * That is what hid a read-only coding agent for a full day (Quentin 20/08:
 * Dev C, 9 attempts, 9 refusals, and the UI kept saying files changed).
 * The Nodal builtins report their own failures as `{"ok":false,...}`.
 */
export function isRefusedToolCall(toolOutput: string | null | undefined): boolean {
  if (!toolOutput) return false;
  const head = toolOutput.slice(0, 400);
  return head.includes('<tool_use_error>') || /^\s*\{"ok"\s*:\s*false\b/.test(head);
}

export function extractChange(toolName: string, rawInput: unknown): CodingChangeView | null {
  const input = (rawInput ?? null) as Record<string, unknown> | null;
  const filePath = extractFilePath(input);
  if (!filePath || !input) return null;

  // Une écriture d'un agent en runtime CODEX (revue Codex, 27/08). Elle
  // qualifiait déjà le pipeline et comptait dans les fichiers changés, mais le
  // panneau Changes restait VIDE : une session annonçant « 3 fichiers » sans
  // rien montrer. Codex ne rend pas l'avant/après — seulement un `diff` par
  // changement — donc on montre le diff quand il est là, et on ne fabrique
  // aucun contenu quand il ne l'est pas.
  if (toolName === 'cli:file_change') {
    const changes = Array.isArray(input['changes']) ? input['changes'] : [];
    const mine = changes.find(
      (c) => c && typeof c === 'object' && (c as Record<string, unknown>)['path'] === filePath,
    ) as Record<string, unknown> | undefined;
    const diff = typeof mine?.['diff'] === 'string' ? mine['diff'] : null;
    return {
      filePath,
      // `add` est une création, tout le reste (update, move) touche un existant.
      kind: mine?.['kind'] === 'add' ? 'write' : 'edit',
      oldText: null,
      newText: diff,
    };
  }
  if (toolName === 'cli:Edit' || toolName === 'file_edit') {
    return {
      filePath,
      kind: 'edit',
      oldText: typeof input['old_string'] === 'string' ? input['old_string'] : null,
      newText: typeof input['new_string'] === 'string' ? input['new_string'] : null,
    };
  }
  if (toolName === 'cli:Write' || toolName === 'file_write') {
    return {
      filePath,
      kind: 'write',
      oldText: null,
      newText: typeof input['content'] === 'string' ? input['content'] : null,
    };
  }
  if (toolName === 'cli:MultiEdit') {
    const edits = Array.isArray(input['edits']) ? input['edits'] : [];
    const olds: string[] = [];
    const news: string[] = [];
    for (const e of edits) {
      if (!e || typeof e !== 'object') continue;
      const rec = e as Record<string, unknown>;
      if (typeof rec['old_string'] === 'string') olds.push(rec['old_string']);
      if (typeof rec['new_string'] === 'string') news.push(rec['new_string']);
    }
    return {
      filePath,
      kind: 'edit',
      oldText: olds.length > 0 ? olds.join('\n') : null,
      newText: news.length > 0 ? news.join('\n') : null,
    };
  }
  if (toolName === 'cli:NotebookEdit') {
    const oldText = typeof input['old_source'] === 'string' ? input['old_source'] : null;
    const newText =
      typeof input['new_source'] === 'string'
        ? input['new_source']
        : typeof input['content'] === 'string'
          ? input['content']
          : null;
    return { filePath, kind: oldText !== null ? 'edit' : 'write', oldText, newText };
  }
  return null;
}

/** Le churn d'une écriture : lignes du nouveau texte, lignes de l'ancien. */
export function changeLineCounts(change: CodingChangeView): LineCounts {
  return {
    added: change.newText ? change.newText.split('\n').length : 0,
    removed: change.oldText ? change.oldText.split('\n').length : 0,
  };
}

/**
 * Les compteurs de CET appel, par chemin de fichier.
 *
 * `{}` quand l'appel n'a rien écrit de textuel — un `xlsx_write` écrit un
 * classeur, il n'a pas de lignes ; une lecture n'écrit rien — et quand l'appel
 * a été REFUSÉ : un refus n'a pas de compteurs, sinon le fil afficherait
 * « +40 » sur une écriture qui n'a jamais eu lieu (le bug d'août sur la page
 * Code, invariant #4).
 *
 * `cli:file_change` (runtime Codex) porte PLUSIEURS fichiers dans un même
 * appel ; `extractChange` n'en rend qu'un, parce que le panneau Changes le
 * demande fichier par fichier. Ici on les compte tous : la carte du fil montre
 * la liste entière, et une ligne sans compteur au milieu de trois qui en ont
 * se lirait comme une donnée perdue.
 */
export function lineCountsOfCall(
  toolName: string,
  input: unknown,
  toolOutput: string | null | undefined,
): Record<string, LineCounts> {
  if (isRefusedToolCall(toolOutput)) return {};
  const out: Record<string, LineCounts> = {};
  const add = (path: string, counts: LineCounts): void => {
    const prev = out[path];
    out[path] =
      prev === undefined
        ? counts
        : { added: prev.added + counts.added, removed: prev.removed + counts.removed };
  };
  if (toolName === 'cli:file_change') {
    const record = (input ?? null) as Record<string, unknown> | null;
    const changes = record && Array.isArray(record['changes']) ? record['changes'] : [];
    for (const c of changes) {
      if (!c || typeof c !== 'object') continue;
      const rec = c as Record<string, unknown>;
      const path = typeof rec['path'] === 'string' ? rec['path'] : null;
      if (path === null) continue;
      const diff = typeof rec['diff'] === 'string' ? rec['diff'] : null;
      add(path, changeLineCounts({ filePath: path, kind: 'edit', oldText: null, newText: diff }));
    }
    return out;
  }
  const change = extractChange(toolName, input);
  if (change === null) return out;
  add(change.filePath, changeLineCounts(change));
  return out;
}

/**
 * Les compteurs d'UN fichier dans le jeu d'un appel, ou `null`.
 *
 * Le même fichier arrive sous deux orthographes : la charge utile `files` d'un
 * outil Nodal le nomme relativement au dossier (`src/auth/session.ts`), les
 * outils du CLI l'écrivent en absolu (`D:\ws\src\auth\session.ts`). La page
 * Code recolle les deux avec les racines des dossiers de l'entité, que le fil
 * n'a pas sous la main. On compare donc sur la forme à barres obliques, et un
 * chemin qui TERMINE l'autre sur une frontière de segment compte comme le
 * même fichier. Rien de plus : deux fichiers homonymes dans deux dossiers ne
 * se confondent que si l'un est un suffixe complet de l'autre, ce qui est
 * exactement le cas qu'on cherche à recoller.
 */
export function findLineCounts(
  counts: Record<string, LineCounts>,
  path: string,
): LineCounts | null {
  const direct = counts[path];
  if (direct !== undefined) return direct;
  const want = path.replace(/\\/g, '/');
  for (const [key, value] of Object.entries(counts)) {
    const have = key.replace(/\\/g, '/');
    if (have === want) return value;
    if (have.endsWith('/' + want) || want.endsWith('/' + have)) return value;
  }
  return null;
}

/** La somme de plusieurs jeux de compteurs — le total d'une carte, d'un travail. */
export function sumLineCounts(parts: ReadonlyArray<Record<string, LineCounts>>): LineCounts {
  let added = 0;
  let removed = 0;
  for (const part of parts) {
    for (const counts of Object.values(part)) {
      added += counts.added;
      removed += counts.removed;
    }
  }
  return { added, removed };
}
