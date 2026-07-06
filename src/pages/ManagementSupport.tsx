import { useState, useEffect } from 'react';
import { Send, Copy, CheckCircle2, MessageSquare, Clock, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDate } from '../contexts/DateContext';

export default function ManagementSupport() {
  const { isAdmin } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(isAdmin);
  const [authPassword, setAuthPassword] = useState('');
  const { startDate } = useDate();
  const [reportDate, setReportDate] = useState(startDate);

  const [capacities, setCapacities] = useState<Record<string, number>>({
    '16평': 70,
    '35평': 50,
    '51평': 30,
    '펫룸 16평': 10,
    '펫룸 35평': 10,
    '펫룸 51평': 10
  });

  useEffect(() => {
    const fetchCapacities = async () => {
      try {
        const { db } = await import('../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'roomCapacity', 'default');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCapacities(docSnap.data() as Record<string, number>);
        }
      } catch (err) {
        console.error('Error fetching capacities:', err);
      }
    };
    fetchCapacities();
  }, []);

  const handleUpdateCapacity = async (key: string, value: number) => {
    const updated = { ...capacities, [key]: value };
    setCapacities(updated);
    try {
      const { db } = await import('../lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'roomCapacity', 'default'), updated);
    } catch (err) {
      console.error('Error saving capacities:', err);
      alert('객실 수용량 저장 실패: ' + err);
    }
  };

  const currentDate = '26년 06월 06일(토)'; // Using current date context
  const nextDate = '06/07(일)';

  const defaultMessage = `[블랙스톤 벨포레 리조트]영업보고
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
  const [scheduledTime, setScheduledTime] = useState('09:00'); // Default 09:00 AM
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
      const response = await fetch(`https://belleforet-data.vercel.app/api/generate-report?date=${reportDate}`);
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`서버 응답 오류 (HTTP ${response.status}):\n${text.slice(0, 150)}...`);
      }

      const result = await response.json();
      if (result.success) {
        setMessage(result.message);
        alert('✅ MariaDB에서 영업 데이터를 성공적으로 불러왔습니다!');
      } else {
        alert('❌ 데이터 불러오기 실패: ' + result.error);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      alert(`❌ 데이터 불러오기 중 오류가 발생했습니다.\n\n상세내용: ${err.message}`);
    }
  };

  // Handle Send SMS via Solapi API
  const handleSendSMS = async () => {
    if (!receiverPhone) {
      alert('수신 번호를 입력해주세요.');
      return;
    }

    if (isScheduled && !scheduledTime) {
      alert('매일 발송할 시간을 설정해주세요.');
      return;
    }

    // Split and clean phone numbers
    const phones = receiverPhone.split(/[\n, ]+/).map(p => p.replace(/[^0-9]/g, '')).filter(p => p.length >= 10);
    
    if (phones.length === 0) {
      alert('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    const confirmMsg = isScheduled 
      ? `총 ${phones.length}명에게 매일 [${scheduledTime}]에 영업보고 문자를 자동 발송하도록 정기 구독을 등록하시겠습니까? (MariaDB 데이터를 자동 취합합니다)`
      : `총 ${phones.length}명에게 지금 즉시 문자를 발송하시겠습니까?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsSending(true);
    try {
      if (isScheduled) {
        // Save daily schedule to Firestore
        const { db } = await import('../lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        
        await setDoc(doc(db, 'dailySmsSchedules', 'defaultSchedule'), {
          phones,
          time: scheduledTime,
          updatedAt: new Date().toISOString()
        });
        
        alert('✅ 매일 정기구독(자동 발송)이 파이어베이스에 성공적으로 등록되었습니다!');
      } else {
        // Immediate Send
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {
          to: phones.join(','),
          text: message
        };

        const response = await fetch('https://belleforet-data.vercel.app/api/send-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`서버 응답 오류 (HTTP ${response.status}):\n${text.slice(0, 150)}...`);
        }

        const result = await response.json();

        if (result.success) {
          alert('✅ 문자가 성공적으로 즉시 발송되었습니다!');
        } else {
          alert(`❌ 문자 발송 실패: ${result.error || '알 수 없는 오류'}`);
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Action Error:', err);
      alert(`❌ 서버와 통신하는 중 오류가 발생했습니다.\n\n상세내용: ${err.message}`);
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
          <h2 className="text-2xl font-medium text-slate-800 mb-2">접근 제한 구역</h2>
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
              className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors"
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
          <div className="flex items-center gap-2 mb-2 text-brand-mint text-sm font-medium">
            <ShieldAlert size={16} /> 최고 관리자 인증 완료
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-slate-900 flex items-center gap-3">
            <MessageSquare className="text-brand-mint" size={32} />
            영업보고 문자 발송 시스템
          </h1>
          <p className="text-slate-500 mt-2 font-medium">다중 수신자 발송 및 예약 발송이 지원되는 솔라피(Solapi) 연동 엔진입니다.</p>
        </div>

        {/* Sender / Receiver Info Form */}
        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-6">
          <h2 className="text-xl font-medium text-slate-800 mb-4 flex items-center gap-2">
            📡 발송 정보 세팅
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">수신자 번호 (여러 명 가능)</label>
              <textarea
                placeholder="01012345678, 01098765432&#13;&#10;콤마(,)나 줄바꿈으로 여러 명을 입력할 수 있습니다."
                className="w-full h-[120px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50 resize-y"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
              />
              <p className="text-xs font-medium text-brand-mint mt-2">
                총 {receiverPhone.split(/[\n, ]+/).filter(p => p.replace(/[^0-9]/g, '').length >= 10).length}명의 유효한 수신자가 입력되었습니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">보고 대상 날짜 선택</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50 font-medium text-center"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
              <p className="text-xs text-brand-mint font-medium mt-2 text-center">
                이 날짜의 매출 데이터를 취합하여 보고서를 생성합니다.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">발송 시점 선택</label>
              
              <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
                <button
                  className={`flex-1 py-2 font-medium text-sm rounded-lg transition-colors ${!isScheduled ? 'bg-white text-brand-mint shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setIsScheduled(false)}
                >
                  단건 즉시 발송
                </button>
                <button
                  className={`flex-1 py-2 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-1 ${isScheduled ? 'bg-brand-mint text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setIsScheduled(true)}
                >
                  <Clock size={14} /> 매일 정기 발송
                </button>
              </div>

              {isScheduled && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50 text-xl font-medium text-center"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                  <p className="text-xs text-brand-mint font-medium mt-2 text-center">
                    매일 위 시간에 최신 리포트가 자동 발송됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
              📱 문자 내용 작성 및 편집
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFetchReport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-all shadow-md mr-2"
              >
                📥 데이터 자동 생성
              </button>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {copied ? '복사완료!' : '내용 복사'}
              </button>
              <button
                onClick={handleSendSMS}
                disabled={isSending}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all shadow-md hover:shadow-lg ${
                  isSending ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-brand-mint text-white hover:bg-emerald-500'
                }`}
              >
                {isScheduled ? <Clock size={18} /> : <Send size={18} className={isSending ? 'animate-pulse' : ''} />}
                {isSending ? '처리 중...' : (isScheduled ? '매일 정기구독 등록' : '즉시 쏘기!')}
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              className="w-full h-[600px] p-6 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-mint/50 focus:border-brand-mint resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-400 bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm">
              글자수: {message.length}자 (LMS 장문 자동처리)
            </div>
          </div>
        </div>

        {/* Firestore Room Capacity Configurations Card */}
        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mt-6">
          <h2 className="text-xl font-medium text-slate-800 mb-4 flex items-center gap-2">
            🏨 평형별 객실 총 수용량(Inventory Capacity) 설정
          </h2>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            각 객실 평형별 실제 보유하고 있는 총 방 개수를 지정합니다. 이 수치는 리조트사업본부 탭에서 실시간 객실 가동률을 계산하는 데 사용됩니다.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Object.entries(capacities).map(([key, val]) => (
              <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="block text-xs font-medium text-slate-400 mb-2">{key}</span>
                <input
                  type="number"
                  min="0"
                  className="w-full text-center text-lg font-medium bg-white border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                  value={val}
                  onChange={(e) => handleUpdateCapacity(key, parseInt(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
