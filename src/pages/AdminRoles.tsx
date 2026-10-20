import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { 
  Save, Trash2, Plus, Users, ShieldAlert, Check, X, 
  Settings, CheckSquare, Square
} from 'lucide-react';

export interface RoleConfig {
  id: string;
  label: string;
  fullLabel: string;
  badgeStyle: string;
  icon: string;
}

export const ROLE_CONFIG: RoleConfig[] = [
  { id: 'admin', label: '슈퍼 관리자', fullLabel: '👑 슈퍼 관리자 (전체 제어)', badgeStyle: 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]', icon: '👑' },
  { id: 'executive', label: 'CEO/임원', fullLabel: '⭐ CEO / 임원 (전사 대시보드)', badgeStyle: 'bg-[#FDF0ED] text-[#B59269] border-[#D0C6BB]', icon: '⭐' },
  { id: 'resort', label: '리조트사업본부', fullLabel: '🏨 리조트사업본부', badgeStyle: 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]', icon: '🏨' },
  { id: 'golf', label: '골프사업본부', fullLabel: '⛳ 골프사업본부', badgeStyle: 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]', icon: '⛳' },
  { id: 'leisure', label: '레저본부', fullLabel: '🎢 레저본부 (모토아레나 포함)', badgeStyle: 'bg-[#E8F2EE] text-[#1E523F] border-[#B4C6C1]', icon: '🎢' },
  { id: 'sales', label: '세일즈본부', fullLabel: '💼 세일즈본부', badgeStyle: 'bg-[#FDF0ED] text-[#B59269] border-[#D0C6BB]', icon: '💼' },
  { id: 'fnb', label: '식음본부', fullLabel: '🍽️ 식음본부', badgeStyle: 'bg-[#FDF0ED] text-[#B59269] border-[#D0C6BB]', icon: '🍽️' },
  { id: 'management', label: '경영지원본부', fullLabel: '📋 경영지원실 / 지원본부', badgeStyle: 'bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]', icon: '📋' },
  { id: 'content', label: '콘텐츠기획실', fullLabel: '🎨 콘텐츠기획실', badgeStyle: 'bg-[#F4F3EE] text-[#1B382E] border-[#D0C6BB]', icon: '🎨' },
  { id: 'guest', label: '게스트', fullLabel: '👤 게스트 (조회 제한)', badgeStyle: 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]', icon: '👤' },
];

export const getRoleMeta = (roleId: string): RoleConfig => {
  const found = ROLE_CONFIG.find(r => r.id === roleId);
  if (found) return found;
  return {
    id: roleId,
    label: roleId,
    fullLabel: roleId,
    badgeStyle: 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]',
    icon: '🔹'
  };
};

