
export type Language = 'English' | 'Vietnamese' | 'French' | 'German' | 'Japanese' | 'Korean' | 'Chinese';
export type Theme = 'light' | 'dark' | 'auto';
export type ViewType = 'chat' | 'dashboard' | 'folders' | 'admin-panel' | 'history' | 'profile';
export type ResearchMode = 'new' | 'library';
export type UserRole = 'admin' | 'user';
export type DocStatus = 'pending' | 'approved' | 'rejected' | 'uploading';

export interface ActivityLog {
  id: string;
  type: 'upload' | 'folder_creation';
  name: string;
  timestamp: string;
  details?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  departmentId?: string;
  allowedDocIds?: string[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  departmentId?: string;
  status: DocStatus;
  userId: string;
  isSystem?: boolean;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx' | 'txt' | 'doc' | 'xlsx';
  uploadDate: string;
  size: number;
  content: string; 
  status: DocStatus;
  isDeleted?: boolean;
  fileData?: string;
  folderId?: string;
  departmentId?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  selectedDocIds: string[];
  selectedFolderIds: string[];
  lastUpdated: string;
  mode: ResearchMode;
}

export interface NewsArticle {
  title: string;
  summary: string;
  url?: string;
  category: string;
}
