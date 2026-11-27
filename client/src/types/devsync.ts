export type SupportedLanguage =
  | 'javascript'
  | 'python'
  | 'cpp'
  | 'java'
  | 'html'
  | 'css'
  | 'text';

export type Role = 'owner' | 'editor' | 'viewer';

export type CollaboratorAccess = 'view' | 'edit';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  initials: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: 'owner' | CollaboratorAccess;
  online: boolean;
  cursorColor: string;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  language?: SupportedLanguage;
  content?: string;
  updatedAt: string;
}

export interface ExecutionRecord {
  id: string;
  projectId: string;
  fileId: string;
  fileName: string;
  language: SupportedLanguage;
  runtime: string;
  status: 'success' | 'error';
  stdout: string;
  stderr: string;
  durationMs: number;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  currentUserRole: Role;
  updatedAt: string;
  lastOpenedAt: string;
  nodes: FileNode[];
  collaborators: Collaborator[];
  executions: ExecutionRecord[];
}

export type AppView = 'landing' | 'auth' | 'dashboard' | 'workspace';

export type DashboardFilter = 'all' | 'owned' | 'shared' | 'recent';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'info' | 'success' | 'error';
}
