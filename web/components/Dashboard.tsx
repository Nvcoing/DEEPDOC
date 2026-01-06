
import React from 'react';
import { ChevronRight, History, MessageSquare, Presentation, FileText, Eye, FolderIcon, Download, Trash2, Clock, CheckCircle, XCircle, Layout, Loader2, Plus } from 'lucide-react';
// Fix: Added NewsArticle to imports to support new props
import { ChatSession, Document, NewsArticle } from '../types';
import { downloadFile } from '../apiService';

interface DashboardProps {
  t: any;
  chatSessions: ChatSession[];
  documents: Document[];
  onCreateSession: () => void;
  onOpenSession: (id: string) => void;
  onFileAction: (doc: Document) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: (doc: Document) => void;
  onDelete?: (id: string) => void;
  // Fix: Added missing props to interface to resolve TS error in App.tsx
  trendingNews: NewsArticle[];
  isNewsLoading: boolean;
  onNewsAction: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  // Fix: Destructured the added news-related props
  t, chatSessions, documents, onCreateSession, onOpenSession, onFileAction, onFileUpload, onPreview, onDelete,
  trendingNews, isNewsLoading, onNewsAction
}) => {
  const filteredDocs = documents.filter(doc => !doc.isDeleted);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'rejected': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'uploading': return <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />;
      default: return <Clock className="w-3.5 h-3.5 text-orange-400" />;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-200/60 dark:border-slate-800/60 pb-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[11px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50">
            <Layout className="w-4 h-4" /> {t.portalName}
          </div>
          <h2 className="text-6xl font-black tracking-tighter dark:text-white mt-2 italic uppercase leading-none drop-shadow-sm">
            {t.welcome}
          </h2>
        </div>
        
        <button 
          onClick={onCreateSession} 
          className="relative flex items-center gap-4 px-12 py-6 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-300 dark:shadow-indigo-950/50 hover:scale-105 hover:shadow-indigo-400 dark:hover:shadow-indigo-900 transition-all active:scale-[0.98] group overflow-hidden"
        >
          {/* Subtle background shimmer */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
          
          <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-90 transition-transform duration-500">
            <Plus className="w-6 h-6" />
          </div>
          <span className="relative uppercase tracking-tight italic">{t.startNew}</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <section className="lg:col-span-5 space-y-8">
          <h3 className="font-black text-2xl flex items-center gap-3 dark:text-white italic uppercase tracking-tight">
            <div className="w-2 h-8 bg-purple-500 rounded-full" /> {t.recentDiscussions}
          </h3>
          <div className="grid gap-5">
            {chatSessions.length > 0 ? chatSessions.slice(0, 5).map(session => (
              <div key={session.id} onClick={() => onOpenSession(session.id)} className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] hover:shadow-2xl hover:border-indigo-400 transition-all flex items-center gap-5 group border-b-4 border-b-slate-100 dark:border-b-slate-950">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-black text-sm dark:text-white block uppercase italic tracking-wide break-words">{session.title}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">{new Date(session.lastUpdated).toLocaleDateString()}</span>
                </div>
              </div>
            )) : <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] opacity-50">
                   <p className="text-slate-400 text-xs italic uppercase font-black tracking-widest">Chưa có thảo luận nào</p>
                 </div>}
          </div>
        </section>

        <section className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-2xl flex items-center gap-3 dark:text-white italic uppercase tracking-tight">
              <div className="w-2 h-8 bg-indigo-500 rounded-full" /> {t.knowledgeTitle}
            </h3>
            <label className="text-[11px] font-black text-indigo-600 cursor-pointer uppercase bg-indigo-50 dark:bg-indigo-900/30 px-5 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
              {t.uploadDesc}
              <input type="file" className="hidden" multiple onChange={onFileUpload} />
            </label>
          </div>
          <div className="grid gap-5">
            {filteredDocs.length > 0 ? filteredDocs.map(doc => (
              <div key={doc.id} className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] transition-all flex items-center gap-5 border-b-4 border-b-slate-100 dark:border-b-slate-950 ${doc.status === 'uploading' ? 'opacity-70 animate-pulse' : 'hover:shadow-2xl hover:border-indigo-400'}`}>
                <div className={`p-4 rounded-2xl ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {doc.type === 'pptx' ? <Presentation className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0" onClick={() => (doc.status === 'approved' || doc.status === 'uploading') && onFileAction(doc)}>
                  <div className="flex items-center gap-2.5">
                    <h4 className={`font-black text-sm dark:text-white uppercase italic tracking-wide pt-0.5 break-words ${(doc.status === 'approved' || doc.status === 'uploading') ? 'cursor-pointer hover:text-indigo-600' : 'text-slate-400'}`}>{doc.name}</h4>
                    {getStatusIcon(doc.status)}
                  </div>
                  <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mt-1">{doc.type} • {doc.uploadDate}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => onPreview(doc)} className="p-2.5 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors" disabled={doc.status === 'uploading'}>
                    <Eye className="w-5 h-5" />
                  </button>
                  {doc.status === 'approved' && (
                    <button onClick={() => downloadFile(doc.name)} className="p-2.5 hover:bg-green-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-green-600 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  {doc.status !== 'uploading' && (
                    <button onClick={() => onDelete?.(doc.id)} className="p-2.5 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )) : <div className="py-40 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] opacity-50 space-y-4">
                   <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto"><FileText className="w-8 h-8 text-slate-300" /></div>
                   <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{t.noDocsFocused}</p>
                 </div>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
