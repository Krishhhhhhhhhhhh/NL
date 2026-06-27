'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  BookOpen,
  Lock,
  Play,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeState = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface FlowchartNodeData {
  id: string;
  title: string;
  description?: string;
  resources?: Array<{ type: string; title: string; url?: string }>;
  dependsOn?: string[];
  stepNumber?: number;
  level?: number;
}

interface FlowchartNodeProps {
  node: FlowchartNodeData;
  state: NodeState;
  stepNumber: number;
  prereqTitles: string[];
  onToggleComplete: () => void;
  onViewDetails: () => void;
  isLoading?: boolean;
}

// ─── Per-state visual config ───────────────────────────────────────────────────

const CARD_CLASS: Record<NodeState, string> = {
  locked:
    'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/90',
  unlocked:
    'border-violet-200 bg-violet-50/50 dark:border-violet-900/70 dark:bg-violet-950/20 ' +
    'hover:border-violet-300 dark:hover:border-violet-800 ' +
    'hover:shadow-xl hover:shadow-violet-100/60 dark:hover:shadow-violet-950/30',
  in_progress:
    'border-blue-300 bg-blue-50/40 dark:border-blue-800/60 dark:bg-blue-950/20 ' +
    'ring-[1.5px] ring-blue-100 dark:ring-blue-900/40 ' +
    'hover:border-blue-400 dark:hover:border-blue-700 ' +
    'hover:shadow-xl hover:shadow-blue-100/60 dark:hover:shadow-blue-950/30',
  completed:
    'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/60 dark:bg-emerald-950/10',
};

const STEP_CLASS: Record<NodeState, string> = {
  locked:      'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
  unlocked:    'bg-violet-600 text-white shadow shadow-violet-300/60 dark:shadow-violet-900/50',
  in_progress: 'bg-blue-600   text-white shadow shadow-blue-300/60   dark:shadow-blue-900/50',
  completed:   'bg-emerald-500 text-white shadow shadow-emerald-300/60 dark:shadow-emerald-900/50',
};

const BADGE_CLASS: Record<NodeState, string> = {
  locked:
    'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800',
  unlocked:
    'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900',
  in_progress:
    'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
  completed:
    'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900',
};

const TITLE_CLASS: Record<NodeState, string> = {
  locked:      'text-slate-400 dark:text-slate-600',
  unlocked:    'text-slate-900 dark:text-slate-100',
  in_progress: 'text-slate-900 dark:text-slate-100',
  completed:   'text-slate-400 dark:text-slate-600 line-through decoration-emerald-300/60 dark:decoration-emerald-700/50',
};

const FOOTER_BORDER: Record<NodeState, string> = {
  locked:      'border-slate-100 dark:border-slate-800/50',
  unlocked:    'border-violet-100 dark:border-violet-900/40',
  in_progress: 'border-blue-100  dark:border-blue-900/40',
  completed:   'border-emerald-100 dark:border-emerald-900/40',
};

const META_CLASS: Record<NodeState, string> = {
  locked:      'text-slate-300 dark:text-slate-700',
  unlocked:    'text-slate-400 dark:text-slate-500',
  in_progress: 'text-slate-400 dark:text-slate-500',
  completed:   'text-slate-300 dark:text-slate-700',
};

const BADGE_ICON: Record<NodeState, React.ReactNode> = {
  locked:      <Lock       className="h-3 w-3" />,
  unlocked:    <ChevronRight className="h-3 w-3" />,
  in_progress: <Play       className="h-3 w-3 fill-current" />,
  completed:   <CheckCircle2 className="h-3 w-3" />,
};

