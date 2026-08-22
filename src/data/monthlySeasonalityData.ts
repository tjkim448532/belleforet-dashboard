// 백엔드 mat_v6_data_mart_revenue 표준 영업장 기반 2025년 월별 실측 계절성 SSOT
export interface MonthlyFacilityShare {
  venueName: string;
  categoryCode: string;
  netRevenue: number;
  shareRatio: number;
}

export interface MonthSeasonalityMeta {
  month: number;
  days: number;
  totalRevenue: number;
  trevpar: number;
  divisionShares: {
    ROOM: number;
    GOLF: number;
    FNB: number;
    LEISURE: number;
    MOTO: number;
    BANQUET: number;
    OTHER: number;
  };
  facilities: MonthlyFacilityShare[];
}

export const ANNUAL_BASELINE_META = {
  totalRevenue: 26334667152,
  trevpar: 412284,
  days: 365
};

export const MONTHLY_SEASONALITY_DATA: Record<number, MonthSeasonalityMeta> = {
  "1": {
    "month": 1,
    "days": 31,
    "totalRevenue": 1001006783,
    "trevpar": 184517,
    "divisionShares": {
      "ROOM": 0.2963,
      "GOLF": 0.1825,
      "FNB": 0.2642,
      "LEISURE": 0.1199,
      "MOTO": 0.0343,
      "BANQUET": 0.0182,
      "OTHER": 0.0847
    },
    "facilities": [
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 292815660,
        "shareRatio": 0.2925
      },
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 153568000,
        "shareRatio": 0.1534
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 94477455,
        "shareRatio": 0.0944
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 77096364,
        "shareRatio": 0.077
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 59219691,
        "shareRatio": 0.0592
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 36892745,
        "shareRatio": 0.0369
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 35740091,
        "shareRatio": 0.0357
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 32931173,
        "shareRatio": 0.0329
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 29527727,
        "shareRatio": 0.0295
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 27208864,
        "shareRatio": 0.0272
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 25739336,
        "shareRatio": 0.0257
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 19864545,
        "shareRatio": 0.0198
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 19097273,
        "shareRatio": 0.0191
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 18175273,
        "shareRatio": 0.0182
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 16690909,
        "shareRatio": 0.0167
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 15750364,
        "shareRatio": 0.0157
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 9225455,
        "shareRatio": 0.0092
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 6533182,
        "shareRatio": 0.0065
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 6500909,
        "shareRatio": 0.0065
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 5454545,
        "shareRatio": 0.0054
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 5151682,
        "shareRatio": 0.0051
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 4832727,
        "shareRatio": 0.0048
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 3737268,
        "shareRatio": 0.0037
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 1880909,
        "shareRatio": 0.0019
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1467364,
        "shareRatio": 0.0015
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 1427273,
        "shareRatio": 0.0014
      }
    ]
  },
  "2": {
    "month": 2,
    "days": 28,
    "totalRevenue": 826766243,
    "trevpar": 168728,
    "divisionShares": {
      "ROOM": 0.275,
      "GOLF": 0.1576,
      "FNB": 0.29,
      "LEISURE": 0.1249,
      "MOTO": 0.0361,
      "BANQUET": 0.034,
      "OTHER": 0.0825
    },
    "facilities": [
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 221750905,
        "shareRatio": 0.2682
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 109924091,
        "shareRatio": 0.133
      },
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 108386800,
        "shareRatio": 0.1311
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 59084911,
        "shareRatio": 0.0715
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 42827036,
        "shareRatio": 0.0518
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 31734091,
        "shareRatio": 0.0384
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 30127118,
        "shareRatio": 0.0364
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 29063182,
        "shareRatio": 0.0352
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 28110909,
        "shareRatio": 0.034
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 25297000,
        "shareRatio": 0.0306
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 22795409,
        "shareRatio": 0.0276
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 19474364,
        "shareRatio": 0.0236
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 15200909,
        "shareRatio": 0.0184
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 12771818,
        "shareRatio": 0.0154
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 12587273,
        "shareRatio": 0.0152
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 12478182,
        "shareRatio": 0.0151
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 9101818,
        "shareRatio": 0.011
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 8436182,
        "shareRatio": 0.0102
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 6639591,
        "shareRatio": 0.008
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 5628199,
        "shareRatio": 0.0068
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 4932727,
        "shareRatio": 0.006
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 3625000,
        "shareRatio": 0.0044
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 2675455,
        "shareRatio": 0.0032
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 1975091,
        "shareRatio": 0.0024
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1342727,
        "shareRatio": 0.0016
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 795455,
        "shareRatio": 0.001
      }
    ]
  },
  "3": {
    "month": 3,
    "days": 31,
    "totalRevenue": 1710296477,
    "trevpar": 315262,
    "divisionShares": {
      "ROOM": 0.1593,
      "GOLF": 0.4655,
      "FNB": 0.1763,
      "LEISURE": 0.0924,
      "MOTO": 0.0356,
      "BANQUET": 0.0176,
      "OTHER": 0.0532
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 726309300,
        "shareRatio": 0.4247
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 260586390,
        "shareRatio": 0.1524
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 118596455,
        "shareRatio": 0.0693
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 75127820,
        "shareRatio": 0.0439
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 59056164,
        "shareRatio": 0.0345
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 54506364,
        "shareRatio": 0.0319
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 49710000,
        "shareRatio": 0.0291
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 35750500,
        "shareRatio": 0.0209
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 35482182,
        "shareRatio": 0.0207
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 35150909,
        "shareRatio": 0.0206
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 34706182,
        "shareRatio": 0.0203
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 32703545,
        "shareRatio": 0.0191
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 30562218,
        "shareRatio": 0.0179
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 30463818,
        "shareRatio": 0.0178
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 30130455,
        "shareRatio": 0.0176
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 15281818,
        "shareRatio": 0.0089
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 12573636,
        "shareRatio": 0.0074
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 12371818,
        "shareRatio": 0.0072
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 11805495,
        "shareRatio": 0.0069
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 10434455,
        "shareRatio": 0.0061
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 9835455,
        "shareRatio": 0.0058
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 8702727,
        "shareRatio": 0.0051
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 7683773,
        "shareRatio": 0.0045
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 6286364,
        "shareRatio": 0.0037
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 2604545,
        "shareRatio": 0.0015
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 1688636,
        "shareRatio": 0.001
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1667727,
        "shareRatio": 0.001
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 377273,
        "shareRatio": 0.0002
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 140455,
        "shareRatio": 0.0001
      }
    ]
  },
  "4": {
    "month": 4,
    "days": 30,
    "totalRevenue": 2230803765,
    "trevpar": 424915,
    "divisionShares": {
      "ROOM": 0.1443,
      "GOLF": 0.5039,
      "FNB": 0.1834,
      "LEISURE": 0.0706,
      "MOTO": 0.0253,
      "BANQUET": 0.0194,
      "OTHER": 0.053
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 1030936080,
        "shareRatio": 0.4621
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 314934221,
        "shareRatio": 0.1412
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 154927855,
        "shareRatio": 0.0694
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 92034545,
        "shareRatio": 0.0413
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 70913275,
        "shareRatio": 0.0318
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 67967550,
        "shareRatio": 0.0305
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 53929545,
        "shareRatio": 0.0242
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 52336364,
        "shareRatio": 0.0235
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 48063000,
        "shareRatio": 0.0215
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 43063636,
        "shareRatio": 0.0193
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 42067500,
        "shareRatio": 0.0189
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 40891818,
        "shareRatio": 0.0183
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 37106273,
        "shareRatio": 0.0166
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 26466727,
        "shareRatio": 0.0119
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 24213182,
        "shareRatio": 0.0109
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 23548182,
        "shareRatio": 0.0106
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 16186818,
        "shareRatio": 0.0073
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 15611818,
        "shareRatio": 0.007
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 15163636,
        "shareRatio": 0.0068
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 13565455,
        "shareRatio": 0.0061
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 10263091,
        "shareRatio": 0.0046
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 9340909,
        "shareRatio": 0.0042
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 8226364,
        "shareRatio": 0.0037
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 6915285,
        "shareRatio": 0.0031
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 5565455,
        "shareRatio": 0.0025
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 2850909,
        "shareRatio": 0.0013
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1395818,
        "shareRatio": 0.0006
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 1254636,
        "shareRatio": 0.0006
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 955455,
        "shareRatio": 0.0004
      },
      {
        "venueName": "벨포레홀",
        "categoryCode": "BANQUET",
        "netRevenue": 108364,
        "shareRatio": 0
      }
    ]
  },
  "5": {
    "month": 5,
    "days": 31,
    "totalRevenue": 3034795445,
    "trevpar": 559409,
    "divisionShares": {
      "ROOM": 0.1408,
      "GOLF": 0.4786,
      "FNB": 0.1746,
      "LEISURE": 0.106,
      "MOTO": 0.0412,
      "BANQUET": 0.011,
      "OTHER": 0.0478
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 1346792100,
        "shareRatio": 0.4438
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 416122134,
        "shareRatio": 0.1371
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 180175727,
        "shareRatio": 0.0594
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 146712727,
        "shareRatio": 0.0483
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 112407727,
        "shareRatio": 0.037
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 97307182,
        "shareRatio": 0.0321
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 91816309,
        "shareRatio": 0.0303
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 66072571,
        "shareRatio": 0.0218
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 63843636,
        "shareRatio": 0.021
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 53776818,
        "shareRatio": 0.0177
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 52842909,
        "shareRatio": 0.0174
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 51154255,
        "shareRatio": 0.0169
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 42146909,
        "shareRatio": 0.0139
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 41927273,
        "shareRatio": 0.0138
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 37622273,
        "shareRatio": 0.0124
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 35155364,
        "shareRatio": 0.0116
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 31142318,
        "shareRatio": 0.0103
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 29086364,
        "shareRatio": 0.0096
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 22754545,
        "shareRatio": 0.0075
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 20495000,
        "shareRatio": 0.0068
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 20088182,
        "shareRatio": 0.0066
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 18429091,
        "shareRatio": 0.0061
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 13859818,
        "shareRatio": 0.0046
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 13406864,
        "shareRatio": 0.0044
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 11198986,
        "shareRatio": 0.0037
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 7324545,
        "shareRatio": 0.0024
      },
      {
        "venueName": "벨포레홀",
        "categoryCode": "BANQUET",
        "netRevenue": 4145455,
        "shareRatio": 0.0014
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 3571909,
        "shareRatio": 0.0012
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 2193727,
        "shareRatio": 0.0007
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 1222727,
        "shareRatio": 0.0004
      }
    ]
  },
  "6": {
    "month": 6,
    "days": 30,
    "totalRevenue": 2834121629,
    "trevpar": 539833,
    "divisionShares": {
      "ROOM": 0.1467,
      "GOLF": 0.4944,
      "FNB": 0.1665,
      "LEISURE": 0.0879,
      "MOTO": 0.0413,
      "BANQUET": 0.0111,
      "OTHER": 0.0521
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 1298269364,
        "shareRatio": 0.4581
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 411149323,
        "shareRatio": 0.1451
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 154492364,
        "shareRatio": 0.0545
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 150819091,
        "shareRatio": 0.0532
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 82309609,
        "shareRatio": 0.029
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 77954077,
        "shareRatio": 0.0275
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 68819545,
        "shareRatio": 0.0243
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 65068182,
        "shareRatio": 0.023
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 58206280,
        "shareRatio": 0.0205
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 52120491,
        "shareRatio": 0.0184
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 46610082,
        "shareRatio": 0.0164
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 43892273,
        "shareRatio": 0.0155
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 37921636,
        "shareRatio": 0.0134
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 32113909,
        "shareRatio": 0.0113
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 31409091,
        "shareRatio": 0.0111
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 29097273,
        "shareRatio": 0.0103
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 26513182,
        "shareRatio": 0.0094
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 26136818,
        "shareRatio": 0.0092
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 23775455,
        "shareRatio": 0.0084
      },
      {
        "venueName": "썸머랜드",
        "categoryCode": "TICKET",
        "netRevenue": 21108909,
        "shareRatio": 0.0074
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 18515455,
        "shareRatio": 0.0065
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 16051000,
        "shareRatio": 0.0057
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 14446364,
        "shareRatio": 0.0051
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 14192773,
        "shareRatio": 0.005
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 11039091,
        "shareRatio": 0.0039
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 8517273,
        "shareRatio": 0.003
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 4595358,
        "shareRatio": 0.0016
      },
      {
        "venueName": "원더풀",
        "categoryCode": "TICKET",
        "netRevenue": 2853636,
        "shareRatio": 0.001
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 2592364,
        "shareRatio": 0.0009
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1547727,
        "shareRatio": 0.0005
      },
      {
        "venueName": "주차관제",
        "categoryCode": "PARKING",
        "netRevenue": 1314545,
        "shareRatio": 0.0005
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 605455,
        "shareRatio": 0.0002
      },
      {
        "venueName": "마리나 클럽",
        "categoryCode": "TICKET",
        "netRevenue": 63636,
        "shareRatio": 0
      }
    ]
  },
  "7": {
    "month": 7,
    "days": 31,
    "totalRevenue": 2494143742,
    "trevpar": 459750,
    "divisionShares": {
      "ROOM": 0.2156,
      "GOLF": 0.4062,
      "FNB": 0.1731,
      "LEISURE": 0.1009,
      "MOTO": 0.0333,
      "BANQUET": 0.0147,
      "OTHER": 0.0562
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 926732000,
        "shareRatio": 0.3716
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 532082692,
        "shareRatio": 0.2133
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 138189091,
        "shareRatio": 0.0554
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 125035491,
        "shareRatio": 0.0501
      },
      {
        "venueName": "썸머랜드",
        "categoryCode": "TICKET",
        "netRevenue": 101680455,
        "shareRatio": 0.0408
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 99114623,
        "shareRatio": 0.0397
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 62133700,
        "shareRatio": 0.0249
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 60549909,
        "shareRatio": 0.0243
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 57819091,
        "shareRatio": 0.0232
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 56067509,
        "shareRatio": 0.0225
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 40986364,
        "shareRatio": 0.0164
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 36679455,
        "shareRatio": 0.0147
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 31270909,
        "shareRatio": 0.0125
      },
      {
        "venueName": "원더풀",
        "categoryCode": "TICKET",
        "netRevenue": 30649182,
        "shareRatio": 0.0123
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 28613636,
        "shareRatio": 0.0115
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 21939818,
        "shareRatio": 0.0088
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 21017273,
        "shareRatio": 0.0084
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 18127727,
        "shareRatio": 0.0073
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 17763636,
        "shareRatio": 0.0071
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 14893182,
        "shareRatio": 0.006
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 14216364,
        "shareRatio": 0.0057
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 10406273,
        "shareRatio": 0.0042
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 9313000,
        "shareRatio": 0.0037
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 7656364,
        "shareRatio": 0.0031
      },
      {
        "venueName": "마리나 클럽",
        "categoryCode": "TICKET",
        "netRevenue": 6587727,
        "shareRatio": 0.0026
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 5596182,
        "shareRatio": 0.0022
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 4518182,
        "shareRatio": 0.0018
      },
      {
        "venueName": "주차관제",
        "categoryCode": "PARKING",
        "netRevenue": 4358182,
        "shareRatio": 0.0017
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 2910909,
        "shareRatio": 0.0012
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 2707818,
        "shareRatio": 0.0011
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 2429273,
        "shareRatio": 0.001
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1676818,
        "shareRatio": 0.0007
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 420909,
        "shareRatio": 0.0002
      }
    ]
  },
  "8": {
    "month": 8,
    "days": 31,
    "totalRevenue": 2769815198,
    "trevpar": 510565,
    "divisionShares": {
      "ROOM": 0.2126,
      "GOLF": 0.3672,
      "FNB": 0.1849,
      "LEISURE": 0.1113,
      "MOTO": 0.0574,
      "BANQUET": 0.0114,
      "OTHER": 0.0551
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 936719100,
        "shareRatio": 0.3382
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 583288536,
        "shareRatio": 0.2106
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 152926455,
        "shareRatio": 0.0552
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 147286364,
        "shareRatio": 0.0532
      },
      {
        "venueName": "썸머랜드",
        "categoryCode": "TICKET",
        "netRevenue": 123470000,
        "shareRatio": 0.0446
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 112780727,
        "shareRatio": 0.0407
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 112291691,
        "shareRatio": 0.0405
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 87092393,
        "shareRatio": 0.0314
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 60593191,
        "shareRatio": 0.0219
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 56727273,
        "shareRatio": 0.0205
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 44901291,
        "shareRatio": 0.0162
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 36763182,
        "shareRatio": 0.0133
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 35980000,
        "shareRatio": 0.013
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 35082273,
        "shareRatio": 0.0127
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 31500000,
        "shareRatio": 0.0114
      },
      {
        "venueName": "원더풀",
        "categoryCode": "TICKET",
        "netRevenue": 30416545,
        "shareRatio": 0.011
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 23695455,
        "shareRatio": 0.0086
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 23624091,
        "shareRatio": 0.0085
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 21749091,
        "shareRatio": 0.0079
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 20090000,
        "shareRatio": 0.0073
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 16746182,
        "shareRatio": 0.006
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 11777273,
        "shareRatio": 0.0043
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 11399000,
        "shareRatio": 0.0041
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 11113636,
        "shareRatio": 0.004
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 8345909,
        "shareRatio": 0.003
      },
      {
        "venueName": "마리나 클럽",
        "categoryCode": "TICKET",
        "netRevenue": 6426818,
        "shareRatio": 0.0023
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 5962727,
        "shareRatio": 0.0022
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 5651815,
        "shareRatio": 0.002
      },
      {
        "venueName": "주차관제",
        "categoryCode": "PARKING",
        "netRevenue": 5375455,
        "shareRatio": 0.0019
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 4222727,
        "shareRatio": 0.0015
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 2844091,
        "shareRatio": 0.001
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 2226455,
        "shareRatio": 0.0008
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 745455,
        "shareRatio": 0.0003
      }
    ]
  },
  "9": {
    "month": 9,
    "days": 30,
    "totalRevenue": 2251992296,
    "trevpar": 428951,
    "divisionShares": {
      "ROOM": 0.1612,
      "GOLF": 0.4472,
      "FNB": 0.1981,
      "LEISURE": 0.0835,
      "MOTO": 0.0361,
      "BANQUET": 0.0261,
      "OTHER": 0.0477
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 921569800,
        "shareRatio": 0.4092
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 360346661,
        "shareRatio": 0.16
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 142650091,
        "shareRatio": 0.0633
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 129167294,
        "shareRatio": 0.0574
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 77832500,
        "shareRatio": 0.0346
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 69742955,
        "shareRatio": 0.031
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 58704182,
        "shareRatio": 0.0261
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 54265727,
        "shareRatio": 0.0241
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 50029545,
        "shareRatio": 0.0222
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 46685455,
        "shareRatio": 0.0207
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 42700164,
        "shareRatio": 0.019
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 41427091,
        "shareRatio": 0.0184
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 38836364,
        "shareRatio": 0.0172
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 34506873,
        "shareRatio": 0.0153
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 23421364,
        "shareRatio": 0.0104
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 23382818,
        "shareRatio": 0.0104
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 20713636,
        "shareRatio": 0.0092
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 18343818,
        "shareRatio": 0.0081
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 16994141,
        "shareRatio": 0.0075
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 15168182,
        "shareRatio": 0.0067
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 11996364,
        "shareRatio": 0.0053
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 10115455,
        "shareRatio": 0.0045
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 8513318,
        "shareRatio": 0.0038
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 7781818,
        "shareRatio": 0.0035
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 5950909,
        "shareRatio": 0.0026
      },
      {
        "venueName": "마리나 클럽",
        "categoryCode": "TICKET",
        "netRevenue": 4650455,
        "shareRatio": 0.0021
      },
      {
        "venueName": "썸머랜드",
        "categoryCode": "TICKET",
        "netRevenue": 3570909,
        "shareRatio": 0.0016
      },
      {
        "venueName": "주차관제",
        "categoryCode": "PARKING",
        "netRevenue": 3160909,
        "shareRatio": 0.0014
      },
      {
        "venueName": "원더풀",
        "categoryCode": "TICKET",
        "netRevenue": 2894545,
        "shareRatio": 0.0013
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 2785454,
        "shareRatio": 0.0012
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 1999227,
        "shareRatio": 0.0009
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1479727,
        "shareRatio": 0.0007
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 604545,
        "shareRatio": 0.0003
      }
    ]
  },
  "10": {
    "month": 10,
    "days": 31,
    "totalRevenue": 2966211970,
    "trevpar": 546767,
    "divisionShares": {
      "ROOM": 0.163,
      "GOLF": 0.4375,
      "FNB": 0.182,
      "LEISURE": 0.1167,
      "MOTO": 0.0426,
      "BANQUET": 0.0095,
      "OTHER": 0.0486
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 1195827900,
        "shareRatio": 0.4031
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 475343734,
        "shareRatio": 0.1603
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 182300818,
        "shareRatio": 0.0615
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 131030131,
        "shareRatio": 0.0442
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 115830909,
        "shareRatio": 0.0391
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 98266864,
        "shareRatio": 0.0331
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 87635864,
        "shareRatio": 0.0295
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 82215367,
        "shareRatio": 0.0277
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 57268818,
        "shareRatio": 0.0193
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 55016364,
        "shareRatio": 0.0185
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 52450118,
        "shareRatio": 0.0177
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 49795200,
        "shareRatio": 0.0168
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 49212818,
        "shareRatio": 0.0166
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 46873818,
        "shareRatio": 0.0158
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 45967273,
        "shareRatio": 0.0155
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 35990455,
        "shareRatio": 0.0121
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 32054545,
        "shareRatio": 0.0108
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 28520818,
        "shareRatio": 0.0096
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 28174545,
        "shareRatio": 0.0095
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 21617818,
        "shareRatio": 0.0073
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 21058182,
        "shareRatio": 0.0071
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 14860000,
        "shareRatio": 0.005
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 13940909,
        "shareRatio": 0.0047
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 10270000,
        "shareRatio": 0.0035
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 10187818,
        "shareRatio": 0.0034
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 8135974,
        "shareRatio": 0.0027
      },
      {
        "venueName": "주차관제",
        "categoryCode": "PARKING",
        "netRevenue": 6392727,
        "shareRatio": 0.0022
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 3853636,
        "shareRatio": 0.0013
      },
      {
        "venueName": "마리나 클럽",
        "categoryCode": "TICKET",
        "netRevenue": 2795909,
        "shareRatio": 0.0009
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 2438091,
        "shareRatio": 0.0008
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 857273,
        "shareRatio": 0.0003
      },
      {
        "venueName": "벨포레홀",
        "categoryCode": "BANQUET",
        "netRevenue": 27273,
        "shareRatio": 0
      }
    ]
  },
  "11": {
    "month": 11,
    "days": 30,
    "totalRevenue": 2780449319,
    "trevpar": 529609,
    "divisionShares": {
      "ROOM": 0.1656,
      "GOLF": 0.4155,
      "FNB": 0.2042,
      "LEISURE": 0.0997,
      "MOTO": 0.038,
      "BANQUET": 0.0253,
      "OTHER": 0.0518
    },
    "facilities": [
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 1050963500,
        "shareRatio": 0.378
      },
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 454454178,
        "shareRatio": 0.1634
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 193630364,
        "shareRatio": 0.0696
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 145894718,
        "shareRatio": 0.0525
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 129948956,
        "shareRatio": 0.0467
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 70217909,
        "shareRatio": 0.0253
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 66521678,
        "shareRatio": 0.0239
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 66516045,
        "shareRatio": 0.0239
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 64476364,
        "shareRatio": 0.0232
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 59823636,
        "shareRatio": 0.0215
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 54350455,
        "shareRatio": 0.0195
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 53081645,
        "shareRatio": 0.0191
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 48536936,
        "shareRatio": 0.0175
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 44818454,
        "shareRatio": 0.0161
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 44530909,
        "shareRatio": 0.016
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 40024636,
        "shareRatio": 0.0144
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 38627727,
        "shareRatio": 0.0139
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 33169273,
        "shareRatio": 0.0119
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 23597273,
        "shareRatio": 0.0085
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 22209091,
        "shareRatio": 0.008
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 16298182,
        "shareRatio": 0.0059
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 14836636,
        "shareRatio": 0.0053
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 14001818,
        "shareRatio": 0.005
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 8095455,
        "shareRatio": 0.0029
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 6069091,
        "shareRatio": 0.0022
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 5863616,
        "shareRatio": 0.0021
      },
      {
        "venueName": "주차관제",
        "categoryCode": "PARKING",
        "netRevenue": 3815455,
        "shareRatio": 0.0014
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 2874045,
        "shareRatio": 0.001
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1399909,
        "shareRatio": 0.0005
      },
      {
        "venueName": "마리나 클럽",
        "categoryCode": "TICKET",
        "netRevenue": 1195909,
        "shareRatio": 0.0004
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 605455,
        "shareRatio": 0.0002
      }
    ]
  },
  "12": {
    "month": 12,
    "days": 31,
    "totalRevenue": 1434264285,
    "trevpar": 264381,
    "divisionShares": {
      "ROOM": 0.2794,
      "GOLF": 0.1658,
      "FNB": 0.2866,
      "LEISURE": 0.0892,
      "MOTO": 0.0558,
      "BANQUET": 0.0454,
      "OTHER": 0.0778
    },
    "facilities": [
      {
        "venueName": "객실",
        "categoryCode": "ROOM",
        "netRevenue": 392517871,
        "shareRatio": 0.2737
      },
      {
        "venueName": "골프",
        "categoryCode": "GOLF",
        "netRevenue": 207466500,
        "shareRatio": 0.1447
      },
      {
        "venueName": "남도예담",
        "categoryCode": "FNB",
        "netRevenue": 139043455,
        "shareRatio": 0.0969
      },
      {
        "venueName": "쿠치나",
        "categoryCode": "FNB",
        "netRevenue": 119317513,
        "shareRatio": 0.0832
      },
      {
        "venueName": "브리스킷346",
        "categoryCode": "FNB",
        "netRevenue": 94723045,
        "shareRatio": 0.066
      },
      {
        "venueName": "대관",
        "categoryCode": "BANQUET",
        "netRevenue": 65060000,
        "shareRatio": 0.0454
      },
      {
        "venueName": "CU편의점",
        "categoryCode": "ETC",
        "netRevenue": 51149327,
        "shareRatio": 0.0357
      },
      {
        "venueName": "밤밤테이블",
        "categoryCode": "FNB",
        "netRevenue": 49408056,
        "shareRatio": 0.0344
      },
      {
        "venueName": "모토아레나",
        "categoryCode": "MOTO",
        "netRevenue": 44314682,
        "shareRatio": 0.0309
      },
      {
        "venueName": "미디어아트센터",
        "categoryCode": "TICKET",
        "netRevenue": 34801091,
        "shareRatio": 0.0243
      },
      {
        "venueName": "모토아레나 렌탈샵",
        "categoryCode": "MOTO",
        "netRevenue": 32394864,
        "shareRatio": 0.0226
      },
      {
        "venueName": "투썸플레이스",
        "categoryCode": "ETC",
        "netRevenue": 32200091,
        "shareRatio": 0.0225
      },
      {
        "venueName": "놀이동산",
        "categoryCode": "TICKET",
        "netRevenue": 26571818,
        "shareRatio": 0.0185
      },
      {
        "venueName": "BHC(멕시카나)",
        "categoryCode": "ETC",
        "netRevenue": 21858182,
        "shareRatio": 0.0152
      },
      {
        "venueName": "사계절썰매장",
        "categoryCode": "TICKET",
        "netRevenue": 20775818,
        "shareRatio": 0.0145
      },
      {
        "venueName": "벨포레 목장",
        "categoryCode": "TICKET",
        "netRevenue": 19590273,
        "shareRatio": 0.0137
      },
      {
        "venueName": "클럽-레스토랑",
        "categoryCode": "GOLF",
        "netRevenue": 15462727,
        "shareRatio": 0.0108
      },
      {
        "venueName": "클럽-스타트하우스",
        "categoryCode": "GOLF",
        "netRevenue": 14879091,
        "shareRatio": 0.0104
      },
      {
        "venueName": "얼룩말카페",
        "categoryCode": "TICKET",
        "netRevenue": 9110273,
        "shareRatio": 0.0064
      },
      {
        "venueName": "객실 서비스",
        "categoryCode": "ROOM",
        "netRevenue": 8191790,
        "shareRatio": 0.0057
      },
      {
        "venueName": "벨포레 목장(체험)",
        "categoryCode": "TICKET",
        "netRevenue": 6969091,
        "shareRatio": 0.0049
      },
      {
        "venueName": "마운틴카트",
        "categoryCode": "TICKET",
        "netRevenue": 5177273,
        "shareRatio": 0.0036
      },
      {
        "venueName": "딜라이트",
        "categoryCode": "FNB",
        "netRevenue": 4848182,
        "shareRatio": 0.0034
      },
      {
        "venueName": "프로샵",
        "categoryCode": "ETC",
        "netRevenue": 4525091,
        "shareRatio": 0.0032
      },
      {
        "venueName": "벼루재촌",
        "categoryCode": "FNB",
        "netRevenue": 3740455,
        "shareRatio": 0.0026
      },
      {
        "venueName": "핏스탑",
        "categoryCode": "MOTO",
        "netRevenue": 3350909,
        "shareRatio": 0.0023
      },
      {
        "venueName": "미디어-뮤지엄카페",
        "categoryCode": "TICKET",
        "netRevenue": 3023727,
        "shareRatio": 0.0021
      },
      {
        "venueName": "주차관제",
        "categoryCode": "PARKING",
        "netRevenue": 1898182,
        "shareRatio": 0.0013
      },
      {
        "venueName": "미디어-기프트샵",
        "categoryCode": "TICKET",
        "netRevenue": 1226727,
        "shareRatio": 0.0009
      },
      {
        "venueName": "디노 시네마",
        "categoryCode": "TICKET",
        "netRevenue": 668182,
        "shareRatio": 0.0005
      }
    ]
  }
};
