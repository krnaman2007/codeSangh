export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorPayload;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
  preferences?: Record<string, unknown> | null;
}

export interface LanguageRegistryEntry {
  key: string;
  label: string;
  ext: string;
  monaco: string;
  judge0Id: number | null;
  mode: 'run' | 'preview' | 'none';
  debug: boolean;
  debugAdapter: string | null;
  envRuntime: string | null;
}

export interface OwnedProjectSummary {
  id: string;
  name: string;
  fileCount: number;
  folderCount: number;
  collaboratorCount: number;
  updatedAt: string;
}

export interface SharedProjectSummary {
  id: string;
  name: string;
  role: 'editor' | 'viewer';
  owner: {
    id: string;
    name: string;
  };
  updatedAt: string;
}

export interface DashboardProjectsResponse {
  owned: OwnedProjectSummary[];
  shared: SharedProjectSummary[];
}

export interface ProjectDetailsResponse {
  project: {
    id: string;
    name: string;
  };
  myRole: 'owner' | 'editor' | 'viewer';
  owner: {
    id: string;
    name: string;
  };
  collaboratorCount: number;
  settings: {
    aiEnabled: boolean;
  };
}

export interface ApiTreeNode {
  id: string;
  parentId: string | null;
  type: 'file' | 'folder';
  name: string;
  language?: string | null;
  size?: number;
  updatedAt?: string;
}

export interface ApiFileDetail {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  size: number;
  updatedAt: string;
}

export interface ApiCollaborator {
  userId: string;
  name: string;
  email: string;
  avatarColor?: string;
  role: 'editor' | 'viewer';
  joinedAt?: string;
  updatedAt?: string;
}

export interface ApiExecutionRecord {
  id: string;
  projectId: string;
  fileId: string | null;
  userId: string;
  language: string;
  status: string;
  stdout?: string | null;
  stderr?: string | null;
  compileOutput?: string | null;
  time?: string | number | null;
  memory?: number | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    avatarColor?: string;
  };
  file?: {
    id: string;
    name: string;
  } | null;
}
