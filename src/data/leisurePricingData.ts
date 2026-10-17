export interface RegularPriceItem {
  name: string;
  target?: string;
  priceWeekday: string;
  priceWeekend?: string;
  note?: string;
}

export interface DiscountPolicy {
  target: string;
  rate: string;
  discountPrice?: string;
  condition: string;
}

export interface LeisureFacilityPricing {
  id: string;
  name: string;
  category: 'racing' | 'farm' | 'play' | 'culture' | 'water' | 'package';
  categoryLabel: string;
  summary: string;
  representativePrice: string;
  operatingHours: string;
  breakTime?: string;
  closedDay?: string;
  location?: string;
  contact?: string;
  ageRequirement: string;
  discountBadges: string[];
  regularPrices: RegularPriceItem[];
  discounts: DiscountPolicy[];
  requirements: string[];
  notes: string[];
  cancellationPolicy?: string;
  officialUrl?: string;
}

export const LEISURE_CATEGORIES = [
  { key: 'all', label: '전체', icon: 'Sparkles', count: 12 },
  { key: 'racing', label: '육상·스피드', icon: 'Zap', count: 4 },
  { key: 'farm', label: '자연·동물교감', icon: 'Heart', count: 2 },
  { key: 'play', label: '놀이·테마파크', icon: 'Smile', count: 2 },
  { key: 'culture', label: '문화·전시', icon: 'Palette', count: 2 },
  { key: 'water', label: '수상·물놀이', icon: 'Waves', count: 2 },
  { key: 'package', label: '통합 패키지', icon: 'PackageCheck', count: 1 },
] as const;

