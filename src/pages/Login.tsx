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
    <div className="min-h-screen flex items-center justify-center bg-[#F4F3EE] text-[#1B382E] font-sans relative overflow-hidden">
      
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-[#284F42] rounded-b-[60px] z-0 overflow-hidden shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="w-full max-w-md p-8 md:p-10 rounded-[32px] bg-white border border-[#D0C6BB]/75 shadow-[0_20px_60px_rgba(40,79,66,0.12)] relative z-10 mx-4">
        
        <div className="relative z-10 text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-[#E8F2EE] text-[#284F42] border border-[#B4C6C1]/60 mb-6 shadow-xs">
            <Lock size={36} strokeWidth={2.5} />
          </div>
          <div className="font-emphatic text-3xl tracking-widest text-[#284F42] mb-2 font-black">BELLE FORET</div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-[#1B382E] break-keep whitespace-nowrap">임직원 전용 대시보드</h1>
          <p className="text-sm text-[#5A6B63] font-medium">벨포레 회사 이메일로 로그인하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5A6B63]">
                <Mail size={20} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="회사 이메일 (@bsbelleforet.com)"
                className={`w-full pl-12 pr-5 py-4 rounded-2xl bg-[#F4F3EE] border focus:ring-4 outline-none transition-all font-medium text-[#1B382E] ${
                  error 
                    ? 'border-red-300 focus:ring-red-500/20 text-red-500' 
                    : 'border-[#D0C6BB] focus:border-[#284F42] focus:ring-[#284F42]/20'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5A6B63]">
                <Lock size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className={`w-full pl-12 pr-5 py-4 rounded-2xl bg-[#F4F3EE] border focus:ring-4 outline-none transition-all font-medium text-[#1B382E] ${
                  error 
                    ? 'border-red-300 focus:ring-red-500/20 text-red-500' 
                    : 'border-[#D0C6BB] focus:border-[#284F42] focus:ring-[#284F42]/20'
                }`}
                required
              />
            </div>
            {error && (
              <p className="text-[#8B2635] text-sm mt-3 font-medium px-2 text-center animate-pulse">
                이메일 도메인 또는 비밀번호가 올바르지 않습니다.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-white bg-[#284F42] hover:bg-[#1B382E] hover:shadow-lg active:scale-98 text-lg cursor-pointer shadow-xs"
          >
            <LogIn size={22} />
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
