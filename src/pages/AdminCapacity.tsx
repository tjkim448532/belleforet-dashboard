import { useState, useEffect } from 'react';
import { 
  Save, RefreshCw, Plus, Trash2, CheckCircle2, 
  Filter, ShieldCheck, Gauge
} from 'lucide-react';
import type { FacilityCapacityItem } from '../types/simulation';

// 42개 공식 영업장_항목명 SSOT 캐파 마스터 시드 데이터
export const DEFAULT_CAPACITY_SEEDS: FacilityCapacityItem[] = [
  // 1. 🏨 객실 (ROOM) - 2개
  {
    id: 'cap_room_condo',
    shopCode: 'SHOP_ROOM_CONDO',
    shopName: 'ROOM (콘도 객실)',
    category: 'ROOM',
    categoryLabel: '객실',
    maxDailyUnits: 175,
    unitName: '실',
    baseUnitPrice: 165000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 35,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '전체 보유 175실 (51평 35세트 물리 70실 포함)'
  },
  {
    id: 'cap_room_other',
    shopCode: 'SHOP_ROOM_OTHER',
    shopName: 'ROOM OTHER (부대 객실/기타)',
    category: 'ROOM',
    categoryLabel: '객실',
    maxDailyUnits: 20,
    unitName: '실',
    baseUnitPrice: 120000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '기타 부대 객실 및 레이트 체크아웃 등'
  },

  // 2. 🍽️ 식음 (FNB) - 10개
  {
    id: 'cap_fnb_namdo',
    shopCode: 'SHOP_FNB_NAMDO',
    shopName: '남도예담',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 300,
    unitName: '석',
    baseUnitPrice: 25000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: true,
    spilloverPriority: 6,
    notes: '한식당 좌석 회전율 3.0회'
  },
  {
    id: 'cap_fnb_cucina',
    shopCode: 'SHOP_FNB_CUCINA',
    shopName: '쿠치나',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 200,
    unitName: '석',
    baseUnitPrice: 22000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 6,
    notes: '양식 레스토랑'
  },
  {
    id: 'cap_fnb_byeoru',
    shopCode: 'SHOP_FNB_BYEORU',
    shopName: '벼루재촌',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 150,
    unitName: '석',
    baseUnitPrice: 18000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 7,
    notes: '전통 식음 시설'
  },
  {
    id: 'cap_fnb_brisket',
    shopCode: 'SHOP_FNB_BRISKET',
    shopName: '브리스킷346',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 180,
    unitName: '석',
    baseUnitPrice: 28000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: true,
    spilloverPriority: 6,
    notes: '바베큐 & 그릴 다이닝'
  },
  {
    id: 'cap_fnb_delight',
    shopCode: 'SHOP_FNB_DELIGHT',
    shopName: '딜라이트',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 150,
    unitName: '석',
    baseUnitPrice: 16000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 7,
    notes: '캐주얼 다이닝'
  },
  {
    id: 'cap_fnb_bambam_table',
    shopCode: 'SHOP_FNB_BAMBAM_T',
    shopName: '밤밤테이블',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 120,
    unitName: '석',
    baseUnitPrice: 15000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 8,
    notes: '야간 펍 & 다이닝'
  },
  {
    id: 'cap_fnb_bambam_truck',
    shopCode: 'SHOP_FNB_BAMBAM_TRK',
    shopName: '밤밤트럭',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 300,
    unitName: '건',
    baseUnitPrice: 8000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 9,
    notes: '야간 푸드트럭'
  },
  {
    id: 'cap_fnb_summer_truck',
    shopCode: 'SHOP_FNB_SUMMER_TRK',
    shopName: '썸머랜드 푸드트럭',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 400,
    unitName: '건',
    baseUnitPrice: 9000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 9,
    notes: '워터파크 푸드트럭'
  },
  {
    id: 'cap_fnb_cu',
    shopCode: 'SHOP_FNB_CU',
    shopName: 'CU편의점',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 800,
    unitName: '건',
    baseUnitPrice: 6500,
    allowPriceLeverage: false,
    maxPriceHikeRate: 10,
    allowSpillover: true,
    spilloverPriority: 10,
    notes: '리조트 편의점'
  },
  {
    id: 'cap_fnb_twosome',
    shopCode: 'SHOP_FNB_TWOSOME',
    shopName: '투썸플레이스',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 600,
    unitName: '건',
    baseUnitPrice: 7500,
    allowPriceLeverage: true,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 8,
    notes: '베이커리 & 카페'
  },
  {
    id: 'cap_fnb_bhc',
    shopCode: 'SHOP_FNB_BHC',
    shopName: 'BHC(멕시카나)',
    category: 'FNB',
    categoryLabel: '식음',
    maxDailyUnits: 250,
    unitName: '건',
    baseUnitPrice: 24000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 7,
    notes: '치킨 & 룸서비스'
  },

  // 3. ⛳ 골프 (GOLF) - 6개
  {
    id: 'cap_golf_greenfee',
    shopCode: 'SHOP_GOLF_GF',
    shopName: '골프 그린피 (Green Fee)',
    category: 'GOLF',
    categoryLabel: '골프',
    maxDailyUnits: 80,
    unitName: '팀',
    baseUnitPrice: 140000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 30,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '1일 최대 80팀 그린피'
  },
  {
    id: 'cap_golf_cartfee',
    shopCode: 'SHOP_GOLF_CF',
    shopName: '골프 카트비 (Cart Fee)',
    category: 'GOLF',
    categoryLabel: '골프',
    maxDailyUnits: 80,
    unitName: '팀',
    baseUnitPrice: 100000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '팀당 카트 대여비'
  },
  {
    id: 'cap_golf_club_rest',
    shopCode: 'SHOP_GOLF_REST',
    shopName: '클럽-레스토랑',
    category: 'GOLF',
    categoryLabel: '골프',
    maxDailyUnits: 320,
    unitName: '석',
    baseUnitPrice: 28000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '골프장 클럽하우스 레스토랑'
  },
  {
    id: 'cap_golf_start_house',
    shopCode: 'SHOP_GOLF_START',
    shopName: '클럽-스타트하우스',
    category: 'GOLF',
    categoryLabel: '골프',
    maxDailyUnits: 320,
    unitName: '건',
    baseUnitPrice: 15000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '골프 그늘집 식음'
  },
  {
    id: 'cap_golf_proshop',
    shopCode: 'SHOP_GOLF_PROSHOP',
    shopName: '프로샵',
    category: 'GOLF',
    categoryLabel: '골프',
    maxDailyUnits: 150,
    unitName: '건',
    baseUnitPrice: 45000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '골프 용품 및 의류'
  },
  {
    id: 'cap_golf_etc',
    shopCode: 'SHOP_GOLF_ETC',
    shopName: '골프클럽 기타매출',
    category: 'GOLF',
    categoryLabel: '골프',
    maxDailyUnits: 80,
    unitName: '건',
    baseUnitPrice: 20000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '락커, 대여채, 기타 골프 부대매출'
  },

  // 4. 🏎️ 모토아레나 (MOTO) - 2개
  {
    id: 'cap_moto_arena',
    shopCode: 'SHOP_MOTO_ARENA',
    shopName: '모토아레나',
    category: 'MOTO',
    categoryLabel: '모토아레나',
    maxDailyUnits: 400,
    unitName: '세션',
    baseUnitPrice: 35000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: true,
    spilloverPriority: 5,
    notes: '서킷 카트 주행 및 트랙 대관'
  },
  {
    id: 'cap_moto_pitstop',
    shopCode: 'SHOP_MOTO_PITSTOP',
    shopName: '핏스탑',
    category: 'MOTO',
    categoryLabel: '모토아레나',
    maxDailyUnits: 300,
    unitName: '건',
    baseUnitPrice: 12000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 6,
    notes: '모토아레나 전용 식음/스낵 매장'
  },

  // 5. 🏛️ 대관/연회 (BANQUET) - 3개
  {
    id: 'cap_banquet_hall',
    shopCode: 'SHOP_BANQUET_HALL',
    shopName: '연회장',
    category: 'BANQUET',
    categoryLabel: '대관',
    maxDailyUnits: 300,
    unitName: '명',
    baseUnitPrice: 2500000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 40,
    allowSpillover: true,
    spilloverPriority: 10,
    notes: '소/중연회장 대관 및 식음'
  },
  {
    id: 'cap_banquet_belle_hall',
    shopCode: 'SHOP_BANQUET_BELLE',
    shopName: '벨포레홀',
    category: 'BANQUET',
    categoryLabel: '대관',
    maxDailyUnits: 500,
    unitName: '명',
    baseUnitPrice: 3500000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 50,
    allowSpillover: true,
    spilloverPriority: 10,
    notes: '그랜드볼룸 대형 컨벤션 & 웨딩'
  },
  {
    id: 'cap_banquet_rental',
    shopCode: 'SHOP_BANQUET_RENTAL',
    shopName: '연회 및 대관',
    category: 'BANQUET',
    categoryLabel: '대관',
    maxDailyUnits: 200,
    unitName: '명',
    baseUnitPrice: 1500000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 30,
    allowSpillover: true,
    spilloverPriority: 10,
    notes: '기업 세미나 및 부대시설 대관'
  },

  // 6. 🎢 레저본부 (LEISURE) - 15개 (익스트림 루지 휴장 제외)
  {
    id: 'cap_leisure_mt_kart',
    shopCode: 'SHOP_LEISURE_MT_KART',
    shopName: '마운틴카트',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 600,
    unitName: '명',
    baseUnitPrice: 15000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 2,
    notes: '마운틴코스 카트 주행'
  },
  {
    id: 'cap_leisure_sled',
    shopCode: 'SHOP_LEISURE_SLED',
    shopName: '사계절썰매장',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 1000,
    unitName: '명',
    baseUnitPrice: 12000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 2,
    notes: '슬로프 썰매 수용 인원'
  },
  {
    id: 'cap_leisure_marina',
    shopCode: 'SHOP_LEISURE_MARINA',
    shopName: '마리나 클럽',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 400,
    unitName: '명',
    baseUnitPrice: 25000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: true,
    spilloverPriority: 4,
    notes: '요트 & 보트 레저'
  },
  {
    id: 'cap_leisure_amusement',
    shopCode: 'SHOP_LEISURE_AMUSE',
    shopName: '놀이동산',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 1200,
    unitName: '명',
    baseUnitPrice: 10000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 3,
    notes: '어린이 놀이기구 탑승'
  },
  {
    id: 'cap_leisure_ranch',
    shopCode: 'SHOP_LEISURE_RANCH',
    shopName: '벨포레 목장',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 1500,
    unitName: '명',
    baseUnitPrice: 8000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 3,
    notes: '양떼목장 관람 입장'
  },
  {
    id: 'cap_leisure_ranch_exp',
    shopCode: 'SHOP_LEISURE_RANCH_EXP',
    shopName: '벨포레 목장(체험)',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 800,
    unitName: '명',
    baseUnitPrice: 10000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 3,
    notes: '먹이주기 및 승마체험'
  },
  {
    id: 'cap_leisure_zebra_cafe',
    shopCode: 'SHOP_LEISURE_ZEBRA',
    shopName: '얼룩말카페',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 500,
    unitName: '건',
    baseUnitPrice: 6500,
    allowPriceLeverage: true,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 4,
    notes: '목장 구역 테마 카페 (레저본부 귀속)'
  },
  {
    id: 'cap_leisure_dino',
    shopCode: 'SHOP_LEISURE_DINO',
    shopName: '디노 시네마',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 600,
    unitName: '명',
    baseUnitPrice: 9000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 4,
    notes: '공룡 테마 4D 영상관'
  },
  {
    id: 'cap_leisure_media_art',
    shopCode: 'SHOP_LEISURE_MEDIA_ART',
    shopName: '미디어아트센터',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 1500,
    unitName: '명',
    baseUnitPrice: 15000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 3,
    notes: '몰입형 미디어아트 전시관'
  },
  {
    id: 'cap_leisure_museum_cafe',
    shopCode: 'SHOP_LEISURE_MUS_CAFE',
    shopName: '미디어-뮤지엄카페',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 400,
    unitName: '건',
    baseUnitPrice: 7000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 4,
    notes: '미디어아트센터 내 카페 (레저본부 귀속)'
  },
  {
    id: 'cap_leisure_giftshop',
    shopCode: 'SHOP_LEISURE_GIFTSHOP',
    shopName: '미디어-기프트샵',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 300,
    unitName: '건',
    baseUnitPrice: 15000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 4,
    notes: '미디어아트 기념품샵 (레저본부 귀속)'
  },
  {
    id: 'cap_leisure_summerland',
    shopCode: 'SHOP_LEISURE_SUMMERLAND',
    shopName: '썸머랜드',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 1000,
    unitName: '명',
    baseUnitPrice: 25000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: true,
    spilloverPriority: 2,
    notes: '하계 워터파크 물놀이 시설'
  },
  {
    id: 'cap_leisure_wonderful',
    shopCode: 'SHOP_LEISURE_WONDERFUL',
    shopName: '원더풀',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 500,
    unitName: '명',
    baseUnitPrice: 15000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: true,
    spilloverPriority: 3,
    notes: '레저 테마파크 부대시설'
  },
  {
    id: 'cap_leisure_minigolf',
    shopCode: 'SHOP_LEISURE_MINIGOLF',
    shopName: '미니골프',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 300,
    unitName: '명',
    baseUnitPrice: 8000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 4,
    notes: '어린이 & 가족 파크골프'
  },
  {
    id: 'cap_leisure_swing',
    shopCode: 'SHOP_LEISURE_SWING',
    shopName: '회전그네',
    category: 'LEISURE',
    categoryLabel: '레저본부',
    maxDailyUnits: 400,
    unitName: '명',
    baseUnitPrice: 6000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 15,
    allowSpillover: true,
    spilloverPriority: 4,
    notes: '레저 익스트림 스윙 어트랙션'
  },

  // 7. 📦 독립 및 기타 분류 - 3개
  {
    id: 'cap_goods_belle',
    shopCode: 'SHOP_GOODS_BELLE',
    shopName: '벨포레 굿즈',
    category: 'OTHER',
    categoryLabel: '벨포레굿즈',
    maxDailyUnits: 300,
    unitName: '건',
    baseUnitPrice: 20000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 20,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '벨포레 공식 캐릭터 & 기념품 굿즈'
  },
  {
    id: 'cap_parking_ctrl',
    shopCode: 'SHOP_PARKING_CTRL',
    shopName: '주차관제',
    category: 'OTHER',
    categoryLabel: '주차관제',
    maxDailyUnits: 1500,
    unitName: '대',
    baseUnitPrice: 5000,
    allowPriceLeverage: false,
    maxPriceHikeRate: 10,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '리조트 단지 내 유료 주차'
  },
  {
    id: 'cap_promotion_event',
    shopCode: 'SHOP_PROMO_EVENT',
    shopName: '기획전 (벨포레 리조트)',
    category: 'OTHER',
    categoryLabel: '기타(PROMOTION)',
    maxDailyUnits: 500,
    unitName: '건',
    baseUnitPrice: 30000,
    allowPriceLeverage: true,
    maxPriceHikeRate: 25,
    allowSpillover: false,
    spilloverPriority: 99,
    notes: '온라인 특별 기획전 및 패키지 프로모션'
  }
];

