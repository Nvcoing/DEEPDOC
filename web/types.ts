
export type Language = 'English' | 'Vietnamese' | 'French' | 'German' | 'Japanese' | 'Korean' | 'Chinese';
export type Theme = 'light' | 'dark' | 'auto';
export type ViewType = 'chat' | 'dashboard' | 'folders' | 'trash' | 'admin-panel' | 'history';
export type ResearchMode = 'new' | 'library';
export type UserRole = 'admin' | 'user';
export type DocStatus = 'pending' | 'approved' | 'rejected';

export interface ActivityLog {
  id: string;
  type: 'upload' | 'folder_creation';
  name: string;
  timestamp: string;
  details?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  allowedDocIds?: string[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  departmentId?: string;
  status: DocStatus;
  userId: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx' | 'txt' | 'doc';
  uploadDate: string;
  size: number;
  content: string; 
  status: DocStatus;
  isDeleted?: boolean;
  fileData?: string;
  folderId?: string; // ID của thư mục chứa file
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
  lastUpdated: string;
  mode: ResearchMode;
}

export interface NewsArticle {
  title: string;
  summary: string;
  url?: string;
  category: string;
}
