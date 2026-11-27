import prisma from '../db/prisma.js';

// Safe user fields for collaborators
const USER_COLLABORATOR_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarColor: true,
};

/**
 * Lists owner and all collaborators of a project (Blueprint Section 7.4 - Endpoint #25)
 */
export async function listProjectCollaborators(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      owner: {
        select: USER_COLLABORATOR_SELECT,
      },
      members: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: USER_COLLABORATOR_SELECT,
          },
        },
      },
    },
  });

  if (!project) return null;

  const collaborators = project.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatarColor: m.user.avatarColor,
    role: m.role,
    joinedAt: m.createdAt,
  }));

  return {
    owner: project.owner,
    collaborators,
  };
}

/**
 * Counts total collaborators in a project (used for 20-collaborator limit)
 */
export async function countProjectCollaborators(projectId) {
  return prisma.projectMember.count({
    where: { projectId },
  });
}

/**
 * Finds collaborator membership by projectId and userId
 */
export async function findProjectMember(projectId, userId) {
  return prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    include: {
      user: {
        select: USER_COLLABORATOR_SELECT,
      },
    },
  });
}

/**
 * Adds a collaborator to a project (Blueprint Section 7.4 - Endpoint #26)
 */
export async function addCollaborator({ projectId, userId, role, invitedById }) {
  const member = await prisma.projectMember.create({
    data: {
      projectId,
      userId,
      role,
      invitedById,
    },
    include: {
      user: {
        select: USER_COLLABORATOR_SELECT,
      },
    },
  });

  return {
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    avatarColor: member.user.avatarColor,
    role: member.role,
    joinedAt: member.createdAt,
  };
}

/**
 * Updates a collaborator's access level (Blueprint Section 7.4 - Endpoint #27)
 */
export async function updateCollaboratorRole(projectId, userId, role) {
  const updated = await prisma.projectMember.update({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    data: { role },
    include: {
      user: {
        select: USER_COLLABORATOR_SELECT,
      },
    },
  });

  return {
    userId: updated.user.id,
    name: updated.user.name,
    email: updated.user.email,
    avatarColor: updated.user.avatarColor,
    role: updated.role,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Removes a collaborator from a project (Blueprint Section 7.4 - Endpoint #28)
 */
export async function removeCollaborator(projectId, userId) {
  return prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });
}
