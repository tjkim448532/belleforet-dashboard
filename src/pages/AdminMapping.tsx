import { useState } from 'react';
import { useMapping } from '../contexts/MappingContext';
import type { Category } from '../lib/defaultMappings';
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function AdminMapping() {
  const { mappings, categories, loading, updateMapping, addCategory, deleteCategory } = useMapping();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  const handleCategoryChange = async (id: string, newCategory: Category) => {
    if (!id || id.startsWith('local-')) return;
    try {
      setSavingId(id);
      await updateMapping(id, newCategory);
    } catch (err) {
      alert("매핑 업데이트 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      alert("이미 존재하는 본부명입니다.");
      return;
    }
    try {
      setIsAddingCategory(true);
      await addCategory(trimmed);
      setNewCategoryName('');
    } catch (err) {
      alert("본부 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (name: string) => {
    if (window.confirm(`'${name}' 본부를 정말 삭제하시겠습니까?\n이 본부에 속했던 매장들은 '미분류'로 변경됩니다.`)) {
      try {
        await deleteCategory(name);
      } catch (err) {
        alert("본부 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">매장 분류 매핑 관리</h1>
        <p className="text-slate-500 mt-2 text-sm">
          S3 원본 데이터에서 들어오는 매장명을 어느 본부(카테고리)에 매칭시킬지 설정합니다.
          여기서 설정된 값은 대시보드 합계 계산의 기준이 됩니다.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <AlertCircle size={20} className="shrink-0 text-blue-500" />
        <p>
          신규 매장이 추가되거나 기존 매장의 본부 소속이 변경되었을 때, 이 페이지에서 
          <strong> 셀렉트박스(드롭다운)</strong>를 변경하시면 즉시 클라우드에 반영됩니다.
        </p>
      </div>

      {/* 본부(Category) 관리 섹션 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">본부 목록 관리</h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <div key={cat} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-sm">
              <span className="font-medium">{cat}</span>
              <button 
                onClick={() => handleDeleteCategory(cat)}
                className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-slate-200"
                title="본부 삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="새 본부명 입력 (예: 기타, 외주업체)"
            className="flex-1 max-w-sm bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-mint focus:border-brand-mint block p-2.5"
            disabled={isAddingCategory}
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim() || isAddingCategory}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
            본부 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-4 font-semibold w-1/2">원천 매장명 (POS 기준)</th>
                <th className="px-6 py-4 font-semibold w-1/2">소속 본부 (대시보드 표시 카테고리)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((mapping) => (
                <tr key={mapping.id || mapping.storeName} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-700">{mapping.storeName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <select
                        value={mapping.category}
                        onChange={(e) => handleCategoryChange(mapping.id!, e.target.value as Category)}
                        disabled={savingId === mapping.id}
                        className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-mint focus:border-brand-mint block w-full p-2.5 max-w-[200px]"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {savingId === mapping.id && (
                        <span className="text-xs text-brand-mint animate-pulse flex items-center gap-1">
                          <Save size={14} /> 저장 중...
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
