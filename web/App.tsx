
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Upload, FileText, Moon, Sun, Plus, Library, MessageSquare,
  ChevronRight, ChevronLeft, X, File as FileIcon, Check, Languages,
  Trash2, Eye, Info, Presentation, LayoutDashboard, Monitor,
  Search, Bookmark, Clock, ArrowUpRight, Globe, TrendingUp, Newspaper, ExternalLink, Sparkles,
  History, Calendar, Database, FileUp, Settings2, Layers
} from 'lucide-react';
import { User, Document, ChatSession, Message, Language, Theme, ViewType, Topic, NewsArticle } from './types';
import { generateDocumentAnswer, fetchTrendingNews } from './geminiService';
import mammoth from 'mammoth';

const translations: Record<Language, any> = {
  English: {
    langCode: "EN", home: "Home", research: "Research", library: "Library",
    welcome: "Intelligence Hub", selectLang: "Language", docsSelected: "selected",
    trendingTitle: "Global Trends", knowledgeTitle: "Knowledge Base",
    uploadDesc: "Upload docs", startNew: "New Research",
    recentDiscussions: "Recent Discussions", noHistory: "No history yet",
    backToHome: "Back to Home", loading: "AI is thinking...",
    searchPlaceholder: "Ask anything about your knowledge...",
    globalSearch: "Global Mode", sessionStarted: "Session started",
    updateNews: "Update", docDetails: "Document Details",
    focusNewDocs: "Research New Docs", useLibrary: "Use Knowledge Base",
    focusDesc: "Upload specific files to focus your research session.",
    libraryDesc: "Analyze and query from your existing document library.",
    uploadAndStart: "Upload & Start",
    selectMode: "Research Configuration",
    focusedDocs: "Focused Documents",
    noDocsFocused: "No documents focused yet.",
    tagline: "Unify your knowledge library and global trends.",
    brandName: "DocuMind",
    portalName: "GenAI Research Portal",
    newSession: "NEW SESSION",
    modeLibrary: "LIBRARY",
    modeFocus: "FOCUS FILES",
    summaryPrompt: "Summarize my current knowledge base.",
    rawContent: "RAW CONTENT",
    poweredBy: "Intelligence Powered by Gemini 3.0"
  },
  Vietnamese: {
    langCode: "VN", home: "Trang chủ", research: "Nghiên cứu", library: "Thư viện",
    welcome: "Trung tâm Trí tuệ", selectLang: "Ngôn ngữ", docsSelected: "đã chọn",
    trendingTitle: "Xu hướng thế giới", knowledgeTitle: "Kho kiến thức",
    uploadDesc: "Tải lên tài liệu", startNew: "Nghiên cứu mới",
    recentDiscussions: "Thảo luận gần đây", noHistory: "Chưa có lịch sử thảo luận",
    backToHome: "Quay lại trang chủ", loading: "AI đang suy nghĩ...",
    searchPlaceholder: "Hỏi bất cứ điều gì về kiến thức của bạn...",
    globalSearch: "Chế độ Toàn cầu", sessionStarted: "Phiên đã bắt đầu",
    updateNews: "Cập nhật", docDetails: "Chi tiết tài liệu",
    focusNewDocs: "Tập trung Tài liệu mới", useLibrary: "Dùng Kho kiến thức tổng quát",
    focusDesc: "Tải lên file cụ thể để AI chỉ tập trung trả lời dựa trên chúng.",
    libraryDesc: "AI sẽ sử dụng toàn bộ dữ liệu bạn đã nạp vào thư viện.",
    uploadAndStart: "Tải lên & Bắt đầu",
    selectMode: "Cấu hình Nghiên cứu",
    focusedDocs: "Tài liệu đang tập trung",
    noDocsFocused: "Chưa có tài liệu nào được tải lên.",
    tagline: "Hợp nhất thư viện kiến thức và xu hướng toàn cầu.",
    brandName: "DocuMind",
    portalName: "Cổng nghiên cứu GenAI",
    newSession: "PHIÊN MỚI",
    modeLibrary: "THƯ VIỆN",
    modeFocus: "TẬP TRUNG FILE",
    summaryPrompt: "Hãy tóm tắt kho kiến thức hiện tại của tôi.",
    rawContent: "DỮ LIỆU GỐC",
    poweredBy: "Trí tuệ nhân tạo được cung cấp bởi Gemini 3.0"
  },
  French: { langCode: "FR", home: "Accueil", research: "Recherche", welcome: "Centre d'Intelligence", trendingTitle: "Tendances", knowledgeTitle: "Savoir", uploadDesc: "Déposer", startNew: "Nouvelle Recherche", recentDiscussions: "Discussions récentes", focusNewDocs: "Nouveaux Docs", useLibrary: "Base de Connaissances", tagline: "Unifiez votre bibliothèque.", brandName: "DocuMind", portalName: "Portail GenAI", newSession: "NOUVEAU", modeLibrary: "BIBLIO", modeFocus: "FOCUS", summaryPrompt: "Résumez mes connaissances.", rawContent: "CONTENU BRUT", poweredBy: "Propulsé par Gemini 3.0" },
  German: { langCode: "DE", home: "Home", research: "Forschung", welcome: "Wissenszentrum", trendingTitle: "Trends", knowledgeTitle: "Wissen", uploadDesc: "Hochladen", startNew: "Neue Forschung", recentDiscussions: "Letzte Diskussionen", focusNewDocs: "Neue Dok", useLibrary: "Wissensdatenbank", tagline: "Wissen vereinheitlichen.", brandName: "DocuMind", portalName: "GenAI Portal", newSession: "NEU", modeLibrary: "BIBLIOTHEK", modeFocus: "FOKUS", summaryPrompt: "Fasse mein Wissen zusammen.", rawContent: "ROHDATEN", poweredBy: "Unterstützt durch Gemini 3.0" },
  Japanese: { langCode: "JP", home: "ホーム", research: "研究", welcome: "ナレッジセンター", trendingTitle: "トレンド", knowledgeTitle: "知識", uploadDesc: "アップロード", startNew: "新規研究", recentDiscussions: "最近の議論", focusNewDocs: "新規ドキュメント", useLibrary: "ナレッジベース", tagline: "知識とトレンドの統合。", brandName: "DocuMind", portalName: "GenAI ポータル", newSession: "新規", modeLibrary: "ライブラリ", modeFocus: "フォーカス", summaryPrompt: "知識を要約して。", rawContent: "生データ", poweredBy: "Gemini 3.0 による知能" },
  Korean: { langCode: "KR", home: "홈", research: "연구", welcome: "지식 센터", trendingTitle: "트렌드", knowledgeTitle: "지식", uploadDesc: "업로드", startNew: "새 연구", recentDiscussions: "최근 토론", focusNewDocs: "새 문서", useLibrary: "지식 베이스", tagline: "지식과 트렌드 통합.", brandName: "DocuMind", portalName: "GenAI 포털", newSession: "신규", modeLibrary: "라이브러리", modeFocus: "포커스", summaryPrompt: "지식 요약해줘.", rawContent: "원본 데이터", poweredBy: "Gemini 3.0 기반 인공지능" },
  Chinese: { langCode: "CN", home: "首页", research: "研究", welcome: "知识中心", trendingTitle: "热门", knowledgeTitle: "知识库", uploadDesc: "上传", startNew: "新研究", recentDiscussions: "最近讨论", focusNewDocs: "新文档", useLibrary: "知识库", tagline: "统一您的知识库。", brandName: "DocuMind", portalName: "GenAI 门户", newSession: "新建", modeLibrary: "资料库", modeFocus: "专注", summaryPrompt: "总结我的知识库。", rawContent: "原始内容", poweredBy: "由 Gemini 3.0 提供动力" }
};

