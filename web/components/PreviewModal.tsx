
import React, { useEffect, useState } from 'react';
import { X, Presentation, FileText, Table, FileBox, ExternalLink, Download } from 'lucide-react';
import { Document } from '../types';
import mammoth from 'mammoth';
import { downloadFile } from '../apiService';

interface PreviewModalProps {
  t: any;
  doc: Document;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ t, doc, onClose }) => {
  const [docxHtml, setDocxHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const BACKEND_URL = "http://localhost:8000";

  useEffect(() => {
    setLoading(true);
    if (doc.type === 'docx' && doc.fileData) {
      // Mammoth xử lý docx từ blob/url
      fetch(doc.fileData)
        .then(r => r.arrayBuffer())
        .then(ab => mammoth.convertToHtml({ arrayBuffer: ab }))
        .then(res => {
          setDocxHtml(res.value);
          setLoading(false);
        })
        .catch(err => {
          console.error("Docx Error", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [doc]);

  const getIcon = () => {
    switch (doc.type) {
      case 'pptx': return <Presentation className="w-5 h-5" />;
      case 'docx':
      case 'doc': return <FileText className="w-5 h-5" />;
      case 'txt': return <FileText className="w-5 h-5" />;
      default: return <FileBox className="w-5 h-5" />;
    }
  };

  // Tạo link preview qua Google Docs Viewer (Yêu cầu file phải truy cập được từ internet hoặc dùng localhost nếu dev)
  // Đối với môi trường nội bộ, ta dùng iframe trực tiếp trỏ vào backend cho PDF
  const fileUrl = `${BACKEND_URL}/files/${encodeURIComponent(doc.name)}`;
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-6xl h-full bg-white dark:bg-slate-900 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative border border-white/10">
        
        <header className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              {getIcon()}
            </div>
            <div>
              <h4 className="font-black text-base dark:text-white truncate max-w-md uppercase italic">{doc.name}</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{doc.type} • {doc.uploadDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadFile(doc.name)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl" title="Tải về">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all group">
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center relative">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải tri thức...</p>
            </div>
          ) : (
            <>
              {doc.type === 'pdf' ? (
                <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
              ) : doc.type === 'docx' ? (
                <div className="w-full h-full overflow-y-auto p-8 md:p-16 bg-white dark:bg-slate-900">
                  <div className="max-w-3xl mx-auto prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: docxHtml }} />
                </div>
              ) : (doc.type === 'pptx' || doc.type === 'doc') ? (
                <iframe src={googleViewerUrl} className="w-full h-full border-none" title="Office Preview" />
              ) : doc.type === 'txt' ? (
                <div className="p-10 font-mono text-sm whitespace-pre-wrap leading-relaxed dark:text-slate-300 h-full w-full overflow-y-auto bg-white dark:bg-slate-900">
                  {doc.content}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 opacity-40">
                  <FileBox className="w-20 h-20 text-slate-300" />
                  <p className="text-xs font-black uppercase text-center">Định dạng {doc.type} chưa hỗ trợ xem trực tiếp.<br/>Vui lòng tải về để xem nội dung.</p>
                  <button onClick={() => downloadFile(doc.name)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Tải xuống ngay</button>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 px-10">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Bảo mật tri thức bởi DocuMind AI</span>
          <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase hover:underline">
            <ExternalLink className="w-3 h-3" /> Xem file gốc
          </a>
        </footer>
      </div>
    </div>
  );
};

export default PreviewModal;
