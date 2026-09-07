// ToolBlock — UN appel d'outil, visible (P2bis, plan « De la maquette au
// produit »).
//
// C'est le changement le plus visible du design de Quentin : il n'y a plus de
// groupe « 4 tool calls » qu'il faut déplier pour savoir ce que l'agent a
// fait. Chaque appel qui n'est pas une carte de résultat pleine prend deux
// lignes de 31 px — ce qu'on a demandé, puis ce qu'on a obtenu — et un tour
// avec vingt lectures montre vingt blocs. Le fil se lit du regard.
//
// Composant SERVEUR : rien n'est dépliable ici, donc rien ne bascule dans le
// navigateur. Le raisonnement, lui, reste replié (`ThinkingBlock`).

import { ArrowElbowDownRight, Terminal } from '@phosphor-icons/react/dist/ssr';
import { MonoMicroTag } from '@/components/ui/MonoMicroTag';
import type { Step } from '@/lib/conversation-feed.ts';
import { formatMs, shortToolName } from './format.ts';

type ToolStep = Extract<Step, { kind: 'tool' }>;

/** La pastille de 6 px qui dit comment l'appel s'est terminé. */
const DOT: Readonly<Record<string, string>> = {
  success: 'bg-ok',
  error: 'bg-err',
  blocked: 'bg-err',
  awaiting_approval: 'bg-run',
};

/**
 * L'entrée d'un appel, en une ligne : la valeur si elle n'a qu'un champ texte,
 * sinon les champs `clé=valeur`. Coupée à 60 caractères — c'est un repère, pas
 * une transcription ; le détail vit dans la carte de résultat quand il y en a
 * une.
 */
export function excerptOfInput(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  let text: string | null = null;
  if (typeof input === 'string') text = input;
  else if (typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>);
    if (entries.length === 0) return null;
    if (entries.length === 1 && typeof entries[0]?.[1] === 'string') {
      text = entries[0][1] as string;
    } else {
      text = entries
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(' ');
    }
  } else text = String(input);
  if (text === null || text === '') return null;
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat === '') return null;
  return flat.length > 60 ? `${flat.slice(0, 59)}…` : flat;
}

/**
 * La deuxième ligne a-t-elle quelque chose à dire ? Sans ça, un appel muet
 * (pas de charge utile, pas de sortie, pas d'entrée) laissait une barre de
 * 31 px vide sous la première ligne — ce qui se lit comme un bug, pas comme
 * « rien à dire ».
 */
export function hasResultLine(step: ToolStep): boolean {
  if (step.outcome !== 'success') return true;
  if (step.presented !== null) return true;
  if (step.outputText !== null && step.outputText.trim() !== '') return true;
  return excerptOfInput(step.input) !== null;
}