interface UserRole {
  email: string;
  role: string;
  roles: string[];
  name?: string;
  updatedAt?: string;
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['guest']);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [openPopoverEmail, setOpenPopoverEmail] = useState<string | null>(null);

  const PURGE_DEV_ACCOUNTS = [
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
        if (!PURGE_DEV_ACCOUNTS.includes(email)) {
          const data = docSnap.data();
          const roleList = Array.isArray(data.roles) && data.roles.length > 0
            ? data.roles
            : (data.role ? [data.role] : ['guest']);
          const primaryRole = data.role || roleList[0] || 'guest';
          fetchedRoles.push({ 
            email, 
            role: primaryRole, 
            roles: roleList, 
            name: data.name || '',
            updatedAt: data.updatedAt
          });
          emailSet.add(email.toLowerCase());
        }
      });

      // Auto-discover accounts registered/logged-in via Firebase Authentication
      try {
        const logSnap = await getDocs(collection(db, 'loginLogs'));
        logSnap.forEach((docSnap) => {
          const email = docSnap.data().email;
          if (email && email.includes('@') && !PURGE_DEV_ACCOUNTS.includes(email) && !emailSet.has(email.toLowerCase())) {
            emailSet.add(email.toLowerCase());
            const nameFromEmail = email.split('@')[0];
            fetchedRoles.push({ 
              email, 
              role: 'guest', 
              roles: ['guest'], 
              name: nameFromEmail 
            });
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

  const handleToggleFormRole = (roleId: string) => {
    setSelectedRoles(prev => {
      if (roleId === 'guest') {
        return ['guest'];
      }
      
      const withoutGuest = prev.filter(r => r !== 'guest');
      if (withoutGuest.includes(roleId)) {
        const next = withoutGuest.filter(r => r !== roleId);
        return next.length > 0 ? next : ['guest'];
      } else {
        return [...withoutGuest, roleId];
      }
    });
  };

  const handleAddOrUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      alert('유효한 이메일을 입력해주세요.');
      return;
    }

    const finalRoles = selectedRoles.length > 0 ? selectedRoles : ['guest'];
    const primaryRole = finalRoles.includes('admin') ? 'admin' : finalRoles[0];
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'userRoles', newEmail), {
        role: primaryRole,
        roles: finalRoles,
        name: newName,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNewEmail('');
      setNewName('');
      setSelectedRoles(['guest']);
      setEditingEmail(null);
      await fetchRoles();
      alert('권한이 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('Error saving role:', error);
      alert('권한 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserRole = async (email: string, roleToToggle: string) => {
    const user = roles.find(r => r.email === email);
    if (!user) return;
    
    let currentRoles = [...(user.roles && user.roles.length > 0 ? user.roles : [user.role || 'guest'])];
    
    if (roleToToggle === 'guest') {
      currentRoles = ['guest'];
    } else if (currentRoles.includes(roleToToggle)) {
      currentRoles = currentRoles.filter(r => r !== roleToToggle);
      if (currentRoles.length === 0) currentRoles = ['guest'];
    } else {
      currentRoles = currentRoles.filter(r => r !== 'guest');
      currentRoles.push(roleToToggle);
    }

    const primaryRole = currentRoles.includes('admin') ? 'admin' : currentRoles[0];

    // Optimistic UI update
    setRoles(prev => prev.map(r => r.email === email ? { ...r, role: primaryRole, roles: currentRoles } : r));

    try {
      await setDoc(doc(db, 'userRoles', email), { 
        role: primaryRole, 
        roles: currentRoles,
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    } catch (error) {
      console.error('Error updating role:', error);
      alert('권한 업데이트에 실패했습니다.');
      fetchRoles();
    }
  };

  const handleRemoveSingleRole = async (email: string, roleToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await handleToggleUserRole(email, roleToRemove);
  };

  const handleDeleteRole = async (email: string) => {
    if (!confirm(`${email} 계정의 권한을 삭제하시겠습니까? (삭제 시 기본 게스트 권한으로 변경됩니다)`)) return;
    
    try {
      await deleteDoc(doc(db, 'userRoles', email));
      await fetchRoles();
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
    
    let fetchUrl = sheetUrl;
    if (sheetUrl.includes('/edit')) {
      fetchUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv');
    }

    if (!confirm('입력하신 구글 시트에서 최신 명단을 불러와 일괄 등록하시겠습니까? (기존 권한은 최신 내용으로 덮어쓰기 됩니다)')) return;
    setImporting(true);
    try {
      const bustUrl = `${fetchUrl}${fetchUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      const response = await fetch(bustUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('구글 시트를 읽을 수 없습니다. "링크가 있는 모든 사용자 보기 가능" 설정인지 확인해주세요.');
      
      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.trim()).filter(row => row);
      
      const dataRows = rows.slice(1);
      const spreadsheetData: { name: string; email: string; role: string; roles: string[] }[] = [];
      
      dataRows.forEach(row => {
        const columns = row.split(',');
        if (columns.length >= 3) {
          const name = columns[0].trim();
          const email = columns[1].trim();
          const rawRoleStr = columns[2].trim();
          
          if (!email || !email.includes('@')) return;
          
          // Split by comma, slash, plus, or pipe for multi-role support
          const segments = rawRoleStr.split(/[,/|+&]+/).map(s => s.trim()).filter(Boolean);
          const assignedRoles: string[] = [];

          segments.forEach(part => {
            if (part.includes('레져') || part.includes('레저')) assignedRoles.push('leisure');
            else if (part.includes('골프')) assignedRoles.push('golf');
            else if (part.includes('세일즈') || part.includes('영업')) assignedRoles.push('sales');
            else if (part.includes('콘텐츠') || part.includes('컨텐츠')) assignedRoles.push('content');
            else if (part.includes('경영지원') || part.includes('지원본부') || part.includes('지원')) assignedRoles.push('management');
            else if (part.includes('임원') || part.includes('CEO') || part.includes('대표')) assignedRoles.push('executive');
            else if (part.includes('리조트') || part.includes('콘도')) assignedRoles.push('resort');
            else if (part.includes('식음') || part.includes('F&B') || part.includes('연회')) assignedRoles.push('fnb');
            else if (part.includes('관리자') || part.includes('슈퍼')) assignedRoles.push('admin');
          });

          const uniqueRoles = Array.from(new Set(assignedRoles));
          const finalRoles = uniqueRoles.length > 0 ? uniqueRoles : ['guest'];
          const primaryRole = finalRoles.includes('admin') ? 'admin' : finalRoles[0];
          
          spreadsheetData.push({ name, email, role: primaryRole, roles: finalRoles });
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
          roles: data.roles,
          name: data.name,
          updatedAt: new Date().toISOString()
        }, { merge: true });
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
    const userRoleList = user.roles && user.roles.length > 0 ? user.roles : [user.role || 'guest'];
    setSelectedRoles(userRoleList);
    setEditingEmail(user.email);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const term = searchTerm.toLowerCase();
    return roles.filter(r => 
      (r.name && r.name.toLowerCase().includes(term)) || 
      (r.email && r.email.toLowerCase().includes(term)) ||
      (r.role && r.role.toLowerCase().includes(term)) ||
      (r.roles && r.roles.some(roleId => roleId.toLowerCase().includes(term)))
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
            roles: ['guest'],
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
      PURGE_DEV_ACCOUNTS.forEach(email => {
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
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Global backdrop when popover is open */}
      {openPopoverEmail && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpenPopoverEmail(null)} 
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1B382E] flex items-center gap-2 break-keep whitespace-nowrap">
            <Users className="text-[#284F42] shrink-0" />
            임직원 대시보드 권한 관리
          </h1>
          <p className="text-[#5A6B63] mt-1 text-sm font-medium">
            임직원별 <strong>복수 권한(다중 본부 접근)</strong>을 지정할 수 있으며, 부여된 권한에 따라 사이드바 메뉴가 자동으로 활성화됩니다.
          </p>
        </div>
        <div className="flex flex-col gap-1 w-full max-w-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAuthUsers}
              disabled={saving}
              className="px-3.5 py-2 bg-[#284F42] hover:bg-[#1B382E] text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Firebase Authentication에 가입되어 있거나 접속했던 실계정을 불러와 자동 추가합니다"
            >
              🔥 Firebase Auth 계정 동기화
            </button>
            <button
              onClick={handlePurgeFakeAccounts}
              disabled={saving}
              className="px-3 py-2 bg-[#FDF0ED] hover:bg-[#FCE7E2] text-[#8B2635] text-xs font-bold rounded-xl transition-colors whitespace-nowrap border border-[#EAC5BD] cursor-pointer"
              title="테스트용 가짜 예시 계정을 모두 정리합니다"
            >
              🗑️ 테스트 계정 정리
            </button>
            <input 
              type="text" 
              placeholder="구글 시트 공유 링크 (옵션)..." 
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-[#D0C6BB] bg-[#F4F3EE] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#284F42] text-[#1B382E]"
            />
            <button
              onClick={handleBulkImport}
              disabled={importing || !sheetUrl}
              className="px-3.5 py-2 bg-[#B59269] hover:bg-[#a38058] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap shadow-xs cursor-pointer"
            >
              {importing ? '전송 중...' : '시트 동기화'}
            </button>
          </div>
          <span className="text-[11px] text-[#5A6B63] flex items-center gap-1 pl-1">
            💡 <strong>시트 동기화:</strong> 구글 시트의 [이름, 이메일, 본부] 명단을 일괄 등록합니다. (복수 본부는 쉼표나 슬래시 구분 지원)
          </span>
        </div>
      </div>

      {/* Add or Update Role Form */}
      <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 p-6 lg:p-7">
        <h2 className="text-lg font-bold text-[#1B382E] mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plus size={20} className="text-[#284F42]" />
            {editingEmail ? `임직원 정보/권한 수정 (${editingEmail})` : '임직원 신규 권한 등록 및 수정'}
          </span>
          {editingEmail && (
            <button 
              type="button" 
              onClick={() => { setEditingEmail(null); setNewName(''); setNewEmail(''); setSelectedRoles(['guest']); }}
              className="text-xs text-[#5A6B63] hover:text-[#1B382E] underline font-bold cursor-pointer"
            >
              신규 등록 모드로 전환
            </button>
          )}
        </h2>
        <form onSubmit={handleAddOrUpdateRole} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-52">
              <label className="block text-sm font-bold text-[#1B382E] mb-1">임직원 이름</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="임직원 성명 입력"
                className="w-full px-4 py-2 border border-[#D0C6BB] bg-[#F4F3EE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284F42] text-sm text-[#1B382E]"
                required
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-[#1B382E] mb-1">회사 이메일 계정</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@bsbelleforet.com"
                className="w-full px-4 py-2 border border-[#D0C6BB] bg-[#F4F3EE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#284F42] text-sm text-[#1B382E]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto px-6 py-2.5 bg-[#284F42] hover:bg-[#1B382E] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-xs"
            >
              <Save size={18} />
              {saving ? '저장 중...' : editingEmail ? '수정 내용 저장' : '권한 등록/저장'}
            </button>
          </div>

          {/* Multi-role selection badge pills */}
          <div className="pt-2 border-t border-[#D0C6BB]/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <label className="text-sm font-bold text-[#1B382E] flex items-center gap-2">
                <span>부여할 대시보드 권한 (복수 선택 가능)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8F2EE] text-[#1E523F] border border-[#B4C6C1]/60">
                  선택됨 {selectedRoles.length}개
                </span>
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#5A6B63] font-medium mr-1">빠른 선택:</span>
                <button
                  type="button"
                  onClick={() => setSelectedRoles(['admin'])}
                  className="px-2 py-1 rounded-lg bg-[#E8F2EE] text-[#1E523F] font-bold hover:bg-[#D0E4DC] transition-colors border border-[#B4C6C1]/70 cursor-pointer"
                >
                  👑 슈퍼 관리자
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoles(['executive'])}
                  className="px-2 py-1 rounded-lg bg-[#FDF0ED] text-[#B59269] font-bold hover:bg-[#FBE4DD] transition-colors border border-[#D0C6BB]/70 cursor-pointer"
                >
                  ⭐ CEO/임원
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoles(['guest'])}
                  className="px-2 py-1 rounded-lg bg-[#F4F3EE] text-[#5A6B63] font-bold hover:bg-[#EAE8E0] transition-colors border border-[#D0C6BB]/70 cursor-pointer"
                >
                  👤 게스트 초기화
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {ROLE_CONFIG.map((role) => {
                const isSelected = selectedRoles.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleToggleFormRole(role.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#284F42] text-white border-[#284F42] shadow-xs'
                        : 'bg-[#F4F3EE] text-[#5A6B63] border-[#D0C6BB]/80 hover:bg-[#E8F2EE] hover:text-[#1E523F] hover:border-[#B4C6C1]'
                    }`}
                  >
                    <span>{role.icon}</span>
                    <span>{role.label}</span>
                    {isSelected ? (
                      <Check size={14} className="text-white ml-0.5" />
                    ) : (
                      <Plus size={14} className="text-[#5A6B63]/60 ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        <div className="mt-4 p-3.5 bg-[#F4F3EE] rounded-2xl border border-[#D0C6BB]/60 flex items-start gap-3">
          <ShieldAlert className="text-[#284F42] shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-[#5A6B63] space-y-0.5">
            <p>
              <strong className="text-[#1B382E]">복수 권한 안내:</strong> 한 임직원에게 여러 본부(예: 리조트 + 레저 + 골프)를 동시에 배정하면, 해당되는 모든 메뉴에 즉시 접근 권한이 부여됩니다.
            </p>
            <p>
              하단 명단 테이블의 <strong>[⚙️ 권한 설정]</strong> 버튼을 누르시면 테이블 상에서 1초 만에 체크박스로 즉시 수정할 수도 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Role List with Search */}
      <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(40,79,66,0.06)] border border-[#D0C6BB]/75 overflow-hidden">
        <div className="p-6 border-b border-[#D0C6BB]/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F4F3EE]/60">
          <div>
            <h2 className="text-lg font-bold text-[#1B382E]">전체 등록 임직원 명단 및 권한 리스트</h2>
            <p className="text-xs text-[#5A6B63] mt-0.5">
              임직원별 부여된 권한을 확인하고, <strong>[⚙️ 권한 설정]</strong>을 클릭하여 체크박스를 토글하거나 수정 버튼을 이용하세요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="text"
              placeholder="이름, 이메일, 권한 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-1.5 border border-[#D0C6BB] bg-white rounded-xl text-xs outline-none focus:border-[#284F42] text-[#1B382E] w-56 shadow-2xs"
            />
            <span className="text-xs font-bold text-[#1E523F] bg-[#E8F2EE] border border-[#B4C6C1]/70 px-3 py-1.5 rounded-xl whitespace-nowrap">
              총 {filteredRoles.length}명 / {roles.length}명
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-[#5A6B63] font-medium animate-pulse">데이터를 불러오는 중입니다...</div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-12 text-center text-[#5A6B63] space-y-4">
            <p className="text-sm font-medium">아직 등록된 임직원 명단 데이터가 없습니다.</p>
            <p className="text-xs text-[#5A6B63]/80">상단 양식에서 신규 임직원을 직접 등록하시거나, 아래 버튼을 눌러 초기 명단을 자동 생성하세요.</p>
            <button
              type="button"
              onClick={handleSyncAuthUsers}
              disabled={saving}
              className="px-5 py-2.5 bg-[#284F42] hover:bg-[#1B382E] text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              🔥 Firebase Auth 가입 계정 자동 가져오기
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[760px]">
              <thead>
                <tr className="bg-[#F4F3EE] text-[#1B382E] text-xs border-b border-[#D0C6BB]/75 uppercase tracking-wider font-bold">
                  <th className="px-6 py-3.5 font-bold text-left whitespace-nowrap w-36">임직원 성명</th>
                  <th className="px-6 py-3.5 font-bold text-left whitespace-nowrap w-56">회사 이메일 계정</th>
                  <th className="px-6 py-3.5 font-bold text-left whitespace-nowrap">부여된 권한 (복수 권한 리스트)</th>
                  <th className="px-6 py-3.5 font-bold text-right whitespace-nowrap w-36">수정 / 삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0C6BB]/30 text-sm">
                {filteredRoles.map((roleObj: UserRole) => {
                  const assignedList = roleObj.roles && roleObj.roles.length > 0
                    ? roleObj.roles
                    : [roleObj.role || 'guest'];
                  const isPopoverOpen = openPopoverEmail === roleObj.email;

                  return (
                    <tr 
                      key={roleObj.email} 
                      className={`hover:bg-[#F4F3EE]/50 transition-colors ${editingEmail === roleObj.email ? 'bg-[#E8F2EE]/40 font-semibold' : ''}`}
                    >
                      <td className="px-6 py-4 text-[#1B382E] font-bold">{roleObj.name || '-'}</td>
                      <td className="px-6 py-4 text-[#5A6B63] font-medium">{roleObj.email}</td>
                      <td className="px-6 py-4 relative">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assignedList.map((rId) => {
                            const meta = getRoleMeta(rId);
                            const canRemove = assignedList.length > 1;
                            return (
                              <span
                                key={rId}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${meta.badgeStyle}`}
                              >
                                <span>{meta.icon}</span>
                                <span>{meta.label}</span>
                                {canRemove && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoveSingleRole(roleObj.email, rId, e)}
                                    className="ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors cursor-pointer"
                                    title={`${meta.label} 권한 제거`}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            );
                          })}

                          {/* Quick multi-role popover trigger button */}
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenPopoverEmail(isPopoverOpen ? null : roleObj.email);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer shadow-2xs ${
                                isPopoverOpen 
                                  ? 'bg-[#284F42] text-white border-[#284F42]' 
                                  : 'bg-[#F4F3EE] hover:bg-[#E8F2EE] text-[#1B382E] hover:text-[#1E523F] border-[#D0C6BB]/70'
                              }`}
                              title="권한 추가 및 체크박스 토글"
                            >
                              <Settings size={13} />
                              <span>권한 설정</span>
                            </button>

                            {/* Dropdown checklist popover */}
                            {isPopoverOpen && (
                              <div 
                                className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#D0C6BB] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D0C6BB]/50">
                                  <span className="text-xs font-bold text-[#1B382E]">
                                    {roleObj.name || roleObj.email} 권한 지정
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setOpenPopoverEmail(null)}
                                    className="text-[#5A6B63] hover:text-[#1B382E] p-1 rounded-md"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                                  {ROLE_CONFIG.map((role) => {
                                    const isChecked = assignedList.includes(role.id);
                                    return (
                                      <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => handleToggleUserRole(roleObj.email, role.id)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                          isChecked
                                            ? 'bg-[#E8F2EE] text-[#1E523F]'
                                            : 'hover:bg-[#F4F3EE] text-[#5A6B63]'
                                        }`}
                                      >
                                        <span className="flex items-center gap-1.5">
                                          <span>{role.icon}</span>
                                          <span>{role.label}</span>
                                        </span>
                                        {isChecked ? (
                                          <CheckSquare size={16} className="text-[#1E523F]" />
                                        ) : (
                                          <Square size={16} className="text-[#D0C6BB]" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-[#D0C6BB]/50 flex justify-between items-center text-[11px] text-[#5A6B63]">
                                  <span>체크 시 즉시 저장됩니다</span>
                                  <button
                                    type="button"
                                    onClick={() => setOpenPopoverEmail(null)}
                                    className="px-2 py-0.5 rounded bg-[#284F42] text-white font-bold cursor-pointer"
                                  >
                                    완료
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleSelectUserForEdit(roleObj)}
                            className="px-2.5 py-1 text-xs bg-[#F4F3EE] hover:bg-[#E8F2EE] text-[#1B382E] hover:text-[#1E523F] font-bold rounded-lg transition-colors flex items-center gap-1 border border-[#D0C6BB]/60 cursor-pointer"
                            title="상단 양식에서 수정"
                          >
                            ✎ 수정
                          </button>
                          <button
                            onClick={() => handleDeleteRole(roleObj.email)}
                            className="text-[#8B2635] hover:text-[#5A1923] p-1.5 hover:bg-[#FDF0ED] rounded-lg transition-colors cursor-pointer"
                            title="권한 삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
