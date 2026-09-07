'use client';

// ConversationsList — la liste de TOUTES les conversations (P7).
//
// Une conversation par ligne, la plus récente en haut, avec son ORIGINE : le
// dashboard et les canaux se lisent au même endroit, parce que du point de vue
// de l'utilisateur c'est le même agent qui parle. Le filtre est côté client :
// deux cents lignes tiennent en mémoire, et taper doit répondre à la frappe.
//
// Ce qui est repris du chat à deux volets qui disparaît ici : la recherche, la
// suppression avec confirmation, le bouton « nouvelle conversation ».

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Trash } from '@phosphor-icons/react';
import AgentAvatar from '@/components/ui/AgentAvatar';
import Checkbox from '@/components/ui/Checkbox';
import ConfirmDialog from '@/components/ConfirmDialog.tsx';
import EmptyState from '@/components/ui/EmptyState';
import PageSearchInput from '@/components/ui/PageSearchInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import RowActionButton from '@/components/ui/RowActionButton';
import Table, { THead, Th, Tr, Td } from '@/components/ui/Table';
import {
  createConversationAction,
  deleteConversationAction,
  deleteConversationsAction,
} from '@/lib/actions.ts';
import type { ConversationListRow } from '@/lib/conversation-actions.ts';
import { relativeTime, truncate } from '@/lib/format-time';
import { originLabel } from '@/app/(dashboard)/spaces/format.ts';

