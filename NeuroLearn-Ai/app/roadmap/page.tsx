"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  BookOpen,
  Code,
  Zap,
  Brain,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Roadmap {
  id: string;
  title: string;
  description?: string;
  slug: string;
  difficulty: string;
  thumbnail?: string;
  _count?: {
    nodes: number;
    userProgress: number;
  };
}

export default function RoadmapListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchRoadmaps = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/roadmap");

        if (!response.ok) {
          throw new Error("Failed to fetch roadmaps");
        }

        const data = await response.json();
        setRoadmaps(data.roadmaps);
      } catch (err) {
        console.error("Error fetching roadmaps:", err);
        setError("Failed to load roadmaps. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmaps();
  }, []);

  const handleCustomRoadmapSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const slug = searchQuery
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Navigate to the roadmap (will trigger Gemini generation if not found)
    router.push(`/roadmap/${slug}`);
  };

  const getIcon = (slug: string) => {
    switch (slug) {
      case "frontend":
        return <Code className="h-8 w-8" />;
      case "backend":
        return <Zap className="h-8 w-8" />;
      case "devops":
        return <BookOpen className="h-8 w-8" />;
      case "ai-ml":
        return <Brain className="h-8 w-8" />;
      default:
        return <Zap className="h-8 w-8" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "text-green-600 dark:text-green-400";
      case "intermediate":
        return "text-amber-600 dark:text-amber-400";
      case "advanced":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Learning Roadmaps
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Choose a learning path and track your progress through structured
              learning goals.
            </p>
            <Button
              size="lg"
              onClick={() => router.push("/auth/signin")}
              className="mb-16"
            >
              Sign In to Get Started
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {roadmaps.map((roadmap) => (
              <Card
                key={roadmap.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getIcon(roadmap.slug)}
                        </div>
                        <CardTitle className="text-xl">
                          {roadmap.title}
                        </CardTitle>
                      </div>
                      <span
                        className={`text-sm font-medium capitalize ${getDifficultyColor(roadmap.difficulty)}`}
                      >
                        {roadmap.difficulty}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roadmap.description && (
                    <p className="text-sm text-muted-foreground">
                      {roadmap.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {roadmap._count?.nodes || 0} topics
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/auth/signin")}
                  >
                    Sign In to View
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Learning Roadmaps
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Choose a learning path and track your progress through structured
            learning goals. Each roadmap has a clear progression from basics to
            advanced topics.
          </p>
        </div>

        {/* Create Custom Roadmap Section */}
        <Card className="mb-12 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Your Learning Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCustomRoadmapSearch} className="flex gap-3">
              <Input
                placeholder="e.g., 'React Mastery', 'AWS Cloud', 'Machine Learning'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                disabled={isSearching}
              />
              <Button
                type="submit"
                size="lg"
                disabled={isSearching || !searchQuery.trim()}
                className="gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              Enter any skill or topic and we&apos;ll generate a personalized
              learning roadmap for you using AI.
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading roadmaps...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10 mb-8">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Roadmap Grid */}
        {!loading && roadmaps.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {roadmaps.map((roadmap) => (
              <Link key={roadmap.id} href={`/roadmap/${roadmap.slug}`}>
                <Card className="hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {getIcon(roadmap.slug)}
                          </div>
                          <CardTitle className="text-2xl">
                            {roadmap.title}
                          </CardTitle>
                        </div>
                        <span
                          className={`text-sm font-medium capitalize ${getDifficultyColor(roadmap.difficulty)}`}
                        >
                          {roadmap.difficulty}
                        </span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {roadmap.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {roadmap.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                      <span>{roadmap._count?.nodes || 0} topics</span>
                      <span className="text-primary font-medium">
                        Start Learning →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && roadmaps.length === 0 && !error && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No roadmaps available yet.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
