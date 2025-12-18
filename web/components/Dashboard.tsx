
import React from 'react';
import { Sparkles, ChevronRight, History, MessageSquare, Clock, Globe, Library, Upload, Presentation, FileText, Eye } from 'lucide-react';
import { ChatSession, NewsArticle, Document } from '../types';

interface DashboardProps {
  t: any;
  chatSessions: ChatSession[];
  trendingNews: NewsArticle[];
  documents: Document[];
  isNewsLoading: boolean;
  onCreateSession: () => void;
  onOpenSession: (id: string) => void;
  onNewsAction: (news: NewsArticle) => void;
  onFileAction: (doc: Document) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: (doc: Document) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  t, chatSessions, trendingNews, documents, isNewsLoading, onCreateSession, onOpenSession, onNewsAction, onFileAction, onFileUpload, onPreview
}) => {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3 h-3" /> {t.portalName}
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white leading-tight">{t.welcome}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.tagline}</p>
        </div>
        <button onClick={onCreateSession} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all">
          {t.startNew} <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      <section className="space-y-4">
        <h3 className="font-black text-xl flex items-center gap-2 tracking-tight dark:text-white">
          <History className="w-5 h-5 text-purple-500" /> {t.recentDiscussions}
        </h3>
        {chatSessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chatSessions.slice(0, 6).map(session => (
              <div key={session.id} onClick={() => onOpenSession(session.id)} className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex items-start gap-3">
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
          <h3 className="font-black text-xl flex items-center gap-2 tracking-tight dark:text-white">
            <Globe className="w-5 h-5 text-blue-500" /> {t.trendingTitle}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {isNewsLoading ? <div className="h-24 bg-slate-100 dark:bg-slate-800/30 rounded-2xl animate-pulse" /> :
              trendingNews.map((news, idx) => (
                <div key={idx} onClick={() => onNewsAction(news)} className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex flex-col gap-1">
                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-md uppercase w-fit">{news.category}</span>
                  <h4 className="font-bold text-sm dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">{news.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{news.summary}</p>
                </div>
              ))
            }
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl flex items-center gap-2 tracking-tight dark:text-white">
              <Library className="w-5 h-5 text-indigo-500" /> {t.knowledgeTitle}
            </h3>
            <label className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 cursor-pointer uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md">
              {t.uploadDesc}
              <input type="file" className="hidden" multiple onChange={onFileUpload} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {documents.length > 0 ? documents.map(doc => (
              <div key={doc.id} onClick={() => onFileAction(doc)} className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'}`}>
                  {doc.type === 'pptx' ? <Presentation className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate dark:text-white">{doc.name}</h4>
                  <p className="text-[9px] text-slate-400 uppercase font-black">{doc.type} • {doc.uploadDate}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onPreview(doc); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-300 hover:text-indigo-500 transition-all">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            )) : <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-xs font-black text-slate-400 uppercase">{t.noDocsFocused}</p>
            </div>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
