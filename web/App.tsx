
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Document, ChatSession, Message, Language, Theme, ViewType, ResearchMode, NewsArticle, UserRole, DocStatus, Folder, ActivityLog, Department } from './types';
import { TRANSLATIONS } from './constants';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ChatView from './components/ChatView';
import PreviewModal from './components/PreviewModal';
import Login from './components/Login';
import FoldersView from './components/FoldersView';
import HistoryView from './components/HistoryView';
import ProfileView from './components/ProfileView';
import AdminPanel from './components/AdminPanel';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { deleteFilePermanently, uploadFileToBackend } from './apiService';

const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Admin Cao Vũ', email: 'caovu9523@gmail.com', password: '09052003', role: 'admin', allowedDocIds: [] },
  { id: 'u2', name: 'User Cao Vũ', email: 'caovu9523@gmail.com', password: '09052003', role: 'user', allowedDocIds: [] }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dm_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('dm_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  
  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('dm_depts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem('dm_docs');
    const docs = saved ? JSON.parse(saved) : [];
    return docs.map((d: Document) => d.status === 'uploading' ? { ...d, status: 'pending' } : d);
  });
  
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('dm_folders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('dm_activities');
    return saved ? JSON.parse(saved) : [];
  });

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('documind-theme') as Theme) || 'auto');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('documind-lang') as Language) || 'English');
  const [view, setView] = useState<ViewType>('dashboard');
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [researchMode, setResearchMode] = useState<ResearchMode>('new');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useMemo(() => TRANSLATIONS[language] || TRANSLATIONS.English, [language]);
  const langCodes = useMemo(() => Object.keys(TRANSLATIONS).map(l => ({ lang: l, code: TRANSLATIONS[l as Language].langCode })), []);
  const activeSession = useMemo(() => chatSessions.find(s => s.id === activeSessionId), [chatSessions, activeSessionId]);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (currentTheme: Theme) => {
      if (!currentUser) {
        root.classList.remove('dark');
        return;
      }
      if (currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    applyTheme(theme);
    localStorage.setItem('documind-theme', theme);
  }, [theme, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`dm_chat_sessions_${currentUser.id}`);
      setChatSessions(saved ? JSON.parse(saved) : []);
    } else {
      setChatSessions([]);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`dm_chat_sessions_${currentUser.id}`, JSON.stringify(chatSessions));
    }
  }, [chatSessions, currentUser?.id]);

  useEffect(() => { localStorage.setItem('dm_current_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('dm_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('dm_depts', JSON.stringify(departments)); }, [departments]);
  useEffect(() => { localStorage.setItem('dm_folders', JSON.stringify(folders)); }, [folders]);
  useEffect(() => { 
    const docsToSave = documents.filter(d => d.status !== 'uploading');
    localStorage.setItem('dm_docs', JSON.stringify(docsToSave)); 
  }, [documents]);
  useEffect(() => { localStorage.setItem('dm_activities', JSON.stringify(activities)); }, [activities]);
  useEffect(() => { localStorage.setItem('documind-lang', language); }, [language]);

  const personalFolderId = useMemo(() => currentUser ? `personal-${currentUser.id}` : null, [currentUser]);

  useEffect(() => {
    if (currentUser && personalFolderId && currentUser.role === 'admin') {
      setFolders(prev => {
        if (prev.some(f => f.id === personalFolderId)) return prev;
        return [...prev, {
          id: personalFolderId, name: currentUser.name, parentId: null, userId: currentUser.id, status: 'approved', isSystem: true
        }];
      });
    }
  }, [currentUser, personalFolderId]);

  const visibleFolders = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return folders.filter(f => f.userId === currentUser.id || !f.id.startsWith('personal-'));
    }
    // Employees see folders belonging to their department.
    return folders.filter(f => currentUser.departmentId && f.departmentId === currentUser.departmentId);
  }, [folders, currentUser]);

  const accessibleDocs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return documents.filter(doc => {
        const isPersonalOther = doc.folderId?.startsWith('personal-') && doc.userId !== currentUser.id;
        if (isPersonalOther) return false;
        return true;
      });
    }
    return documents.filter(doc => 
      doc.status === 'approved' && (
        (currentUser.departmentId && doc.departmentId === currentUser.departmentId) ||
        (currentUser.allowedDocIds?.includes(doc.id))
      )
    );
  }, [documents, currentUser]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetFid?: string) => {
    if (currentUser?.role !== 'admin') return;
    const files = e.target.files;
    if (!files || !currentUser || files.length === 0) return;
    setIsUploading(true);
    
    const fileList = Array.from(files) as File[];
    const targetFolderId = targetFid || (view === 'folders' ? currentFolderId : personalFolderId);
    const targetFolder = folders.find(f => f.id === targetFolderId);

    const tempDocs: Document[] = fileList.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`, 
      userId: currentUser.id, 
      name: file.name, 
      type: file.name.split('.').pop()?.toLowerCase() as any || 'txt', 
      uploadDate: new Date().toLocaleDateString(), 
      size: file.size, 
      content: "", 
      status: 'uploading', 
      isDeleted: false, 
      folderId: targetFolderId || undefined,
      departmentId: targetFolder?.departmentId, 
      fileData: URL.createObjectURL(file) 
    }));

    setDocuments(prev => [...prev, ...tempDocs]);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const tempId = tempDocs[i].id;
      
      try {
        await uploadFileToBackend(file, targetFolderId || undefined, targetFolder?.departmentId);
        setDocuments(prev => prev.map(d => 
          d.id === tempId ? { ...d, status: 'approved' } : d
        ));
        setActivities(prev => [...prev, { 
          id: `act-${Date.now()}`, type: 'upload', name: file.name, timestamp: new Date().toISOString() 
        }]);
      } catch (err) {
        setDocuments(prev => prev.filter(d => d.id !== tempId));
        showToast(`Tải tệp ${file.name} thất bại!`, "error");
      }
    }
    setIsUploading(false);
    if (e.target) e.target.value = '';
    showToast(t.uploadSuccess);
  };

  const handleFileDelete = async (id: string) => {
    if (currentUser?.role !== 'admin') return;
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    try {
      if (window.confirm(t.confirmDelete + ` (${doc.name})`)) {
        await deleteFilePermanently(doc.name);
        setDocuments(prev => prev.filter(d => d.id !== id));
        showToast("Đã xóa vĩnh viễn.");
      }
    } catch (err) {
      showToast("Lỗi khi xóa tệp.", "error");
    }
  };

  const createNewSession = (title: string) => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId, userId: currentUser?.id || '', title, messages: [], selectedDocIds: [],
      selectedFolderIds: [], lastUpdated: new Date().toISOString(), mode: 'new'
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setView('chat');
  };

  const handleUpdateSession = (sessionId: string, messages: Message[]) => {
    setChatSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages, lastUpdated: new Date().toISOString() } : s));
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin' && view === 'folders') {
        setView('dashboard');
      }
      if (currentUser.role !== 'admin' && view === 'admin-panel') {
        setView('dashboard');
      }
    }
  }, [currentUser, view]);

  if (!currentUser) return <Login users={users} onLogin={(user) => { setCurrentUser(user); setView('dashboard'); }} t={t} />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      <Header 
        t={t} view={view} setView={setView} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} 
        langCodes={langCodes} user={currentUser} departments={departments} onLogout={() => { setCurrentUser(null); setView('dashboard'); }} 
      />
      <main className="flex-1 relative overflow-hidden">
        {toast && (
          <div className={`fixed top-20 right-4 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 border ${toast.type === 'success' ? 'bg-white dark:bg-slate-900 border-green-500 text-green-600' : 'bg-red-50 dark:bg-slate-900 border-red-500 text-red-600'}`}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        )}
        <div className="h-full w-full overflow-hidden flex flex-col relative">
          {view === 'dashboard' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <Dashboard 
                t={t} chatSessions={chatSessions} documents={accessibleDocs} onCreateSession={() => createNewSession(t.startNew)} 
                onOpenSession={(id) => { setActiveSessionId(id); setView('chat'); }} onFileAction={(d) => createNewSession(d.name)}
                onFileUpload={(e) => handleFileUpload(e)} onPreview={setPreviewDoc} onDelete={handleFileDelete}
                trendingNews={[]} isNewsLoading={false} onNewsAction={() => {}}
                isAdmin={currentUser.role === 'admin'}
              />
            </div>
          ) : view === 'history' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <HistoryView t={t} activities={activities} />
            </div>
          ) : view === 'profile' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <ProfileView t={t} user={currentUser} department={departments.find(d => d.id === currentUser.departmentId)} />
            </div>
          ) : view === 'admin-panel' && currentUser.role === 'admin' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <AdminPanel 
                t={t} pendingDocs={documents.filter(d => d.status === 'pending')} 
                onApprove={(id, s) => setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: s } : d))} 
                users={users} setUsers={setUsers} departments={departments} setDepartments={setDepartments}
                folders={folders} setFolders={setFolders} allDocs={documents} setDocuments={setDocuments}
                onAssignPermission={() => {}}
                onDeletePermanently={async (id) => {
                  const doc = documents.find(d => d.id === id);
                  if (doc) {
                    await deleteFilePermanently(doc.name);
                    setDocuments(prev => prev.filter(d => d.id !== id));
                    showToast("Đã xóa vĩnh viễn.");
                  }
                }}
              />
            </div>
          ) : view === 'folders' && currentUser.role !== 'admin' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <FoldersView 
                t={t} folders={visibleFolders} documents={accessibleDocs} currentFolderId={currentFolderId} onNavigate={setCurrentFolderId} 
                onCreateFolder={() => {}} 
                onUpload={() => {}} 
                onFilePreview={setPreviewDoc} onDeleteFolder={() => {}} 
                onChatWithFolder={(fid) => createNewSession(folders.find(f => f.id === fid)?.name || "")}
                isAdmin={false}
              />
            </div>
          ) : activeSession && (
            <ChatView 
              t={t} activeSession={activeSession} researchMode={researchMode} setResearchMode={setResearchMode} onBack={() => setView('dashboard')} 
              onFileUpload={handleFileUpload} onSendMessage={() => {}} 
              onUpdateSession={handleUpdateSession}
              inputValue={inputValue} setInputValue={setInputValue} 
              isLoading={isLoading} isUploading={isUploading} fileInputRef={fileInputRef} 
              folders={visibleFolders.filter(f => !f.isSystem)}
              personalFolder={visibleFolders.find(f => f.id === personalFolderId)}
              onToggleFolderInChat={() => {}} 
              selectedFolderIds={[]}
              sessionDocs={accessibleDocs} 
              selectedDocIds={accessibleDocs.filter(d => d.status === 'approved').map(d => d.id)} 
              onToggleDoc={() => {}}
              onSelectAll={() => {}}
              onDeselectAll={() => {}}
            />
          )}
        </div>
        {previewDoc && <PreviewModal t={t} doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </main>
    </div>
  );
};

export default App;
