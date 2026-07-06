import { useState, useMemo } from 'react';
import { useLeisureMapping } from '../contexts/LeisureMappingContext';
import { useCoreData } from '../contexts/CoreDataContext';
import { AlertCircle, Plus, Trash2, X } from 'lucide-react';

export default function AdminLeisureMapping() {
  const { leisureGroups, loading, addGroup, updateGroup, deleteGroup } = useLeisureMapping();
  const { core } = useCoreData();
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  // Extract all unique facility names from current data for suggestions
  const availableFacilities = useMemo(() => {
    const facilities = new Set<string>();
    if (core) {

      const breakdowns = [
        core.fnbFacilityBreakdown,
        core.ticketFacilityBreakdown,
        core.golfFacilityBreakdown,
        core.otherFacilityBreakdown,
        core.banquetFacilityBreakdown,
        core.roomTypeBreakdown || core.visitorData?.roomTypeBreakdown || []
      ];
      breakdowns.forEach(b => {
        if (Array.isArray(b)) {
          b.forEach((item: any) => item.facility_name && facilities.add(item.facility_name));
        }
      });
    }
    return Array.from(facilities).sort();
  }, [core]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  const handleAddGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    if (leisureGroups.some(g => g.name === trimmed)) {
      alert("이미 존재하는 그룹명입니다.");
      return;
    }
    try {
      setIsAddingGroup(true);
      await addGroup(trimmed, []);
      setNewGroupName('');
    } catch (error) {
      console.error(error);
      alert("그룹 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAddingGroup(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (window.confirm(`'${name}' 그룹을 정말 삭제하시겠습니까?\n사이드바 메뉴에서도 사라집니다.`)) {
      try {
        await deleteGroup(id);
      } catch (error) {
        console.error(error);
        alert("그룹 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleAddFacilityToGroup = async (groupId: string, groupName: string, currentFacilities: string[], facilityToAdd: string) => {
    const trimmed = facilityToAdd.trim();
    if (!trimmed) return;
    if (currentFacilities.includes(trimmed)) return;
    
    try {
      await updateGroup(groupId, groupName, [...currentFacilities, trimmed]);
    } catch (error) {
      console.error(error);
      alert("영업장 추가 중 오류가 발생했습니다.");
    }
  };

  const handleRemoveFacilityFromGroup = async (groupId: string, groupName: string, currentFacilities: string[], facilityToRemove: string) => {
    try {
      await updateGroup(groupId, groupName, currentFacilities.filter(f => f !== facilityToRemove));
    } catch (error) {
      console.error(error);
      alert("영업장 삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-medium text-slate-800 tracking-tight">레져본부 영업장 그룹핑</h1>
        <p className="text-slate-500 mt-2 text-sm">
          사이드바의 '레져본부' 하위에 노출될 메뉴(그룹)를 생성하고, 각 그룹에 어떤 실제 영업장 데이터를 묶을지 설정합니다.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <AlertCircle size={20} className="shrink-0 text-blue-500" />
        <div>
          <p className="font-medium mb-1">그룹핑 가이드</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>여기서 만든 그룹명은 좌측 사이드바 레져본부 메뉴에 그대로 노출됩니다.</li>
            <li>한 그룹 안에 식음업장, 티켓업장 등 여러 DB 영업장 이름을 추가해 매출을 하나로 묶어볼 수 있습니다. (예: 목장 그룹 = 목장 + 목장체험 + 얼룩말 카페)</li>
            <li>영업장 이름은 오늘자 데이터(gridData 등)에 잡힌 이름들을 드롭다운에서 선택하시거나 직접 타이핑해서 넣을 수 있습니다.</li>
          </ul>
        </div>
      </div>

      {/* 새 그룹 생성 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">신규 그룹 생성</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
            placeholder="새 그룹명 입력 (예: 목장 통합, 패키지 상품)"
            className="flex-1 max-w-sm bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-mint focus:border-brand-mint block p-2.5"
            disabled={isAddingGroup}
          />
          <button
            onClick={handleAddGroup}
            disabled={!newGroupName.trim() || isAddingGroup}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-mint text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
            그룹 생성
          </button>
        </div>
      </div>

      {/* 그룹 목록 및 매핑 관리 */}
      <div className="space-y-6">
        {leisureGroups.map(group => (
          <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <h3 className="font-medium text-slate-800 text-lg flex items-center gap-2">
                📂 {group.name}
              </h3>
              <button 
                onClick={() => handleDeleteGroup(group.id!, group.name)}
                className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:border-red-200"
              >
                <Trash2 size={14} /> 그룹 전체 삭제
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">현재 묶인 DB 영업장 목록:</p>
                {group.facilities.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">묶인 영업장이 없습니다. 아래에서 추가해주세요.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {group.facilities.map(facility => (
                      <div key={facility} className="inline-flex items-center gap-1.5 bg-brand-mint/10 border border-brand-mint/20 text-brand-mint px-3 py-1.5 rounded-full text-sm">
                        <span className="font-medium">{facility}</span>
                        <button 
                          onClick={() => handleRemoveFacilityFromGroup(group.id!, group.name, group.facilities, facility)}
                          className="text-brand-mint/60 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-white"
                          title="영업장 삭제"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 items-end mt-6 pt-6 border-t border-slate-100">
                <div className="flex-1 max-w-sm">
                  <label className="block text-xs font-medium text-slate-500 mb-1">DB 영업장 이름 추가</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id={`input-${group.id}`}
                      placeholder="영업장 이름 직접 입력"
                      className="flex-1 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-mint focus:border-brand-mint block p-2.5"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddFacilityToGroup(group.id!, group.name, group.facilities, e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <select 
                      className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-mint focus:border-brand-mint block p-2.5 max-w-[200px]"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFacilityToGroup(group.id!, group.name, group.facilities, e.target.value);
                          e.target.value = ''; // reset
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>오늘 발생한 매출 영업장 목록에서 선택...</option>
                      {availableFacilities.map(f => (
                        <option key={f} value={f} disabled={group.facilities.includes(f)}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {leisureGroups.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500">생성된 레져본부 그룹이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
