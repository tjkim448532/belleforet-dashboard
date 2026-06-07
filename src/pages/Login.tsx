import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, LogIn, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      alert(`[로그인 실패 알림]\n원인: ${result.errorMsg}\n\n※ user-not-found 에러인 경우, 파이어베이스 콘솔(Authentication)에 해당 이메일이 아직 회원가입(추가)되지 않은 것입니다.`);
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-800 font-sans relative overflow-hidden">
      
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-brand-mint rounded-b-[60px] z-0" />
      <div className="absolute top-10 left-10 w-48 h-48 bg-white/20 rounded-full blur-2xl z-0" />
      <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0" />

      <div className="w-full max-w-md p-8 md:p-10 rounded-[32px] bg-white shadow-[0_20px_60px_rgb(0,0,0,0.08)] relative z-10 mx-4">
        
        <div className="relative z-10 text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-brand-mint/10 text-brand-mint mb-6">
            <Lock size={36} strokeWidth={2.5} />
          </div>
          <div className="font-emphatic text-3xl tracking-widest text-brand-mint mb-2">BELLE FORET</div>
          <h1 className="text-2xl font-bold tracking-tight mb-3">임직원 전용 대시보드</h1>
          <p className="text-sm text-slate-500 font-medium">벨포레 회사 이메일로 로그인하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="회사 이메일 (@bsbelleforet.com)"
                className={`w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border focus:ring-4 outline-none transition-all font-medium ${
                  error 
                    ? 'border-red-300 focus:ring-red-500/20 text-red-500' 
                    : 'border-slate-200 focus:border-brand-mint focus:ring-brand-mint/20'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className={`w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border focus:ring-4 outline-none transition-all font-medium ${
                  error 
                    ? 'border-red-300 focus:ring-red-500/20 text-red-500' 
                    : 'border-slate-200 focus:border-brand-mint focus:ring-brand-mint/20'
                }`}
                required
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-3 font-bold px-2 text-center animate-pulse">
                이메일 도메인 또는 비밀번호가 올바르지 않습니다.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-white bg-brand-mint hover:bg-[#009c85] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-lg"
          >
            <LogIn size={22} />
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
