import type { FileNode, SupportedLanguage } from '../types/devsync';

export interface LanguageMeta {
  id: SupportedLanguage;
  label: string;
  shortTag: string;
  extension: string;
  runtime: string;
  color: string;
  starterCode: (fileName: string) => string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    id: 'javascript',
    label: 'JavaScript',
    shortTag: 'JS',
    extension: '.js',
    runtime: 'Node.js v22.14',
    color: '#FBBF24',
    starterCode: (name) =>
      `// ${name}\nfunction greet(target) {\n  return \`Hello from \${target}\`;\n}\n\nconsole.log(greet("DevSync"));\n`,
  },
  {
    id: 'python',
    label: 'Python',
    shortTag: 'PY',
    extension: '.py',
    runtime: 'Python 3.12.4',
    color: '#60A5FA',
    starterCode: (name) =>
      `# ${name}\ndef solve(values):\n    return sum(values)\n\nresult = solve([10, 20, 30])\nprint(f"Computed total: {result}")\n`,
  },
  {
    id: 'cpp',
    label: 'C++',
    shortTag: 'C++',
    extension: '.cpp',
    runtime: 'g++ 13.2 (C++20)',
    color: '#A78BFA',
    starterCode: (name) =>
      `// ${name}\n#include <iostream>\n#include <vector>\n\nint main() {\n  std::vector<int> nums = {2, 4, 8, 16};\n  std::cout << "Vector size: " << nums.size() << std::endl;\n  return 0;\n}\n`,
  },
  {
    id: 'java',
    label: 'Java',
    shortTag: 'JAVA',
    extension: '.java',
    runtime: 'OpenJDK 21 LTS',
    color: '#F87171',
    starterCode: (name) => {
      const className = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '') || 'Main';
      return `// ${name}\npublic class ${className} {\n  public static void main(String[] args) {\n    System.out.println("DevSync Java runtime ready");\n  }\n}\n`;
    },
  },
  {
    id: 'html',
    label: 'HTML',
    shortTag: 'HTML',
    extension: '.html',
    runtime: 'DOM Renderer v5',
    color: '#FB923C',
    starterCode: (name) =>
      `<!-- ${name} -->\n<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>DevSync Preview</title>\n  </head>\n  <body>\n    <main>\n      <h1>DevSync Workspace</h1>\n    </main>\n  </body>\n</html>\n`,
  },
  {
    id: 'css',
    label: 'CSS',
    shortTag: 'CSS',
    extension: '.css',
    runtime: 'CSS3 Engine',
    color: '#34D399',
    starterCode: (name) =>
      `/* ${name} */\n:root {\n  --surface: #0b0b0f;\n  --accent: #5e5ce6;\n}\n\n.container {\n  display: grid;\n  gap: 16px;\n  color: #f4f4f6;\n}\n`,
  },
];

export function getLanguageMeta(lang?: SupportedLanguage): LanguageMeta {
  return (
    SUPPORTED_LANGUAGES.find((item) => item.id === lang) ?? SUPPORTED_LANGUAGES[0]
  );
}

/**
 * Automatically derives the list of distinct programming languages present
 * across all files inside a language-independent project.
 */
export function deriveProjectLanguages(nodes: FileNode[]): SupportedLanguage[] {
  const seen = new Set<SupportedLanguage>();
  for (const node of nodes) {
    if (node.type === 'file' && node.language) {
      seen.add(node.language);
    }
  }
  return Array.from(seen);
}

export function countProjectFiles(nodes: FileNode[]): number {
  return nodes.filter((n) => n.type === 'file').length;
}

export function getNodeBreadcrumb(nodes: FileNode[], nodeId: string): FileNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const chain: FileNode[] = [];
  let current = byId.get(nodeId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export function getNodePath(nodes: FileNode[], nodeId: string): string {
  return getNodeBreadcrumb(nodes, nodeId)
    .map((n) => n.name)
    .join('/');
}

export function getSortedChildren(
  nodes: FileNode[],
  parentId: string | null
): FileNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

export function isDescendantOf(
  nodes: FileNode[],
  candidateId: string,
  ancestorId: string
): boolean {
  if (candidateId === ancestorId) return true;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current = byId.get(candidateId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return false;
}

export function createFolderNode(
  nodes: FileNode[],
  name: string,
  parentId: string | null,
  id: string
): { nodes: FileNode[]; created: FileNode; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      nodes,
      created: { id, name: '', type: 'folder', parentId, updatedAt: new Date().toISOString() },
      error: 'Folder name is required.',
    };
  }
  if (/[/\\]/.test(trimmed)) {
    return {
      nodes,
      created: { id, name: trimmed, type: 'folder', parentId, updatedAt: new Date().toISOString() },
      error: 'Folder name cannot contain slashes.',
    };
  }
  const duplicate = nodes.some(
    (n) => n.parentId === parentId && n.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return {
      nodes,
      created: { id, name: trimmed, type: 'folder', parentId, updatedAt: new Date().toISOString() },
      error: `An item named "${trimmed}" already exists in this folder.`,
    };
  }
  const created: FileNode = {
    id,
    name: trimmed,
    type: 'folder',
    parentId,
    updatedAt: new Date().toISOString(),
  };
  return { nodes: [...nodes, created], created };
}

