"use client";

import React from "react";
import { FlowchartRoadmap } from "./FlowchartRoadmap";
import type { NodeState } from "./FlowchartNode";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoadmapNode {
  id: string;
  title: string;
  description?: string;
  position: { x: number; y: number };
  dependsOn?: string[];
  resources?: Array<{ type: string; title: string; url?: string }>;
  stepNumber?: number;
  level?: number;
}

export interface RoadmapViewerProps {
  roadmap: {
    id: string;
    title: string;
    description?: string;
    slug: string;
    nodes: RoadmapNode[];
  };
  userProgress?: {
    nodeProgress: Array<{
      nodeId: string;
      state: NodeState;
    }>;
  } | null;
  onNodeClick: (nodeId: string, nodeData: RoadmapNode) => void;
  onNodeStateChange: (nodeId: string, newState: string) => void;
  /** @deprecated No longer needed — kept for API compatibility */
  isMounted?: boolean;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * RoadmapViewer
 *
 * Thin wrapper that forwards all props to FlowchartRoadmap.
 * Previously rendered a ReactFlow canvas; now renders a clean vertical
 * flowchart with no third-party graph library dependency.
 */
export function RoadmapViewer({
  roadmap,
  userProgress,
  onNodeClick,
  onNodeStateChange,
  isLoading = false,
}: RoadmapViewerProps) {
  return (
    <FlowchartRoadmap
      roadmap={roadmap}
      userProgress={userProgress}
      onNodeClick={onNodeClick}
      onNodeStateChange={onNodeStateChange}
      isLoading={isLoading}
    />
  );
}
