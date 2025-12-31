
import React from 'react';
import { Library, LayoutDashboard, FolderTree, Trash2, Languages, Sun, Moon, Monitor } from 'lucide-react';
import { Language, Theme, ViewType } from '../types';

interface HeaderProps {
  t: any;
  view: ViewType;
  setView: (v: ViewType) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  langCodes: {lang: string, code: string}[];
}

const Header: React.FC<HeaderProps> = ({ t, view, setView, language, setLanguage, theme, setTheme, langCodes }) => {
  return (
    <header className="h-14 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-40">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Library className="text-white w-4 h-4" />
          </div>
          <span className="font-black text-lg tracking-tighter italic">{t.brandName}</span>
        </div>
        
        <nav className="hidden sm:flex items-center gap-1">
          <button 
            onClick={() => setView('dashboard')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'dashboard' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> {t.home}
          </button>
          <button 
            onClick={() => setView('folders')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'folders' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <FolderTree className="w-3.5 h-3.5" /> {t.folderMgmt}
          </button>
          <button 
            onClick={() => setView('trash')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${view === 'trash' ? 'bg-red-50 dark:bg-red-900/40 text-red-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Trash2 className="w-3.5 h-3.5" /> {t.trash}
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <Languages className="w-3.5 h-3.5 text-blue-500 ml-1" />
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="bg-transparent text-[10px] font-black uppercase cursor-pointer dark:text-white">
            {langCodes.map(lc => <option key={lc.lang} value={lc.lang}>{lc.code}</option>)}
          </select>
        </div>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light')} className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg">
          {theme === 'light' ? <Sun className="w-3.5 h-3.5 text-orange-500" /> : theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Monitor className="w-3.5 h-3.5 text-blue-500" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
