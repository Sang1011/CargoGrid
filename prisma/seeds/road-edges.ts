import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';
import type { LocationNodeSeed } from './location-nodes';

export async function seedRoadEdges(
  prisma: PrismaClient,
  { scenario1 }: ScenarioSeed,
  nodes: LocationNodeSeed,
) {
  const scenarioId = scenario1.id;

  const edge1 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node1.id,
      toNodeId: nodes.node2.id,
      distanceM: 500,
      direction: 'two_way',
      widthM: 6.0,
      congestionLevel: 0.3,
      isBlocked: false,
      notes: 'Main entry road from port to WH-A',
    },
  });

  const edge2 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node2.id,
      toNodeId: nodes.node11.id,
      distanceM: 5,
      direction: 'two_way',
      widthM: 4.0,
      congestionLevel: 0.1,
      isBlocked: false,
    },
  });

  const edge3 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node11.id,
      toNodeId: nodes.node3.id,
      distanceM: 20,
      direction: 'one_way',
      widthM: 4.0,
      congestionLevel: 0.5,
      isBlocked: false,
    },
  });

  const edge4 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node3.id,
      toNodeId: nodes.node4.id,
      distanceM: 50,
      direction: 'two_way',
      widthM: 3.0,
      congestionLevel: 0.95,
      isBlocked: false,
    },
  });

  const edge5 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node4.id,
      toNodeId: nodes.node8.id,
      distanceM: 30,
      direction: 'two_way',
      widthM: 3.0,
      congestionLevel: 0.4,
      isBlocked: false,
    },
  });

  const edge6 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node8.id,
      toNodeId: nodes.node9.id,
      distanceM: 10,
      direction: 'two_way',
      widthM: 2.5,
      congestionLevel: 0.2,
      isBlocked: false,
    },
  });

  const edge7 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node1.id,
      toNodeId: nodes.node5.id,
      distanceM: 600,
      direction: 'two_way',
      widthM: 5.0,
      congestionLevel: 0.2,
      isBlocked: true,
      notes: 'Road under construction',
    },
  });

  const edge8 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node5.id,
      toNodeId: nodes.node6.id,
      distanceM: 15,
      direction: 'two_way',
      widthM: 3.5,
      congestionLevel: 0.1,
      isBlocked: false,
    },
  });

  const edge9 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node2.id,
      toNodeId: nodes.node7.id,
      distanceM: 1000,
      direction: 'two_way',
      widthM: 4.0,
      congestionLevel: 0.6,
      isBlocked: false,
    },
  });

  const edge10 = await prisma.roadEdge.create({
    data: {
      scenarioId,
      fromNodeId: nodes.node10.id,
      toNodeId: nodes.node4.id,
      distanceM: 25,
      direction: 'two_way',
      widthM: 3.0,
      congestionLevel: 0.1,
      isBlocked: false,
      allowedVehicles: {
        create: [],
      },
    },
  });

  return { edge1, edge2, edge3, edge4, edge5, edge6, edge7, edge8, edge9, edge10 };
}

export type RoadEdgeSeed = Awaited<ReturnType<typeof seedRoadEdges>>;
