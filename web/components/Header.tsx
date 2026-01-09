
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Library, LayoutDashboard, FolderTree, Languages, Sun, Moon, Monitor, LogOut, Clock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { Language, Theme, User } from '../types';

interface HeaderProps {
  t: any;
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  langCodes: {lang: string, code: string}[];
  user: User | null;
  departments: any[];
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ t, language, setLanguage, theme, setTheme, langCodes, user, onLogout }) => {
  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('auto');
    else setTheme('light');
  };

  const getThemeInfo = () => {
    if (theme === 'light') return { icon: <Sun className="w-4 h-4 text-orange-500" />, label: t.lightMode };
    if (theme === 'dark') return { icon: <Moon className="w-4 h-4 text-blue-400" />, label: t.darkMode };
    return { icon: <Monitor className="w-4 h-4 text-slate-500" />, label: t.systemMode };
  };

  const themeInfo = getThemeInfo();

  return (
    <header className="h-16 flex-shrink-0 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 px-6 flex items-center justify-between z-40 shadow-sm">
      <div className="flex items-center gap-8">
        <NavLink to="/dashboard" className="flex items-center gap-3 cursor-pointer group select-none">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none transition-transform group-hover:scale-105">
            <Library className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight italic dark:text-white leading-none pt-0.5">{t.brandName}</span>
        </NavLink>
        
        <nav className="hidden md:flex items-center gap-2">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> {t.home}
          </NavLink>
          
          {user?.role === 'admin' ? (
            <NavLink 
              to="/admin-panel" 
              className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <ShieldCheck className="w-4 h-4" /> {t.adminPanel}
            </NavLink>
          ) : (
            <NavLink 
              to="/folders" 
              className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${isActive ? 'bg-slate-50 dark:bg-slate-800 text-slate-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <FolderTree className="w-4 h-4" /> {t.folderMgmt}
            </NavLink>
          )}

          <NavLink 
            to="/history" 
            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Clock className="w-4 h-4" /> {t.history}
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <NavLink 
          to="/profile"
          className={({ isActive }) => `p-2.5 rounded-xl border transition-all ${isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100'}`}
        >
          <UserIcon className="w-4.5 h-4.5" />
        </NavLink>

        <button 
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group"
          title={`${themeInfo.label}`}
        >
          <div className="group-hover:rotate-12 transition-transform duration-300">
            {themeInfo.icon}
          </div>
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 select-none">{themeInfo.label}</span>
        </button>

        <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Languages className="w-4 h-4 text-indigo-500 ml-1" />
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as Language)} 
            className="bg-transparent text-[10px] font-black uppercase cursor-pointer dark:text-white outline-none pr-1"
          >
            {langCodes.map(lc => <option key={lc.lang} value={lc.lang} className="dark:bg-slate-900">{lc.code}</option>)}
          </select>
        </div>

        <button 
          onClick={onLogout} 
          className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
