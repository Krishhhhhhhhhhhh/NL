import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Sample roadmap data
const SAMPLE_ROADMAPS = [
  {
    title: 'Frontend Development',
    slug: 'frontend',
    description: 'Learn modern frontend development with HTML, CSS, JavaScript, and React',
    difficulty: 'beginner',
    nodes: [
      {
        title: 'HTML Basics',
        description: 'Learn HTML fundamentals and semantic markup',
        position: { x: 0, y: 0 },
        dependsOn: [],
        resources: [
          { title: 'HTML MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', type: 'docs' },
          { title: 'HTML Crash Course', url: 'https://www.youtube.com/results?search_query=html+crash+course', type: 'video' },
        ],
      },
      {
        title: 'CSS Styling',
        description: 'Master CSS for styling and responsive design',
        position: { x: 250, y: 0 },
        dependsOn: ['HTML Basics'],
        resources: [
          { title: 'CSS MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS', type: 'docs' },
          { title: 'CSS Complete Guide', url: 'https://www.youtube.com/results?search_query=css+complete+guide', type: 'video' },
        ],
      },
      {
        title: 'JavaScript Fundamentals',
        description: 'Learn core JavaScript concepts and programming',
        position: { x: 500, y: 0 },
        dependsOn: ['HTML Basics'],
        resources: [
          { title: 'JavaScript.info', url: 'https://javascript.info', type: 'docs' },
          { title: 'JS Basics', url: 'https://www.youtube.com/results?search_query=javascript+fundamentals', type: 'video' },
        ],
      },
      {
        title: 'React Fundamentals',
        description: 'Get started with React and component-based architecture',
        position: { x: 250, y: 200 },
        dependsOn: ['JavaScript Fundamentals', 'CSS Styling'],
        resources: [
          { title: 'React Docs', url: 'https://react.dev', type: 'docs' },
          { title: 'React Tutorial', url: 'https://www.youtube.com/results?search_query=react+fundamentals', type: 'video' },
        ],
      },
      {
        title: 'Advanced React',
        description: 'Learn hooks, context, and advanced patterns',
        position: { x: 250, y: 400 },
        dependsOn: ['React Fundamentals'],
        resources: [
          { title: 'React Hooks', url: 'https://react.dev/reference/react/hooks', type: 'docs' },
          { title: 'Advanced React', url: 'https://www.youtube.com/results?search_query=advanced+react+patterns', type: 'video' },
        ],
      },
    ],
  },
  {
    title: 'Backend Development',
    slug: 'backend',
    description: 'Learn backend development with Node.js, databases, and APIs',
    difficulty: 'intermediate',
    nodes: [
      {
        title: 'Node.js Basics',
        description: 'Get started with Node.js and JavaScript runtime',
        position: { x: 0, y: 0 },
        dependsOn: [],
        resources: [
          { title: 'Node.js Docs', url: 'https://nodejs.org/docs/', type: 'docs' },
          { title: 'Node Crash Course', url: 'https://www.youtube.com/results?search_query=node+js+crash+course', type: 'video' },
        ],
      },
      {
        title: 'Express.js',
        description: 'Learn Express framework for building web servers',
        position: { x: 250, y: 0 },
        dependsOn: ['Node.js Basics'],
        resources: [
          { title: 'Express Docs', url: 'https://expressjs.com/', type: 'docs' },
          { title: 'Express Tutorial', url: 'https://www.youtube.com/results?search_query=express+js+tutorial', type: 'video' },
        ],
      },
      {
        title: 'Databases & SQL',
        description: 'Master relational databases and SQL queries',
        position: { x: 0, y: 200 },
        dependsOn: [],
        resources: [
          { title: 'SQL Basics', url: 'https://www.w3schools.com/sql/', type: 'docs' },
          { title: 'SQL Course', url: 'https://www.youtube.com/results?search_query=sql+tutorial', type: 'video' },
        ],
      },
      {
        title: 'MongoDB & NoSQL',
        description: 'Learn NoSQL databases and MongoDB',
        position: { x: 500, y: 200 },
        dependsOn: [],
        resources: [
          { title: 'MongoDB Docs', url: 'https://docs.mongodb.com/', type: 'docs' },
          { title: 'MongoDB Tutorial', url: 'https://www.youtube.com/results?search_query=mongodb+tutorial', type: 'video' },
        ],
      },
      {
        title: 'REST APIs',
        description: 'Design and build RESTful APIs',
        position: { x: 250, y: 200 },
        dependsOn: ['Express.js'],
        resources: [
          { title: 'REST API Guide', url: 'https://restfulapi.net/', type: 'docs' },
          { title: 'API Design', url: 'https://www.youtube.com/results?search_query=rest+api+design', type: 'video' },
        ],
      },
    ],
  },
  {
    title: 'DevOps',
    slug: 'devops',
    description: 'Learn DevOps, Docker, Kubernetes, and CI/CD',
    difficulty: 'advanced',
    nodes: [
      {
        title: 'Linux Basics',
        description: 'Master Linux command line and system administration',
        position: { x: 0, y: 0 },
        dependsOn: [],
        resources: [
          { title: 'Linux Docs', url: 'https://linux.die.net/', type: 'docs' },
          { title: 'Linux Course', url: 'https://www.youtube.com/results?search_query=linux+terminal+basics', type: 'video' },
        ],
      },
      {
        title: 'Docker',
        description: 'Learn containerization with Docker',
        position: { x: 250, y: 0 },
        dependsOn: ['Linux Basics'],
        resources: [
          { title: 'Docker Docs', url: 'https://docs.docker.com/', type: 'docs' },
          { title: 'Docker Tutorial', url: 'https://www.youtube.com/results?search_query=docker+tutorial', type: 'video' },
        ],
      },
      {
        title: 'Kubernetes',
        description: 'Orchestrate containers with Kubernetes',
        position: { x: 500, y: 0 },
        dependsOn: ['Docker'],
        resources: [
          { title: 'K8s Docs', url: 'https://kubernetes.io/docs/', type: 'docs' },
          { title: 'Kubernetes Course', url: 'https://www.youtube.com/results?search_query=kubernetes+tutorial', type: 'video' },
        ],
      },
      {
        title: 'CI/CD Pipelines',
        description: 'Set up automated testing and deployment',
        position: { x: 250, y: 200 },
        dependsOn: ['Docker'],
        resources: [
          { title: 'CI/CD Guide', url: 'https://about.gitlab.com/blog/2023/08/01/cicd/', type: 'docs' },
          { title: 'GitHub Actions', url: 'https://www.youtube.com/results?search_query=github+actions+tutorial', type: 'video' },
        ],
      },
    ],
  },
  {
    title: 'AI & Machine Learning',
    slug: 'ai-ml',
    description: 'Learn AI, machine learning, and deep learning concepts',
    difficulty: 'advanced',
    nodes: [
      {
        title: 'Python Fundamentals',
        description: 'Learn Python programming for data science',
        position: { x: 0, y: 0 },
        dependsOn: [],
        resources: [
          { title: 'Python.org', url: 'https://www.python.org/doc/', type: 'docs' },
          { title: 'Python Course', url: 'https://www.youtube.com/results?search_query=python+for+beginners', type: 'video' },
        ],
      },
      {
        title: 'Linear Algebra & Calculus',
        description: 'Learn math foundations for ML',
        position: { x: 250, y: 0 },
        dependsOn: [],
        resources: [
          { title: 'Khan Academy', url: 'https://www.khanacademy.org/', type: 'docs' },
          { title: 'Math for ML', url: 'https://www.youtube.com/results?search_query=linear+algebra+machine+learning', type: 'video' },
        ],
      },
      {
        title: 'Machine Learning Basics',
        description: 'Understand ML algorithms and concepts',
        position: { x: 250, y: 200 },
        dependsOn: ['Python Fundamentals', 'Linear Algebra & Calculus'],
        resources: [
          { title: 'ML Course', url: 'https://www.coursera.org/learn/machine-learning', type: 'course' },
          { title: 'Scikit-learn', url: 'https://scikit-learn.org/', type: 'docs' },
        ],
      },
      {
        title: 'Deep Learning',
        description: 'Learn neural networks and deep learning frameworks',
        position: { x: 500, y: 200 },
        dependsOn: ['Machine Learning Basics'],
        resources: [
          { title: 'TensorFlow', url: 'https://www.tensorflow.org/', type: 'docs' },
          { title: 'Deep Learning Course', url: 'https://www.youtube.com/results?search_query=deep+learning+tutorial', type: 'video' },
        ],
      },
    ],
  },
];

