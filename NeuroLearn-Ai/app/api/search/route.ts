import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { YouTubeService } from "@/lib/services/youtube";
import { GroqService } from "@/lib/services/groq";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { buildReferenceLinks } from "@/lib/roadmap/reference-links";

export const dynamic = "force-dynamic";

function getCoveragePlan(query: string) {
  const lowerQuery = query.toLowerCase();

  if (
    /(react|reactjs|react\.js|next\.js|frontend|ui|javascript|typescript)/.test(
      lowerQuery,
    )
  ) {
    return {
      coverageInstructions:
        "Cover React as a complete learning map. Explain the core mental model first, then the main APIs, then advanced patterns and ecosystem topics.",
      coverageTopics: [
        "React mental model and component architecture",
        "JSX, props, and component composition",
        "State management with useState",
        "Side effects and useEffect",
        "Callbacks, memoization, and useCallback/useMemo",
        "Refs and DOM access with useRef",
        "Context and global state",
        "State lifting and prop drilling",
        "Custom hooks and reusable logic",
        "Forms and controlled components",
        "Rendering lists, keys, and conditional UI",
        "Performance, re-rendering, and optimization",
        "Routing and data fetching patterns",
        "Testing and debugging React apps",
        "Common pitfalls and best practices",
      ],
    };
  }

  if (
    /(python|data science|machine learning|ai|deep learning|numpy|pandas)/.test(
      lowerQuery,
    )
  ) {
    return {
      coverageInstructions:
        "Cover the subject end-to-end from fundamentals to practical workflows and advanced usage.",
      coverageTopics: [
        "Core language fundamentals",
        "Data structures and control flow",
        "Functions and modules",
        "File handling and environments",
        "Data analysis workflow",
        "Numerical computing",
        "Visualization",
        "Machine learning workflow",
        "Model evaluation and tuning",
        "Common pitfalls and best practices",
      ],
    };
  }

  return {
    coverageInstructions:
      "Cover the canonical hot topics, prerequisites, common mistakes, and practical examples for this subject.",
    coverageTopics: [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as Session & {
      user: { id: string };
    };
    const {
      query,
      language = "en",
      difficulty = "beginner",
      outputType = "playlist",
    } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const youtubeService = new YouTubeService();
    const groqService = new GroqService();

    // 1. Generate curriculum steps first to maintain chronological order
    const curriculumSteps = await groqService.generateCurriculumSteps(
      query,
      language,
      difficulty,
    );

    if (!curriculumSteps || curriculumSteps.length === 0) {
      return NextResponse.json({
        playlist: null,
        message:
          "Could not generate a learning path for this topic. Please try another.",
      });
    }

    // 2. Fetch the best video for each step
    const allVideos: any[] = [];
    for (const step of curriculumSteps) {
      const bestVideo = await youtubeService.searchBestVideo(step.searchPhrase);
      if (bestVideo) {
        // Prevent exact duplicates if multiple steps yield the same best video
        if (!allVideos.find((v) => v.id === bestVideo.id)) {
          allVideos.push(bestVideo);
        }
      }
    }

    if (allVideos.length === 0) {
      return NextResponse.json({
        playlist: null,
        message:
          "No videos found for this curriculum. Please try a different search term.",
      });
    }

    // Categorize all videos in a single batched LLM call to verify difficulty context
    const difficulties = await groqService.categorizeDifficultyBatch(
      allVideos.map((v) => ({ title: v.title, description: v.description })),
    );

    // Keep the chronological order from the curriculum steps!
    const sortedVideos = allVideos.map((video, index) => ({
      ...video,
      order: index + 1,
      difficulty: difficulties[index] ?? "beginner",
      duration: youtubeService.formatDuration(video.duration),
    }));

    const references = buildReferenceLinks(query);
    const coveragePlan = getCoveragePlan(query);

    const playlistData = {
      title: `${query} - Complete Learning Path`,
      description: `AI-curated learning playlist for ${query} with ${sortedVideos.length} videos`,
      query,
      language,
      difficulty,
      totalVideos: sortedVideos.length,
      completedVideos: 0,
      videos: sortedVideos,
    };

    const roadmap = await groqService.generateLearningRoadmap({
      topic: query,
      language,
      difficulty,
      contextVideos: sortedVideos,
      references,
      coverageInstructions: coveragePlan.coverageInstructions,
      coverageTopics: coveragePlan.coverageTopics,
    });

    // Save videos to database if user is authenticated
    if (session?.user?.id) {
      const videoPromises = sortedVideos.map(async (video) => {
        try {
          return await prisma.video.upsert({
            where: {
              youtubeId: video.id,
            },
            update: {
              title: video.title,
              description: video.description,
              thumbnail: video.thumbnailUrl,
              duration: video.duration,
            },
            create: {
              youtubeId: video.id,
              title: video.title,
              description: video.description,
              thumbnail: video.thumbnailUrl,
              duration: video.duration,
              userId: session.user.id,
            },
          });
        } catch (error) {
          console.error(`Error saving video ${video.id}:`, error);
          return null;
        }
      });

      await Promise.allSettled(videoPromises);

      // If the user generated a document/roadmap, record it as a Playlist entry
      // (prefixed "[Doc]") so the heatmap/streak API picks it up via Playlist.createdAt.
      if (outputType === "document") {
        try {
          await (prisma as any).playlist.create({
            data: {
              title: `[Doc] ${query}`,
              description: `AI-generated learning document for ${query}`,
              videos: [],
              userId: session.user.id,
            },
          });
        } catch (error) {
          // Non-critical — don't fail the whole request if activity logging fails
          console.error("Failed to log document activity:", error);
        }
      }
    }

    return NextResponse.json({
      playlist: playlistData,
      document: roadmap,
      outputType,
      message: `Found ${sortedVideos.length} videos for "${query}"`,
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: "Failed to search videos. Please try again." },
      { status: 500 },
    );
  }
}