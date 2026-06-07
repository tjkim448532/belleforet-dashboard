import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../contexts/SimulationContext';
import { Save, RotateCcw, CheckCircle2 } from 'lucide-react';

const HQS = ['골프', '숙박', '레저', '식음'];
const HQ_COLORS: Record<string, string> = {
  '골프': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '숙박': 'bg-blue-100 text-blue-700 border-blue-200',
  '레저': 'bg-orange-100 text-orange-700 border-orange-200',
  '식음': 'bg-rose-100 text-rose-700 border-rose-200',
  '미지정': 'bg-slate-100 text-slate-500 border-slate-200'
};

// 결제 영업장 명칭 목록
const FACILITIES = [
  '블랙스톤CC', '마리나클럽', '투썸플레이스', '브리스킷346', 
  '목장입장권', '루지', '사계절썰매', '놀이동산',
  '콘도(숙박)', '세미나실 대관', '미디어아트센터'
];

const MOCK_TRANSACTIONS = Array.from({ length: 50 }).map((_, i) => {
  const desc = FACILITIES[Math.floor(Math.random() * FACILITIES.length)];
  const amount = Math.floor(Math.random() * 50 + 5) * 10000; // 5만 ~ 55만

  return {
    id: `TX-${2000 + i}`,
    time: `1${Math.floor(Math.random() * 8) + 1}:${Math.floor(Math.random() * 50) + 10}`,
    description: desc,
    amount
  };
}).sort((a, b) => a.time.localeCompare(b.time));

export default function Simulator() {
  const { setSimulatedData, clearSimulation } = useSimulation();
  const navigate = useNavigate();
  
  const [activeHq, setActiveHq] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const handleRowClick = (id: string) => {
    if (!activeHq) {
      alert('먼저 상단에서 할당할 "본부"를 클릭해 주세요!');
      return;
    }
    
    setAssignments(prev => {
      const newAssignments = { ...prev };
      // 이미 현재 본부로 지정된 것을 다시 클릭하면 취소 (미지정으로)
      if (newAssignments[id] === activeHq) {
        delete newAssignments[id];
      } else {
        newAssignments[id] = activeHq;
      }
      return newAssignments;
    });
  };

  const { hqTotals, totalSales } = useMemo(() => {
    const totals: Record<string, number> = { '골프': 0, '숙박': 0, '레저': 0, '식음': 0 };
    let sum = 0;
    
    MOCK_TRANSACTIONS.forEach(t => {
      const hq = assignments[t.id];
      if (hq && totals[hq] !== undefined) {
        totals[hq] += t.amount;
        sum += t.amount;
      }
    });

    return { hqTotals: totals, totalSales: sum };
  }, [assignments]);

  const handleApply = () => {
    setSimulatedData({ hqTotals, totalSales });
    navigate('/');
  };

  const handleClear = () => {
    clearSimulation();
    setAssignments({});
    setActiveHq(null);
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-80px)]">
      
      {/* Header */}
      <div className="bg-brand-mint p-6 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">본부지정</h1>
          <p className="text-white/90 text-sm font-medium">1. 상단의 본부를 선택하세요 ➔ 2. 아래 영업장을 클릭하여 해당 본부 매출로 할당하세요.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleClear} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors font-bold text-sm">
            <RotateCcw size={16} /> 초기화
          </button>
          <button onClick={handleApply} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors font-bold text-sm text-brand-mint shadow-lg">
            <Save size={16} /> 대시보드에 적용
          </button>
        </div>
      </div>

      {/* HQ Selector (The Palette) */}
      <div className="bg-slate-50 border-b border-slate-200 p-6">
        <div className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
          Step 1. 할당할 본부를 먼저 선택하세요 (현재 선택된 펜)
        </div>
        <div className="grid grid-cols-4 gap-4">
          {HQS.map(hq => {
            const isSelected = activeHq === hq;
            return (
              <button
                key={hq}
                onClick={() => setActiveHq(hq)}
                className={`py-4 px-6 rounded-2xl font-bold text-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  isSelected 
                    ? `${HQ_COLORS[hq].split(' ')[0]} border-slate-900 shadow-md transform scale-105` 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {hq} 본부 {isSelected && <CheckCircle2 size={20} className="text-slate-900" />}
                </div>
                <div className="text-sm font-medium opacity-80">
                  누적: {new Intl.NumberFormat('ko-KR').format(hqTotals[hq])}원
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-white border-b border-slate-100 p-4 flex gap-8 items-center text-sm font-bold shadow-sm z-20">
        <div className="text-slate-500">전체 할당된 금액:</div>
        <div className="text-2xl font-emphatic text-brand-mint">{new Intl.NumberFormat('ko-KR').format(totalSales)}원</div>
        
        <div className="ml-auto text-slate-400 bg-slate-100 px-4 py-2 rounded-full flex items-center gap-2">
          Step 2. 아래 리스트를 클릭하여 색칠하세요 👇
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto p-0 bg-slate-50">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-white sticky top-0 border-b border-slate-200 shadow-sm z-10">
            <tr>
              <th className="p-4 w-16 text-center">No.</th>
              <th className="p-4 w-28">결제 시간</th>
              <th className="p-4 w-32">트랜잭션 ID</th>
              <th className="p-4 w-32">지정 본부</th>
              <th className="p-4">영업장 명칭 (결제 영업장)</th>
              <th className="p-4 text-right">결제 금액</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TRANSACTIONS.map((t, idx) => {
              const assignedHq = assignments[t.id] || '미지정';
              const isAssigned = assignedHq !== '미지정';
              
              return (
                <tr 
                  key={t.id} 
                  className={`border-b border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors ${isAssigned ? 'bg-white' : ''}`}
                  onClick={() => handleRowClick(t.id)}
                >
                  <td className="p-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-4 font-mono text-slate-500">{t.time}</td>
                  <td className="p-4 font-mono text-xs text-slate-400">{t.id}</td>
                  <td className="p-4 font-bold">
                    <span className={`px-3 py-1 rounded-full text-xs border ${HQ_COLORS[assignedHq]}`}>
                      {assignedHq}
                    </span>
                  </td>
                  <td className="p-4">{t.description}</td>
                  <td className={`p-4 text-right font-bold ${isAssigned ? 'text-slate-800' : 'text-slate-400'}`}>
                    {new Intl.NumberFormat('ko-KR').format(t.amount)}원
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
