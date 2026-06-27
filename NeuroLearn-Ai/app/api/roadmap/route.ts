import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    // Fetch all available roadmaps
    const roadmaps = await prisma.roadmap.findMany({
      include: {
        _count: {
          select: {
            nodes: true,
            userProgress: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ roadmaps });
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmaps' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Admin only - create new roadmap
    const session = (await getServerSession(authOptions)) as Session | null;

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // You can add admin check here later
    const { title, description, slug, difficulty, nodes, edges } = await req.json();

    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }

    // Check if roadmap already exists
    const existingRoadmap = await prisma.roadmap.findUnique({
      where: { slug },
    });

    if (existingRoadmap) {
      return NextResponse.json(
        { error: 'Roadmap with this slug already exists', roadmap: existingRoadmap },
        { status: 409 }
      );
    }

    // Sanitize nodes for Prisma - only keep fields that Prisma expects
    const sanitizedNodes = (nodes || []).map((node: any) => ({
      title: node.title,
      description: node.description || '',
      level: node.level || 1,
      position: node.position || { x: 0, y: 0 },
      dependsOn: node.dependsOn || [],
      resources: node.resources || [],
    }));

    // Create roadmap
    const roadmap = await prisma.roadmap.create({
      data: {
        title,
        description,
        slug,
        difficulty: difficulty || 'intermediate',
        nodes: {
          create: sanitizedNodes,
        },
      },
      include: {
        nodes: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            position: true,
            dependsOn: true,
            resources: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ roadmap }, { status: 201 });
  } catch (error) {
    console.error('Error creating roadmap:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create roadmap',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}
