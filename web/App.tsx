
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Document, ChatSession, Message, Language, Theme, ViewType, ResearchMode, NewsArticle, UserRole, DocStatus, Folder, ActivityLog } from './types';
import { TRANSLATIONS } from './constants';
import { fetchTrendingNews, uploadFilesToBackend, generateAnswerFromBackend } from './apiService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ChatView from './components/ChatView';
import PreviewModal from './components/PreviewModal';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import FoldersView from './components/FoldersView';
import HistoryView from './components/HistoryView';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@documind.ai', role: 'admin', allowedDocIds: [] },
  { id: 'u2', name: 'Nhân viên A', email: 'userA@documind.ai', role: 'user', allowedDocIds: [] }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('documind-theme') as Theme) || 'auto');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('documind-lang') as Language) || 'Vietnamese');
  const [view, setView] = useState<ViewType>('dashboard');
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFolderInChatId, setSelectedFolderInChatId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [trendingNews, setTrendingNews] = useState<NewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [researchMode, setResearchMode] = useState<ResearchMode>('library');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = useMemo(() => TRANSLATIONS[language] || TRANSLATIONS.English, [language]);
  const langCodes = useMemo(() => Object.keys(TRANSLATIONS).map(l => ({ lang: l, code: TRANSLATIONS[l as Language].langCode })), []);
  const activeSession = useMemo(() => chatSessions.find(s => s.id === activeSessionId), [chatSessions, activeSessionId]);

  // Tài liệu thuộc phiên chat hiện tại (những file được upload khi đang trong chat)
  const sessionDocs = useMemo(() => {
    if (!activeSession) return [];
    return documents.filter(doc => activeSession.selectedDocIds.includes(doc.id));
  }, [documents, activeSession]);

  const accessibleDocs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return documents;
    return documents.filter(doc => 
      (doc.userId === currentUser.id) || 
      (currentUser.allowedDocIds?.includes(doc.id) && doc.status === 'approved')
    );
  }, [documents, currentUser]);

  useEffect(() => {
    const root = document.documentElement;
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (t: Theme) => {
        if (t === 'dark' || (t === 'auto' && darkQuery.matches)) root.classList.add('dark');
        else root.classList.remove('dark');
    };
    applyTheme(theme);
    localStorage.setItem('documind-theme', theme);

    const listener = (e: MediaQueryListEvent) => {
        if (theme === 'auto') applyTheme('auto');
    };
    darkQuery.addEventListener('change', listener);
    return () => darkQuery.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('documind-lang', language);
  }, [language]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const addActivity = (type: 'upload' | 'folder_creation', name: string) => {
    const newAct: ActivityLog = { id: `act-${Date.now()}`, type, name, timestamp: new Date().toISOString() };
    setActivities(prev => [...prev, newAct]);
  };

  const handleLogin = (role: UserRole, name: string) => {
    const user = users.find(u => u.role === role) || users[0];
    setCurrentUser({ ...user, name });
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('dashboard');
    setCurrentFolderId(null);
  };

  const handleCreateFolder = (name: string) => {
    if (!currentUser) return;
    const newFolder: Folder = { id: `f-${Date.now()}`, name, parentId: currentFolderId, userId: currentUser.id, status: 'approved' };
    setFolders(prev => [...prev, newFolder]);
    addActivity('folder_creation', name);
    showToast(t.folderSuccess);
  };

  const handleDeleteFolder = (id: string) => {
    if (window.confirm("Xóa thư mục này?")) setFolders(prev => prev.filter(f => f.id !== id));
  };

  const handleChatWithFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const folderApprovedDocs = documents.filter(d => d.folderId === folderId && d.status === 'approved' && !d.isDeleted);
    const approvedIds = folderApprovedDocs.map(d => d.id);
    if (approvedIds.length === 0) {
      alert("Thư mục này chưa có tài liệu nào được duyệt.");
      return;
    }
    setSelectedFolderInChatId(folderId);
    createNewSession(`${folder.name}`, approvedIds);
  };

  const handleSelectFolderForChat = (folderId: string | null) => {
    setSelectedFolderInChatId(folderId);
    if (!activeSession) return;
    if (folderId) {
       const docsInFolder = documents.filter(d => d.folderId === folderId && d.status === 'approved' && !d.isDeleted).map(d => d.id);
       setSelectedDocIds(docsInFolder);
       setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, selectedDocIds: docsInFolder, title: folders.find(f => f.id === folderId)?.name || s.title } : s));
    } else {
       setSelectedDocIds([]);
       setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, selectedDocIds: [], title: t.startNew } : s));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, forCurrentSession = false) => {
    const files = e.target.files;
    if (!files || !currentUser || files.length === 0) return;
    setIsUploading(true);
    try {
      await uploadFilesToBackend(Array.from(files));
      const newDocs: Document[] = [];
      Array.from(files).forEach((file: any) => {
        const type = file.name.split('.').pop()?.toLowerCase() as any;
        const docId = `d-${Date.now()}-${Math.random()}`;
        const newDoc: Document = {
          id: docId, userId: currentUser.id, name: file.name, type: type || 'txt', 
          uploadDate: new Date().toLocaleDateString(), size: file.size, content: "Content", 
          status: currentUser.role === 'admin' ? 'approved' : 'pending', isDeleted: false,
          folderId: view === 'folders' ? (currentFolderId || undefined) : undefined
        };
        newDocs.push(newDoc);
        addActivity('upload', file.name);
      });
      setDocuments(prev => [...prev, ...newDocs]);
      if (forCurrentSession && activeSession) {
        const approvedIds = newDocs.filter(d => d.status === 'approved').map(d => d.id);
        setSelectedDocIds(prev => [...prev, ...approvedIds]);
        setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, selectedDocIds: [...s.selectedDocIds, ...newDocs.map(d => d.id)] } : s));
        setResearchMode('new');
      }
      showToast(t.uploadSuccess);
    } catch (err) {
      showToast("Lỗi tải lên", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleDoc = (id: string) => {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading || !activeSession || !currentUser) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: new Date().toISOString() };
    const aiMsgId = (Date.now() + 1).toString();
    setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg, { id: aiMsgId, role: 'assistant', content: "", timestamp: "" }] } : s));
    setInputValue('');
    setIsLoading(true);
    try {
      // Logic loại trừ:
      // Chế độ Focus: Chỉ những file được chọn trong danh sách sidebar
      // Chế độ Library: Tất cả file thư viện được duyệt, KHÔNG bao gồm các file tải lên riêng trong phiên này (sessionDocs)
      const targetDocIds = researchMode === 'new' 
        ? selectedDocIds 
        : accessibleDocs.filter(d => d.status === 'approved' && !d.isDeleted && !sessionDocs.map(sd => sd.id).includes(d.id)).map(d => d.id);
      
      const fileNames = documents.filter(d => targetDocIds.includes(d.id)).map(d => d.name);
      let fullText = "";
      for await (const chunk of generateAnswerFromBackend(userMsg.content, fileNames, language)) {
        fullText += chunk;
        setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: s.messages.map(m => m.id === aiMsgId ? { ...m, content: fullText } : m) } : s));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return <Login onLogin={handleLogin} t={t} />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      <Header 
        t={t} view={view} setView={setView} 
        language={language} setLanguage={setLanguage} 
        theme={theme} setTheme={setTheme} 
        langCodes={langCodes} userRole={currentUser.role} onLogout={handleLogout} 
      />
      
      <main className="flex-1 relative overflow-hidden">
        {toast && (
          <div className={`fixed top-16 right-4 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 border ${toast.type === 'success' ? 'bg-white dark:bg-slate-900 border-green-500 text-green-600 shadow-green-100' : 'bg-red-50 dark:bg-slate-900 border-red-500 text-red-600 shadow-red-100'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        )}

        {view === 'dashboard' || view === 'trash' ? (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <Dashboard 
              t={t} chatSessions={chatSessions} trendingNews={trendingNews} documents={accessibleDocs} isNewsLoading={isNewsLoading}
              onCreateSession={() => { setSelectedFolderInChatId(null); createNewSession(t.startNew); }} onOpenSession={(id) => { setActiveSessionId(id); setView('chat'); }}
              onNewsAction={(n) => createNewSession(n.title)} onFileAction={(d) => createNewSession(d.name, [d.id])}
              onFileUpload={(e) => handleFileUpload(e, false)} onPreview={setPreviewDoc} onDelete={(id) => setDocuments(prev => prev.map(d => d.id === id ? {...d, isDeleted: !d.isDeleted} : d))}
              viewMode={view === 'trash' ? 'trash' : 'all'}
            />
          </div>
        ) : view === 'history' ? (
          <HistoryView t={t} activities={activities} />
        ) : view === 'admin-panel' && currentUser.role === 'admin' ? (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <AdminPanel t={t} pendingDocs={documents.filter(d => d.status === 'pending')} onApprove={(id, s) => setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: s } : d))} users={users} onAssignPermission={(uid, did) => setUsers(prev => prev.map(u => u.id === uid ? { ...u, allowedDocIds: u.allowedDocIds?.includes(did) ? u.allowedDocIds.filter(x => x !== did) : [...(u.allowedDocIds || []), did] } : u))} allDocs={documents} />
          </div>
        ) : view === 'folders' ? (
          <div className="h-full overflow-y-auto scrollbar-hide">
             <FoldersView t={t} folders={folders} documents={documents} currentFolderId={currentFolderId} onNavigate={setCurrentFolderId} onCreateFolder={handleCreateFolder} onUpload={(e) => handleFileUpload(e, false)} onFilePreview={setPreviewDoc} onDeleteFolder={handleDeleteFolder} onChatWithFolder={handleChatWithFolder} />
          </div>
        ) : activeSession && (
          <ChatView 
            t={t} activeSession={activeSession} researchMode={researchMode} setResearchMode={setResearchMode} onBack={() => setView('dashboard')} 
            onFileUpload={(e) => handleFileUpload(e, true)} onSendMessage={handleSendMessage} inputValue={inputValue} setInputValue={setInputValue} 
            isLoading={isLoading} isUploading={isUploading} fileInputRef={fileInputRef} folders={folders} onSelectFolderForChat={handleSelectFolderForChat} 
            currentSelectedFolderId={selectedFolderInChatId} sessionDocs={sessionDocs} selectedDocIds={selectedDocIds} onToggleDoc={handleToggleDoc}
          />
        )}
        {previewDoc && <PreviewModal t={t} doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </main>
    </div>
  );

  function createNewSession(title: string, selectedIds: string[] = []) {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId, userId: currentUser?.id || '', title, messages: [], selectedDocIds: selectedIds,
      lastUpdated: new Date().toISOString(), mode: selectedIds.length > 0 ? 'new' : 'library'
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setSelectedDocIds(selectedIds);
    setResearchMode(newSession.mode);
    setView('chat');
  }
};

export default App;
