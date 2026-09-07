// ProjectThread — le bas de la page d'un projet (P8) : le fil de sa
// conversation, et la saisie qui le prolonge.
//
// Trois cas, et un seul mot juste pour chacun (revue passe 30, constat 1) :
//   - pas encore de conversation → « Nothing said here yet », et on peut écrire
//     (le premier envoi la crée) ;
//   - le fil est là → on le dessine, et on peut écrire ;
//   - le fil n'a PAS pu être lu → on dit l'erreur, et on RETIRE la saisie.
//
// Ce troisième cas est la raison d'être du composant. Rendu comme un fil vide,
// une panne de base laissait répondre par-dessus un historique jamais chargé :
// l'agent recevait un message dont le contexte affiché était faux, et personne
// ne pouvait le savoir. Un échec se dit (inv. #4), il ne se dessine pas en
// silence comme une conversation neuve.

import EmptyState from '@/components/ui/EmptyState';
import ConversationFeedView from './ConversationFeedView.tsx';
import LiveRefresh from './LiveRefresh.tsx';
import ProjectComposer from './ProjectComposer.tsx';
import type { ConversationThreadView } from '@/lib/conversation-actions.ts';

export type ProjectThreadResult =
  | { ok: true; data: ConversationThreadView }
  | { ok: false; code: string; message: string };

export default function ProjectThread({
  projectId,
  conversationId,
  thread,
  agentName,
  placeholder,
  note,
}: {
  projectId: string;
  /**
   * La conversation que la saisie PROLONGE : `null` quand le premier envoi
   * doit en créer une (projet neuf, ou fil d'un canal qu'on lit sans pouvoir
   * y répondre depuis le web).
   */
  conversationId: string | null;
  /** `null` quand il n'y avait rien à lire. */
  thread: ProjectThreadResult | null;
  /**
   * À qui la saisie écrit VRAIMENT — l'agent du fil qu'elle prolonge, ou le
   * ROOT qui recevra la conversation qu'elle va créer. La page le décide : le
   * composant ne le déduit plus du fil affiché, qui peut être celui d'un autre
   * agent (revue Codex, passe 60).
   */
  agentName?: string | null;
  /** Le placeholder en toutes lettres quand la saisie va OUVRIR une conversation. */
  placeholder?: string;
  /**
   * Ce que la saisie va faire, quand ce n'est pas répondre au fil affiché :
   * dit AVANT l'envoi, au-dessus du champ.
   */
  note?: string;
}) {
  if (thread !== null && !thread.ok) {
    return (
      <div className="mx-auto mt-8 max-w-[760px]">
        <p className="text-sm text-err">{thread.message}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8">
        {thread !== null ? (
          <>
            {/* P10a — la page d'un projet ne se rafraîchissait pas toute seule,
                alors que celles de /chat et /scheduled le font depuis P2. Une
                question posée pendant qu'on la regarde n'y serait jamais
                apparue : le fil serait resté au dernier rendu, et la carte à
                boutons avec lui. `live` est déjà calculé par le même chargeur
                que les deux autres pages — il n'était simplement pas branché. */}
            <LiveRefresh live={thread.data.live} />
            <ConversationFeedView
              feed={thread.data.feed}
              deliverables={thread.data.verification.deliverables}
            />
          </>
        ) : (
          <div className="mx-auto max-w-[760px]">
            <EmptyState title="Nothing said here yet" compact />
          </div>
        )}
      </div>
      {note !== undefined && (
        <p className="mx-auto mt-8 -mb-6 max-w-[760px] text-body-13 text-ink-3">{note}</p>
      )}
      <ProjectComposer
        projectId={projectId}
        conversationId={conversationId}
        {...(agentName !== undefined ? { agentName } : {})}
        {...(placeholder !== undefined ? { placeholder } : {})}
      />
    </>
  );
}
