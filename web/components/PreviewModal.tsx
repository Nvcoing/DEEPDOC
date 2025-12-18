
import React, { useEffect, useState } from 'react';
import { X, Presentation, FileText } from 'lucide-react';
import { Document } from '../types';
import mammoth from 'mammoth';

interface PreviewModalProps {
  t: any;
  doc: Document;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ t, doc, onClose }) => {
  const [docxHtml, setDocxHtml] = useState<string>('');

  useEffect(() => {
    if (doc.type === 'docx' && doc.fileData) {
      fetch(doc.fileData).then(r => r.arrayBuffer()).then(ab => {
        mammoth.convertToHtml({ arrayBuffer: ab }).then(res => setDocxHtml(res.value));
      });
    }
  }, [doc]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative border border-slate-200 dark:border-slate-800">
        <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg shadow-inner">
              {doc.type === 'pptx' ? <Presentation className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-black text-sm tracking-tight dark:text-white truncate max-w-xs">{doc.name}</h4>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{t.docDetails} • {doc.uploadDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-red-50 text-red-500 rounded-md transition-all"><X className="w-5 h-5" /></button>
        </header>
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
          {doc.type === 'pdf' || doc.type === 'pptx' || doc.type === 'doc' ? (
            <iframe src={`${doc.fileData}#toolbar=0`} className="w-full h-full border-none" title="Viewer" />
          ) : doc.type === 'docx' ? (
            <div className="h-full overflow-y-auto p-8 md:p-16 bg-white dark:bg-slate-900 font-serif text-lg leading-relaxed dark:text-slate-200">
              <div className="max-w-3xl mx-auto docx-content animate-in fade-in duration-500" dangerouslySetInnerHTML={{ __html: docxHtml }} />
            </div>
          ) : (
            <div className="p-8 font-mono text-sm whitespace-pre-wrap leading-relaxed dark:text-slate-300 h-full overflow-y-auto">{doc.content}</div>
          )}
        </div>
        <footer className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t.rawContent}</span>
        </footer>
      </div>
    </div>
  );
};

export default PreviewModal;
