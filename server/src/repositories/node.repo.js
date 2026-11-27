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
 * Calculates height of a subtree rooted at nodeId
 */
export async function calculateSubtreeHeight(nodeId) {
  let maxHeight = 1;

  async function traverse(currentId, currentHeight) {
    if (currentHeight > maxHeight) maxHeight = currentHeight;
    const children = await prisma.fileNode.findMany({
      where: { parentId: currentId },
      select: { id: true, type: true },
    });
    for (const child of children) {
      if (child.type === 'folder') {
        await traverse(child.id, currentHeight + 1);
      }
    }
  }

  await traverse(nodeId, 1);
  return maxHeight;
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

/**
 * Creates a file node inside a transaction and touches project updatedAt (Endpoint #18)
 */
export async function createFile({ projectId, parentId, name, language, content = '', createdById }) {
  const size = Buffer.byteLength(content, 'utf8');

  return prisma.$transaction(async (tx) => {
    const file = await tx.fileNode.create({
      data: {
        projectId,
        parentId: parentId || null,
        type: 'file',
        name,
        nameLower: name.toLowerCase(),
        language,
        content,
        size,
        createdById,
        lastModifiedById: createdById,
      },
      select: {
        id: true,
        parentId: true,
        type: true,
        name: true,
        language: true,
        size: true,
      },
    });

    await tx.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return file;
  });
}

/**
 * Updates file content (Endpoint #20)
 */
export async function updateFileContent(fileId, projectId, content, modifiedById) {
  const size = Buffer.byteLength(content, 'utf8');

  return prisma.$transaction(async (tx) => {
    const file = await tx.fileNode.update({
      where: { id: fileId },
      data: {
        content,
        size,
        lastModifiedById: modifiedById,
      },
      select: {
        id: true,
        size: true,
        updatedAt: true,
      },
    });

    await tx.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return file;
  });
}

/**
 * Renames a node (Endpoint #21)
 */
export async function renameNode(nodeId, projectId, name) {
  return prisma.$transaction(async (tx) => {
    const node = await tx.fileNode.update({
      where: { id: nodeId },
      data: {
        name,
        nameLower: name.toLowerCase(),
      },
      select: {
        id: true,
        name: true,
      },
    });

    await tx.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return node;
  });
}

/**
 * Moves a node to a new parent folder (Endpoint #22)
 */
export async function moveNode(nodeId, projectId, parentId) {
  return prisma.$transaction(async (tx) => {
    const node = await tx.fileNode.update({
      where: { id: nodeId },
      data: {
        parentId: parentId || null,
      },
      select: {
        id: true,
        parentId: true,
      },
    });

    await tx.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return node;
  });
}

/**
 * Changes language of a file (Endpoint #23)
 */
export async function changeFileLanguage(fileId, projectId, language) {
  return prisma.$transaction(async (tx) => {
    const node = await tx.fileNode.update({
      where: { id: fileId },
      data: { language },
      select: {
        id: true,
        language: true,
      },
    });

    await tx.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    return node;
  });
}

/**
 * Recursively deletes a node and all its descendants (Endpoint #24)
 * Returns array of deleted IDs
 */
export async function deleteNodeWithDescendants(nodeId, projectId) {
  // Collect node and all its descendants
  const deletedIds = [nodeId];

  async function collectDescendantIds(currentId) {
    const children = await prisma.fileNode.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });
    for (const child of children) {
      deletedIds.push(child.id);
      await collectDescendantIds(child.id);
    }
  }

  await collectDescendantIds(nodeId);

  await prisma.$transaction(async (tx) => {
    // Delete root node (foreign key ON DELETE CASCADE deletes children in Postgres)
    await tx.fileNode.delete({
      where: { id: nodeId },
    });

    await tx.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });
  });

  return deletedIds;
}

/**
 * Gets breakpoints of a file (Endpoint #36)
 */
export async function getFileBreakpoints(fileId, projectId) {
  const file = await prisma.fileNode.findFirst({
    where: {
      id: fileId,
      projectId,
      type: 'file',
    },
    select: {
      id: true,
      language: true,
      breakpoints: true,
    },
  });

  if (!file) return null;
  return file.breakpoints || [];
}

/**
 * Replaces breakpoints of a file (Endpoint #37)
 */
export async function updateFileBreakpoints(fileId, projectId, breakpoints) {
  return prisma.fileNode.update({
    where: { id: fileId },
    data: {
      breakpoints,
    },
    select: {
      id: true,
      breakpoints: true,
    },
  });
}

