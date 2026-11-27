import prisma from '../db/prisma.js';
import { LIMITS } from '../constants/limits.js';

/**
 * Creates an execution log entry and auto-prunes oldest if exceeding 500 records
 */
export async function createExecution({
  projectId,
  fileId,
  userId,
  language,
  status,
  stdout,
  stderr,
  compileOutput,
  time,
  memory,
}) {
  const execution = await prisma.execution.create({
    data: {
      projectId,
      fileId,
      userId,
      language,
      status,
      stdout,
      stderr,
      compileOutput,
      time,
      memory,
    },
    select: {
      id: true,
      projectId: true,
      fileId: true,
      userId: true,
      language: true,
      status: true,
      stdout: true,
      stderr: true,
      compileOutput: true,
      time: true,
      memory: true,
      createdAt: true,
    },
  });

  // Auto-prune if total executions exceed LIMITS.EXECUTION_HISTORY_LIMIT (500)
  try {
    const count = await prisma.execution.count({ where: { projectId } });
    if (count > LIMITS.EXECUTION_HISTORY_LIMIT) {
      const excess = count - LIMITS.EXECUTION_HISTORY_LIMIT;
      const oldestToPrune = await prisma.execution.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        take: excess,
        select: { id: true },
      });

      if (oldestToPrune.length > 0) {
        await prisma.execution.deleteMany({
          where: {
            id: { in: oldestToPrune.map((e) => e.id) },
          },
        });
      }
    }
  } catch {
    // Non-fatal if auto-prune fails
  }

  return execution;
}

/**
 * Lists executions for a project (latest first)
 */
export async function listProjectExecutions(projectId, { limit = 50, offset = 0 } = {}) {
  const [total, executions] = await Promise.all([
    prisma.execution.count({ where: { projectId } }),
    prisma.execution.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Math.min(limit, 100),
      select: {
        id: true,
        projectId: true,
        fileId: true,
        userId: true,
        language: true,
        status: true,
        time: true,
        memory: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        file: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return { total, executions };
}

/**
 * Gets a single execution detail
 */
export async function getExecutionById(executionId, projectId) {
  return prisma.execution.findFirst({
    where: {
      id: executionId,
      projectId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarColor: true,
        },
      },
      file: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Clears execution history for a project
 */
export async function clearProjectExecutions(projectId) {
  return prisma.execution.deleteMany({
    where: { projectId },
  });
}
