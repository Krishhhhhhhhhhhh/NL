import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

interface RouteParams {
  params: {
    slug: string;
  };
}

const VALID_STATES = [
  "locked",
  "unlocked",
  "in_progress",
  "completed",
] as const;
type NodeState = (typeof VALID_STATES)[number];

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = params;

    // ── Auth ────────────────────────────────────────────────────────────────
    const session = (await getServerSession(authOptions)) as
      | (Session & { user: { id: string } })
      | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // ── Validate body ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { nodeId, newState } = body as { nodeId?: string; newState?: string };

    if (!nodeId || typeof nodeId !== "string") {
      return NextResponse.json(
        { error: "nodeId is required" },
        { status: 400 },
      );
    }

    if (!newState || !VALID_STATES.includes(newState as NodeState)) {
      return NextResponse.json(
        {
          error: `newState must be one of: ${VALID_STATES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const state = newState as NodeState;

    // ── Resolve roadmap ─────────────────────────────────────────────────────
    const roadmap = await prisma.roadmap.findUnique({
      where: { slug },
      include: {
        nodes: { select: { id: true } },
      },
    });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    // Confirm the node actually belongs to this roadmap
    const nodeExistsInRoadmap = roadmap.nodes.some((n) => n.id === nodeId);
    if (!nodeExistsInRoadmap) {
      return NextResponse.json(
        { error: "Node does not belong to this roadmap" },
        { status: 400 },
      );
    }

    // ── Get or create UserRoadmapProgress ───────────────────────────────────
    let roadmapProgress = await prisma.userRoadmapProgress.findUnique({
      where: {
        userId_roadmapId: {
          userId,
          roadmapId: roadmap.id,
        },
      },
    });

    if (!roadmapProgress) {
      roadmapProgress = await prisma.userRoadmapProgress.create({
        data: {
          userId,
          roadmapId: roadmap.id,
        },
      });
    }

    // ── Build timestamp fields based on the new state ───────────────────────
    const now = new Date();

    const timestampFields: {
      unlockedAt?: Date;
      startedAt?: Date;
      completedAt?: Date | null;
    } = {};

    if (state === "unlocked") {
      timestampFields.unlockedAt = now;
    } else if (state === "in_progress") {
      timestampFields.startedAt = now;
      timestampFields.completedAt = null; // clear if reopening
    } else if (state === "completed") {
      timestampFields.completedAt = now;
    }

    // ── Upsert UserNodeProgress ─────────────────────────────────────────────
    await prisma.userNodeProgress.upsert({
      where: {
        userId_nodeId: {
          userId,
          nodeId,
        },
      },
      create: {
        userId,
        nodeId,
        roadmapProgressId: roadmapProgress.id,
        state,
        ...timestampFields,
      },
      update: {
        state,
        ...timestampFields,
      },
    });

    // ── Recalculate progressPercent ─────────────────────────────────────────
    const totalNodes = roadmap.nodes.length;

    const completedCount =
      totalNodes > 0
        ? await prisma.userNodeProgress.count({
            where: {
              userId,
              roadmapProgressId: roadmapProgress.id,
              state: "completed",
            },
          })
        : 0;

    const progressPercent =
      totalNodes === 0 ? 0 : Math.round((completedCount / totalNodes) * 100);

    const isRoadmapNowComplete = progressPercent === 100;

    // ── Persist updated percent & completion timestamp ──────────────────────
    const updatedRoadmapProgress = await prisma.userRoadmapProgress.update({
      where: { id: roadmapProgress.id },
      data: {
        progressPercent,
        completedAt: isRoadmapNowComplete ? now : null,
      },
      include: {
        nodeProgress: {
          select: {
            nodeId: true,
            state: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      userProgress: updatedRoadmapProgress,
      progressPercent,
      completedNodes: completedCount,
      totalNodes,
    });
  } catch (error) {
    console.error("[progress/PUT] Error updating node progress:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update progress",
      },
      { status: 500 },
    );
  }
}
