
import React, { useState, useMemo } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Users, FileText, Lock, Building2, UserPlus, FolderEdit, Save, Trash2, LayoutGrid, ChevronRight, UserCircle, Plus, X, FolderPlus, Upload, ChevronLeft, UserMinus, Folder as FolderIcon, Loader2 } from 'lucide-react';
import { Document, User, DocStatus, Department, Folder as FolderType } from '../types';
import { uploadFileToBackend } from '../apiService';

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
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  t, pendingDocs, onApprove, users, setUsers, departments, setDepartments, folders, setFolders, allDocs, setDocuments
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
  
  const currentLevelFolders = useMemo(() => 
    folders.filter(f => f.departmentId === selectedDeptId && f.parentId === selectedSubFolderId),
    [folders, selectedDeptId, selectedSubFolderId]
  );
  
  const currentLevelDocs = useMemo(() => 
    allDocs.filter(d => d.departmentId === selectedDeptId && d.folderId === (selectedSubFolderId || undefined) && d.status === 'approved'),
    [allDocs, selectedDeptId, selectedSubFolderId]
  );

  const deptPendingDocs = useMemo(() => pendingDocs.filter(d => d.departmentId === selectedDeptId), [pendingDocs, selectedDeptId]);
  const usersNotInDept = useMemo(() => users.filter(u => u.departmentId !== selectedDeptId && u.role !== 'admin'), [users, selectedDeptId]);

  const handleAddDept = () => {
    if (!newDeptName.trim()) return;
    setDepartments([...departments, { id: `dept-${Date.now()}`, name: newDeptName }]);
    setNewDeptName(''); setIsAddingDept(false);
  };

  // Fix: Added handleAddUserToDept to add users to departments
  const handleAddUserToDept = (userId: string) => {
    if (!selectedDeptId) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, departmentId: selectedDeptId } : u));
  };

  // Fix: Added handleRemoveUserFromDept to remove users from departments
  const handleRemoveUserFromDept = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, departmentId: undefined } : u));
  };

  const handleAddUserGlobal = () => {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    setUsers([...users, { ...newUser, id: `u-${Date.now()}`, allowedDocIds: [], departmentId: newUser.departmentId || undefined }]);
    setNewUser({ name: '', email: '', password: '', role: 'user', departmentId: '' });
    setIsAddingUserGlobal(false);
  };

  const handleCreateDeptFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedDeptId) return;
    const newFolder: FolderType = { 
      id: `f-${Date.now()}`, 
      name: newFolderName, 
      parentId: selectedSubFolderId, 
      departmentId: selectedDeptId, 
      status: 'approved', 
      userId: 'admin' 
    };
    setFolders([...folders, newFolder]);
    setNewFolderName(''); 
    setIsCreatingFolder(false);
  };

  const handleDeptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedDeptId) return;
    
    setIsUploading(true);
    const fileList = Array.from(files);
    
    try {
      const uploadedDocs: Document[] = [];
      for (const file of fileList) {
        // Gọi API upload thực tế
        const response = await uploadFileToBackend(file, selectedSubFolderId || undefined, selectedDeptId);
        
        const newDoc: Document = {
          id: response.id || `d-${Date.now()}-${Math.random()}`, 
          userId: 'admin', 
          name: file.name, 
          type: (file.name.split('.').pop() as any) || 'txt',
          uploadDate: new Date().toLocaleDateString(), 
          size: file.size, 
          content: "Tài liệu đã được phân tích...", 
          status: 'approved', 
          departmentId: selectedDeptId,
          folderId: selectedSubFolderId || undefined,
          fileData: response.url || URL.createObjectURL(file) // Lưu URL để preview
        };
        uploadedDocs.push(newDoc);
      }
      setDocuments(prev => [...prev, ...uploadedDocs]);
    } catch (err) {
      alert("Lỗi tải lên: " + (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNavigateBack = () => {
    if (selectedSubFolderId) {
      setSelectedSubFolderId(currentSubFolder?.parentId || null);
    } else {
      setSelectedDeptId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl"><ShieldCheck className="w-8 h-8" /></div>
          <div><h2 className="text-4xl font-black tracking-tighter dark:text-white uppercase italic">{t.adminPanel}</h2></div>
        </div>
        <nav className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
          {[
            { id: 'pending', label: t.pending, icon: FileText },
            { id: 'depts', label: t.orgChart, icon: Building2 },
            { id: 'users', label: t.userMgmt, icon: UserPlus },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSelectedDeptId(null); setSelectedSubFolderId(null); }} className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-[500px]">
        {activeTab === 'pending' && (
          <section className="space-y-6">
            <h3 className="font-black text-xl dark:text-white flex items-center gap-2"><div className="w-1.5 h-6 bg-blue-500 rounded-full" /> {t.pending} ({pendingDocs.length})</h3>
            <div className="grid gap-4">
              {pendingDocs.length > 0 ? pendingDocs.map(doc => (
                <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200 p-6 rounded-[1.8rem] flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400"><FileText className="w-6 h-6" /></div>
                    <div><h4 className="font-black text-sm dark:text-white uppercase">{doc.name}</h4><p className="text-[10px] text-slate-400 font-black uppercase">SỞ HỮU: {users.find(u => u.id === doc.userId)?.name}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => onApprove(doc.id, 'rejected')} className="p-3 text-red-500 rounded-xl hover:bg-red-50"><XCircle className="w-6 h-6" /></button>
                    <button onClick={() => onApprove(doc.id, 'approved')} className="px-8 py-3.5 bg-green-500 text-white rounded-2xl shadow-lg font-black text-xs uppercase">{t.approve}</button>
                  </div>
                </div>
              )) : <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] opacity-40">TRỐNG</div>}
            </div>
          </section>
        )}

        {activeTab === 'depts' && !selectedDeptId && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-xl dark:text-white flex items-center gap-2"><div className="w-1.5 h-6 bg-indigo-500 rounded-full" /> Phòng ban</h3>
               <button onClick={() => setIsAddingDept(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 shadow-lg shadow-indigo-100"><Plus className="w-4 h-4" /> Tạo mới</button>
            </div>
            {isAddingDept && (
              <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-8 rounded-[2.5rem] shadow-2xl max-w-lg mx-auto mb-10">
                <div className="flex justify-between items-center mb-6"><h4 className="font-black text-lg uppercase italic">Phòng ban mới</h4><button onClick={() => setIsAddingDept(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
                <input autoFocus type="text" placeholder="Tên phòng ban..." className="w-full bg-slate-50 dark:bg-slate-800 border-none px-6 py-4 rounded-2xl text-sm font-bold" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                <button onClick={handleAddDept} className="w-full mt-4 py-4.5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase text-xs">Lưu</button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map(dept => (
                <div key={dept.id} onClick={() => { setSelectedDeptId(dept.id); setSelectedSubFolderId(null); }} className="group bg-white dark:bg-slate-900 border border-slate-100 p-8 rounded-[2.5rem] flex flex-col gap-6 hover:border-indigo-400 hover:shadow-2xl cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100"><ChevronRight className="w-6 h-6 text-indigo-500" /></div>
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center"><Building2 className="w-8 h-8" /></div>
                  <div><h4 className="font-black text-xl dark:text-white uppercase italic">{dept.name}</h4></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'depts' && selectedDeptId && selectedDept && (
          <div className="space-y-10 animate-in slide-in-from-right-10">
            <div className="flex items-center gap-4">
              <button onClick={handleNavigateBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase">
                <ChevronLeft className="w-4 h-4" /> {selectedSubFolderId ? 'Quay lại' : 'Danh sách Phòng ban'}
              </button>
              {selectedSubFolderId && (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300">
                  <span>/</span>
                  <span className="text-slate-500">{selectedDept.name}</span>
                  <span>/</span>
                  <span className="text-indigo-600">{currentSubFolder?.name}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
               {!selectedSubFolderId && (
                 <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between"><h3 className="font-black text-xl flex items-center gap-2 dark:text-white"><Users className="w-6 h-6 text-indigo-500" /> Thành viên ({deptUsers.length})</h3><button onClick={() => setShowAddUserToDept(!showAddUserToDept)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">{showAddUserToDept ? <X className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}</button></div>
                    {showAddUserToDept && (
                      <div className="bg-white border border-indigo-200 p-4 rounded-2xl shadow-xl space-y-2">
                        {usersNotInDept.map(u => (
                          <button key={u.id} onClick={() => handleAddUserToDept(u.id)} className="w-full flex items-center justify-between p-3 hover:bg-indigo-50 rounded-xl transition-all group">
                            <span className="text-sm font-bold">{u.name}</span><Plus className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid gap-3">
                      {deptUsers.map(user => (
                        <div key={user.id} className="bg-white dark:bg-slate-900 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group">
                          <div className="flex items-center gap-4"><div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">{user.name[0]}</div><div><p className="text-sm font-black dark:text-white">{user.name}</p></div></div>
                          <button onClick={() => handleRemoveUserFromDept(user.id)} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><UserMinus className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                 </div>
               )}

               <div className={`${selectedSubFolderId ? 'w-full' : 'flex-[1.5]'} space-y-6`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xl flex items-center gap-2 dark:text-white">
                      <FolderIcon className="w-6 h-6 text-indigo-500" /> 
                      {selectedSubFolderId ? currentSubFolder?.name : 'Tài liệu gốc'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={isUploading}
                        onClick={() => setIsCreatingFolder(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <FolderPlus className="w-4 h-4" /> Thư mục mới
                      </button>
                      <label className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md hover:bg-indigo-700 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploading ? 'Đang tải...' : 'Tải tệp lên đây'}
                        {!isUploading && <input type="file" className="hidden" multiple onChange={handleDeptFileUpload} />}
                      </label>
                    </div>
                  </div>

                  {isCreatingFolder && (
                    <form onSubmit={handleCreateDeptFolder} className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-200">
                      <FolderIcon className="w-5 h-5 text-indigo-500" />
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Tên thư mục mới..."
                        className="flex-1 bg-transparent border-none outline-none font-bold text-sm dark:text-white"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                      <button type="button" onClick={() => setIsCreatingFolder(false)} className="text-[10px] font-black text-slate-400 uppercase">Hủy</button>
                      <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase">Tạo</button>
                    </form>
                  )}

                  {isUploading && (
                    <div className="p-10 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2.5rem] border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center space-y-4 animate-pulse">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                      <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Đang đẩy tệp lên trung tâm tri thức...</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {currentLevelFolders.map(folder => (
                        <div 
                          key={folder.id} 
                          onClick={() => setSelectedSubFolderId(folder.id)}
                          className="group bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 p-5 rounded-[2rem] flex items-center gap-4 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
                        >
                           <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-xl flex items-center justify-center">
                              <FolderIcon className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate dark:text-white uppercase">{folder.name}</p>
                              <p className="text-[9px] font-black uppercase text-slate-400">Thư mục con</p>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                     ))}

                     {currentLevelDocs.map(doc => (
                       <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-100 p-5 rounded-[2rem] flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><FileText className="w-6 h-6" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate dark:text-white">{doc.name}</p>
                            <p className="text-[9px] font-black uppercase text-slate-400">{doc.type} • {doc.uploadDate}</p>
                          </div>
                       </div>
                     ))}

                     {currentLevelFolders.length === 0 && currentLevelDocs.length === 0 && !isUploading && (
                       <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] opacity-40">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em]">Thư mục trống</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <section className="space-y-8">
             <div className="flex items-center justify-between"><h3 className="font-black text-xl dark:text-white flex items-center gap-2"><div className="w-1.5 h-6 bg-indigo-500 rounded-full" /> Nhân sự ({users.length})</h3><button onClick={() => setIsAddingUserGlobal(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100"><UserPlus className="w-4 h-4" /> Tạo tài khoản</button></div>
             {isAddingUserGlobal && (
                <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 p-8 rounded-[3rem] shadow-2xl max-w-2xl mx-auto mb-10">
                  <div className="flex justify-between items-center mb-8"><h4 className="font-black text-lg uppercase italic">Nhân viên mới</h4><button onClick={() => setIsAddingUserGlobal(false)}><X className="w-6 h-6 text-slate-400" /></button></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Tên" className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                    <input type="email" placeholder="Email" className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-bold" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    <input type="password" placeholder="Mật khẩu" className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-bold" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    <select className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-bold" value={newUser.departmentId} onChange={e => setNewUser({...newUser, departmentId: e.target.value})}>
                      <option value="">-- Phòng ban --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button onClick={handleAddUserGlobal} className="md:col-span-2 py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase tracking-widest text-xs">Tạo tài khoản</button>
                  </div>
                </div>
             )}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map(user => (
                  <div key={user.id} className="bg-white dark:bg-slate-900 border border-slate-100 p-6 rounded-[2rem] flex items-center justify-between hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-5"><div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl uppercase">{user.name[0]}</div><div><h4 className="font-black text-base dark:text-white">{user.name}</h4><div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold text-slate-400">{user.email}</span></div></div></div>
                    <div className="flex items-center gap-4"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>{user.role}</span></div>
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
