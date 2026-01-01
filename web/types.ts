
export type Language = 'English' | 'Vietnamese' | 'French' | 'German' | 'Japanese' | 'Korean' | 'Chinese';
export type Theme = 'light' | 'dark' | 'auto';
export type ViewType = 'chat' | 'dashboard';
export type ResearchMode = 'new' | 'library';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  category: string;
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
  summary?: string;
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