const MOCK_USER: User = { id: 'u1', name: 'User', email: 'user@documind.ai' };

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(MOCK_USER);
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
  const [docxHtml, setDocxHtml] = useState<string>('');
  const [trendingNews, setTrendingNews] = useState<NewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [researchMode, setResearchMode] = useState<'new' | 'library'>('library');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = useMemo(() => translations[language] || translations.English, [language]);
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
    if (theme === 'auto') {
      const handler = () => applyTheme();
      darkQuery.addEventListener('change', handler);
      return () => darkQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  useEffect(() => {
    if (view === 'dashboard' && trendingNews.length === 0) {
      loadNews();
    }
  }, [view, language]);

  const loadNews = async () => {
    setIsNewsLoading(true);
    try {
      const news = await fetchTrendingNews(language);
      setTrendingNews(news);
    } catch (e) {
      console.error(e);
    } finally {
      setIsNewsLoading(false);
    }
  };

  useEffect(() => {
    if (previewDoc?.type === 'docx' && previewDoc.fileData) {
      fetch(previewDoc.fileData).then(r => r.arrayBuffer()).then(ab => {
        mammoth.convertToHtml({ arrayBuffer: ab }).then(res => setDocxHtml(res.value));
      });
    }
  }, [previewDoc]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, forCurrentSession = false) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const type = file.name.split('.').pop()?.toLowerCase() as any;
      const docId = `d-${Date.now()}-${Math.random()}`;
      
      reader.onload = (ev) => {
        const newDoc: Document = {
          id: docId,
          userId: user?.id || '',
          name: file.name,
          type: type || 'txt',
          uploadDate: new Date().toLocaleDateString(),
          size: file.size,
          fileData: ev.target?.result as string,
          content: `Content of ${file.name}. Parsed for AI context.`,
          summary: "Tài liệu này đã được hệ thống ghi nhận."
        };
        setDocuments(prev => [...prev, newDoc]);
        
        if (forCurrentSession && activeSessionId) {
          setChatSessions(prev => prev.map(s => 
            s.id === activeSessionId 
              ? { ...s, selectedDocIds: [...s.selectedDocIds, docId] } 
              : s
          ));
          setSelectedDocIds(prev => [...prev, docId]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const createNewSession = (title: string, selectedIds: string[] = []) => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      userId: user?.id || '',
      title: title,
      messages: [],
      selectedDocIds: selectedIds,
      lastUpdated: new Date().toISOString()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setSelectedDocIds(selectedIds);
    setResearchMode(selectedIds.length > 0 ? 'new' : 'library');
    setView('chat');
    return newId;
  };

  const openSession = (id: string) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(id);
      setSelectedDocIds(session.selectedDocIds);
      setResearchMode(session.selectedDocIds.length > 0 ? 'new' : 'library');
      setView('chat');
    }
  };

  const handleNewsAction = (news: NewsArticle) => {
    createNewSession(news.title);
    setInputValue(`${t.summaryPrompt} (${news.title})`);
  };

  const handleFileAction = (doc: Document) => {
    createNewSession(`${t.research}: ${doc.name}`, [doc.id]);
    setInputValue(`${t.summaryPrompt}`);
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
      const ctxDocs = selectedDocIds.length > 0 ? documents.filter(d => selectedDocIds.includes(d.id)) : documents;
      const res = await generateDocumentAnswer(currentInput, ctxDocs, activeSession.messages, language);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: res || "...", timestamp: new Date().toISOString() };
      setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3 h-3" /> {t.portalName}
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white leading-tight">
            {t.welcome}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {t.tagline}
          </p>
        </div>
        <button 
          onClick={() => createNewSession(t.startNew)}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
        >
          {t.startNew} <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      {/* Recent Discussions */}
      <section className="space-y-4">
        <h3 className="font-black text-xl flex items-center gap-2 tracking-tight dark:text-white">
          <History className="w-5 h-5 text-purple-500" /> {t.recentDiscussions}
        </h3>
        {chatSessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chatSessions.slice(0, 6).map(session => (
              <div 
                key={session.id} 
                onClick={() => openSession(session.id)}
                className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex items-start gap-3"
              >
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate dark:text-white">{session.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(session.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 self-center group-hover:translate-x-1 transition-transform" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.noHistory}</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl flex items-center gap-2 tracking-tight dark:text-white">
              <Globe className="w-5 h-5 text-blue-500" /> {t.trendingTitle}
            </h3>
            <button onClick={loadNews} className="text-[9px] font-black text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-widest">
              {t.updateNews}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {isNewsLoading ? (
              Array(2).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/30 rounded-2xl animate-pulse" />
              ))
            ) : trendingNews.length > 0 ? (
              trendingNews.map((news, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleNewsAction(news)}
                  className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-md uppercase">{news.category}</span>
                  </div>
                  <h4 className="font-bold text-sm dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">{news.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{news.summary}</p>
                </div>
              ))
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl flex items-center gap-2 tracking-tight dark:text-white">
              <Library className="w-5 h-5 text-indigo-500" /> {t.knowledgeTitle}
            </h3>
            <label className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 cursor-pointer uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md">
              {t.uploadDesc}
              <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, false)} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {documents.length > 0 ? documents.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => handleFileAction(doc)}
                className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex items-center gap-3"
              >
                <div className={`p-2.5 rounded-xl ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'}`}>
                  {doc.type === 'pptx' ? <Presentation className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate dark:text-white">{doc.name}</h4>
                  <p className="text-[9px] text-slate-400 uppercase font-black">{doc.type} • {doc.uploadDate}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-300 hover:text-indigo-500 transition-all"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            )) : (
              <label className="flex flex-col items-center justify-center py-10 bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition-all group">
                <Upload className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 mb-2" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.uploadDesc}</p>
                <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, false)} />
              </label>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-['Inter'] overflow-hidden">
      {/* TOP COMPACT HEADER */}
      <header className="h-14 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('dashboard')}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Library className="text-white w-4 h-4" />
              </div>
              <span className="font-black text-lg tracking-tighter italic">{t.brandName}</span>
           </div>
           
           <nav className="hidden sm:flex items-center">
              <button 
                onClick={() => setView('dashboard')} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'dashboard' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> {t.home}
              </button>
           </nav>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Languages className="w-3.5 h-3.5 text-blue-500 ml-1" />
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as Language)} 
                className="bg-transparent text-[10px] font-black focus:outline-none uppercase cursor-pointer dark:text-white"
              >
                {Object.keys(translations).map(l => (
                  <option key={l} value={l} className="bg-white dark:bg-slate-900 text-black dark:text-white font-sans uppercase">
                    {translations[l as Language].langCode}
                  </option>
                ))}
              </select>
           </div>
           
           <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light')} 
              className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"
            >
              {theme === 'light' ? <Sun className="w-3.5 h-3.5 text-orange-500" /> : theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Monitor className="w-3.5 h-3.5 text-blue-500" />}
           </button>
        </div>
      </header>

      {/* MAIN VIEW */}
      <main className="flex-1 relative overflow-hidden bg-white dark:bg-slate-950">
        {view === 'dashboard' ? (
          <div className="h-full overflow-y-auto scrollbar-hide">
            {renderDashboard()}
          </div>
        ) : (
          <div className="h-full flex flex-row relative">
            {/* SIDEBAR FOR FOCUSED DOCUMENTS */}
            {researchMode === 'new' && (
              <aside className="w-72 flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-30 animate-in slide-in-from-left duration-500">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> {t.focusedDocs}
                  </h3>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 rounded-lg"
                    title={t.uploadAndStart}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {selectedDocIds.length > 0 ? (
                    selectedDocIds.map(id => {
                      const doc = documents.find(d => d.id === id);
                      if (!doc) return null;
                      return (
                        <div 
                          key={id}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-sm hover:border-blue-400 transition-all group relative"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {doc.type === 'pptx' ? <Presentation className="w-3.5 h-3.5 text-orange-500" /> : <FileText className="w-3.5 h-3.5 text-blue-500" />}
                            <span className="text-[11px] font-bold truncate max-w-[150px] dark:text-slate-200">{doc.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-[8px] font-black uppercase text-slate-400">{doc.type}</span>
                             <button 
                              onClick={() => setSelectedDocIds(prev => prev.filter(i => i !== id))}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                        <FileUp className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{t.noDocsFocused}</p>
                    </div>
                  )}
                </div>
              </aside>
            )}

            <div className="flex-1 flex flex-col relative">
              <header className="h-12 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3">
                  <div onClick={() => setView('dashboard')} className="p-1 bg-slate-50 dark:bg-slate-800 rounded-md cursor-pointer hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="font-black text-sm tracking-tight dark:text-white truncate max-w-xs">{activeSession?.title}</h2>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* MODE TOGGLE CHECKLIST */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button 
                      onClick={() => setResearchMode('library')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${researchMode === 'library' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Database className="w-3 h-3" /> {t.modeLibrary}
                    </button>
                    <button 
                      onClick={() => setResearchMode('new')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${researchMode === 'new' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <FileUp className="w-3 h-3" /> {t.modeFocus}
                    </button>
                  </div>

                  <label className="p-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-500 rounded-lg cursor-pointer transition-all border border-slate-200 dark:border-slate-700">
                    <Upload className="w-3.5 h-3.5" />
                    <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, researchMode === 'new')} />
                  </label>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28 scroll-smooth scrollbar-hide">
                {activeSession && activeSession.messages.length === 0 && (
                  <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-xl mb-6">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center space-y-2 mb-10">
                      <h3 className="text-xl font-black tracking-tighter dark:text-white">{t.research}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">{t.selectMode}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
                      <div 
                        onClick={() => { setResearchMode('new'); fileInputRef.current?.click(); }}
                        className={`group cursor-pointer bg-white dark:bg-slate-900 border-2 p-6 rounded-[2rem] hover:shadow-xl transition-all text-center space-y-3 ${researchMode === 'new' ? 'border-blue-500' : 'border-slate-100 dark:border-slate-800'}`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all ${researchMode === 'new' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                          <FileUp className="w-6 h-6" />
                        </div>
                        <h4 className="font-black text-sm dark:text-white">{t.focusNewDocs}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.focusDesc}</p>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFileUpload(e, true)} />
                      </div>

                      <div 
                        onClick={() => { setResearchMode('library'); setInputValue(t.summaryPrompt); }}
                        className={`group cursor-pointer bg-white dark:bg-slate-900 border-2 p-6 rounded-[2rem] hover:shadow-xl transition-all text-center space-y-3 ${researchMode === 'library' ? 'border-indigo-500' : 'border-slate-100 dark:border-slate-800'}`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all ${researchMode === 'library' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'}`}>
                          <Database className="w-6 h-6" />
                        </div>
                        <h4 className="font-black text-sm dark:text-white">{t.useLibrary}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.libraryDesc}</p>
                      </div>
                    </div>
                  </div>
                )}
                {activeSession?.messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-300`}>
                    <div className={`max-w-[85%] p-4 rounded-xl shadow-sm text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-slate-200'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl animate-pulse w-32 flex items-center justify-center gap-1.5">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-75" />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                )}
              </div>

              {/* MESSAGE INPUT */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-slate-950 via-white/95 dark:via-slate-950/95 to-transparent">
                 <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative group">
                    <input 
                      type="text" 
                      value={inputValue} 
                      onChange={e => setInputValue(e.target.value)} 
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-5 pr-14 shadow-xl focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all text-sm font-medium dark:text-white" 
                    />
                    <button type="submit" disabled={!inputValue.trim() || isLoading} className="absolute right-2 top-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-lg transition-all disabled:opacity-50">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                 </form>
                 <p className="text-center text-[8px] mt-3 text-slate-400 font-black uppercase tracking-widest opacity-50">{t.poweredBy}</p>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW MODAL */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative border border-slate-200 dark:border-slate-800">
               <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg shadow-inner">
                      {previewDoc.type === 'pptx' ? <Presentation className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-tight dark:text-white truncate max-w-xs">{previewDoc.name}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{t.docDetails} • {previewDoc.uploadDate}</p>
                    </div>
                  </div>
                  <button onClick={() => setPreviewDoc(null)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-md transition-all"><X className="w-5 h-5" /></button>
               </header>
               <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
                  {previewDoc.type === 'pdf' || previewDoc.type === 'pptx' || previewDoc.type === 'doc' ? (
                     <iframe src={`${previewDoc.fileData}#toolbar=0`} className="w-full h-full border-none" title="Viewer" />
                  ) : previewDoc.type === 'docx' ? (
                     <div className="h-full overflow-y-auto p-8 md:p-16 bg-white dark:bg-slate-900 font-serif text-lg leading-relaxed dark:text-slate-200">
                        <div className="max-w-3xl mx-auto docx-content animate-in fade-in duration-500" dangerouslySetInnerHTML={{ __html: docxHtml }} />
                     </div>
                  ) : (
                     <div className="p-8 font-mono text-sm whitespace-pre-wrap leading-relaxed dark:text-slate-300 h-full overflow-y-auto">{previewDoc.content}</div>
                  )}
               </div>
               <footer className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t.rawContent}</span>
               </footer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
