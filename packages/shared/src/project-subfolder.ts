// project-subfolder.ts — la règle du sous-dossier d'un projet, et le chemin
// qu'elle produit (plan « De la maquette au produit », P8 puis P10b).
//
// Module PUR, sans import Node : la modale « New project » doit montrer le
// chemin final PENDANT la saisie, et un module serveur ne se charge pas dans le
// navigateur.
//
// Il vivait dans `apps/web/src/lib/project-path.ts` jusqu'à P10b. L'outil
// `register_project` crée désormais un projet depuis une CONVERSATION, et il
// doit appliquer EXACTEMENT la même règle que le bouton de Spaces : deux
// énoncés auraient divergé le jour où l'un se resserre, et l'agent aurait pu
// créer un dossier que l'écran refuse. La règle a donc remonté ici, où le web,
// les outils et le runner la lisent tous les trois.

import { normalizePath } from './project-key';

/**
 * Le sous-dossier accepté : des segments RELATIFS, et rien d'autre.
 *
 * `''` est autorisé — le terrain lui-même devient le projet, ce qui est le cas
 * d'un dépôt attaché tel quel. Tout le reste est refusé plutôt que nettoyé :
 * aplatir `../evil` en `evil` serait accepter une demande en en exécutant une
 * autre, et l'utilisateur n'apprendrait jamais que sa saisie n'a pas été lue
 * telle qu'il l'a écrite.
 */
export function isSafeSubfolder(raw: string): boolean {
  if (raw === '') return true;
  const p = raw.replace(/\\/g, '/');
  // Un chemin ABSOLU ne se rattache à aucun terrain : `C:/…`, `/…`, `//srv/…`.
  if (/^[a-z]:/i.test(p) || p.startsWith('/')) return false;
  // Caractères de contrôle : illisibles à l'écran, ingérables sur le disque.
  if (/[\u0000-\u001f]/.test(p)) return false;
  const segments = p.split('/');
  return segments.every((s) => s !== '' && s !== '.' && s !== '..');
}

/**
 * Le nom de dossier DÉRIVÉ du nom du projet, quand l'utilisateur n'en donne pas.
 *
 * Le champ vide voulait dire « le dossier lui-même devient le projet » — c'est
 * ce qui a fait d'un projet « Recipes » tout le dossier `Dev` de Quentin, qui en
 * portait dix-huit autres (08/09/2026). Il veut dire maintenant « nomme-le pour
 * moi », ce qui est le geste attendu d'un formulaire de création : le dossier
 * racine d'un développeur EST un dossier de projets, personne n'y crée un projet
 * qui l'engloberait.
 *
 * Vit ici parce que DEUX surfaces en dépendent et doivent s'accorder : l'aperçu
 * de la modale, qui promet un chemin, et l'action, qui le crée. Deux copies
 * auraient fini par promettre un dossier et en créer un autre.
 *
 * Rend `''` quand rien d'exploitable ne subsiste (un nom entièrement fait
 * d'emoji ou de ponctuation) — l'appelant décide alors, il ne reçoit pas un nom
 * inventé.
 */
export function projectFolderNameFrom(projectName: string): string {
  const slug = projectName
    .normalize('NFD')
    // Les diacritiques partent, la lettre reste : « Idées » donne « idees », et
    // pas « ides ».
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    // Le découpage peut laisser un tiret en queue.
    .replace(/-+$/, '');
  return slug;
}

/**
 * Le chemin que `createProjectAction` construirait, ou `null` si la saisie est
 * refusée.
 *
 * `null` plutôt qu'un chemin approximatif : montrer un aperçu pour une saisie
 * que l'action va rejeter promettrait un dossier qui ne sera jamais créé. La
 * modale affiche alors la règle, pas une destination.
 */
export function previewProjectPath(workspacePath: string, subfolder: string): string | null {
  if (!isSafeSubfolder(subfolder)) return null;
  const terrain = normalizePath(workspacePath);
  if (subfolder === '') return terrain;
  return normalizePath(`${terrain}/${subfolder.replace(/\\/g, '/')}`);
}
