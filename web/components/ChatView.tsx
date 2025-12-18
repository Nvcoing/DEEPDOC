
import React from 'react';
import { ChevronLeft, Upload, MessageSquare, FileUp, Database, ChevronRight } from 'lucide-react';
import { ChatSession, ResearchMode } from '../types';

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
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const ChatView: React.FC<ChatViewProps> = ({
  t, activeSession, researchMode, setResearchMode, onBack, onFileUpload, onSendMessage, inputValue, setInputValue, isLoading, fileInputRef
}) => {
  return (
    <div className="flex-1 flex flex-col relative">
      <header className="h-12 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div onClick={onBack} className="p-1 bg-slate-50 dark:bg-slate-800 rounded-md cursor-pointer hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700">
            <ChevronLeft className="w-3.5 h-3.5" />
          </div>
          <h2 className="font-black text-sm tracking-tight dark:text-white truncate max-w-xs">{activeSession.title}</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button onClick={() => setResearchMode('library')} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${researchMode === 'library' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>
              <Database className="w-3 h-3" /> {t.modeLibrary}
            </button>
            <button onClick={() => setResearchMode('new')} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${researchMode === 'new' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>
              <FileUp className="w-3 h-3" /> {t.modeFocus}
            </button>
          </div>
          <label className="p-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-lg cursor-pointer transition-all border border-slate-200 dark:border-slate-700">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" className="hidden" multiple onChange={onFileUpload} />
          </label>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28 scroll-smooth scrollbar-hide">
        {activeSession.messages.length === 0 && (
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-700">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-xl mb-6"><MessageSquare className="w-8 h-8 text-white" /></div>
            <div className="text-center space-y-2 mb-10">
              <h3 className="text-xl font-black tracking-tighter dark:text-white">{t.research}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">{t.selectMode}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
              <div onClick={() => { setResearchMode('new'); fileInputRef.current?.click(); }} className={`group cursor-pointer bg-white dark:bg-slate-900 border-2 p-6 rounded-[2rem] hover:shadow-xl transition-all text-center space-y-3 ${researchMode === 'new' ? 'border-blue-500' : 'border-slate-100 dark:border-slate-800'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all ${researchMode === 'new' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}><FileUp className="w-6 h-6" /></div>
                <h4 className="font-black text-sm dark:text-white">{t.focusNewDocs}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.focusDesc}</p>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={onFileUpload} />
              </div>
              <div onClick={() => { setResearchMode('library'); setInputValue(t.summaryPrompt); }} className={`group cursor-pointer bg-white dark:bg-slate-900 border-2 p-6 rounded-[2rem] hover:shadow-xl transition-all text-center space-y-3 ${researchMode === 'library' ? 'border-indigo-500' : 'border-slate-100 dark:border-slate-800'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all ${researchMode === 'library' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'}`}><Database className="w-6 h-6" /></div>
                <h4 className="font-black text-sm dark:text-white">{t.useLibrary}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.libraryDesc}</p>
              </div>
            </div>
          </div>
        )}
        {activeSession.messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-300`}>
            <div className={`max-w-[85%] p-4 rounded-xl shadow-sm text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-slate-200'}`}>{m.content}</div>
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

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-slate-950 via-white/95 dark:via-slate-950/95 to-transparent">
        <form onSubmit={onSendMessage} className="max-w-3xl mx-auto relative group">
          <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-5 pr-14 shadow-xl focus:border-blue-500 outline-none transition-all text-sm font-medium dark:text-white" />
          <button type="submit" disabled={!inputValue.trim() || isLoading} className="absolute right-2 top-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-lg transition-all disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
        <p className="text-center text-[8px] mt-3 text-slate-400 font-black uppercase tracking-widest opacity-50">{t.poweredBy}</p>
      </div>
    </div>
  );
};

export default ChatView;
