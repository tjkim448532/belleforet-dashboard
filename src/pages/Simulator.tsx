import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../contexts/SimulationContext';
import { useMapping } from '../contexts/MappingContext';
import { Save, RotateCcw, CheckCircle2, Plus, X } from 'lucide-react';

const getHqColor = (hq: string) => {
  if (hq.includes('골프')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (hq.includes('리조트') || hq.includes('숙박')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (hq.includes('레져') || hq.includes('레저')) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (hq.includes('식음')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (hq === '미지정' || hq === '미분류') return 'bg-slate-100 text-slate-500 border-slate-200';
  
  const colors = [
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-teal-100 text-teal-700 border-teal-200'
  ];
  const hash = hq.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// 결제 영업장 명칭 목록 (삭제 - 실제 데이터 사용)
// MOCK_TRANSACTIONS (삭제 - 실제 데이터 사용)

interface Transaction {
  id: string;
  time: string;
  description: string;
  amount: number;
}

export default function Simulator() {
  const { setSimulatedData, clearSimulation } = useSimulation();
  const { getCategoryForStore, mappings, categories, loading: mappingLoading, addCategory, deleteCategory } = useMapping();
  const navigate = useNavigate();
  
  const [activeHq, setActiveHq] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // 실데이터 S3 연동 API 호출
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const res = await fetch('https://belleforet-data.vercel.app/api/reports/recent-transactions');
        const data = await res.json();
        if (data.success && data.transactions) {
          setTransactions(data.transactions);
        } else {
          console.error("API error:", data.error);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRealData();
  }, []);

  // 매핑 정보를 기반으로 초기 본부 자동 지정
  useEffect(() => {
    if (transactions.length > 0 && mappings.length > 0) {
      setAssignments(prev => {
        const newAssignments = { ...prev };
        let updated = false;

        transactions.forEach(t => {
          if (!newAssignments[t.id]) {
            const fullCategory = getCategoryForStore(t.description);
            if (fullCategory !== '미분류') {
              newAssignments[t.id] = fullCategory;
              updated = true;
            }
          }
        });

        return updated ? newAssignments : prev;
      });
    }
  }, [transactions, mappings, getCategoryForStore]);

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
    const totals: Record<string, number> = {};
    categories.forEach(cat => totals[cat] = 0);
    
    let sum = 0;
    
    transactions.forEach(t => {
      const hq = assignments[t.id];
      if (hq && totals[hq] !== undefined) {
        totals[hq] += t.amount;
        sum += t.amount;
      }
    });

    return { hqTotals: totals, totalSales: sum };
  }, [assignments, transactions]);

  const handleApply = () => {
    setSimulatedData({ hqTotals, totalSales });
    navigate('/');
  };

  const handleClear = () => {
    clearSimulation();
    setAssignments({});
    setActiveHq(null);
  };

  const handleAddCategory = async () => {
    const name = window.prompt("추가할 본부의 이름을 입력하세요 (예: 외주업체, 신규사업부)");
    if (name && name.trim()) {
      await addCategory(name.trim());
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation(); // Prevents button click
    if (window.confirm(`'${name}' 본부를 정말 삭제하시겠습니까? 매핑된 데이터가 모두 '미분류'로 초기화됩니다.`)) {
      await deleteCategory(name);
      if (activeHq === name) setActiveHq(null);
    }
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
        <div className="flex flex-wrap gap-4">
          {categories.filter(c => c !== '미분류').map(hq => {
            const isSelected = activeHq === hq;
            const hqColorClasses = getHqColor(hq);
            return (
              <button
                key={hq}
                onClick={() => setActiveHq(hq)}
                className={`relative py-4 px-6 rounded-2xl font-bold text-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  isSelected 
                    ? `${hqColorClasses.split(' ')[0]} border-slate-900 shadow-md transform scale-105` 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {hq} {isSelected && <CheckCircle2 size={20} className="text-slate-900" />}
                </div>
                <div className="text-sm font-medium opacity-80">
                  누적: {new Intl.NumberFormat('ko-KR').format(hqTotals[hq] || 0)}원
                </div>
                {/* 커스텀 본부 전용 삭제 버튼 */}
                <div 
                  onClick={(e) => handleDeleteCategory(e, hq)}
                  className="absolute -top-2 -right-2 bg-slate-200 hover:bg-red-500 hover:text-white text-slate-500 rounded-full p-1 cursor-pointer transition-colors shadow-sm"
                  title="본부 삭제"
                >
                  <X size={14} />
                </div>
              </button>
            );
          })}
          <button
            onClick={handleAddCategory}
            className="py-4 px-6 rounded-2xl font-bold text-lg border-2 border-dashed border-slate-300 text-slate-400 hover:text-brand-mint hover:border-brand-mint hover:bg-brand-mint/5 transition-all flex flex-col items-center justify-center gap-1"
          >
            <Plus size={24} />
            <span className="text-sm">본부 추가</span>
          </button>
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
            {loading || mappingLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-bold animate-pulse">
                  실제 S3 영업 데이터 및 매핑 정보를 불러오는 중입니다...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                  최근 거래 내역이 없습니다.
                </td>
              </tr>
            ) : (
              transactions.map((t, idx) => {
                const assignedHq = assignments[t.id] || '미지정';
                const isAssigned = assignedHq !== '미지정';
                
                // 본부별 테마색 배경 매핑
                const rowBgColor = getHqColor(assignedHq).split(' ')[0].replace('100', '50');
                
                return (
                  <tr 
                    key={t.id} 
                    className={`border-b border-slate-100 cursor-pointer transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:scale-95 ${isAssigned ? rowBgColor : 'bg-white hover:bg-slate-50'} ${isAssigned ? 'shadow-[inset_4px_0_0_0_currentColor] text-slate-800' : ''}`}
                    style={{ color: isAssigned ? '#475569' : '' }}
                    onClick={() => handleRowClick(t.id)}
                  >
                    <td className="p-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-4 font-mono text-slate-500">{t.time}</td>
                    <td className="p-4 font-mono text-xs text-slate-400" title={t.id}>{t.id.substring(0, 15)}...</td>
                    <td className="p-4 font-bold">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border shadow-sm transition-all ${getHqColor(assignedHq)} ${isAssigned ? 'scale-110 inline-block' : ''}`}>
                        {isAssigned && <CheckCircle2 size={12} className="inline mr-1 -mt-0.5" />}
                        {assignedHq}
                      </span>
                    </td>
                    <td className={`p-4 font-bold ${isAssigned ? 'text-slate-800' : 'text-slate-600'}`}>{t.description}</td>
                    <td className={`p-4 text-right font-bold ${isAssigned ? 'text-slate-800' : 'text-slate-400'}`}>
                      {new Intl.NumberFormat('ko-KR').format(t.amount)}원
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