export default function AdminCapacity() {
  const [items, setItems] = useState<FacilityCapacityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    loadCapacityMaster();
  }, []);

  const loadCapacityMaster = async () => {
    setLoading(true);
    try {
      // 1. Try Firebase Firestore
      try {
        const { db } = await import('../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'simulationMaster', 'facilityCapacities'));
        if (docSnap.exists() && Array.isArray(docSnap.data()?.items)) {
          const cleaned = docSnap.data().items.filter((item: any) => item.id !== 'cap_leisure_luge' && item.shopName !== '익스트림 루지');
          setItems(cleaned);
          setLoading(false);
          return;
        }
      } catch (fbErr) {
        console.warn('Firebase fetch skipped, checking localStorage cache:', fbErr);
      }

      // 2. Fallback to LocalStorage Cache
      const cached = localStorage.getItem('BELLEFORET_CAPACITY_MASTER_V2');
      if (cached) {
        const parsed = JSON.parse(cached);
        const cleaned = Array.isArray(parsed) ? parsed.filter((item: any) => item.id !== 'cap_leisure_luge' && item.shopName !== '익스트림 루지') : DEFAULT_CAPACITY_SEEDS;
        setItems(cleaned);
        localStorage.setItem('BELLEFORET_CAPACITY_MASTER_V2', JSON.stringify(cleaned));
      } else {
        // 3. Fallback to Initial Default Seeds (42개 공식 실운영 항목)
        setItems(DEFAULT_CAPACITY_SEEDS);
        localStorage.setItem('BELLEFORET_CAPACITY_MASTER_V2', JSON.stringify(DEFAULT_CAPACITY_SEEDS));
      }
    } catch (err) {
      console.error('Failed to load capacity master:', err);
      setItems(DEFAULT_CAPACITY_SEEDS);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (id: string, field: keyof FacilityCapacityItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // 1. Save to LocalStorage cache
      localStorage.setItem('BELLEFORET_CAPACITY_MASTER_V2', JSON.stringify(items));

      // 2. Save to Firebase Firestore
      try {
        const { db } = await import('../lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'simulationMaster', 'facilityCapacities'), {
          items,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin'
        });
      } catch (fbErr) {
        console.warn('Firebase sync warning (local cache preserved):', fbErr);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save capacity master:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('공식 43개 영업장 표준 캐파 설정값으로 초기화하시겠습니까?')) {
      setItems(DEFAULT_CAPACITY_SEEDS);
      localStorage.setItem('BELLEFORET_CAPACITY_MASTER_V2', JSON.stringify(DEFAULT_CAPACITY_SEEDS));
    }
  };

  const handleAddNewItem = () => {
    const newItem: FacilityCapacityItem = {
      id: `cap_custom_${Date.now()}`,
      shopCode: `SHOP_CUSTOM_${items.length + 1}`,
      shopName: '신규 영업장',
      category: 'LEISURE',
      categoryLabel: '레저본부',
      maxDailyUnits: 500,
      unitName: '명',
      baseUnitPrice: 20000,
      allowPriceLeverage: true,
      maxPriceHikeRate: 20,
      allowSpillover: true,
      spilloverPriority: 10,
      notes: '신규 추가 영업장'
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('해당 영업장의 캐파 설정을 삭제하시겠습니까?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const filteredItems = items.filter(item => {
    if (filterCategory === 'ALL') return true;
    return item.category === filterCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                영업장별 물리적 캐파(Capacity) 및 단가 마스터 관리
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  43개 공식 영업장 SSOT
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                목표 시뮬레이터가 역추산 시 적용할 <strong>43개 공식 영업장별 1일 최대 수용량(객실, 티타임, 탑승정원, 좌석수)과 단가 정책</strong>을 설정합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            공식 43개 기준 복구
          </button>
          <button
            onClick={handleAddNewItem}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            영업장 추가
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-xs ${
              saveSuccess 
                ? 'bg-emerald-600' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                저장 완료!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {saving ? '저장 중...' : '전체 캐파 마스터 저장'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-teal-50/50 to-slate-50 border border-indigo-100 text-xs text-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg mt-0.5 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm mb-0.5">
              💡 43개 영업장 캐파 제약 기반 역추산 규칙 (Capacity SSOT)
            </div>
            <div className="text-slate-600 leading-relaxed">
              1. <strong>객실(175실) & 골프(80팀):</strong> 수용량 100% 매진 시 ADR/그린피 단가 인상 목표로 자동 전환됩니다.<br/>
              2. <strong>얼룩말카페 / 미디어-기프트샵:</strong> 레저본부 귀속 / <strong>핏스탑:</strong> 모토아레나 귀속 / <strong>클럽-레스토랑:</strong> 골프 귀속 기준으로 연동됩니다.
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 pl-3 pr-2 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> 부문 필터:
        </span>
        {[
          { id: 'ALL', label: '전체 (43개)', icon: '🌐' },
          { id: 'ROOM', label: '객실', icon: '🏨' },
          { id: 'GOLF', label: '골프', icon: '⛳' },
          { id: 'LEISURE', label: '레저본부', icon: '🎢' },
          { id: 'MOTO', label: '모토아레나', icon: '🏎️' },
          { id: 'FNB', label: '식음', icon: '🍽️' },
          { id: 'BANQUET', label: '대관', icon: '🏛️' },
          { id: 'OTHER', label: '독립/기타', icon: '📦' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filterCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label} ({cat.id === 'ALL' ? items.length : items.filter(i => i.category === cat.id).length})
          </button>
        ))}
      </div>

      {/* Capacity Master Table */}
      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs animate-pulse">
            43개 공식 영업장 캐파 마스터 설정을 불러오는 중입니다...
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 min-w-[220px]">영업장명 (Facility Name)</th>
                <th className="py-3.5 px-4 min-w-[120px]">공식 시스템 분류</th>
                <th className="py-3.5 px-4 min-w-[140px]">1일 최대 캐파 (수용량)</th>
                <th className="py-3.5 px-4 min-w-[140px]">기준 평균단가 (원)</th>
                <th className="py-3.5 px-4 min-w-[120px] text-center">단가인상 허용</th>
                <th className="py-3.5 px-4 min-w-[120px] text-center">초과분 재배분</th>
                <th className="py-3.5 px-4 min-w-[220px]">비고 및 산출 근거</th>
                <th className="py-3.5 px-4 w-16 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-center font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  
                  {/* Shop Name */}
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <input
                      type="text"
                      value={item.shopName}
                      onChange={(e) => handleFieldChange(item.id, 'shopName', e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-indigo-500"
                    />
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    <select
                      value={item.category}
                      onChange={(e) => {
                        const cat = e.target.value as any;
                        const labels: Record<string, string> = {
                          ROOM: '객실', GOLF: '골프', LEISURE: '레저본부', MOTO: '모토아레나', FNB: '식음', BANQUET: '대관', OTHER: '독립/기타'
                        };
                        handleFieldChange(item.id, 'category', cat);
                        handleFieldChange(item.id, 'categoryLabel', labels[cat] || '기타');
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-700"
                    >
                      <option value="ROOM">🏨 객실</option>
                      <option value="GOLF">⛳ 골프</option>
                      <option value="LEISURE">🎢 레저본부</option>
                      <option value="MOTO">🏎️ 모토아레나</option>
                      <option value="FNB">🍽️ 식음</option>
                      <option value="BANQUET">🏛️ 대관</option>
                      <option value="OTHER">📦 독립/기타</option>
                    </select>
                  </td>

                  {/* Max Daily Units */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={item.maxDailyUnits}
                        onChange={(e) => handleFieldChange(item.id, 'maxDailyUnits', Number(e.target.value))}
                        className="w-20 px-2.5 py-1 rounded-lg border border-slate-200 font-black text-indigo-900 text-right tabular-nums focus:outline-indigo-500"
                      />
                      <input
                        type="text"
                        value={item.unitName}
                        onChange={(e) => handleFieldChange(item.id, 'unitName', e.target.value)}
                        className="w-12 px-1.5 py-1 rounded-lg border border-slate-200 text-center font-bold text-slate-600"
                        placeholder="단위"
                      />
                      <span className="text-slate-400 text-[11px]">/일</span>
                    </div>
                  </td>

                  {/* Base Unit Price */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-semibold">₩</span>
                      <input
                        type="number"
                        value={item.baseUnitPrice}
                        onChange={(e) => handleFieldChange(item.id, 'baseUnitPrice', Number(e.target.value))}
                        className="w-28 px-2.5 py-1 rounded-lg border border-slate-200 font-black text-slate-900 text-right tabular-nums focus:outline-indigo-500"
                      />
                    </div>
                  </td>

                  {/* Allow Price Leverage */}
                  <td className="py-3 px-4 text-center">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.allowPriceLeverage}
                        onChange={(e) => handleFieldChange(item.id, 'allowPriceLeverage', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`text-[11px] font-bold ${item.allowPriceLeverage ? 'text-teal-700' : 'text-slate-400'}`}>
                        {item.allowPriceLeverage ? '허용' : '고정'}
                      </span>
                    </label>
                  </td>

                  {/* Allow Spillover */}
                  <td className="py-3 px-4 text-center">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.allowSpillover}
                        onChange={(e) => handleFieldChange(item.id, 'allowSpillover', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`text-[11px] font-bold ${item.allowSpillover ? 'text-amber-700' : 'text-slate-400'}`}>
                        {item.allowSpillover ? '전이' : '제외'}
                      </span>
                    </label>
                  </td>

                  {/* Notes */}
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => handleFieldChange(item.id, 'notes', e.target.value)}
                      placeholder="캐파 근거 및 메모"
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-indigo-500"
                    />
                  </td>

                  {/* Delete Action */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="영업장 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
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
