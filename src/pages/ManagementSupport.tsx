import { useState } from 'react';
import { Send, Copy, CheckCircle2, MessageSquare, Clock, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ManagementSupport() {
  const { isAdmin } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(isAdmin);
  const [authPassword, setAuthPassword] = useState('');
  
  const currentDate = '26년 06월 06일(토)'; // Using current date context
  const nextDate = '06/07(일)';

  const defaultMessage = `[Web발신]
[블랙스톤 벨포레 리조트]영업보고
일자: ${currentDate}
내장팀: 114팀(451명)
총매출: 103,220,931원

골프: 35,052,000원
객실: 22,823,203원
프로샵: 253,000원
연회장: 0원
벨포레 굿즈: 11,000원

마운틴카트: 1,100,380원
사계절썰매장: 744,940원
회전그네: 120,000원
미니골프: 152,000원
마리나 클럽: 139,200원
놀이동산: 906,500원
펫포레: 0원

벨포레 목장: 1,256,520원
벨포레 목장(체험): 204,000원
(앵무새: 102,000원 포함)

모토아레나: 12,194,820원
미디어아트센터: 582,360원
미디어-뮤지엄카페: 101,500원
미디어-기프트샵: 20,000원
벨포레홀: -130,000원[온라인매출]
원더풀: 110,000원[온라인매출]
썸머랜드: 0원
주차관제: 1,221,000원

브리스킷346: 4,825,900원
얼룩말카페: 529,000원
밤밤테이블: 5,465,238원
남도예담: 3,360,200원
클럽-레스토랑: 1,548,000원
클럽-스타트하우스: 2,512,000원
쿠치나: 947,000원
핏스탑: 265,000원
딜라이트: 524,000원
투썸플레이스: 1,475,750원
BHC(멕시카나): 1,200,500원
CU편의점: 3,705,920원
밤밤트럭: 0원

${nextDate} 예약팀: 120팀
첫팀: 06:20
막팀: 18:52`;

  const [message, setMessage] = useState(defaultMessage);
  const [receiverPhone, setReceiverPhone] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Handle local page authentication
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === 'service' || authPassword === 'aebece') {
      setIsUnlocked(true);
    } else {
      alert('비밀번호가 일치하지 않습니다.');
    }
  };

  // Handle Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('복사에 실패했습니다.');
    }
  };

  const handleFetchReport = async () => {
    try {
      // API call to generate report from MariaDB
      // Assuming today is 06-06, we fetch data for '2026-06-05'
      const response = await fetch('/api/generate-report?date=2026-06-05');
      const result = await response.json();
      if (result.success) {
        setMessage(result.message);
        alert('✅ MariaDB에서 영업 데이터를 성공적으로 불러왔습니다!');
      } else {
        alert('❌ 데이터 불러오기 실패: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('❌ 데이터 불러오기 중 오류가 발생했습니다.');
    }
  };

  // Handle Send SMS via Solapi API
  const handleSendSMS = async () => {
    if (!receiverPhone) {
      alert('수신 번호를 입력해주세요.');
      return;
    }

    if (isScheduled && !scheduledDate) {
      alert('예약 시간을 설정해주세요.');
      return;
    }

    // Split and clean phone numbers
    const phones = receiverPhone.split(/[\n, ]+/).map(p => p.replace(/[^0-9]/g, '')).filter(p => p.length >= 10);
    
    if (phones.length === 0) {
      alert('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    const confirmMsg = isScheduled 
      ? `총 ${phones.length}명에게 ${new Date(scheduledDate).toLocaleString()}에 문자를 예약 발송하시겠습니까?`
      : `총 ${phones.length}명에게 지금 즉시 문자를 발송하시겠습니까?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsSending(true);
    try {
      const payload: any = {
        to: phones.join(','),
        text: message
      };
      
      if (isScheduled) {
        payload.scheduledDate = new Date(scheduledDate).toISOString();
      }

      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(isScheduled ? '✅ 문자 예약 발송이 성공적으로 등록되었습니다!' : '✅ 문자가 성공적으로 발송되었습니다!');
      } else {
        alert(`❌ 문자 발송 실패: ${result.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('SMS Send Error:', err);
      alert('❌ 서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="w-full h-full min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-200 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">접근 제한 구역</h2>
          <p className="text-slate-500 mb-6 text-sm">경영지원실 영업보고 문자 발송 기능은 승인된 관리자만 접근할 수 있습니다.</p>
          
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              placeholder="접속 비밀번호 입력"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50 mb-4 text-center"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors"
            >
              인증하고 들어가기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 p-4 md:p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 text-brand-mint text-sm font-bold">
            <ShieldAlert size={16} /> 최고 관리자 인증 완료
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <MessageSquare className="text-brand-mint" size={32} />
            영업보고 문자 발송 시스템
          </h1>
          <p className="text-slate-500 mt-2 font-medium">다중 수신자 발송 및 예약 발송이 지원되는 솔라피(Solapi) 연동 엔진입니다.</p>
        </div>

        {/* Sender / Receiver Info Form */}
        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            📡 발송 정보 세팅
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">수신자 번호 (여러 명 가능)</label>
              <textarea
                placeholder="01012345678, 01098765432&#13;&#10;콤마(,)나 줄바꿈으로 여러 명을 입력할 수 있습니다."
                className="w-full h-[120px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50 resize-y"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
              />
              <p className="text-xs font-bold text-brand-mint mt-2">
                총 {receiverPhone.split(/[\n, ]+/).filter(p => p.replace(/[^0-9]/g, '').length >= 10).length}명의 유효한 수신자가 입력되었습니다.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">발송 시점 선택</label>
              
              <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
                <button
                  className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${!isScheduled ? 'bg-white text-brand-mint shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setIsScheduled(false)}
                >
                  즉시 발송
                </button>
                <button
                  className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1 ${isScheduled ? 'bg-brand-mint text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setIsScheduled(true)}
                >
                  <Clock size={14} /> 예약 발송
                </button>
              </div>

              {isScheduled && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-slate-400 mt-2">현재 시간으로부터 최소 10분 이후부터 예약 가능합니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              📱 문자 내용 작성 및 편집
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFetchReport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-md mr-2"
              >
                📥 데이터 자동 생성
              </button>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {copied ? '복사완료!' : '내용 복사'}
              </button>
              <button
                onClick={handleSendSMS}
                disabled={isSending}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                  isSending ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-brand-mint text-white hover:bg-emerald-500'
                }`}
              >
                {isScheduled ? <Clock size={18} /> : <Send size={18} className={isSending ? 'animate-pulse' : ''} />}
                {isSending ? '처리 중...' : (isScheduled ? '문자 예약하기' : '즉시 쏘기!')}
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              className="w-full h-[600px] p-6 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-mint/50 focus:border-brand-mint resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm">
              글자수: {message.length}자 (LMS 장문 자동처리)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
