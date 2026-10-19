import { useState, useEffect } from 'react';
import { AlertCircle, Plus, Trash2, Save } from 'lucide-react';
import { secureFetcher } from '../lib/secureFetcher';

interface Allocation {
  target_name: string;
  ratio: number;
}

interface DaolRule {
  id?: number;
  rule_type: string;
  source_name: string;
  target_name: string;
  ratio: number;
}

interface GroupedRule {
  rule_type: string;
  source_name: string;
  allocations: Allocation[];
}

export default function AdminDaolRules() {
  const [rules, setRules] = useState<GroupedRule[]>([]);
  const [unmappedRooms, setUnmappedRooms] = useState<string[]>([]);
  const [unmappedTickets, setUnmappedTickets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [ruleType, setRuleType] = useState('ROOM_TICKET_MAPPING');
  const [sourceName, setSourceName] = useState('');
  const [allocations, setAllocations] = useState<Allocation[]>([{ target_name: '', ratio: 0 }]);
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

  const fetchRules = async () => {
    try {
      const data = await secureFetcher(`${API_BASE}/api/v6/admin/daol-rules`);
      
      // Group flat rules by rule_type + source_name
      const grouped = new Map<string, GroupedRule>();
      data.rules.forEach((r: DaolRule) => {
        const key = `${r.rule_type}|${r.source_name}`;
        if (!grouped.has(key)) {
          grouped.set(key, { rule_type: r.rule_type, source_name: r.source_name, allocations: [] });
        }
        grouped.get(key)!.allocations.push({ target_name: r.target_name, ratio: Number(r.ratio) });
      });

      setRules(Array.from(grouped.values()));
      setUnmappedRooms(data.unmappedRooms || []);
      setUnmappedTickets(data.unmappedTickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAddAllocation = () => {
    setAllocations([...allocations, { target_name: '', ratio: 0 }]);
  };

  const handleUpdateAllocation = (index: number, field: 'target_name' | 'ratio', value: any) => {
    const newAlloc = [...allocations];
    newAlloc[index] = { ...newAlloc[index], [field]: value };
    setAllocations(newAlloc);
  };

  const handleRemoveAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const handleSaveRule = async () => {
    if (!sourceName.trim()) return alert('원본명(source_name)을 입력하세요.');
    if (allocations.some(a => !a.target_name.trim() || a.ratio <= 0)) {
      return alert('모든 분배 대상의 이름과 금액(또는 비율)을 올바르게 입력하세요.');
    }

    try {
      setSaving(true);
      await secureFetcher(`${API_BASE}/api/v6/admin/daol-rules`, {
        method: 'POST',
        body: JSON.stringify({
          rule_type: ruleType,
          source_name: sourceName.trim(),
          allocations
        })
      });
      
      setSourceName('');
      setAllocations([{ target_name: '', ratio: 0 }]);
      await fetchRules();
    } catch (err) {
      console.error(err);
      alert('룰 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (rType: string, sName: string) => {
    if (!window.confirm(`'${sName}' 매핑 룰을 정말 삭제하시겠습니까?`)) return;
    try {
      await secureFetcher(`${API_BASE}/api/v6/admin/daol-rules?rule_type=${rType}&source_name=${encodeURIComponent(sName)}`, {
        method: 'DELETE'
      });
      await fetchRules();
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleBackfill = async () => {
    if (!window.confirm('저장된 모든 룰을 기준으로 과거 데이터를 전체 재적재(Backfill) 하시겠습니까?\n이 작업은 데이터 양에 따라 수 초~수 분이 소요될 수 있습니다.')) return;
    try {
      setBackfilling(true);
      const data = await secureFetcher(`${API_BASE}/api/v6/admin/trigger-etl`, {
        method: 'POST'
      });
      if (data.success) {
        alert('과거 데이터 재적재가 완료되었습니다.');
      } else {
        alert(`백필 실패: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('백필 실행 중 오류가 발생했습니다.');
    } finally {
      setBackfilling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F3EE]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#284F42]"></div>
          <span className="text-xs font-bold text-[#5A6B63]">분배 룰 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F4F3EE] text-[#1B382E] tracking-tight pb-16 relative">
      {/* Ambient Forest Glow Banner */}
      <div className="w-full bg-[#284F42] h-[200px] absolute top-0 left-0 z-0 overflow-hidden rounded-b-[36px] border-b border-[#1B382E] shadow-xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#2F5548] opacity-70 pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-80 h-80 rounded-full bg-[#2F5548] opacity-40 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-60 h-60 rounded-full bg-[#1B382E] opacity-60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Tag Pill & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B382E]/80 border border-white/20 text-white/90 text-xs font-semibold backdrop-blur-xs shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5FB878] animate-pulse" />
              <span>BELLEFORET ADMIN · DAOL RULES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight break-keep whitespace-nowrap">
              객실 패키지 분배 관리
            </h1>
            <p className="text-white/80 mt-1 text-xs sm:text-sm font-medium">
              객실 패키지 요금(ROOM_TICKET_MAPPING)에 포함된 식음/레져 쿠폰의 원가를 각 본부로 배분하는 룰을 설정합니다.
            </p>
          </div>
        </div>

        {(unmappedRooms.length > 0 || unmappedTickets.length > 0) && (
          <div className="bg-[#FDF0ED] border border-[#EAC5BD] rounded-3xl p-5 text-sm text-[#8B2635] shadow-[0_4px_24px_rgba(40,79,66,0.06)]">
            <div className="flex items-center gap-2 mb-2 font-bold text-[#8B2635]">
              <AlertCircle size={20} />
              <span>최근 7일 내 미분류 항목 알림 (노션 알람 연동됨)</span>
            </div>
            <ul className="list-disc pl-6 space-y-1 text-xs sm:text-sm font-medium">
              {unmappedRooms.map(r => (
                <li key={r}>객실 패키지 미분류: <strong className="font-extrabold">{r}</strong> 
                  <button onClick={() => { setRuleType('ROOM_TICKET_MAPPING'); setSourceName(r); }} className="ml-3 text-xs bg-[#EAC5BD] px-2.5 py-1 rounded-lg hover:bg-[#d8aca3] text-[#8B2635] font-bold transition-colors">매핑 등록</button>
                </li>
              ))}
              {unmappedTickets.map(t => (
                <li key={t}>티켓 패키지 미분류: <strong className="font-extrabold">{t}</strong>
                  <button onClick={() => { setRuleType('DISTRIBUTION'); setSourceName(t); }} className="ml-3 text-xs bg-[#EAC5BD] px-2.5 py-1 rounded-lg hover:bg-[#d8aca3] text-[#8B2635] font-bold transition-colors">매핑 등록</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 새 룰 등록 Bento Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-7 border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)]">
          <h2 className="text-base sm:text-lg font-bold text-[#1B382E] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B59269]" />
            신규 분배 룰 등록
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-[#5A6B63] mb-1.5">매핑 종류</label>
              <select 
                value={ruleType} 
                onChange={e => setRuleType(e.target.value)}
                className="w-full bg-[#F4F3EE] border border-[#D0C6BB]/80 text-[#1B382E] text-xs sm:text-sm rounded-xl p-2.5 outline-none focus:border-[#284F42] focus:ring-1 focus:ring-[#284F42]"
              >
                <option value="ROOM_TICKET_MAPPING">객실 패키지 (단가 차감용)</option>
                <option value="DISTRIBUTION">티켓 패키지 (비율 분배용)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5A6B63] mb-1.5">원본 계정코드 / 상품명</label>
              <input 
                type="text" 
                value={sourceName}
                onChange={e => setSourceName(e.target.value)}
                placeholder="예: [조식패키지] 35평형"
                className="w-full bg-[#F4F3EE] border border-[#D0C6BB]/80 text-[#1B382E] text-xs sm:text-sm rounded-xl p-2.5 outline-none focus:border-[#284F42] focus:ring-1 focus:ring-[#284F42]"
              />
            </div>
          </div>

          <div className="border border-[#D0C6BB]/60 rounded-2xl p-4 bg-[#F4F3EE]/60 space-y-3">
            <label className="block text-xs font-bold text-[#1B382E]">분배 대상 (어느 본부/영업장으로 얼마를 떼어줄 것인가)</label>
            
            {allocations.map((alloc, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="대상 본부/영업장 (예: 식음, 목장)"
                  value={alloc.target_name}
                  onChange={e => handleUpdateAllocation(idx, 'target_name', e.target.value)}
                  className="flex-1 bg-white border border-[#D0C6BB]/80 text-[#1B382E] text-xs sm:text-sm rounded-xl p-2.5 outline-none focus:border-[#284F42]"
                />
                <input 
                  type="number" 
                  placeholder={ruleType === 'DISTRIBUTION' ? '비율 (예: 0.3)' : '차감 금액 (예: 15000)'}
                  value={alloc.ratio || ''}
                  onChange={e => handleUpdateAllocation(idx, 'ratio', Number(e.target.value))}
                  className="w-44 bg-white border border-[#D0C6BB]/80 text-[#1B382E] text-xs sm:text-sm rounded-xl p-2.5 outline-none focus:border-[#284F42]"
                />
                <button onClick={() => handleRemoveAllocation(idx)} className="text-[#8B2635] hover:text-red-700 p-2 cursor-pointer transition-colors"><Trash2 size={18} /></button>
              </div>
            ))}

            <button onClick={handleAddAllocation} className="text-xs font-bold text-[#284F42] hover:underline flex items-center gap-1 mt-2 cursor-pointer">
              <Plus size={16} /> 분배 대상 추가
            </button>
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSaveRule} 
              disabled={saving}
              className="px-6 py-2.5 bg-[#284F42] hover:bg-[#1B382E] text-white text-xs sm:text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Save size={16} /> 룰 저장
            </button>
          </div>
        </div>

        {/* 기존 룰 목록 Bento Card */}
        <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] overflow-hidden">
          <div className="p-5 border-b border-[#D0C6BB]/50 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1B382E] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#284F42]" />
              현재 등록된 분배 룰 목록 ({rules.length}건)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
              <thead>
                <tr className="bg-[#F4F3EE] text-[#5A6B63] text-xs font-bold border-b border-[#D0C6BB]/75">
                  <th className="px-6 py-3.5 text-left whitespace-nowrap">종류</th>
                  <th className="px-6 py-3.5 text-left whitespace-nowrap">원본 (계정코드명 / 티켓상품명)</th>
                  <th className="px-6 py-3.5 text-left whitespace-nowrap">분배 대상 (Target)</th>
                  <th className="px-6 py-3.5 text-right whitespace-nowrap">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0C6BB]/30 text-xs sm:text-sm">
                {rules.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-[#F4F3EE]/50 transition-colors">
                    <td className="px-6 py-4">
                      {rule.rule_type === 'ROOM_TICKET_MAPPING' ? (
                        <span className="bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/70 px-2.5 py-1 rounded-lg text-xs font-bold">객실 단가 차감</span>
                      ) : (
                        <span className="bg-[#FAF6ED] text-[#8C6D3B] border border-[#E5DAC1] px-2.5 py-1 rounded-lg text-xs font-bold">티켓 비율 분배</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#1B382E]">{rule.source_name}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        {rule.allocations.map((a, i) => (
                          <div key={i} className="flex justify-between items-center bg-[#F4F3EE] border border-[#D0C6BB]/50 px-3 py-1.5 rounded-xl text-[#1B382E] text-xs font-medium">
                            <span className="font-bold">{a.target_name}</span>
                            <span className="font-mono text-[#5A6B63] font-bold">
                              {rule.rule_type === 'DISTRIBUTION' ? `${(a.ratio * 100).toFixed(1)}%` : `${a.ratio.toLocaleString()}원`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteRule(rule.rule_type, rule.source_name)} className="text-[#8B2635] hover:text-red-700 p-1.5 rounded-lg hover:bg-[#FDF0ED] transition-colors cursor-pointer">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 시스템 관리 도구 Bento Card */}
        <div className="bg-white rounded-3xl border border-[#D0C6BB]/75 shadow-[0_4px_24px_rgba(40,79,66,0.06)] p-6 border-l-4 border-l-[#B59269]">
          <h2 className="text-base font-bold text-[#1B382E] mb-2 flex items-center gap-2">
            ⚙️ 시스템 관리 도구
          </h2>
          <p className="text-[#5A6B63] text-xs sm:text-sm mb-4 font-medium">
            비율이나 대상 영업장을 변경한 후, <strong>과거 매출 데이터</strong>에도 변경된 룰을 적용하려면 아래의 <strong>[과거 데이터 전체 재적재]</strong> 버튼을 반드시 눌러야 전체 대시보드(MariaDB)에 반영됩니다.
          </p>
          <button 
            onClick={handleBackfill}
            disabled={backfilling}
            className="px-6 py-3 bg-[#FAF6ED] text-[#8C6D3B] hover:bg-[#F4ECE1] border border-[#E5DAC1] text-xs sm:text-sm font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
          >
            {backfilling ? '재적재(Backfill) 진행 중...' : '과거 데이터 전체 재적재 (Backfill) 실행'}
          </button>
        </div>
      </div>
    </div>
  );
}
