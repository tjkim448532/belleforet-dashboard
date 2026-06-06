import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Lock, LogIn, Moon, Sun } from 'lucide-react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      navigate('/');
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="w-full max-w-md p-8 rounded-2xl glass-panel-light dark:glass-panel-dark shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl" />
        
        <div className="relative z-10 text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4 shadow-inner">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">경영진 대시보드</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">보안을 위해 공용 비밀번호를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className={`w-full px-5 py-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border focus:ring-2 outline-none transition-all ${
                error 
                  ? 'border-red-500 focus:ring-red-500/50 text-red-500' 
                  : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {error && (
              <p className="text-red-500 text-xs mt-2 font-medium px-2">비밀번호가 올바르지 않습니다.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 active:translate-y-0"
          >
            <LogIn size={20} />
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
