"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Lock,
  CheckCircle2,
  Play,
  AlertCircle,
  BookOpen,
  FileText,
  GraduationCap,
  Youtube,
  ChevronRight,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeState = "locked" | "unlocked" | "in_progress" | "completed";

interface Resource {
  title: string;
  url?: string;
  type: string;
}

interface RoadmapNodeDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: {
    id: string;
    title: string;
    description?: string;
    resources?: Resource[];
    dependsOn?: string[];
  } | null;
  nodeState?: NodeState;
  onStateChange?: (nodeId: string, newState: string) => void;
  roadmapNodes?: Array<{ id: string; title: string }>;
  isLoading?: boolean;
}

// ─── Resource type config ─────────────────────────────────────────────────────

interface ResourceTypeConfig {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
}

function getResourceConfig(type: string): ResourceTypeConfig {
  const t = type.toLowerCase();

  if (t === "video" || t === "youtube") {
    return {
      icon: <Youtube className="h-4 w-4" />,
      iconBg: "bg-red-50 dark:bg-red-950/40",
      iconColor: "text-red-600 dark:text-red-400",
      label: "Video",
    };
  }
  if (t === "docs" || t === "documentation") {
    return {
      icon: <FileText className="h-4 w-4" />,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      label: "Docs",
    };
  }
  if (t === "course") {
    return {
      icon: <GraduationCap className="h-4 w-4" />,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      label: "Course",
    };
  }
  if (t === "article" || t === "blog") {
    return {
      icon: <BookOpen className="h-4 w-4" />,
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconColor: "text-violet-600 dark:text-violet-400",
      label: "Article",
    };
  }
  // fallback
  return {
    icon: <Globe className="h-4 w-4" />,
    iconBg: "bg-slate-50 dark:bg-slate-900",
    iconColor: "text-slate-500 dark:text-slate-400",
    label: type.charAt(0).toUpperCase() + type.slice(1),
  };
}

// ─── State config ─────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<
  NodeState,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  locked: {
    label: "Locked",
    badgeClass:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    icon: <Lock className="h-3.5 w-3.5" />,
  },
  unlocked: {
    label: "Ready to Start",
    badgeClass:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
    icon: <ChevronRight className="h-3.5 w-3.5" />,
  },
  in_progress: {
    label: "In Progress",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    icon: <Play className="h-3.5 w-3.5 fill-current" />,
  },
  completed: {
    label: "Completed",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
      {children}
    </h4>
  );
}

function Divider() {
  return <div className="border-t border-slate-100 dark:border-slate-800" />;
}

function ResourceCard({ resource }: { resource: Resource }) {
  const conf = getResourceConfig(resource.type);
  const hasUrl = Boolean(resource.url);

  return (
    <a
      href={resource.url ?? "#"}
      target={hasUrl ? "_blank" : undefined}
      rel="noopener noreferrer"
      onClick={!hasUrl ? (e) => e.preventDefault() : undefined}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 group",
        "border-slate-100 dark:border-slate-800",
        hasUrl
          ? "hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer"
          : "cursor-default opacity-60",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
          conf.iconBg,
          conf.iconColor,
        )}
      >
        {conf.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate transition-colors",
            "text-slate-700 dark:text-slate-300",
            hasUrl && "group-hover:text-primary",
          )}
        >
          {resource.title}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {conf.label}
        </p>
      </div>

      {/* External link icon */}
      {hasUrl && (
        <ExternalLink
          className={cn(
            "shrink-0 h-4 w-4 transition-colors",
            "text-slate-300 dark:text-slate-600",
            "group-hover:text-primary",
          )}
        />
      )}
    </a>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RoadmapNodeDetail({
  open,
  onOpenChange,
  node,
  nodeState = "locked",
  onStateChange,
  roadmapNodes = [],
  isLoading = false,
}: RoadmapNodeDetailProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!node) return null;

  const stateConf = STATE_CONFIG[nodeState];
  const isLocked = nodeState === "locked";
  const isCompleted = nodeState === "completed";
  const isInProgress = nodeState === "in_progress";

  const prerequisites = (node.dependsOn ?? [])
    .map((id) => roadmapNodes.find((n) => n.id === id))
    .filter((n): n is { id: string; title: string } => Boolean(n));

  const handleStateChange = async (newState: string) => {
    if (!onStateChange || isUpdating) return;
    setIsUpdating(true);
    try {
      await onStateChange(node.id, newState);
    } finally {
      setIsUpdating(false);
    }
  };

  const busy = isUpdating || isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto p-0 gap-0">
        {/* ── Header ── */}
        <DialogHeader className="p-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4 pr-6">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold leading-snug text-slate-900 dark:text-slate-100 mb-3">
                {node.title}
              </DialogTitle>

              {/* State badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-semibold",
                  "px-2.5 py-[5px] rounded-full border",
                  stateConf.badgeClass,
                )}
              >
                {stateConf.icon}
                {stateConf.label}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {node.description && (
            <div>
              <SectionTitle>About</SectionTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {node.description}
              </p>
            </div>
          )}

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <>
              {node.description && <Divider />}
              <div>
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    Prerequisites
                  </span>
                </SectionTitle>
                <ul className="space-y-2">
                  {prerequisites.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 dark:bg-amber-500 shrink-0" />
                      {p.title}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Resources */}
          {node.resources && node.resources.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionTitle>
                  Learning Resources ({node.resources.length})
                </SectionTitle>
                <div className="space-y-2">
                  {node.resources.map((res, i) => (
                    <ResourceCard key={i} resource={res} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Action buttons ── */}
          {!isLocked && (
            <>
              <Divider />
              <div className="flex flex-wrap gap-2">
                {/* Start Learning — shown when unlocked */}
                {nodeState === "unlocked" && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => handleStateChange("in_progress")}
                    className="gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Start Learning
                  </Button>
                )}

                {/* Mark Complete — shown when in_progress */}
                {isInProgress && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => handleStateChange("completed")}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark as Complete
                  </Button>
                )}

                {/* Resume — shown when completed */}
                {isCompleted && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => handleStateChange("in_progress")}
                      className="gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Resume Learning
                    </Button>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      You&apos;ve completed this skill
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {/* Locked notice */}
          {isLocked && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <Lock className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {prerequisites.length > 0
                  ? "Complete the prerequisite skills listed above to unlock this topic."
                  : "This skill is not yet unlocked. Complete earlier steps to proceed."}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
