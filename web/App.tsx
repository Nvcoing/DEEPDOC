
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Document, ChatSession, Message, Language, Theme, ViewType, ResearchMode, NewsArticle, UserRole, DocStatus, Folder, ActivityLog, Department } from './types';
import { TRANSLATIONS } from './constants';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ChatView from './components/ChatView';
import PreviewModal from './components/PreviewModal';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import FoldersView from './components/FoldersView';
import HistoryView from './components/HistoryView';
import ProfileView from './components/ProfileView';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFilesToBackend, deleteFilePermanently, uploadFileToBackend } from './apiService';

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
    return saved ? JSON.parse(saved) : [];
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
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`dm_chat_sessions_${currentUser.id}`);
      setChatSessions(saved ? JSON.parse(saved) : []);
    } else {
      setChatSessions([]);
    }
  }, [currentUser?.id]);

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('documind-theme') as Theme) || 'auto');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('documind-lang') as Language) || 'Vietnamese');
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

  useEffect(() => { localStorage.setItem('dm_current_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('dm_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('dm_depts', JSON.stringify(departments)); }, [departments]);
  useEffect(() => { localStorage.setItem('dm_folders', JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem('dm_docs', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem('dm_activities', JSON.stringify(activities)); }, [activities]);
  useEffect(() => { localStorage.setItem('documind-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('documind-lang', language); }, [language]);

  const personalFolderId = useMemo(() => currentUser ? `personal-${currentUser.id}` : null, [currentUser]);

  useEffect(() => {
    if (currentUser && personalFolderId) {
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
    return folders.filter(f => f.userId === currentUser.id || (currentUser.departmentId && f.departmentId === currentUser.departmentId));
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
    const visibleFolderIds = visibleFolders.map(f => f.id);
    return documents.filter(doc => 
      (doc.userId === currentUser.id) || 
      (doc.folderId && visibleFolderIds.includes(doc.folderId) && doc.status === 'approved') ||
      (currentUser.departmentId && doc.departmentId === currentUser.departmentId && doc.status === 'approved')
    );
  }, [documents, currentUser, visibleFolders]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetFid?: string) => {
    const files = e.target.files;
    if (!files || !currentUser || files.length === 0) return;
    setIsUploading(true);
    
    try {
      const fileList = Array.from(files) as File[];
      const newDocs: Document[] = [];
      
      // Xác định thư mục đích
      const targetFolderId = targetFid || (view === 'folders' ? currentFolderId : personalFolderId);
      const targetFolder = folders.find(f => f.id === targetFolderId);
      
      // LOGIC MỚI: Tự động duyệt cho thư mục cá nhân hoặc admin tải lên
      const isAutoApprove = currentUser.role === 'admin' || targetFolderId === personalFolderId;

      for (const file of fileList) {
        await uploadFileToBackend(file, targetFolderId || undefined, targetFolder?.departmentId);
        
        const type = file.name.split('.').pop()?.toLowerCase() as any;
        const newDoc: Document = {
          id: `d-${Date.now()}-${Math.random()}`, 
          userId: currentUser.id, 
          name: file.name, 
          type: type || 'txt', 
          uploadDate: new Date().toLocaleDateString(), 
          size: file.size, 
          content: "Tài liệu tải lên.", 
          status: isAutoApprove ? 'approved' : 'pending', 
          isDeleted: false, 
          folderId: targetFolderId || undefined,
          departmentId: targetFolder?.departmentId, 
          fileData: URL.createObjectURL(file) 
        };
        newDocs.push(newDoc);
        setActivities(prev => [...prev, { id: `act-${Date.now()}`, type: 'upload', name: file.name, timestamp: new Date().toISOString() }]);
      }

      setDocuments(prev => [...prev, ...newDocs]);
      
      // Nếu đang trong Chat, tự động chọn các file vừa tải lên nếu chúng được duyệt ngay
      if (view === 'chat' && isAutoApprove) {
        const newDocIds = newDocs.map(d => d.id);
        setSelectedDocIds(prev => Array.from(new Set([...prev, ...newDocIds])));
      }

      showToast(isAutoApprove ? t.uploadSuccess : "Đã tải lên, chờ Admin duyệt.");
    } catch (err) {
      showToast("Tải lên thất bại!", "error");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleFileDelete = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    try {
      if (doc.isDeleted || currentUser.role === 'admin') {
        if (window.confirm(`Xóa vĩnh viễn tệp ${doc.name}?`)) {
          await deleteFilePermanently(doc.name);
          setDocuments(prev => prev.filter(d => d.id !== id));
          showToast("Đã xóa vĩnh viễn.");
        }
      } else {
        setDocuments(prev => prev.map(d => d.id === id ? {...d, isDeleted: true} : d));
        showToast("Đã chuyển vào thùng rác.");
      }
    } catch (err) {
      showToast("Lỗi khi xóa tệp.", "error");
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
    setSelectedFolderIds([]);
    setView('chat');
  };

  const handleToggleFolderInChat = (fid: string) => {
    const isAlreadySelected = selectedFolderIds.includes(fid);
    const folderDocIds = documents.filter(d => d.folderId === fid && d.status === 'approved').map(d => d.id);
    
    if (isAlreadySelected) {
      setSelectedFolderIds(prev => prev.filter(id => id !== fid));
      setSelectedDocIds(prev => prev.filter(id => !folderDocIds.includes(id)));
    } else {
      setSelectedFolderIds(prev => [...prev, fid]);
      setSelectedDocIds(prev => Array.from(new Set([...prev, ...folderDocIds])));
    }
  };

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
          {view === 'dashboard' || view === 'trash' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <Dashboard 
                t={t} chatSessions={chatSessions} documents={accessibleDocs} onCreateSession={() => createNewSession(t.startNew)} 
                onOpenSession={(id) => { setActiveSessionId(id); setView('chat'); }} onFileAction={(d) => createNewSession(d.name, [d.id])}
                onFileUpload={(e) => handleFileUpload(e)} onPreview={setPreviewDoc} onDelete={handleFileDelete}
                viewMode={view === 'trash' ? 'trash' : 'all'} trendingNews={[]} isNewsLoading={false} onNewsAction={() => {}}
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
              />
            </div>
          ) : view === 'folders' ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <FoldersView 
                t={t} folders={visibleFolders} documents={accessibleDocs} currentFolderId={currentFolderId} onNavigate={setCurrentFolderId} 
                onCreateFolder={(name) => setFolders(prev => [...prev, { id: `f-${Date.now()}`, name, parentId: currentFolderId, userId: currentUser.id, status: 'approved' }])} 
                onUpload={(e) => handleFileUpload(e)} onFilePreview={setPreviewDoc} onDeleteFolder={(id) => setFolders(prev => prev.filter(f => f.id !== id))} 
                onChatWithFolder={(fid) => { createNewSession(folders.find(f => f.id === fid)?.name || "", documents.filter(d => d.folderId === fid && d.status === 'approved').map(d => d.id)); }}
                isAdmin={currentUser.role === 'admin'}
              />
            </div>
          ) : activeSession && (
            <ChatView 
              t={t} activeSession={activeSession} researchMode={researchMode} setResearchMode={setResearchMode} onBack={() => setView('dashboard')} 
              onFileUpload={handleFileUpload} onSendMessage={() => {}} 
              inputValue={inputValue} setInputValue={setInputValue} 
              isLoading={isLoading} isUploading={isUploading} fileInputRef={fileInputRef} 
              folders={visibleFolders.filter(f => !f.isSystem)}
              personalFolder={visibleFolders.find(f => f.id === personalFolderId)}
              onToggleFolderInChat={handleToggleFolderInChat} 
              selectedFolderIds={selectedFolderIds}
              sessionDocs={accessibleDocs} 
              selectedDocIds={selectedDocIds} 
              onToggleDoc={(id) => setSelectedDocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
              onSelectAll={() => {
                const allDocIds = accessibleDocs.map(d => d.id);
                setSelectedDocIds(allDocIds);
                const allFolderIds = visibleFolders.filter(f => !f.isSystem).map(f => f.id);
                setSelectedFolderIds(allFolderIds);
              }}
              onDeselectAll={() => { setSelectedDocIds([]); setSelectedFolderIds([]); }}
            />
          )}
        </div>
        {previewDoc && <PreviewModal t={t} doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </main>
    </div>
  );
};

export default App;
