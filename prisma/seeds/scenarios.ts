import { PrismaClient, Prisma } from '@prisma/client';

export async function seedScenarios(prisma: PrismaClient) {
  const scenario1 = await prisma.scenario.create({
    data: {
      name: 'Peak Season 2024',
      description: 'Full production scenario for Q4 peak season operations with high volume',
      status: 'active',
      tags: ['peak-season', 'high-volume', 'test'],
    },
  });

  const scenario2 = await prisma.scenario.create({
    data: {
      name: 'Draft Q4 Planning',
      description: null,
      status: 'draft',
      tags: [],
    },
  });

  return { scenario1, scenario2 };
}

export type ScenarioSeed = Awaited<ReturnType<typeof seedScenarios>>;
