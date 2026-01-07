
import React from 'react';
import { User as UserIcon, Mail, Shield, Building2, Calendar, FileCheck, LogOut, CheckCircle } from 'lucide-react';
import { User, Department } from '../types';

interface ProfileViewProps {
  t: any;
  user: User;
  department?: Department;
}

const ProfileView: React.FC<ProfileViewProps> = ({ t, user, department }) => {
  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-32">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-32 h-32 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[3rem] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none relative">
          <UserIcon className="w-16 h-16 text-white" />
          <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white dark:border-slate-950" />
        </div>
        <div>
          <h2 className="text-4xl font-black tracking-tighter dark:text-white uppercase italic">{user.name}</h2>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
            <Shield className="w-3 h-3" /> {user.role === 'admin' ? t.adminRole : t.employee}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] space-y-6">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{t.basicInfo}</h3>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Email</p>
                <p className="font-bold text-sm dark:text-white">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">{t.departments}</p>
                <p className="font-bold text-sm dark:text-white">{department?.name || t.noDept}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] space-y-6">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{t.systemPermissions}</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent hover:border-indigo-200 transition-all">
              <FileCheck className="w-5 h-5 text-indigo-500" />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase dark:text-white">{t.accessKnowledge}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{t.accessKnowledgeDesc}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>

            {user.role === 'admin' && (
              <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-800 transition-all">
                <Shield className="w-5 h-5 text-indigo-600" />
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400">{t.adminPanel}</p>
                  <p className="text-[9px] text-indigo-400 font-bold mt-0.5">{t.adminDashboardDesc}</p>
                </div>
                <CheckCircle className="w-4 h-4 text-indigo-600" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-10">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">{t.protectedByAi}</p>
      </div>
    </div>
  );
};

export default ProfileView;
