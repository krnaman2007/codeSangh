import prisma from '../db/prisma.js';

/**
 * Project repository implementing Blueprint Section 5.3, 5.7 & 7.4
 */

/**
 * Count projects owned by user (used to enforce 50-project limit)
 */
export async function countOwnedProjects(ownerId) {
  return prisma.project.count({
    where: { ownerId },
  });
}

/**
 * Creates an empty project (Blueprint Section 7.4)
 * Only accepts name and ownerId. nameLower is set for unique case-insensitive check.
 */
export async function createProject({ name, ownerId }) {
  return prisma.project.create({
    data: {
      name,
      nameLower: name.toLowerCase(),
      ownerId,
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Dashboard query: owned projects + shared projects in one call (Blueprint Section 5.7 & 7.4)
 * Sorted by updatedAt desc.
 */
export async function getDashboardProjects(userId, search) {
  const nameFilter = search ? { nameLower: { contains: search.toLowerCase() } } : {};

  // 1. Fetch owned projects with member count
  const ownedProjects = await prisma.project.findMany({
    where: {
      ownerId: userId,
      ...nameFilter,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: { select: { members: true } },
    },
  });

  // 2. Fetch file and folder counts for all owned projects in one groupBy query (Blueprint Section 5.7)
  const ownedProjectIds = ownedProjects.map((p) => p.id);
  let fileCountMap = new Map();
  let folderCountMap = new Map();

  if (ownedProjectIds.length > 0) {
    const counts = await prisma.fileNode.groupBy({
      by: ['projectId', 'type'],
      where: {
        projectId: { in: ownedProjectIds },
      },
      _count: true,
    });

    for (const item of counts) {
      if (item.type === 'file') {
        fileCountMap.set(item.projectId, item._count);
      } else if (item.type === 'folder') {
        folderCountMap.set(item.projectId, item._count);
      }
    }
  }

  // Format owned projects output
  const owned = ownedProjects.map((p) => ({
    id: p.id,
    name: p.name,
    fileCount: fileCountMap.get(p.id) || 0,
    folderCount: folderCountMap.get(p.id) || 0,
    collaboratorCount: p._count.members,
    updatedAt: p.updatedAt,
  }));

  // 3. Fetch shared projects (project_members JOIN projects JOIN users)
  const sharedMemberships = await prisma.projectMember.findMany({
    where: {
      userId,
      ...(search && { project: { nameLower: { contains: search.toLowerCase() } } }),
    },
    orderBy: { project: { updatedAt: 'desc' } },
    select: {
      role: true,
      project: {
        select: {
          id: true,
          name: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Format shared projects output
  const shared = sharedMemberships.map((m) => ({
    id: m.project.id,
    name: m.project.name,
    role: m.role,
    owner: m.project.owner,
    updatedAt: m.project.updatedAt,
  }));

  return { owned, shared };
}

/**
 * Fetches project metadata and owner for project view (Blueprint Section 7.4 - Endpoint #13)
 */
export async function getProjectDetails(projectId) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });
}

/**
 * Renames project and updates name_lower (Blueprint Section 7.4 - Endpoint #14)
 */
export async function renameProject(projectId, name) {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      nameLower: name.toLowerCase(),
    },
    select: {
      id: true,
      name: true,
    },
  });
}

/**
 * Deletes project with CASCADE to all child relations (Blueprint Section 5.7 & 7.4 - Endpoint #15)
 */
export async function deleteProject(projectId) {
  return prisma.project.delete({
    where: { id: projectId },
  });
}

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
