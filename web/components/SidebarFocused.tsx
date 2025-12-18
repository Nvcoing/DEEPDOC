
import React from 'react';
import { Layers, Plus, FileText, Presentation, Trash2, FileUp } from 'lucide-react';
import { Document } from '../types';

interface SidebarFocusedProps {
  t: any;
  selectedDocIds: string[];
  documents: Document[];
  onUpload: () => void;
  onRemove: (id: string) => void;
}

const SidebarFocused: React.FC<SidebarFocusedProps> = ({ t, selectedDocIds, documents, onUpload, onRemove }) => {
  return (
    <aside className="w-72 flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-30 animate-in slide-in-from-left duration-500">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Layers className="w-4 h-4" /> {t.focusedDocs}
        </h3>
        <button onClick={onUpload} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 rounded-lg">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {selectedDocIds.length > 0 ? selectedDocIds.map(id => {
          const doc = documents.find(d => d.id === id);
          if (!doc) return null;
          return (
            <div key={id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-sm hover:border-blue-400 transition-all group relative">
              <div className="flex items-center gap-2 mb-1">
                {doc.type === 'pptx' ? <Presentation className="w-3.5 h-3.5 text-orange-500" /> : <FileText className="w-3.5 h-3.5 text-blue-500" />}
                <span className="text-[11px] font-bold truncate max-w-[150px] dark:text-slate-200">{doc.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase text-slate-400">{doc.type}</span>
                <button onClick={() => onRemove(id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center"><FileUp className="w-6 h-6 text-slate-400" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{t.noDocsFocused}</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarFocused;
