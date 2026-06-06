import { useState } from 'react';
import { Send, Copy, CheckCircle2, MessageSquare } from 'lucide-react';

export default function ManagementSupport() {
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
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

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

  // Handle Send SMS via Solapi API
  const handleSendSMS = async () => {
    if (!receiverPhone) {
      alert('수신 번호를 입력해주세요.');
      return;
    }

    // Basic validation for phone number
    const formattedPhone = receiverPhone.replace(/[^0-9]/g, '');
    if (formattedPhone.length < 10) {
      alert('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    if (!confirm(`${formattedPhone} 번호로 솔라피 문자를 발송하시겠습니까?`)) {
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          text: message
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('✅ 문자가 성공적으로 발송되었습니다!');
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

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 p-4 md:p-8 pb-20">
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <MessageSquare className="text-brand-mint" size={32} />
            경영지원실 영업보고
          </h1>
          <p className="text-slate-500 mt-2 font-medium">솔라피(Solapi) API를 이용해 경영진에게 일일 영업보고 문자를 발송합니다.</p>
        </div>

        {/* Sender / Receiver Info Form */}
        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            📡 발송 정보 세팅
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">수신자 번호 (받는 사람)</label>
              <input
                type="tel"
                placeholder="01012345678 (숫자만 입력)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2">여러 명일 경우 추후 그룹 발송 기능으로 업데이트 할 수 있습니다.</p>
            </div>
            <div className="flex items-end">
              <div className="w-full bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-medium h-[70px] flex items-center">
                💡 발신번호와 API 키는 서버 환경변수에 안전하게 등록되어 있습니다.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              📱 문자 메시지 미리보기
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {copied ? '복사완료!' : '내용 복사하기'}
              </button>
              <button
                onClick={handleSendSMS}
                disabled={isSending}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                  isSending ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-brand-mint text-white hover:bg-emerald-500'
                }`}
              >
                <Send size={18} className={isSending ? 'animate-pulse' : ''} />
                {isSending ? '발송 중...' : '문자 실발송하기'}
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
              글자수: {message.length}자 (LMS 장문 전환 자동처리)
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
