"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  FlowchartNode,
  type NodeState,
  type FlowchartNodeData,
} from "./FlowchartNode";
import { BookOpen } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoadmapNodeInput {
  id: string;
  title: string;
  description?: string;
  position: { x: number; y: number };
  dependsOn?: string[];
  resources?: Array<{ type: string; title: string; url?: string }>;
  stepNumber?: number;
  level?: number;
}

export interface FlowchartRoadmapProps {
  roadmap: {
    id: string;
    title: string;
    description?: string;
    slug: string;
    nodes: RoadmapNodeInput[];
  };
  userProgress?: {
    nodeProgress: Array<{
      nodeId: string;
      state: NodeState;
    }>;
  } | null;
  onNodeClick: (nodeId: string, nodeData: RoadmapNodeInput) => void;
  onNodeStateChange: (nodeId: string, newState: string) => void;
  isLoading?: boolean;
}

// ─── Connector ────────────────────────────────────────────────────────────────

function Connector({ fromCompleted }: { fromCompleted: boolean }) {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <svg
        width="24"
        height="52"
        viewBox="0 0 24 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Vertical stem */}
        <line
          x1="12"
          y1="0"
          x2="12"
          y2="40"
          strokeWidth="2"
          strokeLinecap="round"
          className={cn(
            "transition-all duration-500",
            fromCompleted
              ? "stroke-emerald-300 dark:stroke-emerald-700"
              : "stroke-slate-200 dark:stroke-slate-800",
          )}
        />
        {/* Arrowhead */}
        <polygon
          points="6,40 18,40 12,52"
          className={cn(
            "transition-all duration-500",
            fromCompleted
              ? "fill-emerald-300 dark:fill-emerald-700"
              : "fill-slate-200 dark:fill-slate-800",
          )}
        />
      </svg>
    </div>
  );
}

// ─── Legend strip ─────────────────────────────────────────────────────────────

function LegendStrip() {
  const items: Array<{ color: string; label: string }> = [
    { color: "bg-slate-300 dark:bg-slate-700", label: "Locked" },
    { color: "bg-violet-500", label: "Ready" },
    { color: "bg-blue-500", label: "In Progress" },
    { color: "bg-emerald-500", label: "Completed" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 mb-8 text-xs text-slate-500 dark:text-slate-400">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", color)} />
          {label}
        </span>
      ))}
      <span className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-5 ml-1">
        <span className="opacity-60">Tip:</span>
        Click a card to view resources · Check ○ to mark complete
      </span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <BookOpen className="h-7 w-7 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
        No skills yet
      </p>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
        This roadmap has no nodes. Try regenerating it or selecting a different
        topic.
      </p>
    </div>
  );
}

// ─── Step counter header ──────────────────────────────────────────────────────

function StepCounter({ current, total }: { current: number; total: number }) {
  if (total === 0) return null;

  return (
    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 text-center mb-6">
      {total} skill{total !== 1 ? "s" : ""} in this path
      {current > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400">
          {" "}
          · {current} completed
        </span>
      )}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlowchartRoadmap({
  roadmap,
  userProgress,
  onNodeClick,
  onNodeStateChange,
  isLoading = false,
}: FlowchartRoadmapProps) {
  // Build an id→node lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, RoadmapNodeInput>();
    roadmap.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [roadmap.nodes]);

  // Sort by pre-calculated stepNumber; fall back to original array order
  const sortedNodes = useMemo(
    () =>
      [...roadmap.nodes].sort(
        (a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0),
      ),
    [roadmap.nodes],
  );

  // Compute effective state for every node.
  // Priority:  1) explicit DB record  2) auto-unlock rules  3) locked
  //
  // Auto-unlock rules:
  //   • A node with NO dependencies is always "unlocked" (root node).
  //   • A node whose every dependency is "completed" becomes "unlocked".
  //
  // We compute all states in one memoised pass so that deep dependency
  // chains resolve correctly without repeated re-computation.
  const computedStates = useMemo(() => {
    const result = new Map<string, NodeState>();

    const compute = (nodeId: string): NodeState => {
      // Return cached value to avoid re-work / infinite cycles
      if (result.has(nodeId)) return result.get(nodeId)!;

      // Explicit DB state wins over everything
      const explicit = userProgress?.nodeProgress?.find(
        (p) => p.nodeId === nodeId,
      )?.state as NodeState | undefined;

      if (explicit) {
        result.set(nodeId, explicit);
        return explicit;
      }

      const node = nodeMap.get(nodeId);
      if (!node) {
        result.set(nodeId, "locked");
        return "locked";
      }

      // All nodes start as "unlocked" by default when roadmap is created
      // Users can progress through any node without completing prerequisites
      const state: NodeState = "unlocked";
      result.set(nodeId, state);
      return state;
    };

    // Seed the computation for every node in the roadmap
    sortedNodes.forEach((node) => compute(node.id));
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedNodes, nodeMap, userProgress]);

  const getState = (nodeId: string): NodeState =>
    computedStates.get(nodeId) ?? "unlocked";

  // Toggle completed ↔ in_progress (locked nodes are no-ops)
  const handleToggle = (node: RoadmapNodeInput) => {
    const current = getState(node.id);
    if (current === "locked") return;
    const next = current === "completed" ? "in_progress" : "completed";
    onNodeStateChange(node.id, next);
  };

  // Summary counts
  const completedCount = useMemo(
    () => sortedNodes.filter((n) => getState(n.id) === "completed").length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedNodes, userProgress],
  );

  if (sortedNodes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="w-full">
      {/* Legend */}
      <LegendStrip />

      {/* Step counter */}
      <StepCounter current={completedCount} total={sortedNodes.length} />

      {/* Node list */}
      <div className="max-w-2xl mx-auto pb-16">
        {sortedNodes.map((node, index) => {
          const state = getState(node.id);
          const prevState =
            index > 0 ? getState(sortedNodes[index - 1].id) : null;

          // Resolve prerequisite titles from dependsOn IDs
          const prereqTitles = (node.dependsOn ?? [])
            .map((id) => nodeMap.get(id)?.title)
            .filter((t): t is string => Boolean(t));

          return (
            <React.Fragment key={node.id}>
              {/* Animated connector between cards */}
              {index > 0 && (
                <Connector fromCompleted={prevState === "completed"} />
              )}

              <FlowchartNode
                node={node as FlowchartNodeData}
                state={state}
                stepNumber={node.stepNumber ?? index + 1}
                prereqTitles={prereqTitles}
                onToggleComplete={() => handleToggle(node)}
                onViewDetails={() => onNodeClick(node.id, node)}
                isLoading={isLoading}
              />
            </React.Fragment>
          );
        })}

        {/* Bottom finish line */}
        {sortedNodes.length > 0 && (
          <div className="flex flex-col items-center mt-2 pt-2">
            <div
              className={cn(
                "w-px h-8 transition-colors duration-500",
                completedCount === sortedNodes.length
                  ? "bg-emerald-300 dark:bg-emerald-700"
                  : "bg-slate-200 dark:bg-slate-800",
              )}
            />
            <div
              className={cn(
                "mt-2 px-5 py-2 rounded-full border text-xs font-semibold transition-all duration-500",
                completedCount === sortedNodes.length
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500",
              )}
            >
              {completedCount === sortedNodes.length
                ? "🎉 Roadmap complete!"
                : "End of roadmap"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
