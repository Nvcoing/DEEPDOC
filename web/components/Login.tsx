
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
    
    const foundUser = users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password &&
      u.role === role
    );

    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError("Email hoặc mật khẩu không chính xác.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl mb-6 transform hover:rotate-3 transition-transform">
            <Library className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter dark:text-white italic uppercase">{t.brandName}</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">{t.welcome}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button 
              type="button"
              onClick={() => { setRole('user'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${role === 'user' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              <UserIcon className="w-4 h-4" /> USER
            </button>
            <button 
              type="button"
              onClick={() => { setRole('admin'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${role === 'admin' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              <ShieldCheck className="w-4 h-4" /> ADMIN
            </button>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold animate-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="email" 
                placeholder="Email đăng nhập" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/5 outline-none dark:text-white font-bold transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="password" 
                placeholder="Mật khẩu" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/5 outline-none dark:text-white font-bold transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.8rem] font-black shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
          >
            Đăng nhập hệ thống <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