export default function ConversationsList({ rows }: { rows: ConversationListRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<ConversationListRow | null>(null);
  /**
   * Le MODE sélection. Les cases ne sont pas là en permanence : on entre en
   * sélection par le bouton « Select », et on en sort par « Cancel » (Quentin,
   * 07/09 : « la checkbox visible en permanence, c'est la pire UX ; il
   * pourrait y avoir un bouton Select qui déclenche l'apparition du toggle »).
   * En sélection, l'action de ligne disparaît : deux façons de supprimer sur
   * le même écran, à deux bouts opposés, c'était le second défaut.
   */
  const [selecting, setSelecting] = useState(false);
  /**
   * Les conversations COCHÉES. Un ensemble d'identifiants, pas d'index : la
   * recherche filtre la liste sous les pieds de la sélection, et un index
   * aurait désigné une autre ligne.
   */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  /** La suppression EN MASSE attend sa confirmation. */
  const [confirmMass, setConfirmMass] = useState(false);
  // Aucun agent ROOT désigné : le bouton ne peut pas marcher, et l'écran le dit
  // avec le chemin pour y remédier plutôt que d'échouer à chaque clic.
  const [noRoot, setNoRoot] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return rows;
    return rows.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.agentName ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  // Ce qui est coché ET encore visible : cocher, chercher autre chose, puis
  // supprimer ne doit pas emporter des lignes qu'on ne voit plus.
  const visiblePicked = useMemo(
    () => filtered.filter((r) => picked.has(r.id)).map((r) => r.id),
    [filtered, picked],
  );
  const allVisiblePicked = filtered.length > 0 && visiblePicked.length === filtered.length;

  function leaveSelection(): void {
    setSelecting(false);
    setPicked(new Set());
  }

  function toggle(id: string): void {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible(): void {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allVisiblePicked) for (const r of filtered) next.delete(r.id);
      else for (const r of filtered) next.add(r.id);
      return next;
    });
  }

  function confirmMassDelete(): void {
    const ids = visiblePicked;
    setConfirmMass(false);
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await deleteConversationsAction(ids);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      // Le compte RÉEL : une ligne déjà partie ne se compte pas.
      toast.success(
        r.data.deleted === 1 ? '1 conversation deleted' : `${r.data.deleted} conversations deleted`,
      );
      leaveSelection();
      router.refresh();
    });
  }

  function create(): void {
    startTransition(async () => {
      const r = await createConversationAction();
      if (!r.ok) {
        if (r.code === 'no_root_agent') setNoRoot(true);
        else toast.error(r.message);
        return;
      }
      router.push(`/chat/${r.data.id}`);
    });
  }

  function confirmDelete(): void {
    const victim = target;
    if (!victim) return;
    setTarget(null);
    startTransition(async () => {
      const r = await deleteConversationAction(victim.id);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {selecting ? (
          <>
            <span className="text-body-13 text-ink-2">
              {visiblePicked.length === 0
                ? 'Select conversations to delete'
                : `${visiblePicked.length} selected`}
            </span>
            <PrimaryButton
              variant="danger"
              size="sm"
              onClick={() => setConfirmMass(true)}
              disabled={isPending || visiblePicked.length === 0}
            >
              Delete
            </PrimaryButton>
            <PrimaryButton variant="neutral" size="sm" onClick={leaveSelection}>
              Cancel
            </PrimaryButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={create} disabled={isPending || noRoot}>
              New conversation
            </PrimaryButton>
            {rows.length > 0 && (
              <PrimaryButton variant="neutral" size="sm" onClick={() => setSelecting(true)}>
                Select
              </PrimaryButton>
            )}
          </>
        )}
        <PageSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search conversations…"
          className="ml-auto"
        />
      </div>

      {noRoot && (
        // Le ROOT n'est pas désigné à la main : il naît avec le premier
        // orchestrateur créé — Settings renvoie lui-même vers /agents (revue
        // Codex, passe 62 : « Designate one in Settings » menait à une action
        // qui n'existe pas).
        <p className="mb-4 text-body-13 text-ink-3">
          No ROOT agent yet.{' '}
          <Link href="/agents" className="text-ink-2 underline hover:text-ink">
            Create an orchestrator agent
          </Link>{' '}
          — the first one you create becomes this workspace’s ROOT.
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? 'No conversation yet' : 'No conversation matches that.'}
          description={
            rows.length === 0
              ? 'Start one here, or write to your agent from one of its channels.'
              : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            {selecting && (
              <Th className="w-[36px]">
                <Checkbox
                  checked={allVisiblePicked}
                  onChange={toggleAllVisible}
                  aria-label={allVisiblePicked ? 'Clear selection' : 'Select all conversations'}
                />
              </Th>
            )}
            <Th>Agent</Th>
            <Th>Conversation</Th>
            <Th className="hidden md:table-cell">Origin</Th>
            <Th className="hidden lg:table-cell">Project</Th>
            <Th align="right" className="hidden sm:table-cell">
              Turns
            </Th>
            <Th className="hidden lg:table-cell">Last activity</Th>
            <Th align="right">
              <span className="sr-only">Actions</span>
            </Th>
          </THead>
          <tbody>
            {filtered.map((r) => (
              <Tr key={r.id}>
                {selecting && (
                  <Td>
                    <Checkbox
                      checked={picked.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select ${r.title !== '' ? r.title : 'Untitled'}`}
                    />
                  </Td>
                )}
                <Td>
                  <span className="flex items-center gap-2 text-body-13 text-ink">
                    <AgentAvatar
                      name={r.agentName ?? 'Agent'}
                      imageUrl={r.agentAvatarUrl}
                      size="sm"
                      shape="square"
                    />
                    <span className="truncate">{r.agentName ?? 'Agent'}</span>
                  </span>
                </Td>
                <Td>
                  <Link
                    href={`/chat/${r.id}`}
                    className="block max-w-[52ch] truncate text-body-13 text-ink-2 hover:text-ink"
                  >
                    {r.title !== '' ? truncate(r.title, 120) : 'Untitled'}
                  </Link>
                  {r.lastPreview !== null && (
                    <span className="block max-w-[52ch] truncate text-body-12 text-ink-4">
                      {r.lastPreview}
                    </span>
                  )}
                </Td>
                <Td className="hidden text-body-12 text-ink-3 md:table-cell">
                  {originLabel({ channel: r.channel, scheduleName: null, chatId: r.chatId })}
                </Td>
                <Td className="hidden text-body-12 text-ink-3 lg:table-cell">
                  {r.currentProject ? (
                    <Link
                      href={`/spaces/${r.currentProject.id}`}
                      className="hover:text-ink-2"
                      title={r.currentProject.path}
                    >
                      {r.currentProject.name}
                    </Link>
                  ) : (
                    ''
                  )}
                </Td>
                <Td align="right" className="hidden text-mono-12 text-ink-2 sm:table-cell">
                  {r.turns}
                </Td>
                <Td className="hidden text-body-12 whitespace-nowrap text-ink-3 lg:table-cell">
                  {r.updatedAt ? relativeTime(r.updatedAt) : ''}
                </Td>
                <Td align="right">
                  {!selecting && (
                    <RowActionButton
                      square
                      tone="danger"
                      icon={<Trash size={14} weight="bold" />}
                      title="Delete conversation"
                      onClick={() => setTarget(r)}
                      disabled={isPending}
                    />
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={confirmMass}
        title={
          visiblePicked.length === 1
            ? 'Delete this conversation?'
            : `Delete ${visiblePicked.length} conversations?`
        }
        message="Their turns will be removed. The work they produced stays."
        confirmLabel="Delete"
        onConfirm={confirmMassDelete}
        onCancel={() => setConfirmMass(false)}
      />

      <ConfirmDialog
        open={target !== null}
        title="Delete this conversation?"
        message={`“${target?.title !== '' ? (target?.title ?? '') : 'Untitled'}” and its turns will be removed. The work it produced stays.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
