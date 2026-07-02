import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Save, Trash2, Plus, Users, ShieldAlert } from 'lucide-react';

interface UserRole {
  email: string;
  role: string;
  name?: string;
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('guest');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');

  const fetchRoles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'userRoles'));
      const fetchedRoles: UserRole[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRoles.push({ email: doc.id, role: doc.data().role, name: doc.data().name || '' });
      });
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      alert('권한 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

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
        name: newName,
        updatedAt: new Date().toISOString()
      });
      setNewEmail('');
      setNewName('');
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

  const handleInlineRoleChange = async (email: string, newRole: string) => {
    try {
      // Optimistic UI update for snappy feel
      setRoles(prev => prev.map(r => r.email === email ? { ...r, role: newRole } : r));
      await setDoc(doc(db, 'userRoles', email), { 
        role: newRole, 
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    } catch (error) {
      console.error('Error updating role:', error);
      alert('권한 업데이트에 실패했습니다.');
      fetchRoles(); // Revert on failure
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
    if (!sheetUrl) {
      alert('구글 시트 공유 링크를 입력해주세요.');
      return;
    }
    
    // URL 변환 로직 (edit?usp=sharing -> export?format=csv)
    let fetchUrl = sheetUrl;
    if (sheetUrl.includes('/edit')) {
      fetchUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv');
    }

    if (!confirm('입력하신 구글 시트에서 최신 명단을 불러와 일괄 등록하시겠습니까? (기존 권한은 최신 내용으로 덮어쓰기 됩니다)')) return;
    setImporting(true);
    
    try {
      // CSV 데이터 가져오기
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('구글 시트를 읽을 수 없습니다. "링크가 있는 모든 사용자 보기 가능" 설정인지 확인해주세요.');
      
      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.trim()).filter(row => row);
      
      // 첫 줄(헤더) 제외
      const dataRows = rows.slice(1);
      
      const spreadsheetData: any[] = [];
      
      dataRows.forEach(row => {
        // 이름,이메일,본부,파이어베이스 순서
        const columns = row.split(',');
        if (columns.length >= 3) {
          const name = columns[0].trim();
          const email = columns[1].trim();
          const koreanRole = columns[2].trim();
          
          if (!email || !email.includes('@')) return; // 이메일 없는 행 무시
          
          // 한국어 본부명 -> 영문 역할코드 변환
          let role = 'guest';
          if (koreanRole.includes('레져')) role = 'leisure';
          else if (koreanRole.includes('세일즈')) role = 'sales';
          else if (koreanRole.includes('콘텐츠')) role = 'content';
          else if (koreanRole.includes('경영지원') || koreanRole.includes('지원본부')) role = 'management';
          else if (koreanRole.includes('임원')) role = 'executive';
          else if (koreanRole.includes('리조트')) role = 'resort';
          else if (koreanRole.includes('식음')) role = 'fnb';
          
          spreadsheetData.push({ name, email, role });
        }
      });

      if (spreadsheetData.length === 0) {
        alert('읽어올 유효한 데이터가 없습니다. CSV 형식이 맞는지 확인해주세요.');
        setImporting(false);
        return;
      }

      const batch = writeBatch(db);
      
      spreadsheetData.forEach(data => {
        const docRef = doc(db, 'userRoles', data.email);
        batch.set(docRef, {
          role: data.role,
          name: data.name,
          updatedAt: new Date().toISOString()
        });
      });
      
      await batch.commit();
      await fetchRoles();
      setImporting(false);
      setTimeout(() => {
        alert(`총 ${spreadsheetData.length}명의 임직원 권한이 한 번에 안전하게 일괄 등록되었습니다!`);
      }, 100);
    } catch (error) {
      console.error('Bulk import error:', error);
      alert('일괄 등록에 실패했습니다. 링크 또는 방화벽 차단 문제를 확인해주세요.');
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-brand-mint" />
            임직원 권한 관리
          </h1>
          <p className="text-slate-500 mt-1">Firebase 계정에 가입된 이메일 주소별로 대시보드 접근 권한을 설정합니다.</p>
        </div>
        <div className="flex items-center gap-2 w-full max-w-lg">
          <input 
            type="text" 
            placeholder="구글 시트 링크를 입력하세요" 
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
          />
          <button
            onClick={handleBulkImport}
            disabled={importing || !sheetUrl}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {importing ? '전송 중...' : '시트 내용 동기화'}
          </button>
        </div>
      </div>

      {/* Add or Update Role */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus size={20} className="text-slate-400" />
          임직원 권한 부여 및 수정
        </h2>
        <form onSubmit={handleAddOrUpdateRole} className="flex gap-4 items-end">
          <div className="flex-1 max-w-[200px]">
            <label className="block text-sm font-medium text-slate-600 mb-1">이름</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
              required
            />
          </div>
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
                  <th className="px-6 py-3 font-semibold">이름</th>
                  <th className="px-6 py-3 font-semibold">이메일 계정</th>
                  <th className="px-6 py-3 font-semibold">부여된 권한 (역할)</th>
                  <th className="px-6 py-3 font-semibold text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((roleObj) => (
                  <tr key={roleObj.email} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-800 font-bold">{roleObj.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{roleObj.email}</td>
                    <td className="px-6 py-4">
                      <select
                        value={roleObj.role}
                        onChange={(e) => handleInlineRoleChange(roleObj.email, e.target.value)}
                        className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold border-0 cursor-pointer focus:ring-2 focus:ring-brand-mint/50 outline-none
                          ${roleObj.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                            roleObj.role === 'executive' ? 'bg-yellow-100 text-yellow-800' :
                            roleObj.role === 'leisure' ? 'bg-blue-100 text-blue-800' :
                            roleObj.role === 'resort' ? 'bg-green-100 text-green-800' :
                            roleObj.role === 'sales' ? 'bg-orange-100 text-orange-800' :
                            roleObj.role === 'fnb' ? 'bg-amber-100 text-amber-800' :
                            roleObj.role === 'management' ? 'bg-indigo-100 text-indigo-800' :
                            roleObj.role === 'content' ? 'bg-pink-100 text-pink-800' :
                            'bg-slate-100 text-slate-800'}
                        `}
                      >
                        <option value="admin">👑 슈퍼 관리자</option>
                        <option value="executive">⭐ 임원</option>
                        <option value="leisure">🎢 레져본부</option>
                        <option value="resort">🏨 리조트사업본부</option>
                        <option value="sales">💼 세일즈본부</option>
                        <option value="fnb">🍽️ 식음본부</option>
                        <option value="management">📋 경영지원실</option>
                        <option value="content">🎨 콘텐츠기획실</option>
                        <option value="guest">👤 게스트</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteRole(roleObj.email)}
                          className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="권한 삭제"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
