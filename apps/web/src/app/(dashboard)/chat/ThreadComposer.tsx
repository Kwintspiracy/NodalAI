'use client';

// ThreadComposer — la saisie en bas d'un fil du dashboard (P7).
//
// C'est ce qui reste du chat à deux volets : une zone de texte et un envoi.
// L'envoi est SYNCHRONE côté runner (il génère la réponse et écrit les deux
// tours), donc l'écran attend puis se rafraîchit — le fil relu montre la
// réponse, ses actions et, s'il y a lieu, ce qui est sorti du chat.
//
// Un fil venu d'un canal n'a pas ce composant : répondre depuis le web vers
// Telegram ou Slack se vérifie canal par canal, et P7 ne le fait pas. La page
// le dit en toutes lettres plutôt que d'offrir un champ qui ne partirait pas.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PrimaryButton from '@/components/ui/PrimaryButton';
import TextInput from '@/components/ui/TextInput';
import { sendChatMessageAction } from '@/lib/actions.ts';

export default function ThreadComposer({
  conversationId,
  agentName,
  onBeforeSend,
}: {
  conversationId: string;
  /** À qui on écrit — le placeholder le dit. Absent : « Reply… ». */
  agentName?: string | null;
  /**
   * P8 — la page d'un projet sans conversation. Appelé AVANT l'envoi, il rend
   * l'id de la conversation qui doit recevoir le message (elle vient d'être
   * créée). Une prop plutôt qu'un second composeur : la saisie ne change pas,
   * seul son point d'arrivée change. S'il lève, rien n'est envoyé et l'écran
   * le dit (inv. #4).
   */
  onBeforeSend?: () => Promise<string>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  function send(): void {
    const text = message.trim();
    if (text === '') return;
    startTransition(async () => {
      let target = conversationId;
      if (onBeforeSend) {
        try {
          target = await onBeforeSend();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Could not open the conversation');
          return;
        }
      }
      if (target === '') {
        toast.error('No conversation to write to');
        return;
      }
      const r = await sendChatMessageAction({ conversationId: target, message: text });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      setMessage('');
      router.refresh();
    });
  }

  // P2bis — un CADRE, pas un champ posé à côté d'un bouton : le design pose
  // la saisie sur du papier, collée en bas de la zone de contenu, juste
  // au-dessus de la barre d'état. Une seule ligne, comme la maquette ; Entrée
  // envoie, puisqu'il n'y a plus de retour à la ligne à composer.
  return (
    <div className="sticky bottom-7 z-10 mx-auto mt-8 flex max-w-[760px] items-center gap-3 rounded-xl border border-rule bg-paper px-4 py-1.5">
      <TextInput
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={
          agentName !== undefined && agentName !== null && agentName !== ''
            ? `Reply to ${agentName}…`
            : 'Reply…'
        }
        disabled={isPending}
        containerClassName="min-w-0 flex-1"
        className="h-[40px] rounded-none border-0 bg-transparent px-0 py-0 text-body-15"
      />
      <PrimaryButton
        variant="neutral"
        size="sm"
        onClick={send}
        disabled={isPending || message.trim() === ''}
      >
        {isPending ? 'Sending…' : 'Send'}
      </PrimaryButton>
    </div>
  );
}
