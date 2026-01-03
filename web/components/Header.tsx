
import React from 'react';
import { Library, LayoutDashboard, FolderTree, Trash2, Languages, Sun, Moon, Monitor, ShieldCheck, LogOut, Clock } from 'lucide-react';
import { Language, Theme, ViewType, UserRole, User, Department } from '../types';

interface HeaderProps {
  t: any;
  view: ViewType;
  setView: (v: ViewType) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  langCodes: {lang: string, code: string}[];
  // Fix: Property 'user' and 'departments' should be in props to match usage in App.tsx
  user: User | null;
  departments: Department[];
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ t, view, setView, language, setLanguage, theme, setTheme, langCodes, user, departments, onLogout }) => {
  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('auto');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4 text-orange-500" />;
    if (theme === 'dark') return <Moon className="w-4 h-4 text-blue-400" />;
    return <Monitor className="w-4 h-4 text-slate-500" />;
  };

  return (
    <header className="h-14 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-40">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
            <Library className="text-white w-4 h-4" />
          </div>
          <span className="font-black text-lg tracking-tighter italic dark:text-white">{t.brandName}</span>
        </div>
        
        <nav className="hidden sm:flex items-center gap-1">
          <button 
            onClick={() => setView('dashboard')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'dashboard' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> {t.home}
          </button>
          {/* Fix: check role from user object */}
          {user?.role === 'admin' && (
            <button 
              onClick={() => setView('admin-panel')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'admin-panel' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> {t.adminPanel}
            </button>
          )}
          <button 
            onClick={() => setView('folders')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'folders' ? 'bg-slate-50 dark:bg-slate-800 text-slate-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <FolderTree className="w-3.5 h-3.5" /> {t.folderMgmt}
          </button>
          <button 
            onClick={() => setView('history')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'history' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Clock className="w-3.5 h-3.5" /> {t.history}
          </button>
          <button 
            onClick={() => setView('trash')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'trash' ? 'bg-red-50 dark:bg-red-900/40 text-red-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Trash2 className="w-3.5 h-3.5" /> {t.trash}
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          title="Toggle Theme"
        >
          {getThemeIcon()}
        </button>

        {/* Language Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <Languages className="w-3.5 h-3.5 text-blue-500 ml-1" />
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as Language)} 
            className="bg-transparent text-[10px] font-black uppercase cursor-pointer dark:text-white outline-none"
          >
            {langCodes.map(lc => <option key={lc.lang} value={lc.lang} className="dark:bg-slate-900">{lc.code}</option>)}
          </select>
        </div>

        <button 
          onClick={onLogout} 
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
