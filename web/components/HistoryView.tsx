
import React from 'react';
import { Clock, FileUp, FolderPlus, Search, ChevronRight } from 'lucide-react';
import { ActivityLog } from '../types';

interface HistoryViewProps {
  t: any;
  activities: ActivityLog[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ t, activities }) => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white">{t.activityTitle}</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Toàn bộ hoạt động gần đây</p>
        </div>
      </header>

      <div className="space-y-3">
        {activities.length > 0 ? [...activities].reverse().map(act => (
          <div key={act.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${act.type === 'upload' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                {act.type === 'upload' ? <FileUp className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm dark:text-white">{act.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400">{act.type}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span className="text-[10px] text-slate-500">{new Date(act.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </div>
        )) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest italic">Chưa có hoạt động nào được ghi lại</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
