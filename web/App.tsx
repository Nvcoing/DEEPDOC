
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Document, ChatSession, Message, Language, Theme, ViewType, ResearchMode, NewsArticle, UserRole, DocStatus, Folder, ActivityLog, Department } from './types';
import { TRANSLATIONS } from './constants';
import { fetchTrendingNews, uploadFilesToBackend, generateAnswerFromBackend } from './geminiService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ChatView from './components/ChatView';
import PreviewModal from './components/PreviewModal';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import FoldersView from './components/FoldersView';
import HistoryView from './components/HistoryView';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Admin', email: 'admin@documind.ai', password: 'password123', role: 'admin', allowedDocIds: [] },
  { id: 'u2', name: 'User A', email: 'userA@documind.ai', password: 'password123', role: 'user', allowedDocIds: [] }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('dm_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('dm_depts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('documind-theme') as Theme) || 'auto');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('documind-lang') as Language) || 'Vietnamese');
  const [view, setView] = useState<ViewType>('dashboard');
  
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('dm_folders');
    return saved ? JSON.parse(saved) : [];
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFolderIdsInChat, setSelectedFolderIdsInChat] = useState<string[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [researchMode, setResearchMode] = useState<ResearchMode>('new');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = useMemo(() => TRANSLATIONS[language] || TRANSLATIONS.English, [language]);
  const langCodes = useMemo(() => Object.keys(TRANSLATIONS).map(l => ({ lang: l, code: TRANSLATIONS[l as Language].langCode })), []);
  const activeSession = useMemo(() => chatSessions.find(s => s.id === activeSessionId), [chatSessions, activeSessionId]);

  useEffect(() => { localStorage.setItem('dm_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('dm_depts', JSON.stringify(departments)); }, [departments]);
  useEffect(() => { localStorage.setItem('dm_folders', JSON.stringify(folders)); }, [folders]);

  const personalFolderId = useMemo(() => {
    if (!currentUser) return null;
    return `personal-${currentUser.id}`;
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && personalFolderId) {
      setFolders(prev => {
        if (prev.some(f => f.id === personalFolderId)) return prev;
        return [...prev, {
          id: personalFolderId,
          name: t.personalFolder,
          parentId: null,
          userId: currentUser.id,
          status: 'approved',
          isSystem: true
        }];
      });
    }
  }, [currentUser, personalFolderId, t.personalFolder]);

  const sessionDocs = useMemo(() => {
    if (!activeSession) return [];
    return documents.filter(doc => activeSession.selectedDocIds.includes(doc.id));
  }, [documents, activeSession]);

  const visibleFolders = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return folders;
    return folders.filter(f => 
      f.userId === currentUser.id || 
      (currentUser.departmentId && f.departmentId === currentUser.departmentId)
    );
  }, [folders, currentUser]);

  const accessibleDocs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return documents;
    
    const visibleFolderIds = visibleFolders.map(f => f.id);
    return documents.filter(doc => 
      (doc.userId === currentUser.id) || 
      (doc.folderId && visibleFolderIds.includes(doc.folderId) && doc.status === 'approved') ||
      (currentUser.allowedDocIds?.includes(doc.id) && doc.status === 'approved')
    );
  }, [documents, currentUser, visibleFolders]);

  useEffect(() => {
    const root = document.documentElement;
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (t: Theme) => {
        if (t === 'dark' || (t === 'auto' && darkQuery.matches)) root.classList.add('dark');
        else root.classList.remove('dark');
    };
    applyTheme(theme);
    localStorage.setItem('documind-theme', theme);
  }, [theme]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, forCurrentSession = false) => {
    const files = e.target.files;
    if (!files || !currentUser || files.length === 0) return;
    setIsUploading(true);
    try {
      await uploadFilesToBackend(Array.from(files));
      const newDocs: Document[] = [];
      const targetFolderId = forCurrentSession ? personalFolderId : (view === 'folders' ? currentFolderId : personalFolderId);
      
      Array.from(files).forEach((file: any) => {
        const type = file.name.split('.').pop()?.toLowerCase() as any;
        const docId = `d-${Date.now()}-${Math.random()}`;
        const isAutoApprove = targetFolderId === personalFolderId || currentUser.role === 'admin';
        
        const newDoc: Document = {
          id: docId, userId: currentUser.id, name: file.name, type: type || 'txt', 
          uploadDate: new Date().toLocaleDateString(), size: file.size, content: "Content", 
          status: isAutoApprove ? 'approved' : 'pending', isDeleted: false,
          folderId: targetFolderId || undefined
        };
        newDocs.push(newDoc);
        setActivities(prev => [...prev, { id: `act-${Date.now()}`, type: 'upload', name: file.name, timestamp: new Date().toISOString() }]);
      });
      setDocuments(prev => [...prev, ...newDocs]);
      
      if (forCurrentSession && activeSession) {
        const approvedIds = newDocs.filter(d => d.status === 'approved').map(d => d.id);
        setSelectedDocIds(prev => [...prev, ...approvedIds]);
        setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, selectedDocIds: [...s.selectedDocIds, ...newDocs.map(d => d.id)] } : s));
      }
      showToast(t.uploadSuccess);
    } catch (err) {
      showToast("Lỗi tải lên", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const createNewSession = (title: string, selectedIds: string[] = []) => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId, userId: currentUser?.id || '', title, messages: [], selectedDocIds: selectedIds,
      selectedFolderIds: [], lastUpdated: new Date().toISOString(), mode: 'new'
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setSelectedDocIds(selectedIds);
    setSelectedFolderIdsInChat([]);
    setView('chat');
  };

  const handleToggleFolderInChat = (folderId: string) => {
    const newSelection = selectedFolderIdsInChat.includes(folderId) 
      ? selectedFolderIdsInChat.filter(id => id !== folderId)
      : [...selectedFolderIdsInChat, folderId];
    setSelectedFolderIdsInChat(newSelection);
    if (activeSession) {
      setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, selectedFolderIds: newSelection } : s));
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading || !activeSession || !currentUser) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: new Date().toISOString() };
    const aiMsgId = (Date.now() + 1).toString();
    setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg, { id: aiMsgId, role: 'assistant', content: "", timestamp: new Date().toISOString() }] } : s));
    setInputValue('');
    setIsLoading(true);

    try {
      const folderDocIds = documents.filter(d => d.folderId && selectedFolderIdsInChat.includes(d.folderId) && d.status === 'approved' && !d.isDeleted).map(d => d.id);
      const combinedDocIds = Array.from(new Set([...selectedDocIds, ...folderDocIds]));
      const targetDocIds = combinedDocIds.length > 0 
        ? combinedDocIds 
        : accessibleDocs.filter(d => d.status === 'approved' && !d.isDeleted).map(d => d.id);
      const fileNames = documents.filter(d => targetDocIds.includes(d.id)).map(d => d.name);
      let fullText = "";
      // Fix: generateAnswerFromBackend in geminiService.ts only takes 2 arguments
      for await (const chunk of generateAnswerFromBackend(userMsg.content, fileNames)) {
        fullText += chunk;
        setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: s.messages.map(m => m.id === aiMsgId ? { ...m, content: fullText } : m) } : s));
      }
    } catch (err) {
      showToast("Lỗi kết nối AI", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return <Login users={users} onLogin={(user) => {
    setCurrentUser(user);
    setView('dashboard');
  }} t={t} />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      <Header 
        t={t} 
        view={view} 
        setView={setView} 
        language={language} 
        setLanguage={setLanguage} 
        theme={theme} 
        setTheme={setTheme} 
        langCodes={langCodes} 
        user={currentUser} 
        departments={departments}
        onLogout={() => { setCurrentUser(null); setView('dashboard'); }} 
      />
      
      <main className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
        {toast && (
          <div className={`fixed top-20 right-4 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 border ${toast.type === 'success' ? 'bg-white dark:bg-slate-900 border-green-500 text-green-600 shadow-green-100' : 'bg-red-50 dark:bg-slate-900 border-red-500 text-red-600 shadow-red-100'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        )}
        
        {/* Main View Area with Internal Scrolling for non-chat views */}
        <div className="h-full w-full overflow-hidden flex flex-col relative">
          {view === 'dashboard' || view === 'trash' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <Dashboard 
                t={t} chatSessions={chatSessions} trendingNews={[]} documents={accessibleDocs} isNewsLoading={false}
                onCreateSession={() => createNewSession(t.startNew)} onOpenSession={(id) => { setActiveSessionId(id); setView('chat'); }}
                onNewsAction={(n) => createNewSession(n.title)} onFileAction={(d) => createNewSession(d.name, [d.id])}
                onFileUpload={(e) => handleFileUpload(e, false)} onPreview={setPreviewDoc} onDelete={(id) => setDocuments(prev => prev.map(d => d.id === id ? {...d, isDeleted: !d.isDeleted} : d))}
                viewMode={view === 'trash' ? 'trash' : 'all'}
              />
            </div>
          ) : view === 'history' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <HistoryView t={t} activities={activities} />
            </div>
          ) : view === 'admin-panel' && currentUser.role === 'admin' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <AdminPanel 
                t={t} 
                pendingDocs={documents.filter(d => d.status === 'pending')} 
                onApprove={(id, s) => setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: s } : d))} 
                users={users} 
                setUsers={setUsers}
                departments={departments}
                setDepartments={setDepartments}
                folders={folders}
                setFolders={setFolders}
                onAssignPermission={(uid, did) => setUsers(prev => prev.map(u => u.id === uid ? { ...u, allowedDocIds: u.allowedDocIds?.includes(did) ? u.allowedDocIds.filter(x => x !== did) : [...(u.allowedDocIds || []), did] } : u))} 
                allDocs={documents} 
              />
            </div>
          ) : view === 'folders' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <FoldersView t={t} folders={visibleFolders} documents={accessibleDocs} currentFolderId={currentFolderId} onNavigate={setCurrentFolderId} onCreateFolder={(name) => setFolders(prev => [...prev, { id: `f-${Date.now()}`, name, parentId: currentFolderId, userId: currentUser.id, status: 'approved' }])} onUpload={(e) => handleFileUpload(e, false)} onFilePreview={setPreviewDoc} onDeleteFolder={(id) => setFolders(prev => prev.filter(f => f.id !== id))} onChatWithFolder={(fid) => { setSelectedFolderIdsInChat([fid]); createNewSession(folders.find(f => f.id === fid)?.name || "", documents.filter(d => d.folderId === fid && d.status === 'approved').map(d => d.id)); }} />
            </div>
          ) : activeSession && (
            <ChatView 
              t={t} activeSession={activeSession} researchMode={researchMode} setResearchMode={setResearchMode} onBack={() => setView('dashboard')} 
              onFileUpload={(e) => handleFileUpload(e, true)} onSendMessage={handleSendMessage} 
              inputValue={inputValue} setInputValue={setInputValue} 
              isLoading={isLoading} isUploading={isUploading} fileInputRef={fileInputRef} folders={visibleFolders} 
              onToggleFolderInChat={handleToggleFolderInChat} 
              selectedFolderIds={selectedFolderIdsInChat}
              sessionDocs={sessionDocs} selectedDocIds={selectedDocIds} onToggleDoc={(id) => setSelectedDocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            />
          )}
        </div>

        {previewDoc && <PreviewModal t={t} doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </main>
    </div>
  );
};

export default App;
