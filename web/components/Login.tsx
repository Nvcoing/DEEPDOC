
import React, { useState } from 'react';
import { Library, ShieldCheck, User as UserIcon, Lock, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { UserRole, User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  t: any;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, t, users }) => {
  const [role, setRole] = useState<UserRole>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === role);
    if (foundUser) onLogin(foundUser);
    else setError("Thông tin xác thực không chính xác.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-[480px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] p-12 border border-white dark:border-slate-800 animate-in fade-in zoom-in-95 duration-700 relative z-10">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none mb-8 transform hover:scale-110 hover:rotate-3 transition-all duration-500">
            <Library className="text-white w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter dark:text-white italic uppercase leading-none">{t.brandName}</h1>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] mt-5 opacity-80">{t.welcome}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="flex gap-2 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-[1.8rem] border border-slate-200/30 dark:border-slate-700/30">
            <button type="button" onClick={() => { setRole('user'); setError(null); }} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.4rem] text-[11px] font-black transition-all uppercase tracking-widest ${role === 'user' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xl ring-1 ring-slate-100 dark:ring-slate-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <UserIcon className="w-4 h-4" /> NHÂN VIÊN
            </button>
            <button type="button" onClick={() => { setRole('admin'); setError(null); }} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.4rem] text-[11px] font-black transition-all uppercase tracking-widest ${role === 'admin' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xl ring-1 ring-slate-100 dark:ring-slate-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <ShieldCheck className="w-4 h-4" /> QUẢN TRỊ
            </button>
          </div>

          <div className="space-y-5">
            {error && (
              <div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5" /> {error}
              </div>
            )}
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input type="email" placeholder="Email định danh" required className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-[1.8rem] text-sm focus:ring-8 focus:ring-indigo-500/5 outline-none dark:text-white font-bold transition-all placeholder:text-slate-300" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input type="password" placeholder="Mật khẩu bảo mật" required className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-[1.8rem] text-sm focus:ring-8 focus:ring-indigo-500/5 outline-none dark:text-white font-bold transition-all placeholder:text-slate-300" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="group relative w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98] overflow-hidden">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
            
            <div className="relative flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px]">
              VÀO HỆ THỐNG TRÍ TUỆ <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </form>
        
        <p className="text-center text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.5em] mt-12 opacity-60">DocuMind AI Security • v2.6</p>
      </div>
    </div>
  );
};

export default Login;
