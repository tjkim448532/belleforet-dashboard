import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../contexts/SimulationContext';
import { CheckSquare, Square, Save, RotateCcw } from 'lucide-react';

// 가상의 결제 내역 50개 생성
const HQS = ['골프', '숙박', '레저', '식음'];
const DESCRIPTIONS: Record<string, string[]> = {
  '골프': ['그린피 (4인)', '카트비', '캐디피', '프로샵 용품 구매', '클럽 대여'],
  '숙박': ['프리미엄 객실 결제', '스탠다드 객실 결제', '룸서비스', '미니바 이용', '얼리 체크인 추가금'],
  '레저': ['사계절 썰매 이용권', '루지 탑승권', '목장 입장권', '요트 투어', '키즈 체험 교실'],
  '식음': ['레스토랑 디너 코스', '조식 뷔페 2인', '카페테리아 커피', '라운지 바 이용', '바베큐장 예약']
};

const MOCK_TRANSACTIONS = Array.from({ length: 50 }).map((_, i) => {
  const hq = HQS[Math.floor(Math.random() * HQS.length)];
  const descList = DESCRIPTIONS[hq];
  const desc = descList[Math.floor(Math.random() * descList.length)];
  const amount = Math.floor(Math.random() * 20 + 1) * 10000; // 1만 ~ 20만

  return {
    id: `TX-${2000 + i}`,
    time: `1${Math.floor(Math.random() * 8) + 1}:${Math.floor(Math.random() * 50) + 10}`,
    hq,
    description: desc,
    amount
  };
}).sort((a, b) => a.time.localeCompare(b.time));

export default function Simulator() {
  const { setSimulatedData, clearSimulation } = useSimulation();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === MOCK_TRANSACTIONS.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(MOCK_TRANSACTIONS.map(t => t.id)));
    }
  };

  const { hqTotals, totalSales } = useMemo(() => {
    const totals: Record<string, number> = { '골프': 0, '숙박': 0, '레저': 0, '식음': 0 };
    let sum = 0;
    
    MOCK_TRANSACTIONS.forEach(t => {
      if (selectedIds.has(t.id)) {
        totals[t.hq] += t.amount;
        sum += t.amount;
      }
    });

    return { hqTotals: totals, totalSales: sum };
  }, [selectedIds]);

  const handleApply = () => {
    setSimulatedData({ hqTotals, totalSales });
    navigate('/');
  };

  const handleClear = () => {
    clearSimulation();
    setSelectedIds(new Set());
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-80px)]">
      
      {/* Header */}
      <div className="bg-brand-mint p-6 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">매출 시뮬레이터 (Simulator)</h1>
          <p className="text-white/80 text-sm">가상의 개별 결제 내역을 체크하여 메인 현황판 실적에 반영해 봅니다.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleClear} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors font-bold text-sm">
            <RotateCcw size={16} /> 초기화
          </button>
          <button onClick={handleApply} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors font-bold text-sm text-brand-mint shadow-lg">
            <Save size={16} /> 현황판에 적용하기
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex gap-8 items-center text-sm font-bold">
        <div className="text-slate-500">선택된 합계:</div>
        <div className="text-2xl font-emphatic text-brand-mint">{new Intl.NumberFormat('ko-KR').format(totalSales)}원</div>
        
        <div className="flex gap-4 ml-auto">
          {HQS.map(hq => (
            <div key={hq} className="flex gap-2">
              <span className="text-slate-400">{hq}</span>
              <span className="text-slate-700">{new Intl.NumberFormat('ko-KR').format(hqTotals[hq])}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto p-0">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-white sticky top-0 border-b border-slate-200 shadow-sm z-10">
            <tr>
              <th className="p-4 w-12 text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={toggleAll}>
                {selectedIds.size === MOCK_TRANSACTIONS.length ? <CheckSquare className="text-brand-mint mx-auto" /> : <Square className="text-slate-300 mx-auto" />}
              </th>
              <th className="p-4 w-24">결제 시간</th>
              <th className="p-4 w-32">트랜잭션 ID</th>
              <th className="p-4 w-24">본부 분류</th>
              <th className="p-4">결제 내역 (항목)</th>
              <th className="p-4 text-right">결제 금액</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TRANSACTIONS.map((t) => {
              const isSelected = selectedIds.has(t.id);
              return (
                <tr 
                  key={t.id} 
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-brand-mint/5' : ''}`}
                  onClick={() => toggleSelect(t.id)}
                >
                  <td className="p-4 text-center">
                    {isSelected ? <CheckSquare className="text-brand-mint mx-auto" /> : <Square className="text-slate-300 mx-auto" />}
                  </td>
                  <td className="p-4 font-mono text-slate-500">{t.time}</td>
                  <td className="p-4 font-mono text-xs text-slate-400">{t.id}</td>
                  <td className="p-4 font-bold text-slate-700">{t.hq}</td>
                  <td className="p-4">{t.description}</td>
                  <td className="p-4 text-right font-bold text-slate-800">{new Intl.NumberFormat('ko-KR').format(t.amount)}원</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
