import React, { useState, useEffect, useMemo } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  const FAKE_TEST_EMAILS = [
    'ceo@bsbelleforet.com',
    'fnb@bsbelleforet.com',
    'leisure@bsbelleforet.com',
    'planning@bsbelleforet.com',
    'resort@bsbelleforet.com',
    'sales@bsbelleforet.com'
  ];

  const fetchRoles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'userRoles'));
      const fetchedRoles: UserRole[] = [];
      const emailSet = new Set<string>();

      querySnapshot.forEach((docSnap) => {
        const email = docSnap.id;
        if (!FAKE_TEST_EMAILS.includes(email)) {
          fetchedRoles.push({ email, role: docSnap.data().role, name: docSnap.data().name || '' });
          emailSet.add(email.toLowerCase());
        }
      });

      // Auto-discover accounts registered/logged-in via Firebase Authentication
      try {
        const logSnap = await getDocs(collection(db, 'loginLogs'));
        logSnap.forEach((docSnap) => {
          const email = docSnap.data().email;
          if (email && email.includes('@') && !FAKE_TEST_EMAILS.includes(email) && !emailSet.has(email.toLowerCase())) {
            emailSet.add(email.toLowerCase());
            const nameFromEmail = email.split('@')[0];
            fetchedRoles.push({ email, role: 'guest', name: nameFromEmail });
          }
        });
      } catch (e) {
        console.warn('Could not fetch loginLogs for auto-discovery:', e);
      }

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
    } finally {
      setImporting(false);
    }
  };

  const handleSelectUserForEdit = (user: UserRole) => {
    setNewName(user.name || '');
    setNewEmail(user.email);
    setNewRole(user.role);
    setEditingEmail(user.email);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const term = searchTerm.toLowerCase();
    return roles.filter(r => 
      (r.name && r.name.toLowerCase().includes(term)) || 
      (r.email && r.email.toLowerCase().includes(term)) ||
      (r.role && r.role.toLowerCase().includes(term))
    );
  }, [roles, searchTerm]);

  const handleSyncAuthUsers = async () => {
    setSaving(true);
    try {
      const logSnap = await getDocs(collection(db, 'loginLogs'));
      const batch = writeBatch(db);
      let count = 0;

      logSnap.forEach((docSnap) => {
        const email = docSnap.data().email;
        if (email && email.includes('@')) {
          const nameFromEmail = email.split('@')[0];
          batch.set(doc(db, 'userRoles', email), {
            role: 'guest',
            name: nameFromEmail,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          count++;
        }
      });

      await batch.commit();
      await fetchRoles();
      alert(`Firebase Authentication 실제 가입/접속 계정(${count}건)이 동기화되었습니다!`);
    } catch (err) {
      console.error('Auth sync error:', err);
      alert('동기화 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeFakeAccounts = async () => {
    if (!confirm('테스트용 가짜 샘플 계정(ceo@, fnb@, leisure@ 등)을 DB에서 완전히 삭제하시겠습니까?')) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      FAKE_TEST_EMAILS.forEach(email => {
        batch.delete(doc(db, 'userRoles', email));
      });
      await batch.commit();
      await fetchRoles();
      alert('테스트용 가짜 계정이 깔끔하게 모두 삭제되었습니다!');
    } catch (err) {
      console.error('Purge error:', err);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-medium text-slate-800 flex items-center gap-2">
            <Users className="text-brand-mint" />
            임직원 대시보드 권한 관리
          </h1>
          <p className="text-slate-500 mt-1 text-sm">등록된 임직원 목록에서 권한을 직접 수정하거나, 신규 임직원을 등록합니다.</p>
        </div>
        <div className="flex flex-col gap-1 w-full max-w-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAuthUsers}
              disabled={saving}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5"
              title="Firebase Authentication에 가입되어 있거나 접속했던 실계정을 불러와 자동 추가합니다"
            >
              🔥 Firebase Auth 계정 동기화
            </button>
            <button
              onClick={handlePurgeFakeAccounts}
              disabled={saving}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-rose-200"
              title="테스트용 가짜 예시 계정을 모두 정리합니다"
            >
              🗑️ 테스트 계정 정리
            </button>
            <input 
              type="text" 
              placeholder="구글 시트 공유 링크 (옵션)..." 
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
            />
            <button
              onClick={handleBulkImport}
              disabled={importing || !sheetUrl}
              className="px-3.5 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 whitespace-nowrap shadow-xs"
            >
              {importing ? '전송 중...' : '시트 동기화'}
            </button>
          </div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 pl-1">
            💡 <strong>시트 동기화 용도:</strong> 인사팀 구글 엑셀 시트[이름, 이메일, 부서명] 명단을 1초 만에 전사 일괄 등록합니다.
          </span>
        </div>
      </div>

      {/* Add or Update Role Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plus size={20} className="text-emerald-500" />
            {editingEmail ? `임직원 정보/권한 수정 (${editingEmail})` : '임직원 신규 권한 등록 및 수정'}
          </span>
          {editingEmail && (
            <button 
              type="button" 
              onClick={() => { setEditingEmail(null); setNewName(''); setNewEmail(''); setNewRole('guest'); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
            >
              신규 등록 모드로 전환
            </button>
          )}
        </h2>
        <form onSubmit={handleAddOrUpdateRole} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-slate-600 mb-1">임직원 이름</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
              required
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-600 mb-1">회사 이메일 계정</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="예: tjkim@bsbelleforet.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
              required
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-sm font-medium text-slate-600 mb-1">부여할 대시보드 권한 (역할)</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint/50 bg-white"
            >
              <option value="admin">👑 슈퍼 관리자 (전체 제어)</option>
              <option value="executive">⭐ CEO / 임원 (전사 대시보드)</option>
              <option value="resort">🏨 리조트사업본부</option>
              <option value="leisure">🎢 레져본부 (모토아레나 포함)</option>
              <option value="sales">💼 세일즈본부</option>
              <option value="fnb">🍽️ 식음본부</option>
              <option value="management">📋 경영지원실 / 지원본부</option>
              <option value="content">🎨 콘텐츠기획실</option>
              <option value="guest">👤 게스트 (조회 제한)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            <Save size={18} />
            {saving ? '저장 중...' : editingEmail ? '수정 내용 저장' : '권한 등록/저장'}
          </button>
        </form>
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-amber-800">
            <strong>권한 안내:</strong> 하단 <strong>등록된 사용자 리스트</strong>에서 드롭다운을 직접 바꾸시면 1초 만에 즉시 수정됩니다.
          </div>
        </div>
      </div>

      {/* Role List with Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
          <div>
            <h2 className="text-lg font-medium text-slate-800">전체 등록 임직원 명단 및 권한 리스트</h2>
            <p className="text-xs text-slate-400 mt-0.5">등록된 사용자의 권한을 아래 테이블에서 바로 변경하거나 수정 버튼을 눌러 관리하세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="text"
              placeholder="이름, 이메일, 권한 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-emerald-500 w-56"
            />
            <span className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1.5 rounded-xl whitespace-nowrap">
              총 {filteredRoles.length}명 / {roles.length}명
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium animate-pulse">데이터를 불러오는 중입니다...</div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-4">
            <p className="text-sm font-medium">아직 등록된 임직원 명단 데이터가 없습니다.</p>
            <p className="text-xs text-slate-400">상단 양식에서 신규 임직원을 직접 등록하시거나, 아래 버튼을 눌러 초기 명단을 자동 생성하세요.</p>
            <button
              type="button"
              onClick={handleSyncAuthUsers}
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
            >
              🔥 Firebase Auth 가입 계정 자동 가져오기
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200 uppercase tracking-wider">
                  <th className="px-6 py-3.5 font-semibold">임직원 성명</th>
                  <th className="px-6 py-3.5 font-semibold">회사 이메일 계정</th>
                  <th className="px-6 py-3.5 font-semibold">부여된 대시보드 권한 (드롭다운 즉시 변경)</th>
                  <th className="px-6 py-3.5 font-semibold text-right">수정 / 삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRoles.map((roleObj: UserRole) => (
                  <tr key={roleObj.email} className={`hover:bg-slate-50 transition-colors ${editingEmail === roleObj.email ? 'bg-emerald-50/60' : ''}`}>
                    <td className="px-6 py-4 text-slate-800 font-semibold">{roleObj.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{roleObj.email}</td>
                    <td className="px-6 py-4">
                      <select
                        value={roleObj.role}
                        onChange={(e) => handleInlineRoleChange(roleObj.email, e.target.value)}
                        className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold border-0 cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs
                          ${roleObj.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                            roleObj.role === 'executive' ? 'bg-amber-100 text-amber-800' :
                            roleObj.role === 'leisure' ? 'bg-blue-100 text-blue-800' :
                            roleObj.role === 'resort' ? 'bg-emerald-100 text-emerald-800' :
                            roleObj.role === 'sales' ? 'bg-orange-100 text-orange-800' :
                            roleObj.role === 'fnb' ? 'bg-amber-100 text-amber-800' :
                            roleObj.role === 'management' ? 'bg-indigo-100 text-indigo-800' :
                            roleObj.role === 'content' ? 'bg-pink-100 text-pink-800' :
                            'bg-slate-100 text-slate-800'}
                        `}
                      >
                        <option value="admin">👑 슈퍼 관리자 (전체 제어)</option>
                        <option value="executive">⭐ CEO / 임원 (전사 대시보드)</option>
                        <option value="resort">🏨 리조트사업본부</option>
                        <option value="leisure">🎢 레져본부 (모토아레나 포함)</option>
                        <option value="sales">💼 세일즈본부</option>
                        <option value="fnb">🍽️ 식음본부</option>
                        <option value="management">📋 경영지원실 / 지원본부</option>
                        <option value="content">🎨 콘텐츠기획실</option>
                        <option value="guest">👤 게스트 (조회 제한)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSelectUserForEdit(roleObj)}
                          className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 font-semibold rounded-lg transition-colors flex items-center gap-1"
                          title="상단 양식에서 수정"
                        >
                          ✎ 수정
                        </button>
                        <button
                          onClick={() => handleDeleteRole(roleObj.email)}
                          className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="권한 삭제"
                        >
                          <Trash2 size={16} />
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
