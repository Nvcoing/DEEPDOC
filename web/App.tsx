
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Document, ChatSession, Message, Language, Theme, ViewType, ResearchMode, NewsArticle } from './types';
import { TRANSLATIONS } from './constants';
import { fetchTrendingNews, uploadFilesToBackend, generateAnswerFromBackend } from './apiService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ChatView from './components/ChatView';
import SidebarFocused from './components/SidebarFocused';
import PreviewModal from './components/PreviewModal';
// Added missing FolderTree import
import { FolderTree } from 'lucide-react';

const MOCK_USER: User = { id: 'u1', name: 'Admin', email: 'admin@documind.ai', department: 'IT' };

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
    if (theme === 'dark' || (theme === 'auto' && darkQuery.matches)) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('documind-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (view === 'dashboard' && trendingNews.length === 0) {
      setIsNewsLoading(true);
      fetchTrendingNews(language).then(news => setTrendingNews(news)).finally(() => setIsNewsLoading(false));
    }
  }, [view, language]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, forCurrentSession = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsLoading(true);
    try {
      await uploadFilesToBackend(Array.from(files));
      Array.from(files).forEach(file => {
        const type = file.name.split('.').pop()?.toLowerCase() as any;
        const newDoc: Document = {
          id: `d-${Date.now()}-${Math.random()}`, userId: user?.id || '', name: file.name, type: type || 'txt', 
          uploadDate: new Date().toLocaleDateString(), size: file.size, content: "File content", isDeleted: false
        };
        setDocuments(prev => [...prev, newDoc]);
      });
    } catch (err) {
      alert("Lỗi upload server.");
    } finally {
      setIsLoading(false);
    }
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
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: new Date().toISOString() };
    const aiMsgId = (Date.now() + 1).toString();
    setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg, { id: aiMsgId, role: 'assistant', content: "", timestamp: "" }] } : s));
    setInputValue('');
    setIsLoading(true);
    try {
      const fileNames = documents.filter(d => (researchMode === 'new' ? selectedDocIds : documents.map(x=>x.id)).includes(d.id)).map(d => d.name);
      let fullText = "";
      for await (const chunk of generateAnswerFromBackend(userMsg.content, fileNames, language)) {
        fullText += chunk;
        setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: s.messages.map(m => m.id === aiMsgId ? { ...m, content: fullText } : m) } : s));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      <Header t={t} view={view} setView={setView} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} langCodes={langCodes} />
      <main className="flex-1 relative overflow-hidden">
        {view === 'dashboard' || view === 'trash' ? (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <Dashboard 
              t={t} chatSessions={chatSessions} trendingNews={trendingNews} documents={documents} isNewsLoading={isNewsLoading}
              onCreateSession={() => createNewSession(t.startNew || "New Research")} onOpenSession={(id) => { setActiveSessionId(id); setView('chat'); }}
              onNewsAction={(n) => createNewSession(n.title)} onFileAction={(d) => createNewSession(d.name, [d.id])}
              onFileUpload={(e) => handleFileUpload(e, false)} onPreview={setPreviewDoc} viewMode={view === 'trash' ? 'trash' : 'all'}
            />
          </div>
        ) : view === 'folders' ? (
          <div className="h-full flex flex-col items-center justify-center p-10 space-y-4">
             <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl flex items-center justify-center"><FolderTree className="w-10 h-10 text-indigo-500" /></div>
             <h2 className="text-2xl font-black">{t.folderMgmt}</h2>
             <p className="text-slate-500 max-w-md text-center">Chức năng quản lý cây thư mục và phân quyền theo phòng ban ({user?.department}) đang được đồng bộ.</p>
             <button onClick={() => setView('dashboard')} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">{t.home}</button>
          </div>
        ) : activeSession && (
          <div className="h-full flex flex-row relative">
            {researchMode === 'new' && <SidebarFocused t={t} selectedDocIds={selectedDocIds} documents={documents} onUpload={() => fileInputRef.current?.click()} onRemove={(id) => setSelectedDocIds(prev => prev.filter(x => x !== id))} />}
            <ChatView t={t} activeSession={activeSession} researchMode={researchMode} setResearchMode={(m) => { setResearchMode(m); }} onBack={() => setView('dashboard')} onFileUpload={(e) => handleFileUpload(e, true)} onSendMessage={handleSendMessage} inputValue={inputValue} setInputValue={setInputValue} isLoading={isLoading} fileInputRef={fileInputRef} />
          </div>
        )}
        {previewDoc && <PreviewModal t={t} doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </main>
    </div>
  );
};

export default App;
