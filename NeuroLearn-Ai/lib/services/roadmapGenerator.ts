interface RoadmapNode {
  id: string;
  title: string;
  description?: string;
  resources?: Array<{
    title: string;
    url?: string;
    type: 'docs' | 'video' | 'course' | 'article';
  }>;
  dependsOn?: string[];
  position?: { x: number; y: number };
}

interface GeneratedRoadmap {
  title: string;
  description: string;
  slug: string;
  nodes: RoadmapNode[];
}

export async function generateRoadmapWithGemini(
  topic: string
): Promise<GeneratedRoadmap> {
  try {
    if (!topic) {
      throw new Error('Topic is required');
    }

    // Call backend API route that securely handles Gemini API
    const response = await fetch('/api/roadmap/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: topic }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const generatedRoadmap: GeneratedRoadmap = await response.json();
    return generatedRoadmap;
  } catch (error) {
    console.error('Error generating roadmap with Gemini:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to generate roadmap. Please try again.'
    );
  }
}
