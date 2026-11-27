import prisma from '../db/prisma.js';

/**
 * Node repository implementing Blueprint Section 5.5, 5.7 & 7.5
 */

// Explorer query select shape (Blueprint Section 5.7 & Page 14)
// Never includes content or yjsState to keep tree payload small and fast
const TREE_SELECT = {
  id: true,
  parentId: true,
  type: true,
  name: true,
  language: true,
  size: true,
  updatedAt: true,
};

/**
 * Fetches flat node list for explorer (Endpoint #16)
 */
export async function getProjectTree(projectId) {
  return prisma.fileNode.findMany({
    where: { projectId },
    select: TREE_SELECT,
  });
}

/**
 * Finds a node by ID
 */
export async function findNodeById(id) {
  return prisma.fileNode.findUnique({
    where: { id },
  });
}

/**
 * Checks for duplicate name inside the same parent folder (case-insensitive)
 */
export async function findNodeByName(projectId, parentId, nameLower) {
  return prisma.fileNode.findFirst({
    where: {
      projectId,
      parentId: parentId || null,
      nameLower,
    },
    select: { id: true },
  });
}

/**
 * Counts total nodes (files + folders) in a project
 */
export async function countProjectNodes(projectId) {
  return prisma.fileNode.count({
    where: { projectId },
  });
}

/**
 * Calculates depth of a node from root.
 * Root-level items (parentId = null) have depth 1.
 */
export async function calculateNodeDepth(nodeId) {
  let depth = 0;
  let currentId = nodeId;

  while (currentId) {
    depth += 1;
    if (depth > 20) break; // Safeguard against circular references

    const node = await prisma.fileNode.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    if (!node) break;
    currentId = node.parentId;
  }

  return depth;
}

/**
 * Creates a folder node inside a transaction and touches project updatedAt (Blueprint Section 5.3 & 7.5)
 */
export async function createFolder({ projectId, parentId, name, createdById }) {
  return prisma.$transaction(async (tx) => {
    // Create folder
    const folder = await tx.fileNode.create({
      data: {
        projectId,
        parentId: parentId || null,
        type: 'folder',
        name,
        nameLower: name.toLowerCase(),
        content: '',
        size: 0,
        createdById,
        lastModifiedById: createdById,
      },
      select: {
        id: true,
        parentId: true,
        type: true,
        name: true,
      },
    });

    // Touch project updatedAt
    await tx.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return folder;
  });
}
