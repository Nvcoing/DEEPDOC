
import React from 'react';
import { ChevronLeft, Upload, MessageSquare, FileUp, Database, ChevronRight, Loader2, CheckCircle2, FileText, Presentation } from 'lucide-react';
import { ChatSession, ResearchMode, Folder as FolderType, Document } from '../types';

interface ChatViewProps {
  t: any;
  activeSession: ChatSession;
  researchMode: ResearchMode;
  setResearchMode: (m: ResearchMode) => void;
  onBack: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (e: React.FormEvent) => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  isLoading: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  folders: FolderType[];
  onSelectFolderForChat: (folderId: string | null) => void;
  currentSelectedFolderId: string | null;
  sessionDocs: Document[];
  selectedDocIds: string[];
  onToggleDoc: (id: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  t, activeSession, researchMode, setResearchMode, onBack, onFileUpload, onSendMessage, inputValue, setInputValue, isLoading, isUploading, fileInputRef, folders, onSelectFolderForChat, currentSelectedFolderId, sessionDocs, selectedDocIds, onToggleDoc
}) => {
  return (
    <div className="flex-1 flex flex-col relative bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5 dark:text-white" />
          </button>
          
          <div className="flex flex-col min-w-0">
             <h2 className="font-black text-sm tracking-tight dark:text-white truncate">{activeSession.title}</h2>
             <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.selectFolderChat}</span>
                <div className="relative group">
                  <select 
                    value={currentSelectedFolderId || ""}
                    onChange={(e) => onSelectFolderForChat(e.target.value || null)}
                    className="appearance-none bg-slate-100 dark:bg-slate-800 border-none pl-2 pr-6 py-0.5 rounded-md text-[10px] font-bold text-indigo-600 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    <option value="">{t.allFolders}</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setResearchMode('library')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${researchMode === 'library' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}
              title={t.libraryDesc}
            >
              <Database className="w-3.5 h-3.5" /> {t.modeLibrary}
            </button>
            <button 
              onClick={() => setResearchMode('new')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${researchMode === 'new' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              title={t.focusDesc}
            >
              <FileUp className="w-3.5 h-3.5" /> {t.modeFocus}
            </button>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            title={t.uploadFile}
          >
            <Upload className="w-4 h-4" />
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={onFileUpload} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar: Danh sách file trong phiên chat (Focused Docs) */}
        {researchMode === 'new' && (
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 overflow-y-auto p-4 space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.focusedDocs}</h3>
             
             {isUploading && (
               <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl animate-pulse">
                 <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                 <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{t.uploading}</span>
               </div>
             )}

             <div className="space-y-2">
               {sessionDocs.length > 0 ? sessionDocs.map(doc => (
                 <div 
                   key={doc.id} 
                   onClick={() => onToggleDoc(doc.id)}
                   className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedDocIds.includes(doc.id) ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md scale-[1.02]' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                 >
                   <div className={`p-2 rounded-lg ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                     {doc.type === 'pptx' ? <Presentation className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-[11px] font-black truncate dark:text-white">{doc.name}</p>
                     <p className="text-[8px] text-slate-400 uppercase font-black">{doc.type}</p>
                   </div>
                   {selectedDocIds.includes(doc.id) && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />}
                 </div>
               )) : !isUploading && (
                 <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <FileUp className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center">{t.selectToChat}</p>
                 </div>
               )}
             </div>
          </div>
        )}

        {/* Khung chat chính */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 scrollbar-hide">
            {activeSession.messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-1000">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-10 transform -rotate-12 hover:rotate-0 transition-transform duration-500">
                  <MessageSquare className="w-12 h-12 text-white" />
                </div>
                <div className="text-center space-y-4 px-6">
                  <h3 className="text-4xl md:text-5xl font-black tracking-tighter dark:text-white uppercase leading-none">{t.brandName}</h3>
                  <p className="text-slate-400 text-base md:text-lg font-black uppercase tracking-[0.4em] italic opacity-80 max-w-lg mx-auto leading-relaxed">{t.slogan}</p>
                </div>
              </div>
            )}
            
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession.messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[85%] p-5 rounded-[1.8rem] shadow-sm text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-slate-200'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[1.5rem] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Form */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/95 dark:via-slate-950/95 to-transparent">
            <form onSubmit={onSendMessage} className="max-w-3xl mx-auto relative group">
              <input 
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                placeholder={t.searchPlaceholder} 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-5 pl-7 pr-16 shadow-2xl focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 outline-none transition-all text-sm font-bold dark:text-white" 
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || isLoading} 
                className="absolute right-3.5 top-3.5 bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 shadow-xl transition-all disabled:opacity-50 active:scale-90"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
