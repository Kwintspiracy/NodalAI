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

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PrimaryButton from '@/components/ui/PrimaryButton';
import TextArea from '@/components/ui/TextArea';
import { sendChatMessageAction } from '@/lib/actions.ts';

/** Au-delà, la zone défile au lieu de grandir : le fil reste visible. */
const COMPOSER_MAX_HEIGHT_PX = 200;

/** La zone épouse son texte : une ligne à vide, autant qu'il en faut ensuite. */
function fitToContent(el: HTMLTextAreaElement): void {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
}

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
  const box = useRef<HTMLTextAreaElement>(null);

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
      // La zone se remesure VIDE : React ne vide le DOM qu'à la réconciliation,
      // et mesurer avant laissait une zone haute après l'envoi (revue Codex,
      // passes 57-58). On vide donc la valeur du DOM soi-même avant de mesurer
      // — l'état contrôlé la remet à '' au rendu suivant, sans conflit.
      if (box.current) {
        box.current.value = '';
        fitToContent(box.current);
      }
      router.refresh();
    });
  }

  // P2bis — un CADRE, pas un champ posé à côté d'un bouton : le design pose
  // la saisie sur du papier, collée en bas de la zone de contenu, juste
  // au-dessus de la barre d'état. Une ligne à vide, comme la maquette — mais
  // une ZONE de texte, pas un champ : un collage multi-ligne garde ses
  // retours, Maj+Entrée en ajoute un, et la zone grandit avec le texte (revue
  // Codex, passe 56 : le champ d'une ligne aplatissait tout). Entrée envoie.
  return (
    <div className="sticky bottom-7 z-10 mx-auto mt-8 flex max-w-[760px] items-end gap-3 rounded-xl border border-rule bg-paper px-4 py-1.5">
      <TextArea
        ref={box}
        bare
        rows={1}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          fitToContent(e.target);
        }}
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
        className="max-h-[200px] resize-none overflow-y-auto bg-transparent px-0 py-2.5 text-body-15 leading-[20px]"
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
