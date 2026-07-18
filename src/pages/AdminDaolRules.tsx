import { useState, useEffect } from 'react';
import { AlertCircle, Plus, Trash2, Save } from 'lucide-react';

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

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v5';

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/daol-rules`);
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data = await res.json();
      
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
      const res = await fetch(`${API_BASE}/admin/daol-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: ruleType,
          source_name: sourceName.trim(),
          allocations
        })
      });

      if (!res.ok) throw new Error('저장 실패');
      
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
      const res = await fetch(`${API_BASE}/admin/daol-rules?rule_type=${rType}&source_name=${encodeURIComponent(sName)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('삭제 실패');
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
      const res = await fetch(`${API_BASE}/admin/trigger-etl`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('백필 실패');
      const data = await res.json();
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
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-medium text-slate-800 tracking-tight">객실 패키지 분배 관리</h1>
        <p className="text-slate-500 mt-2 text-sm">
          객실 패키지 요금(ROOM_TICKET_MAPPING)에 포함된 식음/레져 쿠폰의 원가를 각 본부로 배분하는 룰을 설정합니다.
        </p>
      </div>

      {(unmappedRooms.length > 0 || unmappedTickets.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          <div className="flex items-center gap-2 mb-2 font-medium text-red-600">
            <AlertCircle size={20} />
            <span>최근 7일 내 미분류 항목 알림 (노션 알람 연동됨)</span>
          </div>
          <ul className="list-disc pl-6 space-y-1">
            {unmappedRooms.map(r => (
              <li key={r}>객실 패키지 미분류: <strong>{r}</strong> 
                <button onClick={() => { setRuleType('ROOM_TICKET_MAPPING'); setSourceName(r); }} className="ml-3 text-xs bg-red-100 px-2 py-1 rounded hover:bg-red-200 text-red-700">매핑 등록</button>
              </li>
            ))}
            {unmappedTickets.map(t => (
              <li key={t}>티켓 패키지 미분류: <strong>{t}</strong>
                <button onClick={() => { setRuleType('DISTRIBUTION'); setSourceName(t); }} className="ml-3 text-xs bg-red-100 px-2 py-1 rounded hover:bg-red-200 text-red-700">매핑 등록</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 새 룰 등록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">신규 분배 룰 등록</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">매핑 종류</label>
            <select 
              value={ruleType} 
              onChange={e => setRuleType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5"
            >
              <option value="ROOM_TICKET_MAPPING">객실 패키지 (단가 차감용)</option>
              <option value="DISTRIBUTION">티켓 패키지 (비율 분배용)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">원본 계정코드 / 상품명</label>
            <input 
              type="text" 
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="예: [조식패키지] 35평형"
              className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
          <label className="block text-xs font-medium text-slate-700">분배 대상 (어느 본부/영업장으로 얼마를 떼어줄 것인가)</label>
          
          {allocations.map((alloc, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input 
                type="text" 
                placeholder="대상 본부/영업장 (예: 식음, 목장)"
                value={alloc.target_name}
                onChange={e => handleUpdateAllocation(idx, 'target_name', e.target.value)}
                className="flex-1 bg-white border border-slate-300 text-sm rounded-lg p-2.5"
              />
              <input 
                type="number" 
                placeholder={ruleType === 'DISTRIBUTION' ? '비율 (예: 0.3)' : '차감 금액 (예: 15000)'}
                value={alloc.ratio || ''}
                onChange={e => handleUpdateAllocation(idx, 'ratio', Number(e.target.value))}
                className="w-40 bg-white border border-slate-300 text-sm rounded-lg p-2.5"
              />
              <button onClick={() => handleRemoveAllocation(idx)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
            </div>
          ))}

          <button onClick={handleAddAllocation} className="text-sm text-brand-mint font-medium hover:underline flex items-center gap-1 mt-2">
            <Plus size={16} /> 분배 대상 추가
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleSaveRule} 
            disabled={saving}
            className="px-6 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} /> 룰 저장
          </button>
        </div>
      </div>

      {/* 기존 룰 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">종류</th>
                <th className="px-6 py-4 font-semibold">원본 (계정코드명 / 티켓상품명)</th>
                <th className="px-6 py-4 font-semibold">분배 대상 (Target)</th>
                <th className="px-6 py-4 font-semibold text-right">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rules.map((rule, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-500">
                    {rule.rule_type === 'ROOM_TICKET_MAPPING' ? (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">객실 단가 차감</span>
                    ) : (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">티켓 비율 분배</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{rule.source_name}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {rule.allocations.map((a, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded text-slate-700">
                          <span>{a.target_name}</span>
                          <span className="font-mono text-slate-500">
                            {rule.rule_type === 'DISTRIBUTION' ? `${(a.ratio * 100).toFixed(1)}%` : `₩${a.ratio.toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteRule(rule.rule_type, rule.source_name)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 시스템 관리 도구 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 mt-8 border-l-4 border-l-brand-purple">
        <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
          ⚙️ 시스템 관리 도구
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          비율이나 대상 영업장을 변경한 후, <strong>과거 매출 데이터</strong>에도 변경된 룰을 적용하려면 아래의 <strong>[과거 데이터 전체 재적재]</strong> 버튼을 반드시 눌러야 전체 대시보드(MariaDB)에 반영됩니다.
        </p>
        <button 
          onClick={handleBackfill}
          disabled={backfilling}
          className="px-6 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
        >
          {backfilling ? '재적재(Backfill) 진행 중...' : '과거 데이터 전체 재적재 (Backfill) 실행'}
        </button>
      </div>

    </div>
  );
}
