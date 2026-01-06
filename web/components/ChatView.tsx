
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Loader2, FileText, Presentation, Folder, ChevronRight, Sparkles, User as UserIcon, Bot, Square, CheckSquare, Plus, Clock, Timer } from 'lucide-react';
import { ChatSession, Folder as FolderType, Document, ResearchMode } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateAnswerFromBackend } from '../apiService';

interface ChatViewProps {
  t: any;
  activeSession: ChatSession;
  researchMode: ResearchMode;
  setResearchMode: (mode: ResearchMode) => void;
  onBack: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, targetFolderId?: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  isLoading: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  folders: FolderType[];
  personalFolder?: FolderType;
  onToggleFolderInChat: (folderId: string) => void;
  selectedFolderIds: string[];
  sessionDocs: Document[];
  selectedDocIds: string[];
  onToggleDoc: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  t, activeSession, onBack, onFileUpload, inputValue, setInputValue, isUploading, folders, personalFolder, sessionDocs, selectedDocIds, onToggleDoc
}) => {
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const specificFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadFolderId, setActiveUploadFolderId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const atBottom = scrollHeight - clientHeight - scrollTop < 150;
    setUserHasScrolledUp(!atBottom);
  };

  const scrollToBottom = () => {
    if (userHasScrolledUp) return;
    // Sử dụng block: 'center' để đẩy nội dung mới lên giữa màn hình, phía trên thanh chat
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages.length, isAiThinking, streamingContent]);

  useEffect(() => {
    if (isAiThinking) {
      setProcessingTime(0);
      timerRef.current = window.setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isAiThinking]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isAiThinking) return;

    const userQuestion = inputValue;
    setInputValue('');
    setUserHasScrolledUp(false);
    
    activeSession.messages.push({ 
      id: Date.now().toString(), role: 'user', content: userQuestion, timestamp: new Date().toISOString() 
    });
    
    setIsAiThinking(true);
    setStreamingContent("");

    try {
      const selectedFiles = sessionDocs.filter(d => selectedDocIds.includes(d.id) && d.status === 'approved');
      const contextFileNames = selectedFiles.map(d => d.name);
      const stream = generateAnswerFromBackend(userQuestion, contextFileNames);
      
      let fullContent = "";
      for await (const chunk of stream) {
        setIsAiThinking(false);
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      activeSession.messages.push({ 
        id: (Date.now() + 1).toString(), role: 'assistant', content: fullContent, timestamp: new Date().toISOString() 
      });

    } catch (err) {
      activeSession.messages.push({ 
        id: (Date.now() + 1).toString(), role: 'assistant', content: "Lỗi kết nối AI: " + (err as Error).message, timestamp: new Date().toISOString() 
      });
    } finally {
      setIsAiThinking(false);
      setStreamingContent("");
    }
  };

  const handleFolderToggle = (folderId: string) => {
    const folderDocs = sessionDocs.filter(d => d.folderId === folderId && d.status === 'approved');
    const folderDocIds = folderDocs.map(d => d.id);
    const isAllSelected = folderDocIds.length > 0 && folderDocIds.every(id => selectedDocIds.includes(id));
    
    if (isAllSelected) {
      folderDocIds.forEach(id => { if (selectedDocIds.includes(id)) onToggleDoc(id); });
    } else {
      folderDocs.forEach(d => { if (!selectedDocIds.includes(d.id)) onToggleDoc(d.id); });
    }
  };

  const allVisibleFolders = personalFolder ? [personalFolder, ...folders] : folders;

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden relative">
      <input type="file" ref={specificFileInputRef} className="hidden" multiple onChange={(e) => { if (activeUploadFolderId) { onFileUpload(e, activeUploadFolderId); setActiveUploadFolderId(null); } }} />
      
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all group">
            <ChevronLeft className="w-5 h-5 dark:text-white group-hover:-translate-x-0.5" />
          </button>
          <div className="flex flex-col">
             <h2 className="font-black text-xs dark:text-white uppercase italic tracking-tight">{activeSession.title}</h2>
             <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic leading-none">{t.brandName} Intelligence</span>
          </div>
        </div>
        
        {isUploading && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Processing...</span>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="hidden md:flex w-80 border-r border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 overflow-y-auto p-5 flex-col flex-shrink-0 scrollbar-hide space-y-6">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2">Thư viện ngữ cảnh</h3>
           <div className="space-y-4">
             {allVisibleFolders.map(folder => {
               const folderDocs = sessionDocs.filter(d => d.folderId === folder.id && (d.status === 'approved' || d.status === 'uploading'));
               const isPersonal = folder.id.startsWith('personal-');
               const isAllSelected = folderDocs.length > 0 && folderDocs.every(d => d.status === 'approved' && selectedDocIds.includes(d.id));
               
               return (
                 <div key={folder.id} className={`p-4 rounded-[1.5rem] border transition-all duration-300 ${isPersonal ? 'bg-green-50/30 dark:bg-green-900/10 border-green-100/50 dark:border-green-900/30' : 'bg-white dark:bg-slate-800 border-slate-200/50 dark:border-slate-800 shadow-sm'}`}>
                   <div className="flex items-center justify-between group mb-4">
                     <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => handleFolderToggle(folder.id)}>
                       <div className="flex-shrink-0">
                         {isAllSelected ? <CheckSquare className={`w-4 h-4 ${isPersonal ? 'text-green-600' : 'text-indigo-600'}`} /> : <Square className="w-4 h-4 text-slate-300" />}
                       </div>
                       <div className="flex items-center gap-2 min-w-0">
                         <Folder className={`w-4 h-4 flex-shrink-0 ${isPersonal ? 'text-green-500 fill-current' : 'text-indigo-500 fill-current'}`} />
                         <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase truncate pt-0.5">{folder.name}</span>
                       </div>
                     </div>
                     <button onClick={() => { setActiveUploadFolderId(folder.id); specificFileInputRef.current?.click(); }} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                       <Plus className="w-3.5 h-3.5" />
                     </button>
                   </div>
                   
                   <div className="space-y-2 pl-6 border-l border-slate-100 dark:border-slate-700/50">
                     {folderDocs.map(doc => (
                       <div key={doc.id} onClick={() => doc.status === 'approved' && onToggleDoc(doc.id)} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${doc.status === 'uploading' ? 'opacity-50 animate-pulse' : selectedDocIds.includes(doc.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20 cursor-pointer' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 opacity-60 cursor-pointer'}`}>
                         <div className="flex-shrink-0">
                           {doc.status === 'uploading' ? <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" /> : selectedDocIds.includes(doc.id) ? <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> : <Square className="w-3.5 h-3.5 text-slate-200" />}
                         </div>
                         <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                           {doc.type === 'pptx' ? <Presentation className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                         </div>
                         <p className="text-[11px] font-bold dark:text-white text-slate-700 truncate flex-1">{doc.name}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               );
             })}
           </div>
        </aside>

        <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950">
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 scrollbar-hide pb-96"
          >
            {activeSession.messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-20">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-12 transform hover:rotate-6 transition-transform">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-4xl font-black tracking-tighter dark:text-white uppercase mb-6 italic">{t.brandName} Portal</h3>
                <div className="h-1 w-16 bg-indigo-500 mx-auto rounded-full mb-6" />
                <p className="text-slate-500 dark:text-slate-400 text-[13px] font-bold uppercase tracking-widest leading-relaxed px-12 italic opacity-80">{t.slogan}</p>
              </div>
            )}
            
            <div className="max-w-3xl mx-auto space-y-12">
              {activeSession.messages.map(m => (
                <div key={m.id} className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`w-11 h-11 flex-shrink-0 rounded-[1rem] flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {m.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5 text-indigo-500" />}
                  </div>
                  <div className="flex flex-col gap-2 max-w-[85%]">
                    <div className={`px-7 py-6 rounded-[2rem] shadow-sm text-[15px] leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white font-bold shadow-indigo-100' : 'bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 dark:text-slate-200'}`}>
                      <div className="prose dark:prose-invert max-w-none prose-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <Clock className="w-2.5 h-2.5" /> {formatTime(m.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {(streamingContent || isAiThinking) && (
                <div className="flex gap-6 animate-in fade-in duration-300">
                  <div className="w-11 h-11 flex-shrink-0 rounded-[1rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <Bot className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex flex-col gap-3 w-full max-w-none">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-7 py-6 rounded-[2rem] shadow-sm">
                      {isAiThinking ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full w-fit border border-indigo-100 dark:border-indigo-800">
                            <Timer className="w-3 h-3 text-indigo-600 animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Processing: {processingTime}s</span>
                          </div>
                        </div>
                      ) : (
                        <div className="prose dark:prose-invert max-w-none prose-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-24" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-gradient-to-t from-white dark:from-slate-950 via-white dark:via-slate-950 to-transparent z-30">
            <form onSubmit={handleChat} className="max-w-3xl mx-auto relative group">
              <input 
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                placeholder={t.searchPlaceholder} 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] py-6 pl-12 pr-28 shadow-2xl focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 outline-none transition-all text-base font-bold dark:text-white" 
              />
              <button type="submit" disabled={!inputValue.trim() || isAiThinking} className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-4.5 rounded-[1.8rem] hover:bg-indigo-700 shadow-xl transition-all disabled:opacity-30 active:scale-95 group">
                <ChevronRight className="w-7 h-7 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
