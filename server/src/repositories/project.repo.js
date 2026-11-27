import prisma from '../db/prisma.js';

/**
 * Project repository implementing Blueprint Section 5.7 (getRole & key queries)
 */

/**
 * getRole(projectId, userId)
 * Resolves role: 'owner' | 'editor' | 'viewer' | null
 * (Blueprint Section 5.7 & Page 14)
 */
export async function getRole(projectId, userId) {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!p) return null;
  if (p.ownerId === userId) return 'owner';
  return p.members[0]?.role ?? null; // null => NOT_FOUND, existence not leaked
}

/**
 * Gets all collaborator userIds of a project
 */
export async function getProjectMemberUserIds(projectId) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}