export async function POST(req: NextRequest) {
  try {
    console.log('🌱 Seeding roadmaps...');

    // Check if roadmaps already exist
    const existingCount = await prisma.roadmap.count();
    const force = req.nextUrl.searchParams.get('force') === 'true';

    if (existingCount > 0 && !force) {
      console.log(`⚠️  Found ${existingCount} existing roadmaps. Skipping seed.`);
      return NextResponse.json({
        message: `Roadmaps already seeded. Found ${existingCount} roadmaps.`,
        skipped: true,
      });
    }

    if (force && existingCount > 0) {
      console.log(`🧹 Force seeding — deleting ${existingCount} existing roadmaps...`);
      await prisma.userNodeProgress.deleteMany();
      await prisma.userRoadmapProgress.deleteMany();
      await prisma.roadmapNode.deleteMany();
      await prisma.roadmap.deleteMany();
    }

    // Seed each roadmap
    for (const roadmapData of SAMPLE_ROADMAPS) {
      const { nodes, ...roadmapInfo } = roadmapData;

      const createdRoadmap = await prisma.roadmap.create({
        data: {
          ...roadmapInfo,
          nodes: {
            create: nodes.map((node) => ({
              ...node,
              resources: node.resources || null,
            })),
          },
        },
        include: {
          nodes: true,
        },
      });

      console.log(`✅ Created roadmap: ${createdRoadmap.title} with ${createdRoadmap.nodes.length} nodes`);
    }

    console.log('🎉 Seeding complete!');

    return NextResponse.json({
      message: 'Roadmaps seeded successfully',
      count: SAMPLE_ROADMAPS.length,
    });
  } catch (error) {
    console.error('❌ Error seeding roadmaps:', error);
    return NextResponse.json(
      { error: 'Failed to seed roadmaps', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const roadmapCount = await prisma.roadmap.count();
    return NextResponse.json({
      message: 'Seed status',
      seeded: roadmapCount > 0,
      roadmapCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get seed status' },
      { status: 500 }
    );
  }
}
