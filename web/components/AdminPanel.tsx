
import React from 'react';
import { ShieldCheck, CheckCircle, XCircle, Users, FileText, Lock } from 'lucide-react';
import { Document, User, DocStatus } from '../types';

interface AdminPanelProps {
  t: any;
  pendingDocs: Document[];
  onApprove: (id: string, status: DocStatus) => void;
  users: User[];
  onAssignPermission: (userId: string, docId: string) => void;
  allDocs: Document[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ t, pendingDocs, onApprove, users, onAssignPermission, allDocs }) => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter dark:text-white">{t.adminPanel}</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Hệ thống phê duyệt & Phân quyền</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Phần duyệt tài liệu */}
        <section className="space-y-4">
          <h3 className="font-black text-xl flex items-center gap-2 dark:text-white">
            <FileText className="w-5 h-5 text-blue-500" /> {t.pending} ({pendingDocs.length})
          </h3>
          <div className="space-y-3">
            {pendingDocs.length > 0 ? pendingDocs.map(doc => (
              <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm dark:text-white">{doc.name}</h4>
                    <p className="text-[9px] text-slate-400 font-black">Người tải: User ID {doc.userId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onApprove(doc.id, 'rejected')} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all">
                    <XCircle className="w-5 h-5" />
                  </button>
                  <button onClick={() => onApprove(doc.id, 'approved')} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg shadow-green-100 dark:shadow-none transition-all">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )) : <p className="text-slate-400 text-xs italic py-10 text-center uppercase font-black">Không có tài liệu chờ duyệt</p>}
          </div>
        </section>

        {/* Phần phân quyền User */}
        <section className="space-y-4">
          <h3 className="font-black text-xl flex items-center gap-2 dark:text-white">
            <Users className="w-5 h-5 text-purple-500" /> {t.userMgmt}
          </h3>
          <div className="space-y-4">
            {users.filter(u => u.role === 'user').map(user => (
              <div key={user.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-full flex items-center justify-center font-black">
                    {user.name[0]}
                  </div>
                  <div>
                    <h4 className="font-black text-sm dark:text-white">{user.name}</h4>
                    <p className="text-[9px] text-slate-400 font-bold">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gán quyền truy cập tài liệu:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {allDocs.filter(d => d.status === 'approved').map(doc => (
                      <label key={doc.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={user.allowedDocIds?.includes(doc.id)} 
                            onChange={() => onAssignPermission(user.id, doc.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold dark:text-slate-300">{doc.name}</span>
                        </div>
                        <Lock className={`w-3 h-3 ${user.allowedDocIds?.includes(doc.id) ? 'text-green-500' : 'text-slate-300'}`} />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;
