
import React, { useState } from 'react';
import { Sparkles, ChevronRight, History, MessageSquare, Presentation, FileText, Eye, FolderIcon, Search, Download, Trash2, RotateCcw, Clock, CheckCircle, XCircle, Layout } from 'lucide-react';
import { ChatSession, NewsArticle, Document } from '../types';
import { downloadFile, deleteFilePermanently } from '../apiService';

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
  onDelete?: (id: string) => void;
  viewMode?: 'all' | 'trash';
}

const Dashboard: React.FC<DashboardProps> = ({
  t, chatSessions, documents, onCreateSession, onOpenSession, onFileAction, onFileUpload, onPreview, onDelete, viewMode = 'all'
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (viewMode === 'trash') return doc.isDeleted && matchesSearch;
    return !doc.isDeleted && matchesSearch;
  });

  const handleDelete = async (doc: Document) => {
    if (window.confirm(`${t.delete} ${doc.name}?`)) {
      if (viewMode === 'trash') {
        await deleteFilePermanently(doc.name);
      }
      onDelete?.(doc.id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'rejected': return <XCircle className="w-3 h-3 text-red-500" />;
      default: return <Clock className="w-3 h-3 text-orange-400" />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">
            <Layout className="w-3 h-3" /> {t.portalName}
          </div>
          <h2 className="text-4xl font-black tracking-tighter dark:text-white mt-2">{viewMode === 'trash' ? t.trash : t.welcome}</h2>
          
          <div className="relative mt-6 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white shadow-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {viewMode === 'all' && (
          <button onClick={onCreateSession} className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 transition-all">
            {t.startNew} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <h3 className="font-black text-xl flex items-center gap-2 dark:text-white">
            <History className="w-5 h-5 text-purple-500" /> {t.recentDiscussions}
          </h3>
          <div className="grid gap-4">
            {chatSessions.length > 0 ? chatSessions.slice(0, 4).map(session => (
              <div key={session.id} onClick={() => onOpenSession(session.id)} className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl hover:shadow-xl hover:border-indigo-400 transition-all flex items-center gap-4 group">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm dark:text-white block truncate">{session.title}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{new Date(session.lastUpdated).toLocaleDateString()}</span>
                </div>
              </div>
            )) : <p className="text-slate-400 text-xs italic uppercase font-black tracking-widest opacity-60">Chưa có thảo luận nào.</p>}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl flex items-center gap-2 dark:text-white">
              <FolderIcon className="w-5 h-5 text-indigo-500" /> {t.knowledgeTitle}
            </h3>
            {viewMode === 'all' && (
              <label className="text-[10px] font-black text-indigo-600 cursor-pointer uppercase bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-800">
                {t.uploadDesc}
                <input type="file" className="hidden" multiple onChange={onFileUpload} />
              </label>
            )}
          </div>
          <div className="grid gap-4">
            {filteredDocs.length > 0 ? filteredDocs.map(doc => (
              <div key={doc.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl hover:shadow-xl transition-all flex items-center gap-4">
                <div className={`p-3 rounded-xl ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {doc.type === 'pptx' ? <Presentation className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0" onClick={() => doc.status === 'approved' && onFileAction(doc)}>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-sm truncate dark:text-white ${doc.status === 'approved' ? 'cursor-pointer hover:text-indigo-500' : 'text-slate-400'}`}>{doc.name}</h4>
                    {getStatusIcon(doc.status)}
                  </div>
                  <p className="text-[10px] text-slate-400 font-black tracking-wider uppercase">{doc.type} • {doc.uploadDate}</p>
                </div>
                
                <div className="flex items-center gap-1">
                  <button onClick={() => onPreview(doc)} title={t.docDetails} className="p-2 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-500 transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                  {doc.status === 'approved' && (
                    <button onClick={() => downloadFile(doc.name)} title={t.download} className="p-2 hover:bg-green-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-green-500 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  {viewMode === 'trash' ? (
                    <button onClick={() => onDelete?.(doc.id)} title={t.restore} className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-500 transition-colors">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  ) : (
                    <button onClick={() => handleDelete(doc)} title={t.delete} className="p-2 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )) : <p className="text-center py-20 text-slate-400 text-xs font-black uppercase tracking-widest opacity-60 italic">{t.noDocsFocused}</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
