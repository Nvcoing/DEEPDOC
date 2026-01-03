
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Upload, MessageSquare, ChevronDown, Loader2, CheckCircle2, FileText, Presentation, Folder, Check, ChevronRight, Sparkles, User as UserIcon, Bot } from 'lucide-react';
import { ChatSession, Folder as FolderType, Document, ResearchMode } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatViewProps {
  t: any;
  activeSession: ChatSession;
  researchMode: ResearchMode;
  setResearchMode: (mode: ResearchMode) => void;
  onBack: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (e: React.FormEvent) => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  isLoading: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  folders: FolderType[];
  onToggleFolderInChat: (folderId: string) => void;
  selectedFolderIds: string[];
  sessionDocs: Document[];
  selectedDocIds: string[];
  onToggleDoc: (id: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  t, activeSession, researchMode, setResearchMode, onBack, onFileUpload, onSendMessage, inputValue, setInputValue, isLoading, isUploading, fileInputRef, folders, onToggleFolderInChat, selectedFolderIds, sessionDocs, selectedDocIds, onToggleDoc
}) => {
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages.length, isLoading]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Session Toolbar */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5 dark:text-white" />
          </button>
          
          <div className="flex flex-col min-w-0">
             <h2 className="font-black text-xs tracking-tight dark:text-white truncate uppercase">{activeSession.title}</h2>
             <div className="relative">
                <button 
                  onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}
                  className="flex items-center gap-1.5 mt-0.5 group"
                >
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">{t.selectFolderChat}</span>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all">
                    <span className="text-[9px] font-bold text-indigo-600">
                      {selectedFolderIds.length === 0 ? t.allFolders : `${selectedFolderIds.length} ${t.folderMgmt}`}
                    </span>
                    <ChevronDown className={`w-2.5 h-2.5 text-indigo-400 transition-transform ${isFolderMenuOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isFolderMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsFolderMenuOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-40 animate-in fade-in slide-in-from-top-2">
                       <div className="max-h-64 overflow-y-auto space-y-1 p-1 scrollbar-hide">
                          {folders.map(folder => (
                            <button 
                              key={folder.id}
                              onClick={() => onToggleFolderInChat(folder.id)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${selectedFolderIds.includes(folder.id) ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${selectedFolderIds.includes(folder.id) ? 'text-indigo-500' : 'text-slate-400'}`} />
                                <span className="text-[11px] font-bold truncate">{folder.name}</span>
                              </div>
                              {selectedFolderIds.includes(folder.id) && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                       </div>
                    </div>
                  </>
                )}
             </div>
          </div>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-md active:scale-95"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">{t.uploadFile}</span>
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={onFileUpload} />
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Context Sidebar (Left) */}
        <aside className="hidden md:flex w-72 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 overflow-y-auto p-5 flex-col space-y-4 flex-shrink-0 scrollbar-hide">
           <div className="flex items-center justify-between px-2 mb-2">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.focusedDocs}</h3>
             <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-[9px] font-black rounded-full">{sessionDocs.length}</span>
           </div>
           
           {isUploading && (
             <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 animate-pulse">
               <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tải lên...</span>
             </div>
           )}

           <div className="space-y-2 flex-1">
             {sessionDocs.length > 0 ? sessionDocs.map(doc => (
               <div 
                 key={doc.id} 
                 onClick={() => onToggleDoc(doc.id)}
                 className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${selectedDocIds.includes(doc.id) ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-xl ring-1 ring-indigo-500/20' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
               >
                 <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                   {doc.type === 'pptx' ? <Presentation className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-[11px] font-black truncate dark:text-white uppercase leading-tight">{doc.name}</p>
                   <p className="text-[8px] text-slate-400 font-bold tracking-tighter mt-1 uppercase">{doc.type}</p>
                 </div>
                 {selectedDocIds.includes(doc.id) && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
               </div>
             )) : !isUploading && (
               <div className="flex flex-col items-center justify-center py-20 opacity-30 px-6">
                  <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                    <MessageSquare className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-[9px] text-slate-500 font-black uppercase text-center leading-relaxed">{t.selectToChat}</p>
               </div>
             )}
           </div>
        </aside>

        {/* Chat Conversation Area (Main) */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 scrollbar-hide pb-40">
            {activeSession.messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto animate-in fade-in duration-1000">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-8 transform hover:scale-105 transition-transform duration-500">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-black tracking-tighter dark:text-white uppercase mb-3">{t.brandName} AI</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold leading-relaxed px-6 italic">{t.slogan}</p>
              </div>
            )}
            
            <div className="max-w-3xl mx-auto space-y-12">
              {activeSession.messages.map(m => (
                <div key={m.id} className={`flex gap-5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`w-11 h-11 flex-shrink-0 rounded-[1.2rem] flex items-center justify-center shadow-lg ${m.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
                    {m.role === 'user' ? <UserIcon className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <div className={`group relative max-w-[82%] px-7 py-6 rounded-[2.5rem] shadow-sm text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white font-medium shadow-indigo-100 dark:shadow-none' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 dark:text-slate-200'}`}>
                    {m.role === 'assistant' ? (
                      <div className="prose dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="text-[15px]">{m.content}</span>
                    )}
                    
                    <span className={`absolute top-full mt-2 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ${m.role === 'user' ? 'right-6 text-indigo-400' : 'left-6 text-slate-400'}`}>
                      {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Professional Shimmer Thinking Animation */}
              {isLoading && (
                <div className="flex gap-5 animate-in fade-in duration-300">
                  <div className="w-11 h-11 flex-shrink-0 rounded-[1.2rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-indigo-500 animate-bounce-subtle" />
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-8 py-7 rounded-[2.5rem] shadow-sm w-full max-w-sm overflow-hidden relative">
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-pulse" />
                         <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] italic animate-pulse-slow">DocuMind AI đang xử lý tri thức...</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent animate-shimmer bg-[length:200%_100%] shimmer-bg" />
                        </div>
                        <div className="h-2 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative opacity-60">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent animate-shimmer bg-[length:200%_100%] delay-300 shimmer-bg" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Sticky Fixed Input Bar with Glassmorphism */}
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 bg-gradient-to-t from-white dark:from-slate-950 via-white/95 dark:via-slate-950/95 to-transparent z-30">
            <form onSubmit={onSendMessage} className="max-w-3xl mx-auto relative group">
              <input 
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                placeholder={t.searchPlaceholder} 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] py-6 pl-10 pr-24 shadow-2xl focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 outline-none transition-all text-[16px] font-bold dark:text-white" 
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || isLoading} 
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-5 rounded-full hover:bg-indigo-700 shadow-xl shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-40 active:scale-90 flex items-center justify-center h-[58px] w-[58px]"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </form>
            <p className="text-center text-[8px] text-slate-400 font-black uppercase tracking-[0.3em] mt-6 opacity-60">
              Hệ thống AI chuyên sâu về quản lý tri thức doanh nghiệp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
