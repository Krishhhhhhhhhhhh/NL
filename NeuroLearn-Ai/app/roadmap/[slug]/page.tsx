"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Share2,
  Copy,
  Download,
  Loader2,
  Trophy,
  Zap,
} from "lucide-react";
import { RoadmapViewer } from "@/components/roadmap/RoadmapViewer";
import { RoadmapNodeDetail } from "@/components/roadmap/RoadmapNodeDetail";
import { generateRoadmapWithGemini } from "@/lib/services/roadmapGenerator";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoadmapData {
  id: string;
  title: string;
  description?: string;
  slug: string;
  nodes: Array<{
    id: string;
    title: string;
    description?: string;
    position: { x: number; y: number };
    dependsOn?: string[];
    resources?: any;
    stepNumber?: number;
    level?: number;
  }>;
}

// ─── Progress Header ──────────────────────────────────────────────────────────

function ProgressHeader({
  completed,
  total,
  percent,
}: {
  completed: number;
  total: number;
  percent: number;
}) {
  const isFinished = percent === 100;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5 mb-8 transition-all duration-500",
        isFinished
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20"
          : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950",
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              isFinished
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-slate-700 dark:text-slate-300",
            )}
          >
            {isFinished ? "🎉 Roadmap complete!" : "Your Progress"}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {completed} of {total} skill{total !== 1 ? "s" : ""} completed
            {total - completed > 0 && ` · ${total - completed} remaining`}
          </p>
        </div>

        {/* Percentage */}
        <span
          className={cn(
            "text-3xl font-bold tabular-nums leading-none",
            isFinished
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-slate-900 dark:text-slate-100",
          )}
        >
          {percent}%
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            background: isFinished
              ? "linear-gradient(to right, #10b981, #14b8a6)"
              : percent > 60
                ? "linear-gradient(to right, #3b82f6, #8b5cf6)"
                : "linear-gradient(to right, #6366f1, #8b5cf6)",
          }}
        />
      </div>

      {/* Milestones */}
      <div className="flex justify-between mt-1.5">
        {[0, 25, 50, 75, 100].map((m) => (
          <span
            key={m}
            className={cn(
              "text-[10px] font-medium tabular-nums",
              percent >= m
                ? "text-slate-500 dark:text-slate-400"
                : "text-slate-300 dark:text-slate-700",
            )}
          >
            {m === 0 ? "Start" : m === 100 ? "Done" : `${m}%`}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen({ generating }: { generating: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-5 text-center">
          {generating ? (
            <>
              {/* Animated brain icon */}
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-primary animate-bounce" />
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Building your roadmap with AI…
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  Designing a structured learning path just for you
                </p>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1.5 mt-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-primary/40 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                  Could not load roadmap
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onBack}>
              ← Back to Roadmaps
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapViewPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const { data: session, status } = useSession();

  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingWithAI, setGeneratingWithAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // ── Fetch roadmap ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check sessionStorage cache first
        const cached = sessionStorage.getItem(`roadmap_${slug}`);
        if (cached) {
          const data = JSON.parse(cached);
          setRoadmap(data.roadmap);
          setUserProgress(data.userProgress);
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/roadmap/${slug}`);

        if (response.ok) {
          const data = await response.json();
          setRoadmap(data.roadmap);
          setUserProgress(data.userProgress);
          sessionStorage.setItem(`roadmap_${slug}`, JSON.stringify(data));
        } else if (response.status === 404) {
          setGeneratingWithAI(true);
          try {
            const generatedRoadmap = await generateRoadmapWithGemini(slug);

            const saveResponse = await fetch("/api/roadmap", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(generatedRoadmap),
            });

            if (saveResponse.ok) {
              const savedData = await saveResponse.json();
              setRoadmap(savedData.roadmap);

              const progressResponse = await fetch(`/api/roadmap/${slug}`);
              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                setUserProgress(progressData.userProgress);
                sessionStorage.setItem(
                  `roadmap_${slug}`,
                  JSON.stringify({
                    roadmap: progressData.roadmap,
                    userProgress: progressData.userProgress,
                  }),
                );
              }
            } else {
              const errorData = await saveResponse.json().catch(() => ({}));
              throw new Error(
                `Failed to save generated roadmap: ${errorData.error || "Unknown error"}`,
              );
            }
          } catch (genErr: any) {
            setError(
              `Could not find "${slug}" and AI generation failed: ${genErr.message}. Try a different topic.`,
            );
          } finally {
            setGeneratingWithAI(false);
          }
        } else {
          throw new Error(
            `Failed to fetch roadmap (Status: ${response.status})`,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load roadmap. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [slug]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleNodeClick = useCallback(
    (nodeId: string, nodeData: any) => {
      if (status === "unauthenticated") {
        router.push("/auth/signin");
        return;
      }

      const nodeState =
        userProgress?.nodeProgress?.find((p: any) => p.nodeId === nodeId)
          ?.state ?? "locked";

      setSelectedNode({ ...nodeData, id: nodeId, currentState: nodeState });
      setDetailOpen(true);
    },
    [status, userProgress, router],
  );

  const handleNodeStateChange = useCallback(
    async (nodeId: string, newState: string) => {
      if (!slug || !(session?.user as any)?.id) return;

      setIsSaving(true);
      try {
        const response = await fetch(`/api/roadmap/${slug}/progress`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId, newState }),
        });

        if (!response.ok) throw new Error("Failed to update progress");

        const data = await response.json();
        setUserProgress(data.userProgress);

        // Invalidate cache so fresh progress is fetched next visit
        sessionStorage.removeItem(`roadmap_${slug}`);

        setSelectedNode((prev: any) =>
          prev ? { ...prev, currentState: newState } : null,
        );
      } catch (err) {
        console.error("Error updating node state:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [slug, (session?.user as any)?.id],
  );

  const handleShareRoadmap = useCallback(async () => {
    if (!roadmap) return;
    const shareUrl = `${window.location.origin}/roadmap/${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: roadmap.title,
          text: `Check out this learning roadmap: ${roadmap.title}`,
          url: shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }, [roadmap, slug]);

  const handleDuplicateRoadmap = useCallback(() => {
    if (!roadmap?.title) return;
    const newSlug = `${roadmap.title}-copy`
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    router.push(`/roadmap/${newSlug}`);
  }, [roadmap?.title, router]);

  const handleExportRoadmap = useCallback(() => {
    if (!roadmap) return;
    const exportData = {
      title: roadmap.title,
      description: roadmap.description,
      nodes: roadmap.nodes,
      generatedAt: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}-roadmap.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [roadmap, slug]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const totalNodes = roadmap?.nodes?.length ?? 0;
  const completedNodes =
    userProgress?.nodeProgress?.filter((p: any) => p.state === "completed")
      .length ?? 0;
  const progressPercent =
    totalNodes === 0 ? 0 : Math.round((completedNodes / totalNodes) * 100);

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading || generatingWithAI) {
    return <LoadingScreen generating={generatingWithAI} />;
  }

  if (error || !roadmap) {
    return (
      <ErrorScreen
        error={error ?? "Roadmap not found."}
        onBack={() => router.push("/roadmap")}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* ── Back link ── */}
          <button
            onClick={() => router.push("/roadmap")}
            className="inline-flex items-center gap-1 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-6"
          >
            ← Back to Roadmaps
          </button>

          {/* ── Page header ── */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                  {roadmap.title}
                </h1>
                {roadmap.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
                    {roadmap.description}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareRoadmap}
                  className="gap-1.5 text-xs"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {copyFeedback ? "Copied!" : "Share"}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDuplicateRoadmap}
                  className="gap-1.5 text-xs hidden sm:flex"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportRoadmap}
                  className="gap-1.5 text-xs hidden sm:flex"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </div>

            {/* Stats strip */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" />
                {totalNodes} skills
              </span>
              {status === "authenticated" && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-medium">
                  {completedNodes} completed
                </span>
              )}
              {status === "unauthenticated" && (
                <button
                  onClick={() => router.push("/auth/signin")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in to track progress →
                </button>
              )}
            </div>
          </div>

          {/* ── Progress header (auth-gated) ── */}
          {status === "authenticated" && (
            <ProgressHeader
              completed={completedNodes}
              total={totalNodes}
              percent={progressPercent}
            />
          )}

          {/* ── Flowchart ── */}
          <RoadmapViewer
            roadmap={roadmap}
            userProgress={userProgress}
            onNodeClick={handleNodeClick}
            onNodeStateChange={handleNodeStateChange}
            isLoading={isSaving}
          />
        </div>
      </main>

      {/* ── Node detail modal ── */}
      <RoadmapNodeDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        node={selectedNode}
        nodeState={selectedNode?.currentState}
        onStateChange={handleNodeStateChange}
        roadmapNodes={roadmap.nodes}
        isLoading={isSaving}
      />
    </div>
  );
}
