import { useState, useEffect } from 'react';

export default function SleepModeModal() {
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [details, setDetails] = useState('');

  useEffect(() => {
    const handleSleepMode = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setDetails(customEvent.detail || '야간 비용 절감을 위해 매일 20:00 ~ 08:00에는 데이터베이스가 수면 모드에 들어갑니다.');
      setIsSleepMode(true);
    };

    window.addEventListener('belleforet:sleep-mode', handleSleepMode);
    return () => {
      window.removeEventListener('belleforet:sleep-mode', handleSleepMode);
    };
  }, []);

  if (!isSleepMode) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="text-6xl sm:text-7xl animate-bounce mb-6 select-none">🌙</div>
      <h1 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight">
        현재 서버가 자고 있습니다 🌙
      </h1>
      <p className="text-sm sm:text-base text-slate-300 max-w-md leading-relaxed mb-8 font-medium">
        {details.includes('20:00') ? (
          <>
            야간 비용 절감을 위해 매일 <b className="text-amber-400 font-bold">20:00 ~ 08:00</b>에는<br />
            데이터베이스가 수면(Sleep) 모드에 들어갑니다.<br />
            매일 아침 08:00에 정상 가동됩니다!
          </>
        ) : (
          details
        )}
      </p>
      <button
        onClick={() => setIsSleepMode(false)}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 text-sm"
      >
        대시보드 둘러보기 (닫기)
      </button>
    </div>
  );
}
