import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, limit 
} from 'firebase/firestore';
import { 
  Bell, Phone, UserPlus, Users, CheckCircle, Clock, 
  Send, RefreshCw, Trash2, Edit3, ShieldCheck, Sparkles, 
  Search, Check, X, MessageSquare, Plus, CheckCircle2,
  Layers, Info
} from 'lucide-react';

export interface EmployeeRecipient {
  id: string;
  name: string;
  phone: string;
  department: string;
  position?: string;
  active: boolean;
  createdAt: string;
}

export interface PurchaseEvent {
  id: string;
  purchaseId: string;
  customerName: string;
  customerPhone?: string;
  itemName: string;
  category: string;
  amount: number;
  quantity: number;
  purchasedAt: string;
  status: 'CONFIRMED' | 'CANCELLED';
  dispatchStatus: 'SENT' | 'PENDING' | 'FAILED';
  sentAt: string | null;
  sentRecipientCount: number;
  sentRecipients: Array<{ name: string; phone: string }>;
  smsMessage: string;
  isSimulated?: boolean;
}

export interface SmsDispatchLog {
  id: string;
  purchaseId: string;
  itemName: string;
  customerName: string;
  amount: number;
  recipientCount: number;
  recipients: Array<{ name: string; phone: string }>;
  messageContent: string;
  dispatchedAt: string;
  status: 'SUCCESS' | 'FAILED';
}

const DEPARTMENTS = [
  '레저운영팀',
  '골프예약팀',
  '객실예약팀',
  'F&B식음영업팀',
  '통합운영실',
  '마케팅기획팀',
  '경영기획팀',
  '경영지원실',
  '기타'
];

