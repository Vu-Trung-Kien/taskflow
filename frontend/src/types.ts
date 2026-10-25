export type ProjectRole = 'OWNER' | 'MEMBER' | 'VIEWER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[] | Array<{ role: ProjectRole }>;
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: User | null;
  subTasks?: Task[];
}

export interface Comment {
  id: string;
  projectId: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: User;
}

export interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string | null;
  createdAt: string;
  uploadedBy: User;
}

export interface SessionPayload {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

export interface AttachmentUploadPayload {
  attachment: Pick<Attachment, 'id' | 'fileName' | 'contentType' | 'sizeBytes' | 'uploadedAt' | 'createdAt'>;
  uploadUrl: string;
  expiresInSeconds: number;
}
