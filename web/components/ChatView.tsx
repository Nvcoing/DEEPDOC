
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Loader2, FileText, Presentation, Folder, ChevronRight, Sparkles, User as UserIcon, Bot, Square, CheckSquare, Plus } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const specificFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadFolderId, setActiveUploadFolderId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages.length, isAiThinking, streamingContent]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isAiThinking) return;

    const userQuestion = inputValue;
    setInputValue('');
    
    const userMsg = { 
      id: Date.now().toString(), 
      role: 'user' as const, 
      content: userQuestion, 
      timestamp: new Date().toISOString() 
    };
    activeSession.messages.push(userMsg);
    
    setIsAiThinking(true);
    setStreamingContent("");

    try {
      const selectedFiles = sessionDocs.filter(d => selectedDocIds.includes(d.id));
      const contextFileNames = selectedFiles.map(d => d.name);

      const stream = generateAnswerFromBackend(userQuestion, contextFileNames);
      
      let fullContent = "";
      for await (const chunk of stream) {
        setIsAiThinking(false);
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      const aiMsg = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant' as const, 
        content: fullContent, 
        timestamp: new Date().toISOString() 
      };
      activeSession.messages.push(aiMsg);

    } catch (err) {
      activeSession.messages.push({ 
        id: (Date.now() + 1).toString(), 
        role: 'assistant' as const, 
        content: "Lỗi kết nối AI: " + (err as Error).message, 
        timestamp: new Date().toISOString() 
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
      folderDocIds.forEach(id => {
        if (selectedDocIds.includes(id)) onToggleDoc(id);
      });
    } else {
      folderDocs.forEach(d => {
        if (!selectedDocIds.includes(d.id)) onToggleDoc(d.id);
      });
    }
  };

  const triggerSpecificUpload = (fid: string) => {
    setActiveUploadFolderId(fid);
    specificFileInputRef.current?.click();
  };

  const allVisibleFolders = personalFolder ? [personalFolder, ...folders] : folders;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-300">
      <input 
        type="file" 
        ref={specificFileInputRef} 
        className="hidden" 
        multiple 
        onChange={(e) => {
          if (activeUploadFolderId) {
            onFileUpload(e, activeUploadFolderId);
            setActiveUploadFolderId(null);
          }
        }} 
      />
      
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all group">
            <ChevronLeft className="w-5 h-5 dark:text-white text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex flex-col">
             <h2 className="font-black text-[11px] tracking-tight dark:text-white text-slate-800 truncate uppercase italic">{activeSession.title}</h2>
             <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">{t.brandName} Portal</span>
          </div>
        </div>
        
        {isUploading && (
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg animate-pulse border border-indigo-100 dark:border-indigo-800">
            <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Synchronizing...</span>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Sidebar tối giản: Chỉ hiển thị thư mục */}
        <aside className="hidden md:flex w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-4 flex-col flex-shrink-0 scrollbar-hide">
           <div className="space-y-4 flex-1">
             {allVisibleFolders.map(folder => {
               // Chỉ hiển thị tệp nằm trong thư mục này
               const folderDocs = sessionDocs.filter(d => d.folderId === folder.id && d.status === 'approved');
               const isPersonal = folder.id.startsWith('personal-');
               const isAllSelected = folderDocs.length > 0 && folderDocs.every(d => selectedDocIds.includes(d.id));
               
               return (
                 <div key={folder.id} className={`space-y-3 p-3 rounded-2xl border transition-all duration-300 ${isPersonal ? 'bg-green-50/20 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 shadow-sm'}`}>
                   <div className="flex items-center justify-between group">
                     <div 
                        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                        onClick={() => handleFolderToggle(folder.id)}
                      >
                       <div className="flex items-center justify-center">
                         {isAllSelected ? 
                           <CheckSquare className={`w-4 h-4 ${isPersonal ? 'text-green-600' : 'text-indigo-600'}`} /> : 
                           <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                         }
                       </div>
                       <div className="flex items-center gap-2 min-w-0">
                         <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${isPersonal ? 'text-green-500 fill-current' : 'text-indigo-500 fill-current'}`} />
                         <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate">
                           {folder.name}
                         </span>
                       </div>
                     </div>
                     <button 
                       onClick={() => triggerSpecificUpload(folder.id)}
                       className={`p-1.5 rounded-lg transition-all ${isPersonal ? 'bg-green-100 dark:bg-green-900/40 text-green-600 hover:bg-green-200 dark:hover:bg-green-800/60' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 hover:bg-indigo-200 dark:hover:bg-indigo-800/60'}`}
                       title="Tải tệp lên thư mục này"
                     >
                       <Plus className="w-3.5 h-3.5" />
                     </button>
                   </div>
                   
                   <div className="space-y-1 ml-6">
                     {folderDocs.map(doc => (
                       <div 
                         key={doc.id}
                         onClick={() => onToggleDoc(doc.id)}
                         className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${selectedDocIds.includes(doc.id) ? 'bg-white dark:bg-slate-800 shadow-sm opacity-100 ring-1 ring-slate-100 dark:ring-slate-700' : 'hover:bg-white dark:hover:bg-slate-800 opacity-60'}`}
                       >
                         {selectedDocIds.includes(doc.id) ? 
                           <CheckSquare className={`w-3.5 h-3.5 ${isPersonal ? 'text-green-500' : 'text-indigo-500'}`} /> : 
                           <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                         }
                         <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${doc.type === 'pptx' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'}`}>
                           {doc.type === 'pptx' ? <Presentation className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                         </div>
                         <p className="text-[10px] font-bold dark:text-white text-slate-700 truncate flex-1">{doc.name}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               );
             })}

             {allVisibleFolders.length === 0 && (
               <div className="flex flex-col items-center justify-center py-24 text-center px-4 opacity-40">
                  <Folder className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-4" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Không tìm thấy thư mục</p>
               </div>
             )}
           </div>
        </aside>

        {/* Nội dung Chat */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 scrollbar-hide pb-44">
            {activeSession.messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto animate-in fade-in duration-1000">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2rem] flex items-center justify-center shadow-2xl mb-10 transform hover:scale-110 transition-transform duration-500 group">
                  <Sparkles className="w-10 h-10 text-white group-hover:rotate-12 transition-transform" />
                </div>
                <h3 className="text-4xl font-black tracking-tighter dark:text-white text-slate-900 uppercase mb-4 italic transition-colors">{t.brandName} Intelligence</h3>
                <div className="space-y-6">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed px-10 italic transition-colors">{t.slogan}</p>
                  <div className="h-0.5 w-12 bg-indigo-500 mx-auto rounded-full" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest transition-colors">Sẵn sàng phân tích tri thức từ thư mục bạn chọn</p>
                </div>
              </div>
            )}
            
            <div className="max-w-3xl mx-auto space-y-14">
              {activeSession.messages.map(m => (
                <div key={m.id} className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-6 duration-500`}>
                  <div className={`w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center shadow-md transition-all ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-slate-100 dark:shadow-none'}`}>
                    {m.role === 'user' ? <UserIcon className="w-5.5 h-5.5" /> : <Bot className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <div className={`group relative max-w-[85%] px-8 py-7 rounded-[2.8rem] shadow-sm text-[15px] leading-relaxed transition-colors ${m.role === 'user' ? 'bg-indigo-600 text-white font-medium' : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 dark:text-slate-200 text-slate-800'}`}>
                    <div className="prose dark:prose-invert transition-colors">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              
              {streamingContent && (
                <div className="flex gap-6 animate-in fade-in duration-300">
                  <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-md">
                    <Bot className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-8 py-7 rounded-[2.8rem] shadow-sm w-full prose dark:prose-invert transition-colors">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                  </div>
                </div>
              )}

              {isAiThinking && (
                <div className="flex gap-6 animate-in fade-in duration-300">
                  <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-md">
                    <Bot className="w-5.5 h-5.5 text-indigo-500 animate-bounce-subtle" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-10 py-8 rounded-[2.8rem] shadow-sm w-full max-w-sm transition-colors">
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                         <div className="w-3.5 h-3.5 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse" />
                         <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em] italic animate-pulse">Processing...</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
                        <div className="h-full bg-indigo-500 animate-shimmer bg-[length:200%_100%] shimmer-bg shadow-indigo-500/20 shadow-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Ô nhập liệu */}
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-gradient-to-t from-white dark:from-slate-950 via-white/95 dark:via-slate-950/95 to-transparent z-30 transition-all">
            <form onSubmit={handleChat} className="max-w-3xl mx-auto relative group">
              <input 
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                placeholder={t.searchPlaceholder} 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4rem] py-7.5 pl-14 pr-32 shadow-2xl focus:border-indigo-500 focus:ring-[14px] focus:ring-indigo-500/5 outline-none transition-all text-lg font-bold dark:text-white text-slate-800 shadow-slate-200/50 dark:shadow-none" 
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || isAiThinking || streamingContent !== ""} 
                className="absolute right-5 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-6 rounded-full hover:bg-indigo-700 shadow-xl transition-all disabled:opacity-30 active:scale-90 flex items-center justify-center h-[66px] w-[66px]"
              >
                <ChevronRight className="w-9 h-9" />
              </button>
            </form>
            <p className="text-center text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.5em] mt-10 opacity-60 transition-colors">
              Knowledge Hub Intelligence • v2.5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