export default function ToolBlock({ step }: { step: ToolStep }) {
  const arg = excerptOfInput(step.input);
  const failed = step.outcome === 'error' || step.outcome === 'blocked';
  return (
    <div className="overflow-hidden rounded-md border border-rule-2 bg-canvas">
      <div className="flex h-[31px] items-center gap-2 px-3">
        <Terminal size={14} className="shrink-0 text-ink-3" aria-hidden />
        <span className="shrink-0 text-mono-12 text-ink" title={step.toolName}>
          {shortToolName(step.toolName)}
        </span>
        {arg !== null && (
          <span className="min-w-0 flex-1 truncate text-mono-12 text-ink-3">({arg})</span>
        )}
        <span
          className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${DOT[step.outcome] ?? 'bg-ink-4'}`}
          aria-hidden
        />
        {step.durationMs !== null && (
          <span className="shrink-0 text-mono-12 text-ink-4">{formatMs(step.durationMs)}</span>
        )}
      </div>
      {hasResultLine(step) && (
        <div className="flex h-[31px] items-center gap-2 border-t border-rule-2 px-3">
          <ArrowElbowDownRight size={12} className="shrink-0 text-ink-4" aria-hidden />
          <span
            className={`min-w-0 flex-1 truncate text-mono-12 ${failed ? 'text-err' : 'text-ink-3'}`}
          >
            <StepLine step={step} />
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Ce qu'une étape dit de son résultat : depuis la charge utile persistée par
 * P1, sinon le brut. Déplacée telle quelle de `StepsGroup` (P2bis) — c'est la
 * seule chose que ce groupe savait faire et qui valait d'être gardée.
 */
export function StepLine({ step }: { step: ToolStep }) {
  if (step.outcome === 'error' || step.outcome === 'blocked') {
    return (
      <>
        {step.outcome} <RawExcerpt text={step.outputText} />
      </>
    );
  }
  if (step.outcome === 'awaiting_approval') {
    return <MonoMicroTag tone="warn">awaiting approval</MonoMicroTag>;
  }
  const p = step.presented;
  if (p === null) {
    // Pas de charge utile : ce qu'on a de plus vrai, c'est la sortie brute,
    // sinon l'entrée (un `return_result` n'a pas de ligne d'audit : son texte
    // est dans l'appel).
    return (
      <>
        {step.card !== null && <MonoMicroTag tone="ink">{step.card}</MonoMicroTag>}{' '}
        <RawExcerpt text={step.outputText ?? excerptOfInput(step.input)} />
      </>
    );
  }
  switch (p.card) {
    case 'text':
      return (
        <span className={p.failure ? 'text-err' : ''}>
          {p.text}
          {p.truncated ? ' …' : ''}
        </span>
      );
    case 'read':
      return (
        <>
          {p.path ?? 'document'} · {p.chars.toLocaleString('en-US')} chars
          {p.sections !== undefined ? ` · ${p.sections} sections` : ''}
          {p.truncated ? ' · truncated' : ''}
        </>
      );
    case 'search':
      return (
        <>
          “{p.query}” · {p.total} {p.total === 1 ? 'match' : 'matches'}
          {p.hits[0] ? ` · ${p.hits[0].title}` : ''}
          {p.truncated ? ' · truncated' : ''}
        </>
      );
    case 'table':
      return (
        <>
          {p.tables.length} {p.tables.length === 1 ? 'table' : 'tables'} ·{' '}
          {p.tables.reduce((acc, t) => acc + t.total, 0)} rows
        </>
      );
    case 'files':
      return (
        <>
          {p.total} {p.total === 1 ? 'file' : 'files'} · {p.files[0]?.path ?? ''}
        </>
      );
    case 'sent': {
      const chars =
        step.input !== null &&
        typeof step.input === 'object' &&
        typeof (step.input as { text?: unknown }).text === 'string'
          ? (step.input as { text: string }).text.length
          : null;
      return (
        <>
          to {p.target ?? p.channel}
          {chars !== null ? ` · ${chars} chars` : ''}
        </>
      );
    }
    case 'question':
      return (
        <>
          asked · {p.options?.length ?? 0} {p.options?.length === 1 ? 'option' : 'options'}
        </>
      );
    case 'delegation':
      return (
        <>
          to {p.to} · {p.ok ? 'done' : 'failed'}
        </>
      );
    case 'terminal':
      return (
        <>
          {p.command} · {p.timedOut ? 'timed out' : `exit ${p.exitCode ?? '?'}`}
        </>
      );
    case 'checks':
      return (
        <>
          {p.verdict === 'pass' ? 'approved' : 'changes requested'} · {p.total}{' '}
          {p.total === 1 ? 'finding' : 'findings'}
        </>
      );
    case 'generic':
      return (
        <>
          <MonoMicroTag tone="ink">raw</MonoMicroTag> <RawExcerpt text={step.outputText} />
        </>
      );
    default: {
      // Toutes les cartes ont leur ligne. Une carte NEUVE casse la compilation
      // ici plutôt que de rendre une pastille muette en silence.
      const unhandled: never = p;
      void unhandled;
      return null;
    }
  }
}

function RawExcerpt({ text }: { text: string | null }) {
  if (text === null) return null;
  const flat = text.replace(/\s+/g, ' ').trim();
  return <>{flat.length > 160 ? `${flat.slice(0, 159)}…` : flat}</>;
}