export const LEISURE_FACILITIES: LeisureFacilityPricing[] = [
  {
    id: 'mountain-kart',
    name: '마운틴 카트',
    category: 'racing',
    categoryLabel: '육상·스피드',
    summary: '두타산 자연 경사로를 주행하는 약 3km 스릴 레이싱',
    representativePrice: '그랜드 30,000원 / 미니 5,000원',
    operatingHours: '하절기 10:00~18:00 / 동절기 10:00~17:00 (티켓마감: 마감 30분 전)',
    breakTime: '주중 12:30~13:30 / 주말 12:00~13:00',
    closedDay: '매주 월요일 휴장',
    contact: '043-926-1000',
    ageRequirement: '그랜드포렛: 키 150cm 이상 / 미니포렛: 단독 130cm 이상 (동반 85~129cm)',
    discountBadges: ['도민·군인 25%', '숙박객 25%', '회원 최대 50%'],
    regularPrices: [
      { name: '그랜드포렛 코스 (약 3km / 스릴)', priceWeekday: '30,000원', priceWeekend: '30,000원', note: '청소년·성인 스릴 코스 (주중/주말 동일)' },
      { name: '미니포렛 코스 (어린이 전용)', priceWeekday: '5,000원', priceWeekend: '5,000원', note: '일반/동반 동일 요금 (할인 적용 불가)' }
    ],
    discounts: [
      { target: '콘도 분양회원 (레드/화이트)', rate: '50% 할인', discountPrice: '15,000원', condition: '회원카드 실물 지참 필수 (그랜드포렛 기준)' },
      { target: '콘도 분양회원 (그린)', rate: '30% 할인', discountPrice: '21,000원', condition: '회원카드 실물 지참 필수 (그랜드포렛 기준)' },
      { target: '충북도민', rate: '25% 할인', discountPrice: '22,500원', condition: '주민등록상 충북 거주 신분증 제시' },
      { target: '37사단 군인', rate: '25% 할인', discountPrice: '22,500원', condition: '군인 신분증 또는 휴가증 제시' },
      { target: '콘도 숙박 고객', rate: '25% 할인', discountPrice: '22,500원', condition: '예약 문자 또는 입실 영수증 제시' }
    ],
    requirements: [
      '그랜드포렛: 키 150cm 이상 탑승 가능 (150cm 미만 탑승 불가)',
      '미니포렛: 단독 탑승 키 130cm 이상 / 보호자 동반 탑승 시 36개월 이상 & 85cm~129cm',
      '신발은 반드시 운동화 착용 (슬리퍼, 샌들, 하이힐 탑승 금지)',
      '헬멧 착용 필수(위생모 제공), 긴 머리는 단정히 묶고 주행',
      '주행 중 휴대폰, 카메라, 셀카봉 촬영 절대 금지'
    ],
    notes: [
      '전기고카트 최고 속도 30km/h 리미티드 제한 적용',
      '온라인 예매 고객은 탑승장에서 QR코드(바코드) 및 MMS 확인 후 입장 가능',
      '온라인 예매 티켓 당일 사용 가능 (구매 후 발권 대기 소요시간 발생 가능)',
      '물품보관함 무료 이용 가능 (썰매 매표소 옆 위치)'
    ],
    cancellationPolicy: '천재지변 및 회사 귀책 사유 외 단순 변심 환불 불가 / 사용 후 잔여 횟수 부분 취소 불가',
    officialUrl: 'https://belleforetresort.com/attraction/10'
  },
  {
    id: 'tubing-sled',
    name: '사계절 썰매장',
    category: 'racing',
    categoryLabel: '육상·스피드',
    summary: '튜브를 타고 슬로프를 미끄러져 내려오는 스릴 액티비티',
    representativePrice: '무제한 썰매 대인 20,000원~ (소인 10,000원~)',
    operatingHours: '하절기 10:00~18:00 / 동절기 10:00~17:00 (티켓마감: 마감 30분 전)',
    breakTime: '주중 12:30~13:30 / 주말 12:00~13:00',
    closedDay: '매주 월요일 휴장',
    ageRequirement: '단독 탑승: 키 130cm 이상 / 동반: 키 85~130cm 미만 (65세 미만 탑승 가능)',
    discountBadges: ['도민·군민 30%', '숙박객 최대 25%', '회원 최대 50%'],
    regularPrices: [
      { name: '무제한 썰매권 (대인 14세 이상)', priceWeekday: '20,000원', priceWeekend: '25,000원', note: '운영 마감 시간까지 자유 이용' },
      { name: '무제한 썰매권 (소인 4세~초6)', priceWeekday: '10,000원', priceWeekend: '15,000원', note: '소인권은 별도 할인 미적용' },
      { name: '1회 탑승권 (대인 14세 이상)', priceWeekday: '13,000원', priceWeekend: '17,000원', note: '단품 1회 주행' },
      { name: '1회 탑승권 (소인 4세~초6)', priceWeekday: '8,000원', priceWeekend: '13,000원', note: '단품 1회 주행' }
    ],
    discounts: [
      { target: '콘도 분양회원 (레드/화이트)', rate: '50% 할인', discountPrice: '주중 10,000원 / 주말 12,500원', condition: '무제한 대인 기준, 회원카드 지참' },
      { target: '콘도 분양회원 (그린)', rate: '30% 할인', discountPrice: '주중 14,000원 / 주말 17,500원', condition: '무제한 대인 기준, 회원카드 지참' },
      { target: '충북도민 / 증평군민', rate: '30% 할인', discountPrice: '주중 14,000원 / 주말 17,500원', condition: '무제한 대인 기준, 주소지 신분증 제시' },
      { target: '콘도 숙박 고객', rate: '약 25% 할인', discountPrice: '주중 15,000원 / 주말 19,000원', condition: '무제한 대인 기준, 객실 예약 내역 확인' },
      { target: '단체 (20인 이상)', rate: '사전 예약 우대', condition: '20인 이상 단체 방문 시 사전 예약 필수' }
    ],
    requirements: [
      '키 130cm 이상 / 65세 미만 단독 탑승 가능',
      '키 85cm ~ 130cm 미만은 반드시 보호자와 동반 탑승 (보호자도 티켓 구매 필요, 미성년자끼리 동반 불가)',
      '키 85cm 미만, 36개월 미만 영유아, 임산부 탑승 제한',
      '무빙워크 탑승 시 앞 사람과 4m 안전거리 유지 필수'
    ],
    notes: [
      '우천/우설 시 안전을 위하여 슬로프 중간 지점에서 운영될 수 있습니다.',
      '소인권은 현장/온라인 우대 할인 적용이 불가합니다.',
      '물품보관함 무료 이용 가능 (오락실 옆)'
    ],
    cancellationPolicy: '사용한 티켓 및 단순 변심 환불 불가 / 현장 환불 불가(온라인 예매 건은 온라인 판매처 환불 규정 준수)',
    officialUrl: 'https://belleforetresort.com/attraction/4'
  },
  {
    id: 'moto-arena-cart',
    name: '모토아레나 (레저 카트 & 서킷)',
    category: 'racing',
    categoryLabel: '육상·스피드',
    summary: '국내 유일 FIA CIK 국제공인 카트 레이싱 트랙에서 즐기는 모터스포츠',
    representativePrice: '1인승 43,000원 / 2인승 52,000원 (10분)',
    operatingHours: '10:00 ~ 18:00 (마지막 예매 가능시간: 17:10)',
    breakTime: '대관 및 경기 일정에 따라 유동적',
    closedDay: '연중무휴 (대관일정 사전 확인 권장)',
    contact: '043-926-1165 (매표소)',
    ageRequirement: '1인승: 신장 150cm 이상 / 2인승: 운전자 만 19세 이상 & 동승자 신장 100cm 이상',
    discountBadges: ['증평군민 10%', '숙박객 10%', '군부대 10~20%', '회원 10~50%'],
    regularPrices: [
      { name: '1인승 레저카트 (1회권 / 10분)', priceWeekday: '43,000원', priceWeekend: '43,000원', note: '1개 세션 약 10분 트랙 주행' },
      { name: '1인승 레저카트 (2회권 / 20분)', priceWeekday: '68,000원', priceWeekend: '68,000원', note: '2개 세션 각 10분씩 주행' },
      { name: '1인승 레저카트 (3회권 / 30분)', priceWeekday: '100,000원', priceWeekend: '100,000원', note: '3개 세션 각 10분씩 주행' },
      { name: '2인승 레저카트 (1회권 / 10분)', priceWeekday: '52,000원', priceWeekend: '52,000원', note: '보호자+동승자 2인 탑승' },
      { name: '2인승 레저카트 (2회권 / 20분)', priceWeekday: '82,000원', priceWeekend: '82,000원', note: '2개 세션 탑승' },
      { name: '2인승 레저카트 (3회권 / 30분)', priceWeekday: '124,000원', priceWeekend: '124,000원', note: '3개 세션 탑승' },
      { name: '카트 스쿨 (초급 레벨1 / 5시간)', priceWeekday: '400,000원', priceWeekend: '400,000원', note: '이론, 조작법, 서킷 주행, 장비 무료대여' },
      { name: '카트 스쿨 (중급 레벨2 / 5시간)', priceWeekday: '600,000원', priceWeekend: '600,000원', note: '안전심화, 짐카나, 레이싱카트 체험' },
      { name: '카트 스쿨 (고급 레벨3 / 6시간)', priceWeekday: '800,000원', priceWeekend: '800,000원', note: '레이싱 카트 심화 주행 및 기록 측정' },
      { name: '라이딩 스쿨 (입문 1일 / 6시간)', priceWeekday: '350,000원', priceWeekend: '350,000원', note: '모터사이클 입문자 (면허 불필요, 자전거 가능자)' },
      { name: 'BIMA 서킷 라이선스 발급비', priceWeekday: '100,000원', priceWeekend: '100,000원', note: '레이싱카트/바이크 서킷 주행 자격 (1년 유효)' }
    ],
    discounts: [
      { target: '증평군민', rate: '10% 할인', condition: '본인 신분증 제시' },
      { target: '콘도 숙박 고객', rate: '10% 할인', condition: '숙박 예약 문자 또는 영수증 제시 (숙박 기간 내)' },
      { target: 'MOU 협약 군부대', rate: '10~20% 할인', condition: '군 신분증 제시' },
      { target: '콘도 분양회원', rate: '10~50% 할인', condition: '본인 회원증 제시' }
    ],
    requirements: [
      '탑승 복장: 긴팔, 긴바지, 운동화 착용 필수 (슬리퍼, 샌들, 치마 착용 시 탑승 불가)',
      '풀페이스 헬멧 및 글러브 무료 대여',
      '교육 시간 이전 도착 필수 (교육 미참석 시 탑승 불가)',
      '티켓 1인 1매 발권 (다회권은 본인 외 가족/타인 양도 불가)'
    ],
    notes: [
      '국내 유일 FIA CIK-FIA 공식 인증 국제 카트 경기장',
      '시간 선택은 이용 당일 현장 모토아레나 프론트에서 지정합니다.',
      '우천 시에도 별도 공지가 없는 한 정상 운영됩니다.'
    ],
    cancellationPolicy: '교육 시간 이전 도착하지 못할 경우 시간 변경 및 환불 불가 / 단순 변심 환불 불가',
    officialUrl: 'https://belleforetresort.com/content/moto_cart'
  },
  {
    id: 'mini-golf',
    name: '미니 골프',
    category: 'racing',
    categoryLabel: '육상·스피드',
    summary: '온 가족이 함께 부담 없이 즐길 수 있는 재미있는 18홀 퍼팅 골프',
    representativePrice: '1인 12,000원 / 4인 40,000원',
    operatingHours: '하절기 10:00~18:00 / 동절기 10:00~17:00 (티켓마감: 운영 종료 2시간 전)',
    breakTime: '11:30~12:30',
    closedDay: '매주 월요일 휴장',
    contact: '043-926-1094',
    ageRequirement: '전 연령 이용 가능 (미취학 아동은 보호자 동반)',
    discountBadges: ['4인 패키지 8,000원 할인', '단체 25% 할인'],
    regularPrices: [
      { name: '1인 이용권 (18홀)', priceWeekday: '12,000원', priceWeekend: '12,000원', note: '퍼터 및 골프공 대여 포함' },
      { name: '4인 패키지 (18홀)', priceWeekday: '40,000원', priceWeekend: '40,000원', note: '4인 동반 시 1인당 10,000원 적용' },
      { name: '단체 이용권 (30인 이상)', priceWeekday: '9,000원', priceWeekend: '9,000원', note: '1인 기준 (25% 단체 할인)' }
    ],
    discounts: [
      { target: '4인 팀 할인', rate: '인당 2,000원 할인', discountPrice: '4인 40,000원', condition: '4인 팀 일괄 결제 시' },
      { target: '30인 이상 단체', rate: '25% 할인', discountPrice: '1인 9,000원', condition: '사전 유선 문의 및 단체 예약' }
    ],
    requirements: [
      '퍼터로 풀 스윙 절대 금지 (적발 시 즉시 퇴장 조치)',
      '코스 진입 시 연습 플레이 금지',
      '클럽 및 골프 볼 훼손/분실 시 배상 비용 발생'
    ],
    notes: [
      '플레이 중 우천으로 인한 홀별 부분 환불은 불가합니다.',
      '1번 홀 티샷 이후 단순 변심으로 인한 환불 불가'
    ],
    officialUrl: 'https://belleforetresort.com/attraction/2'
  },
  {
    id: 'belleforet-farm',
    name: '벨포레 목장 & 승마',
    category: 'farm',
    categoryLabel: '자연·동물교감',
    summary: '푸른 초원에서 펼쳐지는 보더콜리 양몰이 공연과 동물 교감 체험',
    representativePrice: '입장료 평일 8,000원 / 주말 10,000원 (대인)',
    operatingHours: '하절기 10:00~18:00 / 동절기 10:00~17:00 (주말 17:30 마감 / 마감 30분 전 매표마감)',
    closedDay: '연중무휴',
    contact: '043-926-1098',
    ageRequirement: '전 연령 입장 가능 (승마: 키 100~140cm & 몸무게 50kg 이하)',
    discountBadges: ['도민·군민 최대 50%', '숙박객 20%', '회원 최대 50%', '36개월 미만 무료'],
    regularPrices: [
      { name: '목장 입장권 (대인 평일)', priceWeekday: '8,000원', priceWeekend: '10,000원', note: '양몰이공연, 디노시네마, 리틀팜 관람 포함' },
      { name: '목장 입장권 (소인)', priceWeekday: '8,000원', priceWeekend: '8,000원', note: '소인은 주중/주말 동일 8,000원' },
      { name: '동물 먹이주기 체험 (바구니)', priceWeekday: '2,000원', priceWeekend: '2,000원', note: '양, 오리, 염소, 토끼 등 먹이주기' },
      { name: '승마 체험 (어린이 전용)', priceWeekday: '10,000원', priceWeekend: '10,000원', note: '주중 체험 시 얼룩말카페 음료 1잔 무료 제공' },
      { name: '아기동물마을 (리틀팜)', priceWeekday: '무료', priceWeekend: '무료', note: '목장 입장객 전원 무료 관람' },
      { name: '디노 시네마 (공룡 돔 영화관)', priceWeekday: '무료', priceWeekend: '무료', note: '목장 입장객 전원 무료 (20분 상영 / 매시 정각)' }
    ],
    discounts: [
      { target: '증평군민 / 등록 장애인', rate: '50% 할인', discountPrice: '평일 4,000원 / 주말 5,000원', condition: '본인 신분증 또는 복지카드 제시' },
      { target: '콘도 분양회원 (레드/화이트)', rate: '50% 할인', discountPrice: '평일 4,000원 / 주말 5,000원', condition: '회원카드 실물 지참' },
      { target: '콘도 분양회원 (그린) / 37사단 군인', rate: '30% 할인', discountPrice: '평일 5,600원 / 주말 7,000원', condition: '회원증 또는 군인 신분증 제시' },
      { target: '콘도 숙박 고객', rate: '20% 할인', discountPrice: '평일 6,400원 / 주말 8,000원', condition: '입실 확인 문자 또는 영수증 제시' },
      { target: '영유아 (36개월 미만)', rate: '무료 입장', discountPrice: '0원', condition: '주민등록등본 등 연령 증빙 지참 필수' }
    ],
    requirements: [
      '목장 내 반려동물 출입 불가 (리조트 내 펫포레 시설 이용 권장)',
      '승마 체험 기준: 키 100cm~140cm 및 몸무게 50kg 이하 어린이만 가능',
      '외부 음식물, 돗자리, 킥보드, 자전거 반입 금지'
    ],
    notes: [
      '양몰이 공연: 주중 11:30, 13:30, 15:30 / 주말 11:30, 13:30, 15:30, 16:30 (악천후 시 취소 가능)',
      '강아지 원반 공연: 주말 12:30, 14:30',
      '디노시네마: 11:00~16:00 매시 정각 상영 (목장 입장권 소지자 무료 입장)',
      '얼룩말 카페, 목장 어린이 놀이터, 수유실 완비'
    ],
    cancellationPolicy: '입장 후 및 사용한 티켓 교환/환불 불가 / 유효기간 경과 티켓 이용 불가',
    officialUrl: 'https://belleforetresort.com/attraction/7'
  },
  {
    id: 'amusement-park',
    name: '벨포레 놀이동산',
    category: 'play',
    categoryLabel: '놀이·테마파크',
    summary: '회전목마, 범퍼카, 킹바이킹, 회전그네 등 온 가족이 즐기는 놀이기구',
    representativePrice: '단품 5,000~6,000원 / 빅3 15,000원 / 빅5 25,000원',
    operatingHours: '하절기 10:00~18:00 / 동절기 10:00~17:00 (티켓마감: 운영 종료 30분 전)',
    breakTime: '11:30~12:30',
    closedDay: '매주 월요일 휴장',
    contact: '043-926-1094',
    ageRequirement: '기종별 신장 기준 상이 (100cm~140cm 이상)',
    discountBadges: ['빅3 / 빅5 회수권 통합 할인', '전 기종 자유 선택 탑승'],
    regularPrices: [
      { name: '회전목마 (1회권)', priceWeekday: '5,000원', priceWeekend: '5,000원', note: '100cm 이상 단독 탑승 (미만 보호자 동반)' },
      { name: '미니기차 (1회권)', priceWeekday: '5,000원', priceWeekend: '5,000원', note: '100cm 이상 단독 탑승' },
      { name: '범퍼카 (1회권)', priceWeekday: '6,000원', priceWeekend: '6,000원', note: '140cm 이상 단독 탑승 (4세 미만 탑승 불가)' },
      { name: '킹바이킹 (1회권)', priceWeekday: '6,000원', priceWeekend: '6,000원', note: '120cm 이상 단독 탑승 (4세 미만 탑승 불가)' },
      { name: '회전그네 (1회권)', priceWeekday: '6,000원', priceWeekend: '6,000원', note: '130cm 이상 탑승 가능 (65세 미만)' },
      { name: '슬라이딩카 (1회권)', priceWeekday: '6,000원', priceWeekend: '6,000원', note: '120cm 이상 단독 탑승 (4세 미만 탑승 불가)' },
      { name: '통합 3회권 (빅3)', priceWeekday: '15,000원', priceWeekend: '15,000원', note: '6종 기종 상관없이 3회 탑승 (개별 발권 대비 할인)' },
      { name: '통합 5회권 (빅5)', priceWeekday: '25,000원', priceWeekend: '25,000원', note: '6종 기종 상관없이 5회 탑승 (최대 할인 혜택)' }
    ],
    discounts: [
      { target: '빅3 통합회수권', rate: '최대 16% 할인 효과', discountPrice: '15,000원', condition: '단품 6,000원 기종 3회 탑승 시 18,000원 -> 15,000원' },
      { target: '빅5 통합회수권', rate: '최대 17% 할인 효과', discountPrice: '25,000원', condition: '단품 6,000원 기종 5회 탑승 시 30,000원 -> 25,000원' }
    ],
    requirements: [
      '티켓 1인 1매 기준 (보호자 동반 탑승 시 보호자도 티켓 구매 필요)',
      '36개월 미만 영유아도 탑승 시 티켓 구입 필요',
      '회전목마/미니기차: 100cm 이상 / 바이킹/슬라이딩카: 120cm 이상 / 범퍼카: 140cm 이상'
    ],
    notes: [
      '구입한 티켓은 구입 당일 본인만 이용 가능하며, 입장 후 환불 불가합니다.',
      '기상 악화 시 안전을 위하여 일부 기종의 운영이 일시 중단될 수 있습니다.'
    ],
    officialUrl: 'https://belleforetresort.com/attraction/1'
  },
  {
    id: 'media-art',
    name: '미디어아트센터 & 플레이존',
    category: 'culture',
    categoryLabel: '문화·전시',
    summary: '빛과 소리의 향연, 초대형 몰입형 전시관과 4D 라이더 & 키즈 플레이존',
    representativePrice: '성인 17,000원 / 청소년 13,000원 / 어린이 10,000원',
    operatingHours: '10:00 ~ 18:00 (입장 마감: 운영 종료 1시간 전)',
    closedDay: '연중무휴',
    contact: '043-926-1160',
    ageRequirement: '전 연령 관람 가능 (4D 라이더: 키 85cm 이상)',
    discountBadges: ['체험토큰 1개 무료증정', '지역주민 할인', '회원 최대 50%', '36개월 이하 무료'],
    regularPrices: [
      { name: '전시관 입장권 (성인 20세 이상)', priceWeekday: '17,000원', priceWeekend: '17,000원', note: '전시 1~8관 관람 + 체험 토큰 1개 무료 증정' },
      { name: '전시관 입장권 (청소년 14~19세)', priceWeekday: '13,000원', priceWeekend: '13,000원', note: '체험 토큰 1개 무료 증정' },
      { name: '전시관 입장권 (어린이 8~13세)', priceWeekday: '10,000원', priceWeekend: '10,000원', note: '체험 토큰 1개 무료 증정' },
      { name: '우대 할인 대상자 (아동·경로·군인 등)', priceWeekday: '8,000원', priceWeekend: '8,000원', note: '4~7세 아동, 65세 이상, 유공자, 장애인, 의무복무 군인' },
      { name: '플레이존 단독 이용권', priceWeekday: '5,000원', priceWeekend: '5,000원', note: '평일 현장 구매 전용 (키즈카페+VR+유아기차)' },
      { name: '영유아 (36개월 이하)', priceWeekday: '무료', priceWeekend: '무료', note: '증빙 지참 시 무료 입장' }
    ],
    discounts: [
      { target: '아동(4~7세) / 경로(65세~) / 군인 / 장애인 / 유공자', rate: '우대가 적용', discountPrice: '8,000원', condition: '현장 증빙 서류 확인 필수 (본인만 적용)' },
      { target: '지역 주민 우대 (증평군 및 인접면)', rate: '각 요금에서 2,000원 할인', condition: '증평군 / 청원구 북이면 / 진천 초평면 / 괴산 청안·사리면 / 음성 원남면 주민' },
      { target: '15인 이상 단체', rate: '각 요금에서 2,000원 할인', condition: '사전 예약 단체 방문 시' },
      { target: '콘도 분양회원 (레드/그린)', rate: '30% 할인', condition: '회원카드 지참' },
      { target: '콘도 분양회원 (화이트)', rate: '무기명 40% / 기명 50% 할인', condition: '회원카드 지참' }
    ],
    requirements: [
      '입장권 구매 고객에게 1인당 체험 토큰 1개 무료 증정 (VR체험, 애벌레기차, 회전컵 중 택1)',
      '4D 라이더 체험(6관 우주탐험선 블랙스톤): 키 85cm 이상 단독 탑승 가능',
      '미디어아트센터 이용 시 주차 할인 2시간 적용'
    ],
    notes: [
      '플레이존 단독 이용권(5,000원)은 평일 현장 발권만 가능하며 주말/공휴일은 혼잡도에 따라 제한될 수 있습니다.',
      '부대시설: 뮤지엄 카페, 벨포레 홀, 수유실 완비'
    ],
    officialUrl: 'https://belleforetresort.com/attraction/6'
  },
  {
    id: 'children-musical',
    name: '벨포레홀 어린이 공연 (뮤지컬 별주부전)',
    category: 'culture',
    categoryLabel: '문화·전시',
    summary: '토끼와 자라의 신나는 모험! 온 가족이 함께 즐기는 생동감 넘치는 어린이 뮤지컬',
    representativePrice: '정상가 12,000원 (숙박 10,000원 / 도민·회원 8,000원)',
    operatingHours: '매주 토요일 17:00 (러닝타임: 총 60분 - 공연 40분 + 포토타임 20분)',
    location: '벨포레홀 (미디어아트센터 뒤편, 103동 앞)',
    contact: '043-926-1160',
    ageRequirement: '전 연령 관람 가능 (36개월 미만 무료 입장)',
    discountBadges: ['도민·회원 33%', '숙박객 17%', '36개월 미만 무료'],
    regularPrices: [
      { name: '어린이 공연 입장권 (정상가)', priceWeekday: '12,000원', priceWeekend: '12,000원', note: '토요일 정기 공연 선착순 입장' },
      { name: '숙박 고객 우대가', priceWeekday: '10,000원', priceWeekend: '10,000원', note: '콘도 예약 내역 확인 (현장 구매)' },
      { name: '충북도민 우대가', priceWeekday: '8,000원', priceWeekend: '8,000원', note: '충북도민 신분증 제시 (현장 구매)' },
      { name: '콘도 분양회원 우대가', priceWeekday: '8,000원', priceWeekend: '8,000원', note: '회원 카드 제시 (현장 구매)' }
    ],
    discounts: [
      { target: '충북도민 / 분양회원', rate: '33% 할인', discountPrice: '8,000원', condition: '현장 증빙 서류 지참 필수' },
      { target: '콘도 투숙객', rate: '17% 할인', discountPrice: '10,000원', condition: '객실 예약 확인' },
      { target: '영유아 (36개월 미만)', rate: '무료 입장', discountPrice: '0원', condition: '의료보험증 또는 등본 지참 필수' }
    ],
    requirements: [
      '공연 입장은 선착순 자유석으로 진행됩니다.',
      '공연 중 사진/영상 촬영 및 음식물 반입 금지 (공연 종료 후 포토타임 진행)'
    ],
    notes: [
      '미디어아트센터 연계 패키지 및 패밀리 4종 패스 연계 구매 시 추가 할인 혜택 제공',
      '공연 관람 후 배우들과 함께하는 포토타임 20분 포함'
    ],
    cancellationPolicy: '공연일자 당일 단순 변심 취소/환불 불가 (당일 취소 불가 상품)',
    officialUrl: 'https://belleforetresort.com/attraction/16'
  },
  {
    id: 'marina-club',
    name: '마리나 클럽 (수상레저)',
    category: 'water',
    categoryLabel: '수상·물놀이',
    summary: '원남호의 수려한 호수를 질주하는 제트보트, 스피드보트 및 오리배',
    representativePrice: '제트보트 25,000원 / 스피드보트 23,000원 / 오리배 30,000원~',
    operatingHours: '4월~11월 수~일 10:00~18:00 (매표마감: 17:30)',
    breakTime: '주중 12:30~13:30 / 주말 12:00~13:00',
    closedDay: '매주 월, 화요일 휴장 (동절기 12~3월 휴장)',
    contact: '043-926-1097',
    ageRequirement: '제트보트: 만 7세~65세 / 스피드보트: 36개월 이상 / 오리배: 전연령',
    discountBadges: ['도민·숙박객 10%', '워터파크 연계 특가 15,000원', '회원 최대 50%'],
    regularPrices: [
      { name: '제트보트 (소요시간 약 7분)', priceWeekday: '25,000원', priceWeekend: '25,000원', note: '대인/소인 동일 요금 (짜릿한 360도 회전)' },
      { name: '스피드보트 (소요시간 약 10분)', priceWeekday: '23,000원', priceWeekend: '23,000원', note: '대인/소인 동일 요금 (호수 쾌속 질주)' },
      { name: '2인용 오리배 (30분)', priceWeekday: '30,000원', priceWeekend: '30,000원', note: '36개월 미만 유아도 탑승 인원 포함' },
      { name: '4인용 오리배 (30분)', priceWeekday: '35,000원', priceWeekend: '35,000원', note: '가족형 전동/페달 오리배' }
    ],
    discounts: [
      { target: '썸머랜드 / 원더풀 이용 고객', rate: '특별 우대가', discountPrice: '제트/스피드 1인 15,000원', condition: '워터파크 영수증 지참 시 파격 할인' },
      { target: '콘도 분양회원 (레드/화이트)', rate: '50% 할인', discountPrice: '제트보트 12,500원', condition: '제트보트 한정, 회원카드 실물 확인' },
      { target: '콘도 분양회원 (그린)', rate: '30% 할인', discountPrice: '제트보트 17,500원', condition: '제트보트 한정, 회원카드 실물 확인' },
      { target: '충청도민 / 숙박객 / 군인', rate: '10% 할인', discountPrice: '제트 22,500원 / 스피드 20,700원', condition: '신분증 또는 숙박 내역 확인' }
    ],
    requirements: [
      '구명조끼 착용 의무 (계류장 내 필수)',
      '보험 규정에 따라 제트보트는 만 7세 이상~만 65세 이하만 탑승 가능',
      '제트보트는 물이 많이 튀므로 여벌 옷 또는 방수 의류 준비 권장',
      '오리배는 기타 할인 적용 제외'
    ],
    notes: [
      '보트 최소 출항 인원: 4명 이상 (4인 미만 시 최대 20분 대기 후 합승 탑승)',
      '부대시설: 샤워장, 실외 화장실 구비'
    ],
    cancellationPolicy: '천재지변 외 단순 변심 환불 불가 / 사용 후 잔여 부분 환불 불가',
    officialUrl: 'https://belleforetresort.com/travel/11'
  },
  {
    id: 'waterpark',
    name: '워터파크 (원더풀 인피니티풀 & 썸머랜드)',
    category: 'water',
    categoryLabel: '수상·물놀이',
    summary: '산과 호수가 내려다보이는 감성 인피니티 풀 원더풀과 가족형 워터슬라이드 썸머랜드',
    representativePrice: '원더풀 썬베드 패키지 50,000원~ / 썸머랜드 대인 30,000원 (소인 22,000원)',
    operatingHours: '원더풀 14:00~22:00 (2부 주간/3부 야간) / 썸머랜드 10:00~18:00',
    breakTime: '원더풀 17:00~18:00 / 썸머랜드 12:00~13:00 (수질정비)',
    closedDay: '하절기 시즌 한정 운영 (7월~8월 집중 운영)',
    contact: '043-926-1026 (원더풀) / 043-926-1170 (썸머랜드)',
    ageRequirement: '전 연령 이용 가능 (어린이는 보호자 동반 및 구명조끼 필수)',
    discountBadges: ['회원·군민 50%', '도민·숙박 30%', '보트 연계 15,000원 특가'],
    regularPrices: [
      { name: '원더풀 썬베드 패키지 (1인)', priceWeekday: '50,000원', priceWeekend: '50,000원', note: '입장권 + 사물함 제공' },
      { name: '원더풀 카바나 패키지 (기준 2인 / 최대 3인)', priceWeekday: '110,000원', priceWeekend: '110,000원', note: '입장권 + 토트백 제공 (인원추가 소인 20,000원)' },
      { name: '원더풀 프라이빗 자쿠지 패키지 (2인)', priceWeekday: '110,000원', priceWeekend: '110,000원', note: '입장권 + 자쿠지 전용공간 + 토트백' },
      { name: '원더풀 파고라 패키지 (기준 4인 / 최대 8인)', priceWeekday: '220,000원', priceWeekend: '220,000원', note: '입장권 + 토트백 2개 제공 (인원추가 인당 40,000원)' },
      { name: '썸머랜드 입장권 (대인 14세 이상)', priceWeekday: '30,000원', priceWeekend: '30,000원', note: '야외 수영장 및 워터슬라이드 이용' },
      { name: '썸머랜드 입장권 (소인 36개월~13세)', priceWeekday: '22,000원', priceWeekend: '22,000원', note: '36개월 미만 무료 입장' },
      { name: '썸머랜드 썬베드 패키지', priceWeekday: '40,000원', priceWeekend: '40,000원', note: '썬베드 2개 + 테이블 1개 + 파라솔 1개' }
    ],
    discounts: [
      { target: '콘도 분양회원 (레드/화이트)', rate: '50% 할인', condition: '원더풀 썬베드 및 썸머랜드 입장권 50% 할인' },
      { target: '증평군민', rate: '50% 할인', condition: '썸머랜드 대인 15,000원 / 소인 11,000원' },
      { target: '충북도민 / 콘도 투숙객', rate: '30% 할인', condition: '썸머랜드 대인 21,000원 / 소인 15,400원' },
      { target: '마리나클럽 연계 특전', rate: '보트 15,000원 특가', condition: '워터파크 영수증 지참 시 제트/스피드보트 1인 15,000원 이용 가능' }
    ],
    requirements: [
      '수영복(래시가드) 및 수영모(캡모자 가능) 착용 필수',
      '신발은 아쿠아슈즈, 샌들 또는 맨발만 허용 (운동화/구두 착용 불가)',
      '130cm 미만 어린이는 구명조끼 착용 의무'
    ],
    notes: [
      '원더풀은 벨포레 홈페이지/앱 사전 예약 필수 (현장 접수 불가)',
      '렌탈 요금: 비치타월 6,000원 / 세면타월 3,000원 / 구명조끼 5,000원'
    ],
    cancellationPolicy: '당일 취소 및 노쇼 시 환불 불가',
    officialUrl: 'https://belleforetresort.com/travel/7'
  },
  {
    id: 'pet-foret',
    name: '펫포레 (반려견 운동장)',
    category: 'play',
    categoryLabel: '놀이·테마파크',
    summary: '1,090평 대형견 전용 천연잔디 운동장 & 펫룸 고객 전용 놀이터',
    representativePrice: '단독 대여 100,000원 (4시간) / 펫룸 투숙객 무료',
    operatingHours: '10:00 ~ 18:00 (오전타임 10~14시 / 오후타임 14~18시)',
    closedDay: '연중무휴',
    contact: '043-926-1098',
    ageRequirement: '반려견 동반 고객 (동물등록 완료견에 한함)',
    discountBadges: ['펫룸 투숙객 전용운동장 무료', '프라이빗 단독 대여'],
    regularPrices: [
      { name: '운동장 대여 (오전 타임 10:00~14:00)', priceWeekday: '100,000원', priceWeekend: '100,000원', note: '한 타임 1팀 단독 프라이빗 대관 (4시간)' },
      { name: '운동장 대여 (오후 타임 14:00~18:00)', priceWeekday: '100,000원', priceWeekend: '100,000원', note: '한 타임 1팀 단독 프라이빗 대관 (4시간)' },
      { name: '펫룸 투숙객 전용 놀이터', priceWeekday: '무료', priceWeekend: '무료', note: '펫룸 객실 이용객 전용 운동장 상시 무료' }
    ],
    discounts: [
      { target: '펫룸 투숙 고객', rate: '100% 무료', discountPrice: '0원', condition: '펫룸 전용 놀이터 무료 이용 (대여공간은 별도 유료)' }
    ],
    requirements: [
      '보호자가 직접 반려견 관리 및 배변 처리 필수',
      '맹견 및 전염성 질환이 있는 반려견 출입 불가',
      '동물등록 완료 확인 필수'
    ],
    notes: [
      '1,090평 규모의 대형견 전용 천연잔디 놀이터',
      '반려견 모임, 생일파티, 동호회 행사 프라이빗 대관 가능'
    ],
    cancellationPolicy: '이용일 1일 전까지 무료 취소 가능 / 당일 취소 및 환불 불가',
    officialUrl: 'https://belleforetresort.com/travel/8'
  },
  {
    id: 'integrated-package',
    name: '공식 온라인 통합 할인 패키지',
    category: 'package',
    categoryLabel: '통합 패키지',
    summary: '벨포레 핵심 어트랙션을 묶어 최대 45% 할인 혜택을 제공하는 온라인 전용 패스',
    representativePrice: '패밀리 4종 대인 49,000원 / 올데이 5종 대인 59,000원',
    operatingHours: '어트랙션별 운영시간 준수',
    closedDay: '어트랙션별 상이 (월요일 일부 휴장)',
    contact: '1566-0162',
    ageRequirement: '대인(14세 이상) / 소인(36개월~초6)',
    discountBadges: ['온라인 전용 최대 45% 할인', '모바일 바코드 즉시입장'],
    regularPrices: [
      { name: '패밀리 올데이 5종 패스 (대인)', priceWeekday: '59,000원', priceWeekend: '59,000원', note: '정상가 107,000원 -> 45% 할인 (목장+썰매+카트+미디어+놀이동산)' },
      { name: '패밀리 올데이 5종 패스 (소인)', priceWeekday: '35,000원', priceWeekend: '35,000원', note: '정상가 61,000원 -> 43% 할인' },
      { name: '패밀리 4종 패스 (대인 14세 이상)', priceWeekday: '49,000원', priceWeekend: '49,000원', note: '정상가 82,000원 -> 40% 할인 (목장+썰매+미디어+놀이동산)' },
      { name: '패밀리 4종 패스 (소인 36개월~초6)', priceWeekday: '23,000원', priceWeekend: '23,000원', note: '정상가 36,000원 -> 36% 할인' },
      { name: '패밀리 4종 패스 + 어린이공연 PKG (소인)', priceWeekday: '30,000원', priceWeekend: '30,000원', note: '정상가 48,000원 -> 38% 할인' },
      { name: '미디어아트센터 + 어린이공연 PKG (성인)', priceWeekday: '22,000원', priceWeekend: '22,000원', note: '정상가 29,000원 -> 24% 할인' },
      { name: '미디어아트센터 + 어린이공연 PKG (청소년)', priceWeekday: '18,000원', priceWeekend: '18,000원', note: '정상가 25,000원 -> 28% 할인' },
      { name: '미디어아트센터 + 어린이공연 PKG (어린이)', priceWeekday: '15,000원', priceWeekend: '15,000원', note: '정상가 22,000원 -> 32% 할인' }
    ],
    discounts: [
      { target: '온라인 사전 예매', rate: '최대 45% 할인', condition: '벨포레 공식 앱 또는 웹사이트 티켓구매 메뉴에서 온라인 예매 시' },
      { target: 'QR 모바일 바코드', rate: '신속 입장', condition: '매표소 대기 없이 각 시설 검표소에서 QR코드 확인 후 바로 입장' }
    ],
    requirements: [
      '구매일로부터 유효기간(통상 30일 이내) 내 사용 가능',
      '패키지 티켓은 일부 사용 시 부분 취소/환불이 불가합니다.'
    ],
    notes: [
      '온라인 예매 티켓은 구매 당일에도 사용 가능합니다 (발권 확인 소요시간 일부 발생 가능).',
      '각 시설별 기상 상황 및 안전 점검에 따라 운영 일정이 변경될 수 있습니다.'
    ],
    cancellationPolicy: '미사용 티켓은 유효기간 내 온라인 구매처를 통해 100% 취소 가능 (부분 사용 시 환불 불가)',
    officialUrl: 'https://belleforetresort.com/app/ticket/ticketList'
  }
];
