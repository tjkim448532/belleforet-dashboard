import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Save, Trash2, Plus, Users, ShieldAlert } from 'lucide-react';

interface UserRole {
  email: string;
  role: string;
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('guest');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'userRoles'));
      const fetchedRoles: UserRole[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRoles.push({ email: doc.id, role: doc.data().role });
      });
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      alert('권한 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      alert('유효한 이메일을 입력해주세요.');
      return;
    }
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'userRoles', newEmail), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      setNewEmail('');
      setNewRole('guest');
      fetchRoles();
      alert('권한이 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('Error saving role:', error);
      alert('권한 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (email: string) => {
    if (!confirm(`${email} 계정의 권한을 삭제하시겠습니까? (삭제 시 기본 게스트 권한으로 변경됩니다)`)) return;
    
    try {
      await deleteDoc(doc(db, 'userRoles', email));
      fetchRoles();
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('권한 삭제에 실패했습니다.');
    }
  };

  const handleBulkImport = async () => {
    if (!confirm('스프레드시트의 22명 임직원 권한 데이터를 일괄 등록하시겠습니까? (기존 데이터 덮어쓰기)')) return;
    setImporting(true);
    
    const spreadsheetData = [
      { email: 'jsshin@bsbelleforet.com', role: 'leisure' },
      { email: 'smkwon@bsbelleforet.com', role: 'leisure' },
      { email: 'sychoi@bsbelleforet.com', role: 'leisure' },
      { email: 'jhkim2407@bsbelleforet.com', role: 'leisure' },
      { email: 'hdkim@bsbelleforet.com', role: 'leisure' },
      { email: 'jhlee1212@bsbelleforet.com', role: 'leisure' },
      { email: 'jyheo@kmgcompany.co.kr', role: 'leisure' },
      { email: 'jysun@bsbelleforet.com', role: 'sales' },
      { email: 'kimhk@bsbelleforet.com', role: 'sales' },
      { email: 'thim@bsbelleforet.com', role: 'sales' },
      { email: 'swlee@bsbelleforet.com', role: 'content' },
      { email: 'cmjang@bsbelleforet.com', role: 'sales' },
      { email: 'hpark@bsbelleforet.com', role: 'sales' },
      { email: 'jdyang@bsbelleforet.com', role: 'management' },
      { email: 'kmjo@bsbelleforet.com', role: 'management' },
      { email: 'yhkwon@bsbelleforet.com', role: 'management' },
      { email: 'kimjw00@bsbelleforet.com', role: 'executive' },
      { email: 'swon@daewonspic.com', role: 'executive' },
      { email: 'ynshin@bsbelleforet.com', role: 'resort' },
      { email: 'syyeom@bsbelleforet.com', role: 'resort' },
      { email: 'hjchoi71@bsbelleforet.com', role: 'resort' },
      { email: 'jylim@bsbelleforet.com', role: 'resort' },
    ];

    try {
      const promises = spreadsheetData.map(data => 
        setDoc(doc(db, 'userRoles', data.email), {
          role: data.role,
          updatedAt: new Date().toISOString()
        })
      );
      await Promise.all(promises);
      fetchRoles();
      alert('22명의 임직원 권한이 성공적으로 일괄 등록되었습니다!');
    } catch (error) {
      console.error('Bulk import error:', error);
      alert('일괄 등록에 실패했습니다.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-brand-mint" />
            임직원 권한 관리
          </h1>
          <p className="text-slate-500 mt-1">Firebase 계정에 가입된 이메일 주소별로 대시보드 접근 권한을 설정합니다.</p>
        </div>
        <button
          onClick={handleBulkImport}
          disabled={importing}
          className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {importing ? '가져오는 중...' : '엑셀 명단 일괄 가져오기 (22명)'}
        </button>
      </div>

      {/* Add or Update Role */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus size={20} className="text-slate-400" />
          임직원 권한 부여 및 수정
        </h2>
        <form onSubmit={handleAddOrUpdateRole} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">회사 이메일 주소</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="예: tjkim@bsbelleforet.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
              required
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-600 mb-1">권한(본부) 선택</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint/50 bg-white"
            >
              <option value="guest">게스트 (조회 제한)</option>
              <option value="leisure">레져본부 (모토아레나 포함)</option>
              <option value="resort">리조트사업본부</option>
              <option value="sales">세일즈본부</option>
              <option value="fnb">식음본부</option>
              <option value="management">경영지원실 / 지원본부</option>
              <option value="content">콘텐츠기획실</option>
              <option value="executive">임원 (모든 대시보드 조회)</option>
              <option value="admin">슈퍼 관리자 (시스템 제어 권한 포함)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-brand-mint text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </form>
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-amber-800">
            <strong>주의사항:</strong> 권한을 부여하기 전, 대상자가 반드시 <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-amber-900">Firebase 콘솔 (Authentication)</a>에 가입(등록)되어 있어야 실제로 로그인이 가능합니다. 이 화면은 등록된 사용자가 어떤 메뉴를 볼 수 있는지만 결정합니다.
          </div>
        </div>
      </div>

      {/* Role List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">등록된 권한 목록</h2>
          <div className="text-sm text-slate-500">총 {roles.length}명</div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">데이터를 불러오는 중입니다...</div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-slate-500">등록된 권한이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="px-6 py-3 font-semibold">이메일 계정</th>
                  <th className="px-6 py-3 font-semibold">부여된 권한 (역할)</th>
                  <th className="px-6 py-3 font-semibold text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((roleObj) => (
                  <tr key={roleObj.email} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-800 font-medium">{roleObj.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                        ${roleObj.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                          roleObj.role === 'executive' ? 'bg-yellow-100 text-yellow-800' :
                          roleObj.role === 'leisure' ? 'bg-blue-100 text-blue-800' :
                          roleObj.role === 'resort' ? 'bg-green-100 text-green-800' :
                          roleObj.role === 'sales' ? 'bg-orange-100 text-orange-800' :
                          roleObj.role === 'fnb' ? 'bg-amber-100 text-amber-800' :
                          roleObj.role === 'management' ? 'bg-indigo-100 text-indigo-800' :
                          roleObj.role === 'content' ? 'bg-pink-100 text-pink-800' :
                          'bg-slate-100 text-slate-800'}
                      `}>
                        {roleObj.role === 'admin' && '👑 슈퍼 관리자'}
                        {roleObj.role === 'executive' && '⭐ 임원'}
                        {roleObj.role === 'leisure' && '🎢 레져본부'}
                        {roleObj.role === 'resort' && '🏨 리조트사업본부'}
                        {roleObj.role === 'sales' && '💼 세일즈본부'}
                        {roleObj.role === 'fnb' && '🍽️ 식음본부'}
                        {roleObj.role === 'management' && '📋 경영지원실'}
                        {roleObj.role === 'content' && '🎨 콘텐츠기획실'}
                        {roleObj.role === 'guest' && '👤 게스트'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRole(roleObj.email)}
                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="권한 삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
