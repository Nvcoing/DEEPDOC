
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Document, ChatSession, Message, Language, Theme, ViewType, ResearchMode, NewsArticle } from './types';
import { TRANSLATIONS } from './constants';
import { generateDocumentAnswer, fetchTrendingNews } from './geminiService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ChatView from './components/ChatView';
import SidebarFocused from './components/SidebarFocused';
import PreviewModal from './components/PreviewModal';

const MOCK_USER: User = { id: 'u1', name: 'User', email: 'user@documind.ai' };

const App: React.FC = () => {
  const [user] = useState<User | null>(MOCK_USER);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('documind-theme') as Theme) || 'auto');
  const [language, setLanguage] = useState<Language>('Vietnamese');
  const [view, setView] = useState<ViewType>('dashboard');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [trendingNews, setTrendingNews] = useState<NewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [researchMode, setResearchMode] = useState<ResearchMode>('library');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = useMemo(() => TRANSLATIONS[language] || TRANSLATIONS.English, [language]);
  const langCodes = useMemo(() => Object.keys(TRANSLATIONS).map(l => ({ lang: l, code: TRANSLATIONS[l as Language].langCode })), []);
  const activeSession = useMemo(() => chatSessions.find(s => s.id === activeSessionId), [chatSessions, activeSessionId]);

  useEffect(() => {
    const root = document.documentElement;
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'auto' && darkQuery.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    applyTheme();
    localStorage.setItem('documind-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (view === 'dashboard' && trendingNews.length === 0) loadNews();
  }, [view, language]);

  const loadNews = async () => {
    setIsNewsLoading(true);
    try {
      const news = await fetchTrendingNews(language);
      setTrendingNews(news);
    } finally {
      setIsNewsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, forCurrentSession = false) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const type = file.name.split('.').pop()?.toLowerCase() as any;
      const docId = `d-${Date.now()}-${Math.random()}`;
      reader.onload = (ev) => {
        const newDoc: Document = {
          id: docId, userId: user?.id || '', name: file.name, type: type || 'txt', uploadDate: new Date().toLocaleDateString(),
          size: file.size, fileData: ev.target?.result as string, content: `Content of ${file.name}`, summary: "Tài liệu được nạp."
        };
        setDocuments(prev => [...prev, newDoc]);
        if (forCurrentSession) {
          setSelectedDocIds(prev => [...prev, docId]);
          setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, selectedDocIds: [...s.selectedDocIds, docId] } : s));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const createNewSession = (title: string, selectedIds: string[] = []) => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId, userId: user?.id || '', title, messages: [], selectedDocIds: selectedIds,
      lastUpdated: new Date().toISOString(), mode: selectedIds.length > 0 ? 'new' : 'library'
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setSelectedDocIds(selectedIds);
    setResearchMode(newSession.mode);
    setView('chat');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading || !activeSession) return;
    const msg: Message = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: new Date().toISOString() };
    setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, msg], lastUpdated: new Date().toISOString() } : s));
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);
    try {
      const ctxDocs = researchMode === 'new' ? documents.filter(d => selectedDocIds.includes(d.id)) : documents;
      const res = await generateDocumentAnswer(currentInput, ctxDocs, activeSession.messages, language);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: res || "...", timestamp: new Date().toISOString() };
      setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      <Header t={t} view={view} setView={setView} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} langCodes={langCodes} />
      <main className="flex-1 relative overflow-hidden">
        {view === 'dashboard' ? (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <Dashboard t={t} chatSessions={chatSessions} trendingNews={trendingNews} documents={documents} isNewsLoading={isNewsLoading}
              onCreateSession={() => createNewSession(t.startNew)} onOpenSession={(id) => { const s = chatSessions.find(x => x.id === id); if(s) { setActiveSessionId(id); setView('chat'); setResearchMode(s.mode); setSelectedDocIds(s.selectedDocIds); } }}
              onNewsAction={(n) => createNewSession(n.title)} onFileAction={(d) => createNewSession(`${t.research}: ${d.name}`, [d.id])}
              onFileUpload={(e) => handleFileUpload(e, false)} onPreview={setPreviewDoc} />
          </div>
        ) : activeSession && (
          <div className="h-full flex flex-row relative">
            {researchMode === 'new' && <SidebarFocused t={t} selectedDocIds={selectedDocIds} documents={documents} onUpload={() => fileInputRef.current?.click()} onRemove={(id) => setSelectedDocIds(prev => prev.filter(x => x !== id))} />}
            <ChatView t={t} activeSession={activeSession} researchMode={researchMode} setResearchMode={(m) => { setResearchMode(m); setChatSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, mode: m} : s)); }} 
              onBack={() => setView('dashboard')} onFileUpload={(e) => handleFileUpload(e, researchMode === 'new')} onSendMessage={handleSendMessage}
              inputValue={inputValue} setInputValue={setInputValue} isLoading={isLoading} fileInputRef={fileInputRef} />
          </div>
        )}
        {previewDoc && <PreviewModal t={t} doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </main>
    </div>
  );
};

export default App;