const BADGE_LABEL: Record<NodeState, string> = {
  locked:      'Locked',
  unlocked:    'Ready to Start',
  in_progress: 'In Progress',
  completed:   'Completed',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEstimatedTime(level: number, resourceCount: number): string {
  const units = Math.max(1, Math.ceil(level * 0.9 + resourceCount * 0.4));
  if (units <= 1) return '~1 week';
  if (units <= 4) return `~${units} weeks`;
  return `~${Math.ceil(units / 4)} month${Math.ceil(units / 4) > 1 ? 's' : ''}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ state }: { state: NodeState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-[5px] rounded-full border transition-colors duration-300',
        BADGE_CLASS[state],
      )}
    >
      {BADGE_ICON[state]}
      {BADGE_LABEL[state]}
    </span>
  );
}

function CheckboxButton({
  isCompleted,
  isLocked,
  state,
  isLoading,
  onToggle,
}: {
  isCompleted: boolean;
  isLocked: boolean;
  state: NodeState;
  isLoading: boolean;
  onToggle: () => void;
}) {
  const checkedClass =
    'bg-emerald-500 border-emerald-500 text-white hover:bg-red-400 hover:border-red-400';

  const uncheckedClass =
    state === 'locked'
      ? 'border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-40'
      : state === 'unlocked'
      ? 'border-slate-300 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:border-violet-600 dark:hover:bg-violet-950/30'
      : /* in_progress */
        'border-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30';

  return (
    <button
      type="button"
      disabled={isLocked || isLoading}
      aria-label={isCompleted ? 'Unmark as completed' : 'Mark as completed'}
      onClick={(e) => {
        e.stopPropagation();
        if (!isLocked && !isLoading) onToggle();
      }}
      className={cn(
        'shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isCompleted ? checkedClass : uncheckedClass,
      )}
    >
      {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlowchartNode({
  node,
  state,
  stepNumber,
  prereqTitles,
  onToggleComplete,
  onViewDetails,
  isLoading = false,
}: FlowchartNodeProps) {
  const isCompleted = state === 'completed';
  const isLocked    = state === 'locked';
  const resourceCount = node.resources?.length ?? 0;
  const estimatedTime = getEstimatedTime(
    node.level ?? Math.ceil(stepNumber / 2),
    resourceCount,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onViewDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewDetails();
        }
      }}
      className={cn(
        // base
        'relative rounded-2xl border-2 cursor-pointer transition-all duration-200 group select-none',
        // lift on hover (except locked)
        !isLocked && 'hover:-translate-y-px',
        CARD_CLASS[state],
        // dim locked nodes
        isLocked && 'opacity-55 hover:opacity-65',
      )}
    >
      {/* ── In-progress pulse ring ── */}
      {state === 'in_progress' && (
        <span
          aria-hidden
          className="absolute -inset-px rounded-2xl border-2 border-blue-300/40 dark:border-blue-700/30 animate-pulse pointer-events-none"
        />
      )}

      {/* ── Completed shimmer overlay ── */}
      {isCompleted && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/5 to-teal-400/5 pointer-events-none"
        />
      )}

      <div className="p-5 sm:p-6">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Step number circle */}
            <div
              className={cn(
                'shrink-0 h-9 w-9 rounded-full flex items-center justify-center',
                'font-bold text-sm transition-all duration-300',
                STEP_CLASS[state],
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-[18px] w-[18px]" />
              ) : (
                <span>{stepNumber}</span>
              )}
            </div>

            {/* Status badge */}
            <StatusBadge state={state} />
          </div>

          {/* Checkbox */}
          <CheckboxButton
            isCompleted={isCompleted}
            isLocked={isLocked}
            state={state}
            isLoading={isLoading}
            onToggle={onToggleComplete}
          />
        </div>

        {/* ── Title ── */}
        <h3
          className={cn(
            'text-[1.05rem] font-bold leading-snug mb-2 transition-all duration-300',
            TITLE_CLASS[state],
          )}
        >
          {node.title}
        </h3>

        {/* ── Description ── */}
        {node.description && (
          <p
            className={cn(
              'text-[0.825rem] leading-relaxed line-clamp-2 mb-4',
              isLocked || isCompleted
                ? 'text-slate-300 dark:text-slate-700'
                : 'text-slate-500 dark:text-slate-400',
            )}
          >
            {node.description}
          </p>
        )}

        {/* ── Footer meta ── */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t',
            FOOTER_BORDER[state],
          )}
        >
          {/* Time estimate */}
          <span className={cn('flex items-center gap-1.5 text-xs', META_CLASS[state])}>
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {estimatedTime}
          </span>

          {/* Resources count */}
          {resourceCount > 0 && (
            <span className={cn('flex items-center gap-1.5 text-xs', META_CLASS[state])}>
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              {resourceCount} resource{resourceCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Prerequisites */}
          {prereqTitles.length > 0 && (
            <span
              className={cn(
                'hidden sm:flex items-center gap-1 text-xs',
                META_CLASS[state],
              )}
            >
              <span className="opacity-60">After:</span>
              <span className="font-medium truncate max-w-[160px]">
                {prereqTitles[0]}
                {prereqTitles.length > 1 ? ` +${prereqTitles.length - 1}` : ''}
              </span>
            </span>
          )}

          {/* Open link */}
          <span
            className={cn(
              'ml-auto flex items-center gap-1 text-xs font-medium transition-all duration-200',
              isCompleted
                ? 'text-emerald-600 dark:text-emerald-500'
                : 'text-slate-400 dark:text-slate-500 group-hover:text-primary',
            )}
          >
            {isCompleted ? 'Review' : 'Details'}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
