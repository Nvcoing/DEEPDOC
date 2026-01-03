
import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Users, FileText, Lock, Building2, UserPlus, FolderEdit, Save, Trash2, LayoutGrid, ChevronRight, UserCircle, Plus, X } from 'lucide-react';
import { Document, User, DocStatus, Department, Folder } from '../types';

interface AdminPanelProps {
  t: any;
  pendingDocs: Document[];
  onApprove: (id: string, status: DocStatus) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  onAssignPermission: (userId: string, docId: string) => void;
  allDocs: Document[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  t, pendingDocs, onApprove, users, setUsers, departments, setDepartments, folders, setFolders, onAssignPermission, allDocs 
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'depts' | 'users' | 'folders'>('pending');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as const, departmentId: '' });

  const handleAddDept = () => {
    if (!newDeptName.trim()) return;
    const newDept: Department = { id: `dept-${Date.now()}`, name: newDeptName };
    setDepartments([...departments, newDept]);
    setNewDeptName('');
    setIsAddingDept(false);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("Vui lòng nhập đầy đủ thông tin: Tên, Email và Mật khẩu.");
      return;
    }
    const user: User = { 
      id: `u-${Date.now()}`, 
      name: newUser.name, 
      email: newUser.email, 
      password: newUser.password,
      role: newUser.role, 
      departmentId: newUser.departmentId || undefined,
      allowedDocIds: [] 
    };
    setUsers([...users, user]);
    setNewUser({ name: '', email: '', password: '', role: 'user', departmentId: '' });
    setIsAddingUser(false);
  };

  const handleMapFolderToDept = (folderId: string, deptId: string) => {
    setFolders(folders.map(f => f.id === folderId ? { ...f, departmentId: deptId || undefined } : f));
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm("Xóa người dùng này khỏi hệ thống?")) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200 dark:shadow-none">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter dark:text-white uppercase italic">{t.adminPanel}</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">DocuMind Management Console</p>
          </div>
        </div>

        <nav className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
          {[
            { id: 'pending', label: t.pending, icon: FileText },
            { id: 'depts', label: t.orgChart, icon: Building2 },
            { id: 'users', label: t.userMgmt, icon: UserPlus },
            { id: 'folders', label: t.folderMgmt, icon: FolderEdit }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-[500px]">
        {/* PENDING APPROVALS */}
        {activeTab === 'pending' && (
          <section className="space-y-6 animate-in fade-in duration-300">
            <h3 className="font-black text-xl flex items-center gap-3 dark:text-white">
              <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
              {t.pending} ({pendingDocs.length})
            </h3>
            <div className="grid gap-4">
              {pendingDocs.length > 0 ? pendingDocs.map(doc => (
                <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[1.8rem] flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4 hover:border-blue-400 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm dark:text-white uppercase">{doc.name}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">SỞ HỮU: {users.find(u => u.id === doc.userId)?.name || doc.userId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => onApprove(doc.id, 'rejected')} className="p-3 hover:bg-red-50 text-red-500 rounded-xl transition-all border border-transparent hover:border-red-100"><XCircle className="w-6 h-6" /></button>
                    <button onClick={() => onApprove(doc.id, 'approved')} className="px-8 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-xl shadow-green-100 font-black text-xs transition-all uppercase tracking-widest">{t.approve}</button>
                  </div>
                </div>
              )) : (
                <div className="py-24 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] opacity-40">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em]">Hệ thống hiện không có tài liệu nào đang chờ phê duyệt</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* DEPARTMENTS */}
        {activeTab === 'depts' && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-xl flex items-center gap-3 dark:text-white">
                 <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                 Danh sách Phòng ban ({departments.length})
               </h3>
               {!isAddingDept ? (
                 <button onClick={() => setIsAddingDept(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-100">
                   <Plus className="w-4 h-4" /> Thêm phòng ban
                 </button>
               ) : (
                 <button onClick={() => setIsAddingDept(false)} className="flex items-center gap-2 px-5 py-3 bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                   <X className="w-4 h-4" /> Hủy bỏ
                 </button>
               )}
            </div>

            {isAddingDept && (
              <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 max-w-lg mx-auto mb-10">
                <h4 className="font-black text-lg mb-6 dark:text-white uppercase italic">Thông tin phòng ban mới</h4>
                <div className="space-y-4">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Tên phòng ban (VD: Kỹ thuật, Kinh doanh...)" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none px-6 py-4 rounded-2xl text-sm outline-none dark:text-white font-bold"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                  />
                  <button onClick={handleAddDept} className="w-full py-4.5 bg-indigo-600 text-white rounded-[1.8rem] shadow-xl font-black flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                    <Save className="w-5 h-5" /> Lưu phòng ban
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map(dept => (
                <div 
                  key={dept.id} 
                  className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2.2rem] transition-all flex flex-col gap-4 hover:border-indigo-200 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                     <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Building2 className="w-7 h-7" />
                     </div>
                     <button onClick={() => setDepartments(departments.filter(d => d.id !== dept.id))} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
                  <div>
                    <h4 className="font-black text-lg truncate leading-tight dark:text-white uppercase italic">{dept.name}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-slate-400">
                       {users.filter(u => u.departmentId === dept.id).length} Thành viên
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <section className="space-y-8 animate-in fade-in duration-300">
             <div className="flex items-center justify-between">
                <h3 className="font-black text-xl flex items-center gap-3 dark:text-white">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                  Danh sách người dùng ({users.length})
                </h3>
                {!isAddingUser ? (
                  <button onClick={() => setIsAddingUser(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-100">
                    <UserPlus className="w-4 h-4" /> Tạo tài khoản mới
                  </button>
                ) : (
                  <button onClick={() => setIsAddingUser(false)} className="flex items-center gap-2 px-5 py-3 bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                    <X className="w-4 h-4" /> Hủy bỏ
                  </button>
                )}
             </div>

             {isAddingUser && (
                <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-8 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 max-w-2xl mx-auto mb-10">
                  <h4 className="font-black text-lg mb-8 dark:text-white uppercase italic text-center">Tạo định danh nhân sự mới</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 md:col-span-2">
                       <input 
                        type="text" placeholder="Họ và tên nhân viên" className="w-full bg-slate-50 dark:bg-slate-800 border-none px-6 py-4 rounded-2xl text-sm dark:text-white font-bold outline-none"
                        value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                      />
                    </div>
                    <input 
                      type="email" placeholder="Địa chỉ Email (Dùng đăng nhập)" className="w-full bg-slate-50 dark:bg-slate-800 border-none px-6 py-4 rounded-2xl text-sm dark:text-white font-bold outline-none"
                      value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                    />
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="password" placeholder="Mật khẩu truy cập" className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm dark:text-white font-bold outline-none"
                        value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Phòng ban công tác</label>
                       <select 
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none px-5 py-4 rounded-2xl text-sm dark:text-white outline-none font-bold"
                          value={newUser.departmentId} onChange={e => setNewUser({...newUser, departmentId: e.target.value})}
                        >
                          <option value="">-- {t.noDept} --</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Vai trò hệ thống</label>
                       <select 
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none px-5 py-4 rounded-2xl text-sm dark:text-white outline-none font-bold"
                          value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                       </select>
                    </div>
                    <button onClick={handleAddUser} className="md:col-span-2 py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black text-xs shadow-2xl hover:bg-indigo-700 transition-all uppercase tracking-[0.2em] mt-4">
                      Tạo tài khoản và cấp quyền
                    </button>
                  </div>
                </div>
             )}

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map(user => (
                  <div key={user.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl flex items-center justify-center font-black text-2xl text-indigo-600 uppercase">
                        {user.name[0]}
                      </div>
                      <div>
                        <h4 className="font-black text-base dark:text-white">{user.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-bold text-slate-400">{user.email}</span>
                          {user.departmentId && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full" />
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                {departments.find(d => d.id === user.departmentId)?.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                         {user.role}
                       </span>
                       {user.role !== 'admin' && (
                         <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                           <Trash2 className="w-5 h-5" />
                         </button>
                       )}
                    </div>
                  </div>
                ))}
             </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
