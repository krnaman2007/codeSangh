import prisma from '../db/prisma.js';

const USER_DEBUG_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarColor: true,
};

const FILE_DEBUG_SELECT = {
  id: true,
  name: true,
  language: true,
};

/**
 * Creates a new active debug session, cleanly stopping any existing active session for this project
 */
export async function createDebugSession({
  projectId,
  fileId,
  startedById,
  language,
  debugAdapter,
  breakpoints = [],
  currentLine = 1,
  variables = {},
  callStack = [],
}) {
  // 1. Auto-stop any active debug sessions in this project to preserve single active session rule
  await prisma.debugSession.updateMany({
    where: {
      projectId,
      status: 'active',
    },
    data: {
      status: 'stopped',
      stoppedAt: new Date(),
    },
  });

  // 2. Create the new debug session
  const session = await prisma.debugSession.create({
    data: {
      projectId,
      fileId,
      startedById,
      language,
      debugAdapter,
      status: 'active',
      breakpoints,
      currentLine,
      variables,
      callStack,
    },
    include: {
      startedBy: {
        select: USER_DEBUG_SELECT,
      },
      file: {
        select: FILE_DEBUG_SELECT,
      },
    },
  });

  return session;
}

/**
 * Gets the current active debug session for a project
 */
export async function getActiveDebugSession(projectId) {
  return prisma.debugSession.findFirst({
    where: {
      projectId,
      status: 'active',
    },
    include: {
      startedBy: {
        select: USER_DEBUG_SELECT,
      },
      file: {
        select: FILE_DEBUG_SELECT,
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
  });
}

/**
 * Finds debug session by ID
 */
export async function findDebugSessionById(sessionId, projectId) {
  return prisma.debugSession.findFirst({
    where: {
      id: sessionId,
      projectId,
    },
    include: {
      startedBy: {
        select: USER_DEBUG_SELECT,
      },
      file: {
        select: FILE_DEBUG_SELECT,
      },
    },
  });
}

/**
 * Stops an active debug session
 */
export async function stopDebugSession(sessionId, projectId) {
  return prisma.debugSession.updateMany({
    where: {
      id: sessionId,
      projectId,
      status: 'active',
    },
    data: {
      status: 'stopped',
      stoppedAt: new Date(),
    },
  });
}

/**
 * Updates debug session state (e.g., currentLine, variables, status)
 */
export async function updateDebugSessionState(sessionId, projectId, data) {
  return prisma.debugSession.update({
    where: { id: sessionId },
    data,
    include: {
      startedBy: {
        select: USER_DEBUG_SELECT,
      },
      file: {
        select: FILE_DEBUG_SELECT,
      },
    },
  });
}
