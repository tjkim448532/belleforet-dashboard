// src/pages/Members.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc 
} from 'firebase/firestore';
import { secureFetcher } from '../lib/secureFetcher';
import { useDate } from '../contexts/DateContext';
import GlobalDatePicker from '../components/GlobalDatePicker';
import { 
  UserPlus, Search, Trash2, Edit3, X, Award, Clock, 
  Calendar, ChevronRight, User, AlertCircle 
} from 'lucide-react';

interface Member {
  id?: string;
  memberId: string; // e.g. M2026-001
  name: string;
  phone: string;
  memberType: '골프회원' | '콘도회원' | '일반회원' | 'VIP';
  registeredAt: string; // YYYY-MM-DD
}

interface UsageEvent {
  target_date: string;
  category: string;
  shop_name: string;
  item_name: string;
  quantity: number;
  total_amount: number;
  credit_amount: number;
}

export default function Members() {
  // 1. States for member list
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 2. Global date context for default range
  const { startDate } = useDate();
  
  // 3. States for usage tracking
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  
  // Local date override for usage history
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(startDate);

  // 4. States for Add/Edit Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form states
  const [formMemberId, setFormMemberId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formType, setFormType] = useState<'골프회원' | '콘도회원' | '일반회원' | 'VIP'>('일반회원');

  const [prevStartDate, setPrevStartDate] = useState(startDate);

  if (startDate !== prevStartDate) {
    setPrevStartDate(startDate);
    setLocalStartDate(startDate);
    setLocalEndDate(startDate);
  }

  // Firestore Real-time listener for members
  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('memberId', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Member[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(list);
      setLoadingMembers(false);
    }, (error) => {
      console.error('Error fetching members from Firestore:', error);
      setLoadingMembers(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Member Usage when selected or dates change
  useEffect(() => {
    if (!selectedMember) return;
    
    const fetchUsage = async () => {
      setLoadingUsage(true);
      try {
        // Compute SHA-256 hash of the member name
        const nameUtf8 = new TextEncoder().encode(selectedMember.name.trim());
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', nameUtf8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const API_BASE = import.meta.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
        const data = await secureFetcher(
          `${API_BASE}/api/v3/members/usage?hash=${hashHex}&startDate=${localStartDate}&endDate=${localEndDate}`
        );

        if (data.success) {
          setUsageEvents(data.usage || []);
        } else {
          setUsageEvents([]);
        }
      } catch (err) {
        console.error('Error fetching member usage:', err);
        setUsageEvents([]);
      } finally {
        setLoadingUsage(false);
      }
    };

    fetchUsage();
  }, [selectedMember, localStartDate, localEndDate]);

  // Open add modal and preset memberId
  const handleOpenAddModal = () => {
    // Generate simple incremental ID recommendation
    const maxNum = members.reduce((max, m) => {
      const match = m.memberId.match(/\d+$/);
      if (match) {
        const val = parseInt(match[0], 10);
        return val > max ? val : max;
      }
      return max;
    }, 0);
    const nextIdNum = String(maxNum + 1).padStart(3, '0');
    
    setFormMemberId(`BF-${new Date().getFullYear()}-${nextIdNum}`);
    setFormName('');
    setFormPhone('');
    setFormType('일반회원');
    setIsAddModalOpen(true);
  };

  // Create member in Firestore
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMemberId || !formName || !formPhone) {
      alert('모든 필드를 입력해 주세요.');
      return;
    }

    try {
      await addDoc(collection(db, 'members'), {
        memberId: formMemberId.trim(),
        name: formName.trim(),
        phone: formPhone.trim(),
        memberType: formType,
        registeredAt: new Date().toISOString().slice(0, 10)
      });
      setIsAddModalOpen(false);
      alert('회원이 성공적으로 등록되었습니다.');
    } catch (err) {
      console.error('Error adding member:', err);
      alert('회원 등록 실패: ' + err);
    }
  };

  // Open edit modal
  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member);
    setFormMemberId(member.memberId);
    setFormName(member.name);
    setFormPhone(member.phone);
    setFormType(member.memberType);
    setIsEditModalOpen(true);
  };

  // Update member in Firestore
  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.id) return;

    try {
      const docRef = doc(db, 'members', editingMember.id);
      await updateDoc(docRef, {
        memberId: formMemberId.trim(),
        name: formName.trim(),
        phone: formPhone.trim(),
        memberType: formType
      });
      setIsEditModalOpen(false);
      setEditingMember(null);
      alert('회원 정보가 수정되었습니다.');
    } catch (err) {
      console.error('Error updating member:', err);
      alert('회원 정보 수정 실패: ' + err);
    }
  };

  // Delete member from Firestore
  const handleDeleteMember = async (member: Member) => {
    if (!member.id) return;
    if (!confirm(`정말 ${member.name} 회원을 삭제하시겠습니까? (이전 이용 로그 등은 지워지지 않습니다)`)) return;

    try {
      await deleteDoc(doc(db, 'members', member.id));
      if (selectedMember?.id === member.id) {
        setSelectedMember(null);
      }
      alert('회원이 삭제되었습니다.');
    } catch (err) {
      console.error('Error deleting member:', err);
      alert('회원 삭제 실패: ' + err);
    }
  };

  // Filter members based on search queries
  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.memberId.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.memberType.toLowerCase().includes(q)
    );
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(val || 0)) + '원';
  };

  return (
    <div className="p-6 max-w-[1920px] mx-auto space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Award className="text-brand-mint" size={28} /> 회원관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">리조트 사업본부 산하 회원명부 및 실시간 업장에 걸친 이용 실적 추적</p>
        </div>
        <div className="flex items-center gap-4">
          <GlobalDatePicker />
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-3 bg-brand-mint text-white font-medium rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-brand-mint/20 cursor-pointer"
          >
            <UserPlus size={18} /> 신규 회원 등록
          </button>
        </div>
      </div>

      {/* Main Grid: Membership list & selected member overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Membership Registry Table (8/12 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="이름, 회원번호, 휴대폰 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-mint/40 text-sm font-medium"
              />
            </div>
            <div className="text-xs font-medium text-slate-400">
              총 {filteredMembers.length}명의 회원 검색됨
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            {loadingMembers ? (
              <div className="py-20 text-center text-slate-400 font-medium">회원 목록을 불러오는 중...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-medium">등록된 회원이 없거나 검색 결과가 없습니다.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider pl-6">회원번호</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">이름</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">연락처</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">회원구분</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">등록일자</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right pr-6">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => (
                    <tr 
                      key={member.id} 
                      onClick={() => setSelectedMember(member)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer group ${
                        selectedMember?.id === member.id ? 'bg-brand-mint/5 hover:bg-brand-mint/5' : ''
                      }`}
                    >
                      <td className="p-4 text-sm font-medium text-slate-700 pl-6">{member.memberId}</td>
                      <td className="p-4 text-sm font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs ${
                            member.memberType === 'VIP' ? 'bg-amber-100 text-amber-600' :
                            member.memberType === '골프회원' ? 'bg-emerald-100 text-emerald-600' :
                            member.memberType === '콘도회원' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {member.name.charAt(0)}
                          </div>
                          <span>{member.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-500 font-medium">{member.phone}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.memberType === 'VIP' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          member.memberType === '골프회원' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          member.memberType === '콘도회원' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                          'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {member.memberType}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-400 font-medium">{member.registeredAt}</td>
                      <td className="p-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditModal(member)}
                            className="p-1.5 text-slate-400 hover:text-brand-mint hover:bg-slate-100 rounded-lg transition-all"
                            title="수정"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                          <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-mint transition-colors ml-1" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Usage timeline or select prompt (4/12 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {!selectedMember ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
                <User size={32} />
              </div>
              <h3 className="text-lg font-medium text-slate-700">회원 이용내역 분석</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-[200px] mx-auto leading-relaxed">
                좌측 목록에서 회원을 선택하시면 이번 달 업장별 이용 이력을 실시간 조회합니다.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 relative overflow-hidden">
              
              {/* Member detail header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-mint/10 text-brand-mint rounded-xl flex items-center justify-center font-medium text-base">
                    {selectedMember.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">{selectedMember.name} 회원</h3>
                    <p className="text-slate-400 text-xs font-medium">{selectedMember.memberId} · {selectedMember.memberType}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Date pickers to filter history */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Calendar size={14} className="text-brand-mint" /> 조회 기간 설정
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">시작일</label>
                    <input 
                      type="date" 
                      value={localStartDate}
                      onChange={(e) => setLocalStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-mint"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">종료일</label>
                    <input 
                      type="date" 
                      value={localEndDate}
                      onChange={(e) => setLocalEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-mint"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Container */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" /> 이용 업장 타임라인
                </h4>
                
                {loadingUsage ? (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium">
                    MariaDB에서 이용 내역 실시간 집계 중...
                  </div>
                ) : usageEvents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium border border-dashed border-slate-100 rounded-xl bg-slate-50/20">
                    <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                    선택하신 기간 동안의 이용 이력이 없습니다.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                    {usageEvents.map((evt, idx) => (
                      <div key={idx} className="relative group/timeline">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-transform group-hover/timeline:scale-125 ${
                          evt.category === '골프' ? 'bg-emerald-500' :
                          evt.category === '숙박' ? 'bg-indigo-500' :
                          evt.category === '식음' ? 'bg-orange-500' : 'bg-brand-mint'
                        }`} />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-slate-400">{evt.target_date}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              evt.category === '골프' ? 'bg-emerald-50 text-emerald-600' :
                              evt.category === '숙박' ? 'bg-indigo-50 text-indigo-600' :
                              evt.category === '식음' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-600'
                            }`}>
                              {evt.category}
                            </span>
                          </div>
                          <div className="bg-slate-50/50 hover:bg-slate-50 p-3 rounded-xl border border-slate-100 transition-colors">
                            <div className="text-xs font-medium text-slate-700">{evt.shop_name}</div>
                            <div className="text-[11px] text-slate-500 mt-1 flex justify-between items-center font-medium">
                              <span>{evt.item_name} ({evt.quantity}개)</span>
                              {evt.credit_amount !== null && (
                                <span className="font-medium text-slate-800 text-xs">
                                  {formatCurrency(evt.credit_amount ?? evt.total_amount)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-2">
              <UserPlus className="text-brand-mint" size={24} /> 신규 회원 등록
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-6">Firestore DB에 신규 회원을 평문으로 안전하게 등록합니다.</p>
            
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">회원번호 (자동 권장)</label>
                <input 
                  type="text" 
                  value={formMemberId}
                  onChange={(e) => setFormMemberId(e.target.value)}
                  placeholder="예: BF-2026-001"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">회원명</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="이름 입력 (예: 홍길동)"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">휴대폰 번호</label>
                <input 
                  type="tel" 
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="숫자 및 하이픈 입력 (예: 010-1234-5678)"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">회원구분</label>
                <select 
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as '골프회원' | '콘도회원' | '일반회원' | 'VIP')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                >
                  <option value="일반회원">일반회원</option>
                  <option value="골프회원">골프회원</option>
                  <option value="콘도회원">콘도회원</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-brand-mint text-white font-extrabold rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-brand-mint/15 mt-2 cursor-pointer"
              >
                회원 등록 완료
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-2">
              <Edit3 className="text-brand-mint" size={24} /> 회원 정보 수정
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-6">선택한 회원의 프로필 정보를 수정합니다.</p>
            
            <form onSubmit={handleEditMember} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">회원번호</label>
                <input 
                  type="text" 
                  value={formMemberId}
                  onChange={(e) => setFormMemberId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">회원명</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">휴대폰 번호</label>
                <input 
                  type="tel" 
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">회원구분</label>
                <select 
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as '골프회원' | '콘도회원' | '일반회원' | 'VIP')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
                >
                  <option value="일반회원">일반회원</option>
                  <option value="골프회원">골프회원</option>
                  <option value="콘도회원">콘도회원</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-brand-mint text-white font-extrabold rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-brand-mint/15 mt-2 cursor-pointer"
              >
                회원 수정 완료
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
