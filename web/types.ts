
export type Language = 'English' | 'Vietnamese' | 'French' | 'German' | 'Japanese' | 'Korean' | 'Chinese';
export type Theme = 'light' | 'dark' | 'auto';
export type ViewType = 'chat' | 'dashboard' | 'folders' | 'trash';
export type ResearchMode = 'new' | 'library';

export interface User {
  id: string;
  name: string;
  email: string;
  department?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  departmentId?: string;
  permissions?: string[]; // ['read', 'write', 'admin']
}

export interface DocumentVersion {
  version: number;
  date: string;
  author: string;
  filePath: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx' | 'txt' | 'doc';
  uploadDate: string;
  size: number;
  content: string; 
  fileData?: string; 
  folderId?: string;
  isDeleted?: boolean;
  versionHistory?: DocumentVersion[];
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

// Added missing NewsArticle interface
export interface NewsArticle {
  title: string;
  summary: string;
  url?: string;
  category: string;
}
