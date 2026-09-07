// coding-changes.test.ts — la lecture d'une écriture dans un appel d'outil.
//
// Ces fonctions vivaient dans `actions.ts`, non exportées et donc non
// testables : la page Code les éprouvait de très loin, par une action serveur
// entière. Extraites (P2bis), elles se prouvent ici, appel par appel — et
// c'est le même code qui alimente les compteurs « −a +b » du fil.

import { describe, it, expect } from 'vitest';
import {
  changeLineCounts,
  extractChange,
  extractFilePath,
  findLineCounts,
  isRefusedToolCall,
  lineCountsOfCall,
  sumLineCounts,
} from '../coding-changes.ts';

describe('extractFilePath', () => {
  it('lit les trois formes de chemin des outils du dépôt', () => {
    expect(extractFilePath({ file_path: 'a.ts' })).toBe('a.ts');
    expect(extractFilePath({ notebook_path: 'b.ipynb' })).toBe('b.ipynb');
    expect(extractFilePath({ path: 'c.md' })).toBe('c.md');
    expect(extractFilePath({ query: 'x' })).toBeNull();
    expect(extractFilePath(null)).toBeNull();
  });
});

describe('isRefusedToolCall', () => {
  it('reconnaît le refus du CLI et l’échec déclaré d’un outil Nodal', () => {
    expect(
      isRefusedToolCall('<tool_use_error>No such tool available: Write</tool_use_error>'),
    ).toBe(true);
    expect(isRefusedToolCall('{"ok":false,"error":"denied"}')).toBe(true);
    expect(isRefusedToolCall('{"ok":true}')).toBe(false);
    expect(isRefusedToolCall(null)).toBe(false);
    expect(isRefusedToolCall(undefined)).toBe(false);
  });

  it('ne regarde que la tête de la sortie : un texte long qui CITE l’erreur plus loin passe', () => {
    expect(isRefusedToolCall('ok\n'.repeat(300) + '<tool_use_error>')).toBe(false);
  });
});

describe('extractChange', () => {
  it('file_edit et cli:Edit rendent l’avant et l’après', () => {
    expect(extractChange('file_edit', { path: 'a.ts', old_string: 'x', new_string: 'y' })).toEqual({
      filePath: 'a.ts',
      kind: 'edit',
      oldText: 'x',
      newText: 'y',
    });
    expect(
      extractChange('cli:Edit', { file_path: 'a.ts', old_string: 'x', new_string: 'y' }),
    ).toEqual({ filePath: 'a.ts', kind: 'edit', oldText: 'x', newText: 'y' });
  });

  it('file_write et cli:Write n’ont pas d’avant : c’est une écriture', () => {
    expect(extractChange('file_write', { path: 'a.ts', content: 'hello' })).toEqual({
      filePath: 'a.ts',
      kind: 'write',
      oldText: null,
      newText: 'hello',
    });
  });

  it('cli:MultiEdit concatène ses sous-éditions', () => {
    expect(
      extractChange('cli:MultiEdit', {
        file_path: 'a.ts',
        edits: [
          { old_string: 'a', new_string: 'b' },
          { old_string: 'c', new_string: 'd' },
        ],
      }),
    ).toEqual({ filePath: 'a.ts', kind: 'edit', oldText: 'a\nc', newText: 'b\nd' });
  });

  it('cli:NotebookEdit sans old_source passe pour une écriture', () => {
    expect(
      extractChange('cli:NotebookEdit', { notebook_path: 'n.ipynb', new_source: 'x' }),
    ).toEqual({ filePath: 'n.ipynb', kind: 'write', oldText: null, newText: 'x' });
  });

  it('un outil qui n’écrit pas de texte ne rend rien', () => {
    expect(extractChange('xlsx_write', { path: 'b.xlsx', rows: [] })).toBeNull();
    expect(extractChange('file_read', { path: 'a.ts' })).toBeNull();
  });
});

