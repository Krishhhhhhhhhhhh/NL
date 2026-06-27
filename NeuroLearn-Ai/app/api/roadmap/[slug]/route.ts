import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

interface RouteParams {
  params: {
    slug: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = params;
    const session = (await getServerSession(authOptions)) as Session & { user: { id: string } } | null;

    // Fetch roadmap with all nodes
    const roadmap = await prisma.roadmap.findUnique({
      where: { slug },
      include: {
        nodes: {
          select: {
            id: true,
            title: true,
            description: true,
            position: true,
            dependsOn: true,
            resources: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!roadmap) {
      return NextResponse.json(
        { error: 'Roadmap not found' },
        { status: 404 }
      );
    }

    // If user is authenticated, fetch their progress
    let userProgress = null;
    if (session?.user?.id) {
      userProgress = await prisma.userRoadmapProgress.findUnique({
        where: {
          userId_roadmapId: {
            userId: session.user.id,
            roadmapId: roadmap.id,
          },
        },
        include: {
          nodeProgress: {
            select: {
              nodeId: true,
              state: true,
              completedAt: true,
              startedAt: true,
            },
          },
        },
      });

      // If no progress record exists, create one
      if (!userProgress) {
        userProgress = await prisma.userRoadmapProgress.create({
          data: {
            userId: session.user.id,
            roadmapId: roadmap.id,
          },
          include: {
            nodeProgress: true,
          },
        });
      }
    }

    return NextResponse.json({ 
      roadmap, 
      userProgress: userProgress || null 
    });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmap' },
      { status: 500 }
    );
  }
}
