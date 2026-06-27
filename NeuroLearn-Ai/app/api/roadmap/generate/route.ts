import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

interface RoadmapNode {
  id: string;
  title: string;
  level: number;
  description: string;
  resources: Array<{
    type: "docs" | "video" | "course" | "article";
    title: string;
    url?: string;
  }>;
  dependsOn?: string[];
}

interface RoadmapEdge {
  from: string;
  to: string;
}

interface GeneratedRoadmap {
  title: string;
  description: string;
  slug: string;
  nodes: RoadmapNode[];
  edges?: RoadmapEdge[];
}

interface RoadmapNodeForLayout extends Omit<RoadmapNode, "level"> {
  level?: number;
}

function calculateNodePositionsAndSteps(
  nodes: RoadmapNodeForLayout[],
): Array<{ x: number; y: number; stepNumber: number }> {
  if (nodes.length === 0) return [];

  // Create node map for easy lookup
  const nodeMap = new Map(
    nodes.map((node, idx) => [node.id, { ...node, idx }]),
  );

  // Calculate levels based on dependencies (DAG level assignment)
  const levels: Map<string, number> = new Map();
  const visited: Set<string> = new Set();

  const calculateLevel = (nodeId: string): number => {
    if (levels.has(nodeId)) {
      return levels.get(nodeId)!;
    }

    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    if (!node.dependsOn || node.dependsOn.length === 0) {
      levels.set(nodeId, 0);
      return 0;
    }

    let maxDepLevel = 0;
    for (const depId of node.dependsOn) {
      const depLevel = calculateLevel(depId);
      maxDepLevel = Math.max(maxDepLevel, depLevel);
    }

    const level = maxDepLevel + 1;
    levels.set(nodeId, level);
    return level;
  };

  // Calculate levels for all nodes
  for (const node of nodes) {
    calculateLevel(node.id);
  }

  // Group nodes by level
  const levelGroups: Map<number, string[]> = new Map();
  levels.forEach((level, nodeId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(nodeId);
  });

  // Assign sequential step numbers in level order
  const stepNumbers: Map<string, number> = new Map();
  let stepCounter = 1;

  // Sort level groups by level number
  const sortedLevels = Array.from(levelGroups.entries()).sort(
    (a, b) => a[0] - b[0],
  );

  for (const [level, nodeIds] of sortedLevels) {
    for (const nodeId of nodeIds) {
      stepNumbers.set(nodeId, stepCounter);
      stepCounter++;
    }
  }

  // Position nodes
  const positions: Map<string, { x: number; y: number }> = new Map();
  const nodeWidth = 240;
  const nodeHeight = 140;
  const horizontalSpacing = 80;
  const verticalSpacing = 200;
  const canvasWidth = Math.max(1400, nodes.length * 150);

  levelGroups.forEach((nodeIds: string[], level: number) => {
    const nodesInLevel = nodeIds.length;
    const totalWidth =
      nodesInLevel * nodeWidth + (nodesInLevel - 1) * horizontalSpacing;
    const startX = Math.max(50, (canvasWidth - totalWidth) / 2);
    const y = level * verticalSpacing + 50;

    nodeIds.forEach((nodeId: string, index: number) => {
      const x = startX + index * (nodeWidth + horizontalSpacing);
      positions.set(nodeId, { x, y });
    });
  });

  // Return positions with step numbers in original node order
  return nodes.map((node) => ({
    ...(positions.get(node.id) || { x: 0, y: 0 }),
    stepNumber: stepNumbers.get(node.id) || 0,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: "Missing slug parameter" },
        { status: 400 },
      );
    }

    let apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable not set");
      return NextResponse.json(
        { error: "Gemini API key not configured on server" },
        { status: 500 },
      );
    }

    // Handle multiple API keys (comma-separated) - use the first one
    const apiKeys = apiKey
      .split(",")
      .map((key: string) => key.trim())
      .filter((key: string) => key.length > 0);

    if (apiKeys.length === 0) {
      console.error("No valid Gemini API keys found");
      return NextResponse.json(
        { error: "No valid Gemini API keys configured" },
        { status: 500 },
      );
    }

    apiKey = apiKeys[0]; // Use the first valid key

    // Validate API key format (should start with 'AIza' for Google APIs)
    if (!apiKey.startsWith("AIza")) {
      console.error("Invalid API key format:", apiKey.substring(0, 10) + "...");
      return NextResponse.json(
        { error: "Invalid Gemini API key format" },
        { status: 500 },
      );
    }

    // Initialize Gemini client with API key
    const ai = new GoogleGenAI({ apiKey });

    // Try to use the best available model (fallback chain)
    const modelNames = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];
    let selectedModel: string | null = null;
    let lastError;

    for (const modelName of modelNames) {
      try {
        console.log(`Attempting to initialize model: ${modelName}`);
        // Test the model with a simple ping
        await ai.models.generateContent({
          model: modelName,
          contents: 'Say "OK" if you can read this.',
        });
        console.log(`Successfully using model: ${modelName}`);
        selectedModel = modelName;
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `Model ${modelName} failed:`,
          err instanceof Error ? err.message : err,
        );
        continue;
      }
    }

    if (!selectedModel) {
      console.error("All models failed. Last error:", lastError);
      return NextResponse.json(
        {
          error: `No available Gemini models could be initialized. Please ensure your API key has access to at least one model (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, or gemini-1.5-pro).`,
          details:
            process.env.NODE_ENV === "development"
              ? lastError instanceof Error
                ? lastError.message
                : String(lastError)
              : undefined,
        },
        { status: 503 },
      );
    }

    const prompt = `You are an expert curriculum designer and knowledge graph architect.

Your task: Generate a structured learning roadmap for "${slug}" as a Directed Acyclic Graph (DAG).

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON (no markdown, no explanations, no text)
- Each topic is a NODE with a unique ID
- Each prerequisite relationship is a DIRECTED EDGE
- The graph must be a DAG (no cycles, no circular dependencies)
- Topics must progress strictly from fundamentals (level 1) to advanced (level 3-5)

OUTPUT FORMAT (STRICT JSON):
{
  "nodes": [
    {
      "id": "node-1",
      "title": "Topic Name",
      "level": 1,
      "description": "Brief explanation of what this covers",
      "resources": [
        {
          "title": "Resource name",
          "type": "docs|video|article|course",
          "url": "https://example.com or null"
        }
      ]
    }
  ],
  "edges": [
    {
      "from": "node-1",
      "to": "node-2"
    }
  ]
}

GRAPH RULES:
- Level 1: Absolute fundamentals
- Level 2-3: Intermediate concepts
- Level 4-5: Advanced topics
- Edges represent "must learn X before Y" relationships
- A node can have 0, 1, or multiple prerequisites (incoming edges)
- No node should depend on itself (no cycles)
- Ensure logical learning progression

RESOURCE RULES:
- Suggest 2-3 real, high-quality resources per node
- Include types: documentation, tutorials, courses, videos
- Resources should be well-known and reputable
- URL can be null if you're unsure, but try to include valid ones

SCOPE (15-30 nodes based on complexity):
For "${slug}", create a comprehensive learning path from absolute beginner to advanced practitioner.

Return ONLY the JSON object above. No other text.`;

    const result = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
    });
    const responseText = result.text ?? "";

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse JSON from response");
      }
      parsedResponse = JSON.parse(jsonMatch[0]);
    }

    // Handle both formats: edges and dependsOn
    const nodes = parsedResponse.nodes || [];
    const edges = parsedResponse.edges || [];

    // Convert edges to dependsOn arrays for backward compatibility
    const edgeMap = new Map<string, string[]>();
    edges.forEach((edge: any) => {
      if (!edgeMap.has(edge.to)) {
        edgeMap.set(edge.to, []);
      }
      edgeMap.get(edge.to)!.push(edge.from);
    });

    // Enhance nodes with dependsOn from edges
    const enrichedNodes = nodes.map((node: any) => ({
      ...node,
      dependsOn: edgeMap.get(node.id) || node.dependsOn || [],
    }));

    const positionsAndSteps = calculateNodePositionsAndSteps(enrichedNodes);

    const generatedRoadmap: GeneratedRoadmap = {
      title:
        parsedResponse.title ||
        slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
      description:
        parsedResponse.description ||
        `Learn ${slug} with a structured learning path`,
      slug,
      nodes: enrichedNodes.map((node: any, index: number) => ({
        id: node.id || `node-${index + 1}`,
        title: node.title || "Untitled",
        level: node.level || Math.floor(index / 3) + 1,
        description: node.description || "",
        resources: (node.resources || []).map((res: any) => ({
          type: res.type || "docs",
          title: res.title || "Resource",
          url: res.url || null,
        })),
        dependsOn: node.dependsOn || [],
        position: {
          x: positionsAndSteps[index]?.x || 0,
          y: positionsAndSteps[index]?.y || 0,
        },
        stepNumber: positionsAndSteps[index]?.stepNumber || index + 1,
      })),
      edges:
        edges.length > 0
          ? edges
          : enrichedNodes.flatMap((node: any, index: number) =>
              (node.dependsOn || []).map((depId: string) => ({
                from: depId,
                to: node.id,
              })),
            ),
    };

    return NextResponse.json(generatedRoadmap);
  } catch (error) {
    console.error("Error generating roadmap:", error);

    // Handle specific Gemini API errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("API_KEY_INVALID") ||
      errorMessage.includes("API key not valid")
    ) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is invalid or expired. Please check your API key configuration.",
          details:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 401 },
      );
    }

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("not supported")
    ) {
      return NextResponse.json(
        {
          error:
            "The requested Gemini model is not available. Your API key may not have access to this model. Try enabling gemini-pro or gemini-1.5-pro in Google AI Studio.",
          details:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 503 },
      );
    }

    if (
      errorMessage.includes("429") ||
      errorMessage.includes("Too many requests")
    ) {
      return NextResponse.json(
        {
          error: "Gemini API rate limit exceeded. Please try again later.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate roadmap",
      },
      { status: 500 },
    );
  }
}
