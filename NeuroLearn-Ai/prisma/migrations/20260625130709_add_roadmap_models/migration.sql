-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "thumbnail" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmapNode" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resources" JSONB,
    "level" INTEGER NOT NULL DEFAULT 1,
    "stepNumber" INTEGER,
    "position" JSONB NOT NULL,
    "dependsOn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmapNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userRoadmapProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userRoadmapProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userNodeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "roadmapProgressId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'locked',
    "unlockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "userNodeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Note_userId_youtubeId_key" ON "Note"("userId", "youtubeId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_slug_key" ON "roadmap"("slug");

-- CreateIndex
CREATE INDEX "roadmap_slug_idx" ON "roadmap"("slug");

-- CreateIndex
CREATE INDEX "roadmapNode_roadmapId_idx" ON "roadmapNode"("roadmapId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmapNode_roadmapId_title_key" ON "roadmapNode"("roadmapId", "title");

-- CreateIndex
CREATE INDEX "userRoadmapProgress_userId_roadmapId_idx" ON "userRoadmapProgress"("userId", "roadmapId");

-- CreateIndex
CREATE UNIQUE INDEX "userRoadmapProgress_userId_roadmapId_key" ON "userRoadmapProgress"("userId", "roadmapId");

-- CreateIndex
CREATE INDEX "userNodeProgress_userId_roadmapProgressId_idx" ON "userNodeProgress"("userId", "roadmapProgressId");

-- CreateIndex
CREATE UNIQUE INDEX "userNodeProgress_userId_nodeId_key" ON "userNodeProgress"("userId", "nodeId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmapNode" ADD CONSTRAINT "roadmapNode_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userRoadmapProgress" ADD CONSTRAINT "userRoadmapProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userRoadmapProgress" ADD CONSTRAINT "userRoadmapProgress_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userNodeProgress" ADD CONSTRAINT "userNodeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userNodeProgress" ADD CONSTRAINT "userNodeProgress_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "roadmapNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userNodeProgress" ADD CONSTRAINT "userNodeProgress_roadmapProgressId_fkey" FOREIGN KEY ("roadmapProgressId") REFERENCES "userRoadmapProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
