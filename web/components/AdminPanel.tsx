
import React, { useState, useMemo } from 'react';
import { ShieldCheck, FileText, Building2, UserPlus, Trash2, ChevronRight, Plus, X, FolderPlus, Upload, ChevronLeft, UserMinus, Folder as FolderIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { Document, User, DocStatus, Department, Folder as FolderType } from '../types';
import { uploadFileToBackend, deleteFilePermanently } from '../apiService';

interface AdminPanelProps {
  t: any;
  pendingDocs: Document[];
  onApprove: (id: string, status: DocStatus) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  folders: FolderType[];
  setFolders: React.Dispatch<React.SetStateAction<FolderType[]>>;
  onAssignPermission: (userId: string, docId: string) => void;
  allDocs: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  onDeletePermanently: (id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  t, pendingDocs, onApprove, users, setUsers, departments, setDepartments, folders, setFolders, allDocs, setDocuments, onDeletePermanently
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'depts' | 'users'>('depts');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedSubFolderId, setSelectedSubFolderId] = useState<string | null>(null);
  
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [isAddingUserGlobal, setIsAddingUserGlobal] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddUserToDept, setShowAddUserToDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as const, departmentId: '' });

  const selectedDept = useMemo(() => departments.find(d => d.id === selectedDeptId), [departments, selectedDeptId]);
  const currentSubFolder = useMemo(() => folders.find(f => f.id === selectedSubFolderId), [folders, selectedSubFolderId]);
  const deptUsers = useMemo(() => users.filter(u => u.departmentId === selectedDeptId), [users, selectedDeptId]);
  const currentLevelFolders = useMemo(() => folders.filter(f => f.departmentId === selectedDeptId && f.parentId === selectedSubFolderId), [folders, selectedDeptId, selectedSubFolderId]);
  const currentLevelDocs = useMemo(() => allDocs.filter(d => d.departmentId === selectedDeptId && d.folderId === (selectedSubFolderId || undefined) && (d.status === 'approved' || d.status === 'uploading')), [allDocs, selectedDeptId, selectedSubFolderId]);
  const usersNotInDept = useMemo(() => users.filter(u => u.departmentId !== selectedDeptId && u.role !== 'admin'), [users, selectedDeptId]);

  const handleAddDept = () => {
    if (!newDeptName.trim()) return;
    setDepartments([...departments, { id: `dept-${Date.now()}`, name: newDeptName }]);
    setNewDeptName(''); setIsAddingDept(false);
  };

  const handleCreateDeptFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedDeptId) return;
    setFolders([...folders, { id: `f-${Date.now()}`, name: newFolderName, parentId: selectedSubFolderId, departmentId: selectedDeptId, status: 'approved', userId: 'admin' }]);
    setNewFolderName(''); setIsCreatingFolder(false);
  };

  const truncateWords = (str: string, maxWords: number) => {
    const words = str.split(' ');
    if (words.length <= maxWords) return str;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const handleDeptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedDeptId) return;
    
    const fileList = Array.from(files) as File[];
    setIsUploading(true);

    const tempDocs: Document[] = fileList.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`, 
      userId: 'admin', 
      name: file.name, 
      type: (file.name.split('.').pop() as any) || 'txt',
      uploadDate: new Date().toLocaleDateString(), 
      size: file.size, 
      content: "", 
      status: 'uploading', 
      departmentId: selectedDeptId,
      folderId: selectedSubFolderId || undefined
    }));

    setDocuments(prev => [...prev, ...tempDocs]);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const tempId = tempDocs[i].id;
      
      try {
        await uploadFileToBackend(file, selectedSubFolderId || undefined, selectedDeptId);
        setDocuments(prev => prev.map(d => d.id === tempId ? { ...d, status: 'approved' } : d));
      } catch (err) {
        setDocuments(prev => prev.filter(d => d.id !== tempId));
        console.error("Lỗi tải lên:", err);
      }
    }
    
    setIsUploading(false);
  };

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 border-b border-slate-200/60 dark:border-slate-800/60 pb-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl"><ShieldCheck className="w-7 h-7" /></div>
          <div><h2 className="text-4xl font-black tracking-tighter dark:text-white uppercase italic leading-none">{t.adminPanel}</h2></div>
        </div>
        <nav className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.5rem]">
          {[
            { id: 'pending', label: t.pending, icon: FileText },
            { id: 'depts', label: t.orgChart, icon: Building2 },
            { id: 'users', label: t.userMgmt, icon: UserPlus },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSelectedDeptId(null); setSelectedSubFolderId(null); }} className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[11px] font-black transition-all uppercase tracking-wider ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-[500px]">
        {activeTab === 'pending' && (
          <section className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-black text-2xl dark:text-white flex items-center gap-3 italic uppercase"><div className="w-2 h-8 bg-blue-500 rounded-full" /> {t.pending} ({pendingDocs.length})</h3>
            <div className="grid gap-5">
              {pendingDocs.length > 0 ? pendingDocs.map(doc => (
                <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 p-6 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-6 border-b-4 border-b-slate-100 dark:border-b-slate-950">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400"><FileText className="w-7 h-7" /></div>
                    <div><h4 className="font-black text-sm dark:text-white uppercase italic tracking-wide">{truncateWords(doc.name, 4)}</h4><p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">OWNER: {users.find(u => u.id === doc.userId)?.name}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => onDeletePermanently(doc.id)} className="p-3.5 text-red-500 rounded-xl hover:bg-red-50 transition-colors" title="Từ chối/Xóa">
                      <Trash2 className="w-6 h-6" />
                    </button>
                    <button onClick={() => onApprove(doc.id, 'approved')} className="px-10 py-4 bg-green-500 text-white rounded-2xl shadow-lg shadow-green-100 dark:shadow-none font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> {t.approve}
                    </button>
                  </div>
                </div>
              )) : <div className="py-32 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] opacity-40">
                     <p className="text-[11px] font-black uppercase tracking-[0.5em] italic">Không có yêu cầu chờ duyệt</p>
                   </div>}
            </div>
          </section>
        )}

        {activeTab === 'depts' && !selectedDeptId && (
          <section className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-2xl dark:text-white flex items-center gap-3 italic uppercase"><div className="w-2 h-8 bg-indigo-500 rounded-full" /> Cơ cấu phòng ban</h3>
               <button onClick={() => setIsAddingDept(true)} className="flex items-center gap-2.5 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 shadow-xl shadow-indigo-100 transition-all"><Plus className="w-4 h-4" /> Tạo mới</button>
            </div>
            
            {isAddingDept && (
              <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-10 rounded-[2.5rem] shadow-2xl max-w-lg mx-auto mb-12 relative">
                <button onClick={() => setIsAddingDept(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                <h4 className="font-black text-xl uppercase italic mb-8">Phòng ban mới</h4>
                <input autoFocus type="text" placeholder="Tên phòng ban..." className="w-full bg-slate-50 dark:bg-slate-800 border-none px-6 py-5 rounded-2xl text-sm font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 outline-none" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                <button onClick={handleAddDept} className="w-full mt-6 py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Lưu cấu trúc</button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {departments.map(dept => (
                <div key={dept.id} onClick={() => { setSelectedDeptId(dept.id); setSelectedSubFolderId(null); }} className="group bg-white dark:bg-slate-900 border border-slate-200 p-8 rounded-[2.5rem] flex flex-col gap-8 hover:border-indigo-400 hover:shadow-2xl cursor-pointer relative overflow-hidden transition-all border-b-4 border-b-slate-100 dark:border-b-slate-950">
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                    <div onClick={(e) => { e.stopPropagation(); if (window.confirm("Xóa PB này?")) setDepartments(departments.filter(d => d.id !== dept.id)); }} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><Trash2 className="w-4 h-4" /></div>
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><ChevronRight className="w-4 h-4" /></div>
                  </div>
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Building2 className="w-8 h-8" /></div>
                  <div>
                    <h4 className="font-black text-2xl dark:text-white uppercase italic tracking-tight">{truncateWords(dept.name, 4)}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-widest">{users.filter(u => u.departmentId === dept.id).length} Thành viên</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'depts' && selectedDeptId && selectedDept && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-6">
              <button onClick={() => selectedSubFolderId ? setSelectedSubFolderId(currentSubFolder?.parentId || null) : setSelectedDeptId(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all">
                <ChevronLeft className="w-4 h-4" /> Quay lại
              </button>
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest">
                <span className="text-slate-300">/</span>
                <span className="text-slate-500 italic">{selectedDept.name}</span>
                {selectedSubFolderId && <><span className="text-slate-300">/</span><span className="text-indigo-600 italic">{currentSubFolder?.name}</span></>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
               {!selectedSubFolderId && (
                 <div className="lg:col-span-4 space-y-8">
                    <div className="flex items-center justify-between"><h3 className="font-black text-xl italic uppercase dark:text-white flex items-center gap-3"><div className="w-1.5 h-6 bg-purple-500 rounded-full" /> Thành viên</h3><button onClick={() => setShowAddUserToDept(!showAddUserToDept)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl transition-transform hover:scale-110">{showAddUserToDept ? <X className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}</button></div>
                    {showAddUserToDept && (
                      <div className="bg-white dark:bg-slate-800 border border-indigo-100 p-5 rounded-[2rem] shadow-xl space-y-3 animate-in zoom-in-95">
                        {usersNotInDept.map(u => (
                          <button key={u.id} onClick={() => setUsers(users.map(us => us.id === u.id ? { ...us, departmentId: selectedDeptId } : us))} className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all group">
                            <span className="text-xs font-black dark:text-white uppercase tracking-wider">{u.name}</span><Plus className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid gap-4">
                      {deptUsers.map(user => (
                        <div key={user.id} className="bg-white dark:bg-slate-900 border border-slate-100 p-5 rounded-[1.8rem] flex items-center justify-between group shadow-sm">
                          <div className="flex items-center gap-4"><div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-black italic">{user.name[0]}</div><div><p className="text-sm font-black dark:text-white italic">{user.name}</p></div></div>
                          <button onClick={() => setUsers(users.map(u => u.id === user.id ? { ...u, departmentId: undefined } : u))} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><UserMinus className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                 </div>
               )}

               <div className={`${selectedSubFolderId ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-8`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xl italic uppercase dark:text-white flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full" /> 
                      {selectedSubFolderId ? truncateWords(currentSubFolder?.name || "", 4) : 'Kho lưu trữ chính'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <button disabled={isUploading} onClick={() => setIsCreatingFolder(true)} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                        <FolderPlus className="w-4 h-4" /> Thư mục
                      </button>
                      <label className={`flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest cursor-pointer shadow-lg hover:bg-indigo-700 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {isUploading ? 'ĐANG TẢI...' : 'TẢI TỆP LÊN'}
                        {!isUploading && <input type="file" className="hidden" multiple onChange={handleDeptFileUpload} />}
                      </label>
                    </div>
                  </div>

                  {isCreatingFolder && (
                    <form onSubmit={handleCreateDeptFolder} className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-5 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 shadow-2xl">
                      <FolderIcon className="w-6 h-6 text-indigo-500" />
                      <input autoFocus type="text" placeholder="Tên thư mục mới..." className="flex-1 bg-transparent border-none outline-none font-black text-sm dark:text-white italic" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
                      <button type="button" onClick={() => setIsCreatingFolder(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hủy</button>
                      <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Tạo</button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {currentLevelFolders.map(folder => (
                        <div key={folder.id} className="group bg-white dark:bg-slate-900 border border-slate-200 p-6 rounded-[2rem] flex items-center gap-5 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer relative border-b-4 border-b-slate-50 dark:border-b-slate-950">
                           <div onClick={() => setSelectedSubFolderId(folder.id)} className="flex items-center gap-5 flex-1 overflow-hidden">
                              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><FolderIcon className="w-7 h-7 fill-current" /></div>
                              <div className="flex-1 min-w-0"><p className="font-black text-sm dark:text-white uppercase italic tracking-wide">{truncateWords(folder.name, 4)}</p></div>
                           </div>
                           <button onClick={() => setFolders(folders.filter(f => f.id !== folder.id))} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     ))}

                     {currentLevelDocs.map(doc => (
                       <div key={doc.id} className={`group bg-white dark:bg-slate-900 border border-slate-200 p-6 rounded-[2rem] flex items-center gap-5 shadow-sm hover:shadow-xl transition-all relative border-b-4 border-b-slate-50 dark:border-b-slate-950 ${doc.status === 'uploading' ? 'opacity-70 animate-pulse' : ''}`}>
                          <div className={`w-14 h-14 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center`}>
                            {doc.status === 'uploading' ? <Loader2 className="w-7 h-7 animate-spin text-indigo-500" /> : <FileText className="w-7 h-7" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm dark:text-white italic">{truncateWords(doc.name, 4)}</p>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">{doc.status === 'uploading' ? 'Đang tải...' : `${doc.type} • ${doc.uploadDate}`}</p>
                          </div>
                          {doc.status !== 'uploading' && (
                            <button onClick={() => { if(window.confirm("Xóa tệp?")) setDocuments(allDocs.filter(d => d.id !== doc.id)); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                          )}
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <section className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center justify-between"><h3 className="font-black text-2xl dark:text-white italic uppercase flex items-center gap-3"><div className="w-2 h-8 bg-indigo-500 rounded-full" /> Danh bạ nhân sự</h3><button onClick={() => setIsAddingUserGlobal(true)} className="flex items-center gap-2.5 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-105"><UserPlus className="w-4 h-4" /> Tạo tài khoản</button></div>
             {isAddingUserGlobal && (
                <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-12 rounded-[3rem] shadow-2xl max-w-2xl mx-auto mb-12 relative animate-in zoom-in-95">
                  <button onClick={() => setIsAddingUserGlobal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X className="w-6 h-6" /></button>
                  <h4 className="font-black text-2xl uppercase italic mb-10 text-center">Hồ sơ nhân viên mới</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" placeholder="Họ và tên..." className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-bold shadow-inner" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                    <input type="email" placeholder="Email định danh..." className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-bold shadow-inner" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    <input type="password" placeholder="Mật khẩu bảo mật..." className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-bold shadow-inner" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    <select className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-bold shadow-inner" value={newUser.departmentId} onChange={e => setNewUser({...newUser, departmentId: e.target.value})}>
                      <option value="">-- Chọn Phòng ban --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button onClick={() => { if(newUser.name) { setUsers([...users, { ...newUser, id: `u-${Date.now()}`, allowedDocIds: [] }]); setIsAddingUserGlobal(false); } }} className="md:col-span-2 py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase tracking-widest text-xs shadow-xl hover:bg-indigo-700 mt-4 transition-all">Xác thực tài khoản</button>
                  </div>
                </div>
             )}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {users.map(user => (
                  <div key={user.id} className="bg-white dark:bg-slate-900 border border-slate-200 p-8 rounded-[2.5rem] flex items-center justify-between hover:border-indigo-400 hover:shadow-2xl transition-all border-b-4 border-b-slate-100 dark:border-b-slate-950">
                    <div className="flex items-center gap-6"><div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl italic uppercase">{user.name[0]}</div><div><h4 className="font-black text-xl dark:text-white italic uppercase tracking-tight">{truncateWords(user.name, 4)}</h4><p className="text-[11px] font-bold text-slate-400 uppercase mt-1 tracking-wide">{user.email}</p></div></div>
                    <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>{user.role}</span>
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
