
import React, { useState } from 'react';
import { Sparkles, ChevronRight, History, MessageSquare, Search, Download, Trash, Presentation, FileText, Eye, FolderIcon } from 'lucide-react';
import { ChatSession, NewsArticle, Document } from '../types';
import { downloadFile, hardDeleteFile } from '../apiService';

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
  viewMode?: 'all' | 'trash';
}

const Dashboard: React.FC<DashboardProps> = ({
  t, chatSessions, trendingNews, documents, isNewsLoading, onCreateSession, onOpenSession, onNewsAction, onFileAction, onFileUpload, onPreview, viewMode = 'all'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (viewMode === 'trash') return doc.isDeleted && matchesSearch;
    return !doc.isDeleted && matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> {t.portalName}
          </div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white">{viewMode === 'trash' ? t.trash : t.welcome}</h2>
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {viewMode === 'all' && (
          <button onClick={onCreateSession} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg hover:scale-105 transition-all">
            {t.startNew} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-4">
          <h3 className="font-black text-xl flex items-center gap-2 dark:text-white">
            <History className="w-5 h-5 text-purple-500" /> {t.recentDiscussions}
          </h3>
          <div className="grid gap-3">
            {chatSessions.slice(0, 4).map(session => (
              <div key={session.id} onClick={() => onOpenSession(session.id)} className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-sm dark:text-white">{session.title}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl flex items-center gap-2 dark:text-white">
              <FolderIcon className="w-5 h-5 text-indigo-500" /> {t.knowledgeTitle}
            </h3>
            {viewMode === 'all' && (
              <label className="text-[9px] font-black text-indigo-600 cursor-pointer uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md">
                {t.uploadDesc}
                <input type="file" className="hidden" multiple onChange={onFileUpload} />
              </label>
            )}
          </div>
          <div className="grid gap-3">
            {filteredDocs.length > 0 ? filteredDocs.map(doc => (
              <div key={doc.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex items-center gap-3">
                <div className={`p-2 rounded-xl ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {doc.type === 'pptx' ? <Presentation className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0" onClick={() => onFileAction(doc)}>
                  <h4 className="font-bold text-sm truncate dark:text-white cursor-pointer">{doc.name}</h4>
                  <p className="text-[9px] text-slate-400 font-black">{doc.type} • {doc.uploadDate}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onPreview(doc)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => downloadFile(doc.name)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-green-500"><Download className="w-4 h-4" /></button>
                  {viewMode === 'all' ? (
                    <button onClick={() => hardDeleteFile(doc.name)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"><Trash className="w-4 h-4" /></button>
                  ) : (
                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 font-bold text-[10px]">{t.restore}</button>
                  )}
                </div>
              </div>
            )) : <p className="text-center py-10 text-slate-400 text-xs font-black uppercase">{t.noDocsFocused}</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