describe('lineCountsOfCall — les compteurs « −a +b »', () => {
  it('compte les lignes écrites et les lignes remplacées', () => {
    expect(
      lineCountsOfCall(
        'file_edit',
        { path: 'src/session.ts', old_string: 'a\nb', new_string: 'c\nd\ne' },
        null,
      ),
    ).toEqual({ 'src/session.ts': { added: 3, removed: 2 } });
  });

  it('un appel REFUSÉ n’a aucun compteur : il n’a rien écrit', () => {
    expect(
      lineCountsOfCall(
        'cli:Write',
        { file_path: 'a.ts', content: 'x\ny\nz' },
        '<tool_use_error>Write is disabled for this session</tool_use_error>',
      ),
    ).toEqual({});
  });

  it('un outil sans texte (un classeur) n’a aucun compteur', () => {
    expect(lineCountsOfCall('xlsx_write', { path: 'b.xlsx' }, null)).toEqual({});
  });

  it('cli:file_change compte TOUS les fichiers de l’appel, pas seulement le premier', () => {
    expect(
      lineCountsOfCall(
        'cli:file_change',
        {
          path: 'a.ts',
          changes: [
            { path: 'a.ts', kind: 'update', diff: 'l1\nl2' },
            { path: 'b.ts', kind: 'add', diff: 'l1\nl2\nl3' },
          ],
        },
        null,
      ),
    ).toEqual({ 'a.ts': { added: 2, removed: 0 }, 'b.ts': { added: 3, removed: 0 } });
  });

  it('deux écritures du même fichier dans un seul appel s’additionnent', () => {
    expect(
      lineCountsOfCall(
        'cli:file_change',
        {
          path: 'a.ts',
          changes: [
            { path: 'a.ts', kind: 'update', diff: 'l1' },
            { path: 'a.ts', kind: 'update', diff: 'l2\nl3' },
          ],
        },
        null,
      ),
    ).toEqual({ 'a.ts': { added: 3, removed: 0 } });
  });
});

describe('findLineCounts — recoller les deux orthographes du même fichier', () => {
  const counts = { 'D:\\ws\\src\\auth\\session.ts': { added: 3, removed: 1 } };

  it('trouve le fichier quand la carte le nomme relativement au dossier', () => {
    expect(findLineCounts(counts, 'src/auth/session.ts')).toEqual({ added: 3, removed: 1 });
  });

  it('trouve aussi dans l’autre sens, quand l’appel est relatif et la carte absolue', () => {
    expect(
      findLineCounts({ 'src/auth/session.ts': { added: 2, removed: 0 } }, 'ws/src/auth/session.ts'),
    ).toEqual({ added: 2, removed: 0 });
  });

  it('ne confond pas deux homonymes de dossiers différents', () => {
    expect(findLineCounts(counts, 'src/api/session.ts')).toBeNull();
    // Un suffixe qui ne tombe pas sur une frontière de segment ne compte pas.
    expect(findLineCounts({ 'a/mysession.ts': { added: 1, removed: 0 } }, 'session.ts')).toBeNull();
  });

  it('rend null quand l’appel n’a rien écrit', () => {
    expect(findLineCounts({}, 'src/a.ts')).toBeNull();
  });
});

describe('changeLineCounts et sumLineCounts', () => {
  it('un texte vide ne compte aucune ligne', () => {
    expect(
      changeLineCounts({ filePath: 'a', kind: 'write', oldText: null, newText: null }),
    ).toEqual({ added: 0, removed: 0 });
  });

  it('la somme additionne tous les fichiers de tous les appels', () => {
    expect(
      sumLineCounts([
        { 'a.ts': { added: 3, removed: 1 }, 'b.ts': { added: 2, removed: 0 } },
        { 'a.ts': { added: 4, removed: 2 } },
      ]),
    ).toEqual({ added: 9, removed: 3 });
  });
});
