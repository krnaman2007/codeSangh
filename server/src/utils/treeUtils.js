/**
 * Tree Utility Functions (Blueprint Section 5.7 & Page 7)
 */

/**
 * Computes absolute path of a node in the project tree
 * e.g. "/src/helper.py" or "/helper.py" if at root
 */
export async function computeNodePath(node, getParentFn) {
  const parts = [node.name];
  let currentParentId = node.parentId;
  let safetyCounter = 0;

  while (currentParentId && safetyCounter < 20) {
    safetyCounter += 1;
    const parent = await getParentFn(currentParentId);
    if (!parent) break;
    parts.unshift(parent.name);
    currentParentId = parent.parentId;
  }

  return '/' + parts.join('/');
}

/**
 * Checks if targetId is inside ancestorId's subtree
 * Prevents moving a folder into itself or its own descendants (INVALID_MOVE)
 */
export async function isDescendant(targetId, ancestorId, getParentFn) {
  if (targetId === ancestorId) return true;

  let currentId = targetId;
  let safetyCounter = 0;

  while (currentId && safetyCounter < 20) {
    safetyCounter += 1;
    const current = await getParentFn(currentId);
    if (!current || !current.parentId) return false;

    if (current.parentId === ancestorId) {
      return true;
    }
    currentId = current.parentId;
  }

  return false;
}