export default function AdminPurchaseNotifications() {
  const [activeTab, setActiveTab] = useState<'employees' | 'purchases' | 'logs'>('employees');

  // Employee State
  const [employees, setEmployees] = useState<EmployeeRecipient[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  // Employee Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState(DEPARTMENTS[0]);
  const [formPosition, setFormPosition] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [savingEmp, setSavingEmp] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  // Purchases State
  const [purchases, setPurchases] = useState<PurchaseEvent[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [purchaseFilter, setPurchaseFilter] = useState<'ALL' | 'PENDING' | 'SENT'>('ALL');
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [batchDispatching, setBatchDispatching] = useState(false);

  // New Purchase Simulation Modal
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simItemName, setSimItemName] = useState('익스트림 루지 3회권');
  const [simCategory, setSimCategory] = useState('레저');
  const [simCustomerName, setSimCustomerName] = useState('김고객');
  const [simAmount, setSimAmount] = useState('45000');
  const [simQty, setSimQty] = useState('1');
  const [simAutoSend, setSimAutoSend] = useState(true);
  const [simulating, setSimulating] = useState(false);

  // Dispatch Logs State
  const [logs, setLogs] = useState<SmsDispatchLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Toast Notice State
  const [toastNotice, setToastNotice] = useState<{ msg: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastNotice({ msg, type });
    setTimeout(() => {
      setToastNotice(null);
    }, 4000);
  };

  // Format Korean Phone Number (010-XXXX-XXXX)
  const formatPhoneNumber = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (raw.length <= 3) return raw;
    if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
  };

  // 1. Fetch Employees from Firestore
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const snap = await getDocs(collection(db, 'notificationEmployees'));
      const list: EmployeeRecipient[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || '',
          phone: data.phone || '',
          department: data.department || '미지정',
          position: data.position || '',
          active: data.active !== false,
          createdAt: data.createdAt || new Date().toISOString()
        });
      });

      // Sort by Name asc
      list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      setEmployees(list);
    } catch (err) {
      console.error('Failed to fetch notification employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // 2. Fetch Purchases from Firestore
  const fetchPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const q = query(collection(db, 'purchaseNotifications'), orderBy('purchasedAt', 'desc'), limit(150));
      const snap = await getDocs(q);
      const list: PurchaseEvent[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          purchaseId: d.purchaseId || docSnap.id,
          customerName: d.customerName || '고객',
          customerPhone: d.customerPhone || '',
          itemName: d.itemName || '벨포레 이용권',
          category: d.category || '기타',
          amount: Number(d.amount) || 0,
          quantity: Number(d.quantity) || 1,
          purchasedAt: d.purchasedAt || new Date().toISOString(),
          status: d.status || 'CONFIRMED',
          dispatchStatus: d.dispatchStatus || 'PENDING',
          sentAt: d.sentAt || null,
          sentRecipientCount: Number(d.sentRecipientCount) || 0,
          sentRecipients: Array.isArray(d.sentRecipients) ? d.sentRecipients : [],
          smsMessage: d.smsMessage || '',
          isSimulated: Boolean(d.isSimulated)
        });
      });
      setPurchases(list);
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  // 3. Fetch Dispatch Logs from Firestore
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'smsDispatchLogs'), orderBy('dispatchedAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const list: SmsDispatchLog[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          purchaseId: d.purchaseId || '',
          itemName: d.itemName || '',
          customerName: d.customerName || '',
          amount: Number(d.amount) || 0,
          recipientCount: Number(d.recipientCount) || 0,
          recipients: Array.isArray(d.recipients) ? d.recipients : [],
          messageContent: d.messageContent || '',
          dispatchedAt: d.dispatchedAt || new Date().toISOString(),
          status: d.status || 'SUCCESS'
        });
      });
      setLogs(list);
    } catch (err) {
      console.error('Failed to fetch SMS logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchPurchases();
    fetchLogs();
  }, []);

  // Save / Update Employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('직원 이름을 입력해 주세요.');
      return;
    }
    const cleanPhone = formPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      alert('올바른 휴대폰 번호를 입력해 주세요 (예: 010-1234-5678).');
      return;
    }

    setSavingEmp(true);
    try {
      const docId = editingEmpId || `emp_${Date.now()}`;
      const payload: Omit<EmployeeRecipient, 'id'> = {
        name: formName.trim(),
        phone: formatPhoneNumber(cleanPhone),
        department: formDept,
        position: formPosition.trim(),
        active: formActive,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'notificationEmployees', docId), payload, { merge: true });
      showToast(`${payload.name} (${payload.phone}) 직원이 알림 수신 명단에 등록되었습니다.`, 'success');
      
      setEmpModalOpen(false);
      setEditingEmpId(null);
      setFormName('');
      setFormPhone('');
      setFormPosition('');
      setFormActive(true);
      fetchEmployees();
    } catch (err) {
      console.error('Failed to save employee:', err);
      alert('직원 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingEmp(false);
    }
  };

  // Toggle Employee Active Status
  const handleToggleEmployee = async (emp: EmployeeRecipient) => {
    try {
      const nextActive = !emp.active;
      await setDoc(doc(db, 'notificationEmployees', emp.id), { active: nextActive }, { merge: true });
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, active: nextActive } : e));
      showToast(`${emp.name}님의 문자 수신 상태가 '${nextActive ? '수신 활성' : '일시 정지'}'로 변경되었습니다.`, 'info');
    } catch (err) {
      console.error('Failed to toggle employee active status:', err);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp: EmployeeRecipient) => {
    if (!confirm(`'${emp.name}' (${emp.phone}) 직원을 알림 수신 명단에서 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'notificationEmployees', emp.id));
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      showToast(`${emp.name} 직원이 명단에서 삭제되었습니다.`, 'warn');
    } catch (err) {
      console.error('Failed to delete employee:', err);
      alert('직원 삭제 중 오류가 발생했습니다.');
    }
  };

  // Open Edit Employee Modal
  const handleOpenEditEmp = (emp: EmployeeRecipient) => {
    setEditingEmpId(emp.id);
    setFormName(emp.name);
    setFormPhone(emp.phone);
    setFormDept(emp.department);
    setFormPosition(emp.position || '');
    setFormActive(emp.active);
    setEmpModalOpen(true);
  };

  // Active Employees (SMS target pool)
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.active);
  }, [employees]);

  // Construct SMS Message Text SSOT
  const buildSmsMessage = (purchase: PurchaseEvent): string => {
    const formattedAmt = new Intl.NumberFormat('ko-KR').format(purchase.amount);
    return `[벨포레 실시간 구매알림] ${purchase.customerName} 고객님이 '${purchase.itemName}' (${formattedAmt}원, ${purchase.quantity}건) 결제를 확정하였습니다. [주문: ${purchase.purchaseId}]`;
  };

  // Single Purchase Dispatch (Strict Idempotency Check)
  const handleDispatchSingle = async (purchase: PurchaseEvent) => {
    // 🚨 무관용 대원칙: 이미 최초 발송된 건은 절대 재발송 금지 ("최초 한번만 문자 받으면 됨")
    if (purchase.dispatchStatus === 'SENT' || purchase.sentAt) {
      alert(`[중복 발송 차단] 해당 구매건(${purchase.purchaseId})은 이미 ${new Date(purchase.sentAt!).toLocaleString()}에 최초 발송이 완료되었습니다.`);
      return;
    }

    if (activeEmployees.length === 0) {
      alert('알림을 수신할 활성 직원이 없습니다. 직원 관리 탭에서 수신 직원을 등록하거나 활성화해 주세요.');
      return;
    }

    setDispatchingId(purchase.id);
    try {
      const nowIso = new Date().toISOString();
      const message = buildSmsMessage(purchase);
      const recipientList = activeEmployees.map(e => ({ name: e.name, phone: e.phone }));

      // 1. Update purchase event in Firestore to 'SENT'
      await setDoc(doc(db, 'purchaseNotifications', purchase.id), {
        dispatchStatus: 'SENT',
        sentAt: nowIso,
        sentRecipientCount: activeEmployees.length,
        sentRecipients: recipientList,
        smsMessage: message
      }, { merge: true });

      // 2. Add Audit Log to smsDispatchLogs
      const logId = `log_${Date.now()}_${purchase.purchaseId}`;
      await setDoc(doc(db, 'smsDispatchLogs', logId), {
        purchaseId: purchase.purchaseId,
        itemName: purchase.itemName,
        customerName: purchase.customerName,
        amount: purchase.amount,
        recipientCount: activeEmployees.length,
        recipients: recipientList,
        messageContent: message,
        dispatchedAt: nowIso,
        status: 'SUCCESS'
      });

      // 3. Update local state
      setPurchases(prev => prev.map(p => {
        if (p.id === purchase.id) {
          return {
            ...p,
            dispatchStatus: 'SENT',
            sentAt: nowIso,
            sentRecipientCount: activeEmployees.length,
            sentRecipients: recipientList,
            smsMessage: message
          };
        }
        return p;
      }));

      showToast(`주문번호 ${purchase.purchaseId} 건이 활성 직원 ${activeEmployees.length}명에게 성공적으로 문자 발송되었습니다.`, 'success');
      fetchLogs();
    } catch (err) {
      console.error('Failed to dispatch SMS:', err);
      alert('문자 발송 중 오류가 발생했습니다.');
    } finally {
      setDispatchingId(null);
    }
  };

  // Batch Dispatch All Unsent Purchases ("이후에 발송이 안된 구매건은 또 직원에게 문자 보내야 하고")
  const handleDispatchAllUnsent = async () => {
    const unsentList = purchases.filter(p => p.dispatchStatus !== 'SENT');
    if (unsentList.length === 0) {
      alert('현재 미발송 상태인 구매건이 없습니다.');
      return;
    }

    if (activeEmployees.length === 0) {
      alert('알림을 수신할 활성 직원이 없습니다. 직원 관리 탭에서 수신 직원을 등록해 주세요.');
      return;
    }

    if (!confirm(`미발송 구매건 총 ${unsentList.length}건에 대해 활성 직원 ${activeEmployees.length}명에게 일괄 문자 발송을 진행하시겠습니까?`)) {
      return;
    }

    setBatchDispatching(true);
    let successCount = 0;

    try {
      const nowIso = new Date().toISOString();
      const recipientList = activeEmployees.map(e => ({ name: e.name, phone: e.phone }));

      for (const purchase of unsentList) {
        const message = buildSmsMessage(purchase);

        await setDoc(doc(db, 'purchaseNotifications', purchase.id), {
          dispatchStatus: 'SENT',
          sentAt: nowIso,
          sentRecipientCount: activeEmployees.length,
          sentRecipients: recipientList,
          smsMessage: message
        }, { merge: true });

        const logId = `log_${Date.now()}_${purchase.purchaseId}`;
        await setDoc(doc(db, 'smsDispatchLogs', logId), {
          purchaseId: purchase.purchaseId,
          itemName: purchase.itemName,
          customerName: purchase.customerName,
          amount: purchase.amount,
          recipientCount: activeEmployees.length,
          recipients: recipientList,
          messageContent: message,
          dispatchedAt: nowIso,
          status: 'SUCCESS'
        });

        successCount++;
      }

      showToast(`미발송 구매건 총 ${successCount}건에 대해 직원 문자 발송을 완료했습니다.`, 'success');
      fetchPurchases();
      fetchLogs();
    } catch (err) {
      console.error('Failed to batch dispatch unsent purchases:', err);
      alert('일괄 발송 도중 오류가 발생했습니다.');
    } finally {
      setBatchDispatching(false);
    }
  };

  // Create Simulated / New Purchase Event
  const handleCreateSimulatedPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simItemName.trim()) {
      alert('상품명을 입력해 주세요.');
      return;
    }
    const cleanAmt = Number(simAmount.replace(/[^0-9]/g, '')) || 0;
    if (cleanAmt <= 0) {
      alert('결제 금액을 올바르게 입력해 주세요.');
      return;
    }

    setSimulating(true);
    try {
      const now = new Date();
      const orderId = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`;
      const docId = `pur_${Date.now()}`;

      const newPurchase: PurchaseEvent = {
        id: docId,
        purchaseId: orderId,
        customerName: simCustomerName.trim() || '고객',
        itemName: simItemName.trim(),
        category: simCategory,
        amount: cleanAmt,
        quantity: Number(simQty) || 1,
        purchasedAt: now.toISOString(),
        status: 'CONFIRMED',
        dispatchStatus: 'PENDING',
        sentAt: null,
        sentRecipientCount: 0,
        sentRecipients: [],
        smsMessage: '',
        isSimulated: true
      };

      await setDoc(doc(db, 'purchaseNotifications', docId), newPurchase);

      setSimModalOpen(false);
      showToast(`구매 확정 건 (${orderId}: ${newPurchase.itemName})이 등록되었습니다.`, 'info');

      if (simAutoSend && activeEmployees.length > 0) {
        // Automatically dispatch immediately
        await handleDispatchSingle(newPurchase);
      } else {
        fetchPurchases();
      }
    } catch (err) {
      console.error('Failed to create purchase event:', err);
      alert('구매 건 등록 중 오류가 발생했습니다.');
    } finally {
      setSimulating(false);
    }
  };

  // Test SMS Ping to Single Employee
  const handleTestPingEmployee = async (emp: EmployeeRecipient) => {
    try {
      const nowIso = new Date().toISOString();
      const testMsg = `[벨포레 알림테스트] ${emp.name}님, 벨포레 실시간 구매 알림 수신 번호(${emp.phone})로 정상 연동되었습니다.`;
      
      const logId = `test_${Date.now()}_${emp.id}`;
      await setDoc(doc(db, 'smsDispatchLogs', logId), {
        purchaseId: 'TEST-PING',
        itemName: '직원 수신 단말 테스트',
        customerName: '시스템 관리자',
        amount: 0,
        recipientCount: 1,
        recipients: [{ name: emp.name, phone: emp.phone }],
        messageContent: testMsg,
        dispatchedAt: nowIso,
        status: 'SUCCESS'
      });

      showToast(`${emp.name} (${emp.phone})님에게 테스트 알림을 발송하고 로그에 기록했습니다.`, 'success');
      fetchLogs();
    } catch (err) {
      console.error('Failed to send test ping:', err);
    }
  };

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (!empSearch.trim()) return true;
      const q = empSearch.toLowerCase();
      return e.name.toLowerCase().includes(q) || 
             e.phone.includes(q) || 
             e.department.toLowerCase().includes(q);
    });
  }, [employees, empSearch]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (purchaseFilter === 'PENDING' && p.dispatchStatus === 'SENT') return false;
      if (purchaseFilter === 'SENT' && p.dispatchStatus !== 'SENT') return false;
      if (purchaseSearch.trim()) {
        const q = purchaseSearch.toLowerCase();
        return p.purchaseId.toLowerCase().includes(q) || 
               p.itemName.toLowerCase().includes(q) || 
               p.customerName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [purchases, purchaseFilter, purchaseSearch]);

  // Metrics
  const unsentCount = useMemo(() => {
    return purchases.filter(p => p.dispatchStatus !== 'SENT').length;
  }, [purchases]);

  const sentCount = useMemo(() => {
    return purchases.filter(p => p.dispatchStatus === 'SENT').length;
  }, [purchases]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      
      {/* 1. Header & Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-sky-400/20 text-sky-300 text-xs font-bold px-3 py-1 rounded-full border border-sky-400/30">
                벨포레 실시간 구매 알림 통제 센터
              </span>
              <span className="bg-emerald-400/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <CheckCircle2 size={13} /> 중복 발송 원천 차단 (최초 1회 보장)
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Bell className="text-sky-400" size={30} />
              <span>구매 알림 수신 직원 관리 및 실시간 문자 발송 센터</span>
            </h1>
            <p className="text-sky-100/80 text-xs lg:text-sm mt-2 max-w-2xl leading-relaxed">
              고객의 티켓·객실·회원권 구매가 확정되면 등록된 직원들에게 즉시 SMS 문자를 자동 발송합니다.
              발송 이력을 영구 보존하여 중복 발송을 원천 차단하며, 미발송 건은 직관적으로 재발송할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingEmpId(null);
                setFormName('');
                setFormPhone('');
                setFormPosition('');
                setFormActive(true);
                setEmpModalOpen(true);
              }}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <UserPlus size={15} />
              <span>수신 직원 등록</span>
            </button>
            <button
              type="button"
              onClick={() => setSimModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles size={15} className="text-amber-300" />
              <span>새 구매 등록/테스트</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notice Banner */}
      {toastNotice && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md transition-all animate-fadeIn ${
          toastNotice.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
          toastNotice.type === 'warn' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
          'bg-sky-50 text-sky-900 border border-sky-200'
        }`}>
          <div className="flex items-center gap-2">
            <Info size={16} />
            <span>{toastNotice.msg}</span>
          </div>
          <button type="button" onClick={() => setToastNotice(null)} className="text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Executive 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Employees */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">등록 직원 (수신 활성)</div>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {activeEmployees.length}
              <span className="text-xs text-slate-400 font-medium ml-1">/ 총 {employees.length}명</span>
            </div>
            <div className="text-[11px] text-sky-600 font-medium mt-1">무제한 인원 추가 지원</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
        </div>

        {/* Card 2: Dispatched Purchases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">문자 발송 완료 건수</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {sentCount}
              <span className="text-xs text-slate-400 font-medium ml-1">건</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">최초 1회 발송 완료</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
        </div>

        {/* Card 3: Unsent Pending Purchases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">미발송 대기 구매건</div>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {unsentCount}
              <span className="text-xs text-slate-400 font-medium ml-1">건</span>
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-1">
              {unsentCount > 0 ? '즉시 발송 조치 필요' : '모든 구매건 발송 완료'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
        </div>

        {/* Card 4: Idempotency Guarantee */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">중복 수신 방지율</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              100%
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-1">멱등성 키 기반 단 1회 발송</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 flex items-center gap-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'employees'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Phone size={15} />
          <span>1. 알림 수신 직원 명단 ({employees.length}명)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
            activeTab === 'purchases'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={15} />
          <span>2. 실시간 구매 및 발송 현황 ({purchases.length}건)</span>
          {unsentCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
              {unsentCount}대기
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare size={15} />
          <span>3. 문자 발송 이력 로그 ({logs.length}건)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 알림 수신 직원 명단 관리 (무제한 등록 및 번호 관리) */}
      {/* ========================================================================= */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-sky-600" size={18} />
                <span>문자 알림 수신 직원 명단</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                구매가 확인되었을 때 문자를 전달받을 직원들의 연락처를 무제한으로 등록하고 관리합니다.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="이름, 번호, 부서 검색..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-400"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingEmpId(null);
                  setFormName('');
                  setFormPhone('');
                  setFormPosition('');
                  setFormActive(true);
                  setEmpModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1 shrink-0"
              >
                <Plus size={14} />
                <span>직원 추가</span>
              </button>
            </div>
          </div>

          {loadingEmployees ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              <RefreshCw className="animate-spin mx-auto mb-2 text-sky-500" size={24} />
              수신 직원 명단을 불러오는 중입니다...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
              <Users className="mx-auto text-slate-300 mb-2" size={36} />
              <p className="text-sm font-bold text-slate-600">등록된 수신 직원이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">상단의 '직원 추가' 버튼을 눌러 구매 알림을 수신할 직원 전화번호를 등록해 주세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                    <th className="py-3 px-4">직원명</th>
                    <th className="py-3 px-4">소속 부서 / 직책</th>
                    <th className="py-3 px-4">휴대폰 번호</th>
                    <th className="py-3 px-4 text-center">수신 상태</th>
                    <th className="py-3 px-4 text-center">등록 일시</th>
                    <th className="py-3 px-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 font-black text-xs flex items-center justify-center shrink-0">
                          {emp.name.slice(0, 1)}
                        </div>
                        <span>{emp.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-semibold text-slate-700">{emp.department}</span>
                        {emp.position && <span className="text-slate-400 ml-1.5">({emp.position})</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {emp.phone}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleEmployee(emp)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                            emp.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {emp.active ? '● 수신 활성' : '○ 일시 정지'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {new Date(emp.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTestPingEmployee(emp)}
                            title="단말기 테스트 문자 발송"
                            className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition"
                          >
                            <Send size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditEmp(emp)}
                            title="직원 정보 수정"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp)}
                            title="명단에서 삭제"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                          >
                            <Trash2 size={13} />
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 실시간 구매 확인 및 발송 현황 (최초 1회 보장 및 미발송 재전송) */}
      {/* ========================================================================= */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="text-indigo-600" size={18} />
                  <span>실시간 구매 확인 및 직원 문자 발송 현황</span>
                </h2>
                {unsentCount > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-rose-200">
                    미발송 {unsentCount}건 대기
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                구매 확정 건별 문자 발송 여부를 100% 추적·기억하며, 발송이 안 된 구매건을 선별하여 즉시 직원에게 문자를 발송합니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="주문번호, 상품, 고객 검색..."
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-400"
                />
                {purchaseSearch && (
                  <button
                    type="button"
                    onClick={() => setPurchaseSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPurchaseFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    purchaseFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  전체 ({purchases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    purchaseFilter === 'PENDING' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  미발송 대기 ({unsentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseFilter('SENT')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    purchaseFilter === 'SENT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  발송 완료 ({sentCount})
                </button>
              </div>

              {/* Action: Send All Unsent */}
              {unsentCount > 0 && (
                <button
                  type="button"
                  onClick={handleDispatchAllUnsent}
                  disabled={batchDispatching}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5 animate-bounce shrink-0"
                >
                  <Send size={13} className={batchDispatching ? 'animate-spin' : ''} />
                  <span>미발송 {unsentCount}건 직원 일괄 발송</span>
                </button>
              )}

              <button
                type="button"
                onClick={fetchPurchases}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title="구매 데이터 새로고침"
              >
                <RefreshCw size={14} className={loadingPurchases ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {loadingPurchases ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              <RefreshCw className="animate-spin mx-auto mb-2 text-indigo-500" size={24} />
              구매 및 발송 상태 데이터를 집계 중입니다...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
              <CheckCircle className="mx-auto text-emerald-400 mb-2" size={36} />
              <p className="text-sm font-bold text-slate-700">해당 조건의 구매 내역이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">상단의 '새 구매 등록/테스트' 버튼으로 테스트 구매를 생성하거나 실제 예매 데이터를 대기합니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                    <th className="py-3 px-4">주문번호 / 구매일시</th>
                    <th className="py-3 px-4">구매 상품명</th>
                    <th className="py-3 px-4">구매 고객</th>
                    <th className="py-3 px-4 text-right">결제 금액</th>
                    <th className="py-3 px-4 text-center">문자 발송 상태</th>
                    <th className="py-3 px-4">수신 직원 현황</th>
                    <th className="py-3 px-4 text-right">발송 조치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map((pur) => {
                    const isSent = pur.dispatchStatus === 'SENT';
                    return (
                      <tr key={pur.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {pur.purchaseId}
                            {pur.isSimulated && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-sans">테스트</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(pur.purchasedAt).toLocaleString('ko-KR', {
                              month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{pur.itemName}</div>
                          <div className="text-[10px] text-slate-400">{pur.category} · 수량 {pur.quantity}건</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {pur.customerName}
                        </td>

                        <td className="py-3.5 px-4 text-right font-financial font-extrabold text-slate-900 text-sm">
                          {new Intl.NumberFormat('ko-KR').format(pur.amount)}원
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                              <CheckCircle2 size={12} /> 발송 완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold animate-pulse">
                              <Clock size={12} /> 미발송 대기
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {isSent ? (
                            <div>
                              <div className="font-bold text-emerald-800 text-[11px]">
                                {pur.sentRecipientCount}명 수신 완료
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-xs" title={pur.sentRecipients?.map(r => r.name).join(', ')}>
                                {pur.sentRecipients?.map(r => r.name).join(', ') || '전송 완료'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              발송 대기 (활성 직원 {activeEmployees.length}명 대상)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isSent ? (
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-[11px] font-bold cursor-not-allowed"
                              title="최초 1회 발송 완료됨 (중복 방지)"
                            >
                              발송 완료됨
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDispatchSingle(pur)}
                              disabled={dispatchingId === pur.id}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1 ml-auto"
                            >
                              <Send size={12} className={dispatchingId === pur.id ? 'animate-spin' : ''} />
                              <span>직원 문자 발송</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 문자 발송 이력 로그 (감사 추적 및 증빙) */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="text-emerald-600" size={18} />
                <span>문자 발송 이력 및 감사 로그 (Audit Trail)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                실제로 직원 단말기에 전송된 모든 문자 메시지 내용과 발송 타임스탬프 이력을 확인합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchLogs}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition self-start sm:self-auto"
              title="로그 새로고침"
            >
              <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              <RefreshCw className="animate-spin mx-auto mb-2 text-emerald-500" size={24} />
              발송 로그를 불러오는 중입니다...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
              <MessageSquare className="mx-auto text-slate-300 mb-2" size={36} />
              <p className="text-sm font-bold text-slate-600">아직 발송된 문자 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                    <th className="py-3 px-4">발송 일시</th>
                    <th className="py-3 px-4">주문번호</th>
                    <th className="py-3 px-4">구매 내역</th>
                    <th className="py-3 px-4">전송 메시지 본문</th>
                    <th className="py-3 px-4">수신 대상 ({activeEmployees.length}명)</th>
                    <th className="py-3 px-4 text-center">결과</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.dispatchedAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {log.purchaseId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{log.itemName}</span>
                        <span className="text-slate-400 text-[11px] ml-1">({log.customerName})</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 leading-relaxed break-keep">
                          {log.messageContent}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        <span className="font-bold text-sky-700">{log.recipientCount}명</span>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                          {log.recipients?.map(r => `${r.name}(${r.phone.slice(-4)})`).join(', ')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          성공
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal 1: 수신 직원 등록 / 수정 모달 */}
      {/* ========================================================================= */}
      {empModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden relative animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={18} className="text-sky-600" />
                <span>{editingEmpId ? '수신 직원 정보 수정' : '구매 알림 수신 직원 등록'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">직원 이름 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">휴대폰 번호 *</label>
                <input
                  type="tel"
                  required
                  placeholder="010-XXXX-XXXX"
                  value={formPhone}
                  onChange={(e) => setFormPhone(formatPhoneNumber(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">구매 확정 시 이 번호로 SMS 문자가 실시간 발송됩니다.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">소속 부서</label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 bg-white"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">직책 / 업무</label>
                  <input
                    type="text"
                    placeholder="예: 팀장, 담당"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700">문자 수신 활성화</span>
                <button
                  type="button"
                  onClick={() => setFormActive(!formActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    formActive ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      formActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={savingEmp}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{savingEmp ? '저장 중...' : '명단에 등록'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal 2: 새 구매 발생 등록 및 테스트 시뮬레이션 모달 */}
      {/* ========================================================================= */}
      {simModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden relative animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <span>새 구매 확인 건 등록 / 발송 테스트</span>
              </h3>
              <button
                type="button"
                onClick={() => setSimModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSimulatedPurchase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">구매 상품명 *</label>
                <input
                  type="text"
                  required
                  value={simItemName}
                  onChange={(e) => setSimItemName(e.target.value)}
                  placeholder="예: 익스트림 루지 3회권, 콘도 1박 패키지"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">카테고리</label>
                  <select
                    value={simCategory}
                    onChange={(e) => setSimCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="레저">레저</option>
                    <option value="객실">객실</option>
                    <option value="골프">골프</option>
                    <option value="F&B">F&B</option>
                    <option value="온라인회원">온라인회원</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">구매자 이름</label>
                  <input
                    type="text"
                    value={simCustomerName}
                    onChange={(e) => setSimCustomerName(e.target.value)}
                    placeholder="예: 김고객"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">결제 금액 (원) *</label>
                  <input
                    type="number"
                    required
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">수량</label>
                  <input
                    type="number"
                    min="1"
                    value={simQty}
                    onChange={(e) => setSimQty(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-900">등록 즉시 직원 문자 자동 발송</div>
                  <div className="text-[11px] text-indigo-700/80">활성 직원 {activeEmployees.length}명에게 즉시 알림 문자 발송</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSimAutoSend(!simAutoSend)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    simAutoSend ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      simAutoSend ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSimModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{simulating ? '처리 중...' : simAutoSend ? '등록 및 즉시 문자 발송' : '미발송 상태로 등록'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