export function createFileNode(
  nodes: FileNode[],
  name: string,
  language: SupportedLanguage,
  parentId: string | null,
  id: string
): { nodes: FileNode[]; created: FileNode; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      nodes,
      created: {
        id,
        name: '',
        type: 'file',
        parentId,
        language,
        content: '',
        updatedAt: new Date().toISOString(),
      },
      error: 'File name is required.',
    };
  }
  if (/[/\\]/.test(trimmed)) {
    return {
      nodes,
      created: {
        id,
        name: trimmed,
        type: 'file',
        parentId,
        language,
        content: '',
        updatedAt: new Date().toISOString(),
      },
      error: 'File name cannot contain slashes.',
    };
  }
  const meta = getLanguageMeta(language);
  const finalName = trimmed.includes('.') ? trimmed : `${trimmed}${meta.extension}`;
  const duplicate = nodes.some(
    (n) => n.parentId === parentId && n.name.toLowerCase() === finalName.toLowerCase()
  );
  if (duplicate) {
    return {
      nodes,
      created: {
        id,
        name: finalName,
        type: 'file',
        parentId,
        language,
        content: '',
        updatedAt: new Date().toISOString(),
      },
      error: `A file named "${finalName}" already exists here.`,
    };
  }
  const created: FileNode = {
    id,
    name: finalName,
    type: 'file',
    parentId,
    language,
    content: meta.starterCode(finalName),
    updatedAt: new Date().toISOString(),
  };
  return { nodes: [...nodes, created], created };
}

export function renameFileNode(
  nodes: FileNode[],
  nodeId: string,
  nextName: string
): { nodes: FileNode[]; error?: string } {
  const trimmed = nextName.trim();
  if (!trimmed) return { nodes, error: 'Name cannot be empty.' };
  if (/[/\\]/.test(trimmed)) return { nodes, error: 'Name cannot contain slashes.' };
  const target = nodes.find((n) => n.id === nodeId);
  if (!target) return { nodes, error: 'Item not found.' };
  const duplicate = nodes.some(
    (n) =>
      n.id !== nodeId &&
      n.parentId === target.parentId &&
      n.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { nodes, error: `"${trimmed}" already exists in this location.` };
  }
  const now = new Date().toISOString();
  return {
    nodes: nodes.map((n) =>
      n.id === nodeId ? { ...n, name: trimmed, updatedAt: now } : n
    ),
  };
}

export function moveFileNode(
  nodes: FileNode[],
  nodeId: string,
  targetParentId: string | null
): { nodes: FileNode[]; error?: string } {
  const target = nodes.find((n) => n.id === nodeId);
  if (!target) return { nodes, error: 'Item not found.' };
  if (target.parentId === targetParentId) return { nodes };

  if (targetParentId !== null) {
    const destFolder = nodes.find((n) => n.id === targetParentId && n.type === 'folder');
    if (!destFolder) {
      return { nodes, error: 'Destination folder not found.' };
    }
    if (target.type === 'folder' && isDescendantOf(nodes, targetParentId, nodeId)) {
      return { nodes, error: 'Cannot move a folder inside itself or its subfolder.' };
    }
  }

  const duplicate = nodes.some(
    (n) =>
      n.id !== nodeId &&
      n.parentId === targetParentId &&
      n.name.toLowerCase() === target.name.toLowerCase()
  );
  if (duplicate) {
    return {
      nodes,
      error: `"${target.name}" already exists in the destination folder.`,
    };
  }

  const now = new Date().toISOString();
  return {
    nodes: nodes.map((n) =>
      n.id === nodeId ? { ...n, parentId: targetParentId, updatedAt: now } : n
    ),
  };
}

export function deleteFileNode(
  nodes: FileNode[],
  nodeId: string
): { nodes: FileNode[]; removedIds: string[] } {
  const toRemove = new Set<string>([nodeId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const node of nodes) {
      if (node.parentId && toRemove.has(node.parentId) && !toRemove.has(node.id)) {
        toRemove.add(node.id);
        expanded = true;
      }
    }
  }
  return {
    nodes: nodes.filter((n) => !toRemove.has(n.id)),
    removedIds: Array.from(toRemove),
  };
}
