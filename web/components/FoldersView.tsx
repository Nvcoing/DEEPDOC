
import React, { useState, useMemo } from 'react';
import { FolderPlus, Upload, ChevronRight, Folder, FileText, Presentation, ChevronLeft, Trash2, Search, X, Sparkles } from 'lucide-react';
import { Folder as FolderType, Document } from '../types';

interface FoldersViewProps {
  t: any;
  folders: FolderType[];
  documents: Document[];
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilePreview: (doc: Document) => void;
  onDeleteFolder: (id: string) => void;
  onChatWithFolder: (folderId: string) => void;
  isAdmin: boolean;
}

const FoldersView: React.FC<FoldersViewProps> = ({
  t, folders, documents, currentFolderId, onNavigate, onCreateFolder, onUpload, onFilePreview, onDeleteFolder, onChatWithFolder, isAdmin
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const currentFolder = folders.find(f => f.id === currentFolderId);
  
  const filteredSubFolders = useMemo(() => {
    return folders.filter(f => 
      f.parentId === currentFolderId && 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folders, currentFolderId, searchQuery]);

  const filteredFolderDocs = useMemo(() => {
    return documents.filter(d => 
      d.folderId === currentFolderId && 
      !d.isDeleted && 
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, currentFolderId, searchQuery]);

  const hasApprovedDocs = useMemo(() => {
    return documents.some(d => d.folderId === currentFolderId && d.status === 'approved' && !d.isDeleted);
  }, [documents, currentFolderId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() && isAdmin) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const hasContent = filteredSubFolders.length > 0 || filteredFolderDocs.length > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          {currentFolderId && (
            <button onClick={() => onNavigate(currentFolder?.parentId || null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
              <ChevronLeft className="w-5 h-5 dark:text-white" />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-black tracking-tighter dark:text-white flex items-center gap-2 italic uppercase">
              <Folder className="w-8 h-8 text-indigo-50" />
              {currentFolder ? currentFolder.name : t.folderMgmt}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white shadow-sm w-48 md:w-64"
            />
          </div>

          {currentFolderId && hasApprovedDocs && (
            <button 
              onClick={() => onChatWithFolder(currentFolderId)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-xs shadow-lg hover:scale-105 transition-all"
            >
              <Sparkles className="w-4 h-4" /> {t.askAiFolder}
            </button>
          )}

          {isAdmin && (
            <button 
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-md"
            >
              <FolderPlus className="w-4 h-4" /> {t.createFolder}
            </button>
          )}
          
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" /> {t.uploadFile}
            <input type="file" className="hidden" multiple onChange={onUpload} />
          </label>
        </div>
      </header>

      {isCreating && isAdmin && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-200 shadow-lg">
          <Folder className="w-5 h-5 text-indigo-500" />
          <input 
            autoFocus
            type="text" 
            placeholder={t.folderNamePlaceholder}
            className="flex-1 bg-transparent border-none outline-none font-bold text-sm dark:text-white italic"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button type="button" onClick={() => setIsCreating(false)} className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.back}</button>
          <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-md hover:bg-indigo-700 transition-all">OK</button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredSubFolders.map(folder => (
          <div 
            key={folder.id} 
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] hover:border-indigo-500 hover:shadow-2xl transition-all cursor-pointer relative border-b-4 border-b-slate-100 dark:border-b-slate-950"
          >
            <div onClick={() => onNavigate(folder.id)} className="space-y-4">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Folder className="w-7 h-7 fill-current" />
              </div>
              <div>
                <h4 className="font-black text-sm dark:text-white uppercase italic truncate">{folder.name}</h4>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{folder.isSystem ? t.personalStorage : t.folderMgmt}</p>
              </div>
            </div>
            {isAdmin && !folder.isSystem && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        
        {filteredFolderDocs.map(doc => (
          <div 
            key={doc.id}
            onClick={() => onFilePreview(doc)}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] hover:shadow-2xl hover:border-indigo-400 transition-all cursor-pointer border-b-4 border-b-slate-100 dark:border-b-slate-950"
          >
            <div className="space-y-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${doc.type === 'pptx' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                {doc.type === 'pptx' ? <Presentation className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
              </div>
              <div>
                <h4 className="font-black text-sm dark:text-white italic uppercase truncate">{doc.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{doc.type}</p>
                   <span className={`w-1.5 h-1.5 rounded-full ${doc.status === 'approved' ? 'bg-green-500' : 'bg-orange-400'}`} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {!hasContent && !isCreating && (
          <div className="col-span-full py-24 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto opacity-50">
              <Folder className="w-12 h-12 text-slate-300" />
            </div>
            <p className="text-slate-400 font-black uppercase text-xs tracking-[0.3em] italic opacity-60">{t.emptyFolder}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoldersView;
