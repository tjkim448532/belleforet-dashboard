// 백엔드 mat_v6_data_mart_revenue 연도별/월별 실측 계절성 및 표준 영업장 비중 데이터 SSOT
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

export interface YearSeasonalityMeta {
  annual: {
    totalRevenue: number;
    trevpar: number;
    days: number;
  };
  months: Record<number, MonthSeasonalityMeta>;
}

export const MULTI_YEAR_SEASONALITY_DATA: Record<number, YearSeasonalityMeta> = {
  "2024": {
    "annual": {
      "totalRevenue": 24706936601.2,
      "trevpar": 386801,
      "days": 365
    },
    "months": {
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
        "totalRevenue": 1049783379,
        "trevpar": 199959,
        "divisionShares": {
          "ROOM": 0.1428,
          "GOLF": 0.5938,
          "FNB": 0.1672,
          "LEISURE": 0.0527,
          "MOTO": 0.0211,
          "BANQUET": 0.0103,
          "OTHER": 0.0121
        },
        "facilities": [
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 566936800,
            "shareRatio": 0.5401
          },
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 147838491,
            "shareRatio": 0.1408
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 63449318,
            "shareRatio": 0.0604
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 41680909,
            "shareRatio": 0.0397
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 41181727,
            "shareRatio": 0.0392
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 33860909,
            "shareRatio": 0.0323
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 22514545,
            "shareRatio": 0.0214
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 22172727,
            "shareRatio": 0.0211
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 17683636,
            "shareRatio": 0.0168
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 16513909,
            "shareRatio": 0.0157
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 15306636,
            "shareRatio": 0.0146
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 12739091,
            "shareRatio": 0.0121
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 11487636,
            "shareRatio": 0.0109
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 10818182,
            "shareRatio": 0.0103
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 8105636,
            "shareRatio": 0.0077
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 7050773,
            "shareRatio": 0.0067
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 4512000,
            "shareRatio": 0.0043
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 2060906,
            "shareRatio": 0.002
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 1361818,
            "shareRatio": 0.0013
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 1000000,
            "shareRatio": 0.001
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 520455,
            "shareRatio": 0.0005
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 514545,
            "shareRatio": 0.0005
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 472727,
            "shareRatio": 0.0005
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 0,
            "shareRatio": 0
          }
        ]
      },
      "5": {
        "month": 5,
        "days": 31,
        "totalRevenue": 2590852887,
        "trevpar": 477577,
        "divisionShares": {
          "ROOM": 0.1364,
          "GOLF": 0.578,
          "FNB": 0.1778,
          "LEISURE": 0.0627,
          "MOTO": 0.0268,
          "BANQUET": 0.0089,
          "OTHER": 0.0093
        },
        "facilities": [
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 1375967900,
            "shareRatio": 0.5311
          },
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 349881621,
            "shareRatio": 0.135
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 183297709,
            "shareRatio": 0.0707
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 111953175,
            "shareRatio": 0.0432
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 99249091,
            "shareRatio": 0.0383
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 74050000,
            "shareRatio": 0.0286
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 63180800,
            "shareRatio": 0.0244
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 49017000,
            "shareRatio": 0.0189
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 48141091,
            "shareRatio": 0.0186
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 47600909,
            "shareRatio": 0.0184
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 43051636,
            "shareRatio": 0.0166
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 26787727,
            "shareRatio": 0.0103
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 24178182,
            "shareRatio": 0.0093
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 21727273,
            "shareRatio": 0.0084
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 17862318,
            "shareRatio": 0.0069
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 17226818,
            "shareRatio": 0.0066
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 12821818,
            "shareRatio": 0.0049
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 6554545,
            "shareRatio": 0.0025
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 6312727,
            "shareRatio": 0.0024
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 3480001,
            "shareRatio": 0.0013
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 2437182,
            "shareRatio": 0.0009
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 2190000,
            "shareRatio": 0.0008
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 1635455,
            "shareRatio": 0.0006
          },
          {
            "venueName": "벨포레홀",
            "categoryCode": "BANQUET",
            "netRevenue": 1340455,
            "shareRatio": 0.0005
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 907455,
            "shareRatio": 0.0004
          }
        ]
      },
      "6": {
        "month": 6,
        "days": 30,
        "totalRevenue": 2742290825,
        "trevpar": 522341,
        "divisionShares": {
          "ROOM": 0.139,
          "GOLF": 0.5499,
          "FNB": 0.1606,
          "LEISURE": 0.0602,
          "MOTO": 0.0332,
          "BANQUET": 0.0098,
          "OTHER": 0.0472
        },
        "facilities": [
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 1382642900,
            "shareRatio": 0.5042
          },
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 379573964,
            "shareRatio": 0.1384
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 156279000,
            "shareRatio": 0.057
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 102233018,
            "shareRatio": 0.0373
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 94862728,
            "shareRatio": 0.0346
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 86098727,
            "shareRatio": 0.0314
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 73854545,
            "shareRatio": 0.0269
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 55456000,
            "shareRatio": 0.0202
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 51353636,
            "shareRatio": 0.0187
          },
          {
            "venueName": "CU편의점",
            "categoryCode": "ETC",
            "netRevenue": 46788255,
            "shareRatio": 0.0171
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 44823727,
            "shareRatio": 0.0163
          },
          {
            "venueName": "투썸플레이스",
            "categoryCode": "ETC",
            "netRevenue": 39353218,
            "shareRatio": 0.0144
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 33811273,
            "shareRatio": 0.0123
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 27451818,
            "shareRatio": 0.01
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 26954545,
            "shareRatio": 0.0098
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 26398000,
            "shareRatio": 0.0096
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 24264545,
            "shareRatio": 0.0088
          },
          {
            "venueName": "딜라이트",
            "categoryCode": "FNB",
            "netRevenue": 17985000,
            "shareRatio": 0.0066
          },
          {
            "venueName": "BHC(멕시카나)",
            "categoryCode": "ETC",
            "netRevenue": 15970000,
            "shareRatio": 0.0058
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 13673727,
            "shareRatio": 0.005
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 11934273,
            "shareRatio": 0.0044
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 8407273,
            "shareRatio": 0.0031
          },
          {
            "venueName": "원더풀",
            "categoryCode": "TICKET",
            "netRevenue": 7871818,
            "shareRatio": 0.0029
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 5046364,
            "shareRatio": 0.0018
          },
          {
            "venueName": "썸머랜드",
            "categoryCode": "TICKET",
            "netRevenue": 2238182,
            "shareRatio": 0.0008
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 1787273,
            "shareRatio": 0.0007
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 1701364,
            "shareRatio": 0.0006
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 1665561,
            "shareRatio": 0.0006
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 1161818,
            "shareRatio": 0.0004
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 648273,
            "shareRatio": 0.0002
          }
        ]
      },
      "7": {
        "month": 7,
        "days": 31,
        "totalRevenue": 2161864374,
        "trevpar": 398500,
        "divisionShares": {
          "ROOM": 0.2071,
          "GOLF": 0.4427,
          "FNB": 0.1812,
          "LEISURE": 0.0725,
          "MOTO": 0.0245,
          "BANQUET": 0.017,
          "OTHER": 0.055
        },
        "facilities": [
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 860565900,
            "shareRatio": 0.3981
          },
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 444383420,
            "shareRatio": 0.2056
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 123886091,
            "shareRatio": 0.0573
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 92148327,
            "shareRatio": 0.0426
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 85924545,
            "shareRatio": 0.0397
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 67268736,
            "shareRatio": 0.0311
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 61330909,
            "shareRatio": 0.0284
          },
          {
            "venueName": "CU편의점",
            "categoryCode": "ETC",
            "netRevenue": 49124673,
            "shareRatio": 0.0227
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 48424000,
            "shareRatio": 0.0224
          },
          {
            "venueName": "썸머랜드",
            "categoryCode": "TICKET",
            "netRevenue": 37672455,
            "shareRatio": 0.0174
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 36742727,
            "shareRatio": 0.017
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 35104545,
            "shareRatio": 0.0162
          },
          {
            "venueName": "투썸플레이스",
            "categoryCode": "ETC",
            "netRevenue": 33237636,
            "shareRatio": 0.0154
          },
          {
            "venueName": "원더풀",
            "categoryCode": "TICKET",
            "netRevenue": 32256909,
            "shareRatio": 0.0149
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 29880545,
            "shareRatio": 0.0138
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 22056818,
            "shareRatio": 0.0102
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 19124545,
            "shareRatio": 0.0088
          },
          {
            "venueName": "BHC(멕시카나)",
            "categoryCode": "ETC",
            "netRevenue": 17374545,
            "shareRatio": 0.008
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 14820909,
            "shareRatio": 0.0069
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 14021455,
            "shareRatio": 0.0065
          },
          {
            "venueName": "딜라이트",
            "categoryCode": "FNB",
            "netRevenue": 7775364,
            "shareRatio": 0.0036
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 7029182,
            "shareRatio": 0.0033
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 6863909,
            "shareRatio": 0.0032
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 4564545,
            "shareRatio": 0.0021
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 3312409,
            "shareRatio": 0.0015
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 3169091,
            "shareRatio": 0.0015
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 1481273,
            "shareRatio": 0.0007
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 1316818,
            "shareRatio": 0.0006
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 749091,
            "shareRatio": 0.0003
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 253000,
            "shareRatio": 0.0001
          }
        ]
      },
      "8": {
        "month": 8,
        "days": 31,
        "totalRevenue": 2865578803,
        "trevpar": 528217,
        "divisionShares": {
          "ROOM": 0.2136,
          "GOLF": 0.4223,
          "FNB": 0.1826,
          "LEISURE": 0.0938,
          "MOTO": 0.0257,
          "BANQUET": 0.0095,
          "OTHER": 0.0525
        },
        "facilities": [
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 1098460400,
            "shareRatio": 0.3833
          },
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 608189331,
            "shareRatio": 0.2122
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 168529000,
            "shareRatio": 0.0588
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 140914000,
            "shareRatio": 0.0492
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 125807272,
            "shareRatio": 0.0439
          },
          {
            "venueName": "썸머랜드",
            "categoryCode": "TICKET",
            "netRevenue": 101384091,
            "shareRatio": 0.0354
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 71934545,
            "shareRatio": 0.0251
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 67704909,
            "shareRatio": 0.0236
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 67577045,
            "shareRatio": 0.0236
          },
          {
            "venueName": "CU편의점",
            "categoryCode": "ETC",
            "netRevenue": 64954491,
            "shareRatio": 0.0227
          },
          {
            "venueName": "원더풀",
            "categoryCode": "TICKET",
            "netRevenue": 54854091,
            "shareRatio": 0.0191
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 40953364,
            "shareRatio": 0.0143
          },
          {
            "venueName": "투썸플레이스",
            "categoryCode": "ETC",
            "netRevenue": 40203082,
            "shareRatio": 0.014
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 39598182,
            "shareRatio": 0.0138
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 34108636,
            "shareRatio": 0.0119
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 27152727,
            "shareRatio": 0.0095
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 24236364,
            "shareRatio": 0.0085
          },
          {
            "venueName": "BHC(멕시카나)",
            "categoryCode": "ETC",
            "netRevenue": 21188182,
            "shareRatio": 0.0074
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 13643364,
            "shareRatio": 0.0048
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 11034545,
            "shareRatio": 0.0039
          },
          {
            "venueName": "딜라이트",
            "categoryCode": "FNB",
            "netRevenue": 9401727,
            "shareRatio": 0.0033
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 8053909,
            "shareRatio": 0.0028
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 6552455,
            "shareRatio": 0.0023
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 5958182,
            "shareRatio": 0.0021
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 3886181,
            "shareRatio": 0.0014
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 3565455,
            "shareRatio": 0.0012
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 2774091,
            "shareRatio": 0.001
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 2027818,
            "shareRatio": 0.0007
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 570000,
            "shareRatio": 0.0002
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 361364,
            "shareRatio": 0.0001
          }
        ]
      },
      "9": {
        "month": 9,
        "days": 30,
        "totalRevenue": 2569730473,
        "trevpar": 489472,
        "divisionShares": {
          "ROOM": 0.1484,
          "GOLF": 0.5028,
          "FNB": 0.182,
          "LEISURE": 0.0749,
          "MOTO": 0.0307,
          "BANQUET": 0.0144,
          "OTHER": 0.0467
        },
        "facilities": [
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 1192333700,
            "shareRatio": 0.464
          },
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 381267986,
            "shareRatio": 0.1484
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 162291136,
            "shareRatio": 0.0632
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 109218184,
            "shareRatio": 0.0425
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 96144273,
            "shareRatio": 0.0374
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 74045455,
            "shareRatio": 0.0288
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 66216364,
            "shareRatio": 0.0258
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 62952636,
            "shareRatio": 0.0245
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 56578182,
            "shareRatio": 0.022
          },
          {
            "venueName": "CU편의점",
            "categoryCode": "ETC",
            "netRevenue": 46502855,
            "shareRatio": 0.0181
          },
          {
            "venueName": "투썸플레이스",
            "categoryCode": "ETC",
            "netRevenue": 39258236,
            "shareRatio": 0.0153
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 37061818,
            "shareRatio": 0.0144
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 36334182,
            "shareRatio": 0.0141
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 33590000,
            "shareRatio": 0.0131
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 31780909,
            "shareRatio": 0.0124
          },
          {
            "venueName": "딜라이트",
            "categoryCode": "FNB",
            "netRevenue": 21818636,
            "shareRatio": 0.0085
          },
          {
            "venueName": "원더풀",
            "categoryCode": "TICKET",
            "netRevenue": 21081818,
            "shareRatio": 0.0082
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 19405455,
            "shareRatio": 0.0076
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 15508727,
            "shareRatio": 0.006
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 15214545,
            "shareRatio": 0.0059
          },
          {
            "venueName": "BHC(멕시카나)",
            "categoryCode": "ETC",
            "netRevenue": 14799091,
            "shareRatio": 0.0058
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 13910000,
            "shareRatio": 0.0054
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 7892727,
            "shareRatio": 0.0031
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 4970909,
            "shareRatio": 0.0019
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 2705000,
            "shareRatio": 0.0011
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 2351818,
            "shareRatio": 0.0009
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 1810000,
            "shareRatio": 0.0007
          },
          {
            "venueName": "썸머랜드",
            "categoryCode": "TICKET",
            "netRevenue": 1546364,
            "shareRatio": 0.0006
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 1073091,
            "shareRatio": 0.0004
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 66376,
            "shareRatio": 0
          },
          {
            "venueName": "벨포레홀",
            "categoryCode": "BANQUET",
            "netRevenue": 0,
            "shareRatio": 0
          }
        ]
      },
      "10": {
        "month": 10,
        "days": 31,
        "totalRevenue": 3200872369,
        "trevpar": 590023,
        "divisionShares": {
          "ROOM": 0.1409,
          "GOLF": 0.5109,
          "FNB": 0.188,
          "LEISURE": 0.0795,
          "MOTO": 0.0245,
          "BANQUET": 0.0119,
          "OTHER": 0.0442
        },
        "facilities": [
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 1510117100,
            "shareRatio": 0.4718
          },
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 446310220,
            "shareRatio": 0.1394
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 200993409,
            "shareRatio": 0.0628
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 148516364,
            "shareRatio": 0.0464
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 109525073,
            "shareRatio": 0.0342
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 92089545,
            "shareRatio": 0.0288
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 80633045,
            "shareRatio": 0.0252
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 73291773,
            "shareRatio": 0.0229
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 64955455,
            "shareRatio": 0.0203
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 60372727,
            "shareRatio": 0.0189
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 51635273,
            "shareRatio": 0.0161
          },
          {
            "venueName": "CU편의점",
            "categoryCode": "ETC",
            "netRevenue": 51049164,
            "shareRatio": 0.0159
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 46556364,
            "shareRatio": 0.0145
          },
          {
            "venueName": "투썸플레이스",
            "categoryCode": "ETC",
            "netRevenue": 45852918,
            "shareRatio": 0.0143
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 38060909,
            "shareRatio": 0.0119
          },
          {
            "venueName": "딜라이트",
            "categoryCode": "FNB",
            "netRevenue": 37964091,
            "shareRatio": 0.0119
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 27723636,
            "shareRatio": 0.0087
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 24280000,
            "shareRatio": 0.0076
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 22817000,
            "shareRatio": 0.0071
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 16988682,
            "shareRatio": 0.0053
          },
          {
            "venueName": "BHC(멕시카나)",
            "categoryCode": "ETC",
            "netRevenue": 16764545,
            "shareRatio": 0.0052
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 16347273,
            "shareRatio": 0.0051
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 5019091,
            "shareRatio": 0.0016
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 4816440,
            "shareRatio": 0.0015
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 2937273,
            "shareRatio": 0.0009
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 1893182,
            "shareRatio": 0.0006
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 1556364,
            "shareRatio": 0.0005
          },
          {
            "venueName": "원더풀",
            "categoryCode": "TICKET",
            "netRevenue": 926364,
            "shareRatio": 0.0003
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 879091,
            "shareRatio": 0.0003
          }
        ]
      },
      "11": {
        "month": 11,
        "days": 30,
        "totalRevenue": 2631462749,
        "trevpar": 501231,
        "divisionShares": {
          "ROOM": 0.1543,
          "GOLF": 0.4756,
          "FNB": 0.2005,
          "LEISURE": 0.0746,
          "MOTO": 0.0309,
          "BANQUET": 0.0159,
          "OTHER": 0.048
        },
        "facilities": [
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 1156903700,
            "shareRatio": 0.4396
          },
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 402810692,
            "shareRatio": 0.1531
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 188780591,
            "shareRatio": 0.0717
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 123366282,
            "shareRatio": 0.0469
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 123040000,
            "shareRatio": 0.0468
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 75376098,
            "shareRatio": 0.0286
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 68299636,
            "shareRatio": 0.026
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 64438636,
            "shareRatio": 0.0245
          },
          {
            "venueName": "CU편의점",
            "categoryCode": "ETC",
            "netRevenue": 50106345,
            "shareRatio": 0.019
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 48882727,
            "shareRatio": 0.0186
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 45853636,
            "shareRatio": 0.0174
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 41940909,
            "shareRatio": 0.0159
          },
          {
            "venueName": "투썸플레이스",
            "categoryCode": "ETC",
            "netRevenue": 41093364,
            "shareRatio": 0.0156
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 38595727,
            "shareRatio": 0.0147
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 37139545,
            "shareRatio": 0.0141
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 19258364,
            "shareRatio": 0.0073
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 18373636,
            "shareRatio": 0.007
          },
          {
            "venueName": "BHC(멕시카나)",
            "categoryCode": "ETC",
            "netRevenue": 16824545,
            "shareRatio": 0.0064
          },
          {
            "venueName": "딜라이트",
            "categoryCode": "FNB",
            "netRevenue": 16777909,
            "shareRatio": 0.0064
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 13874227,
            "shareRatio": 0.0053
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 11941818,
            "shareRatio": 0.0045
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 7442727,
            "shareRatio": 0.0028
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 6067273,
            "shareRatio": 0.0023
          },
          {
            "venueName": "마운틴카트",
            "categoryCode": "TICKET",
            "netRevenue": 5067727,
            "shareRatio": 0.0019
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 3215723,
            "shareRatio": 0.0012
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 2275909,
            "shareRatio": 0.0009
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 1564545,
            "shareRatio": 0.0006
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 1208636,
            "shareRatio": 0.0005
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 941818,
            "shareRatio": 0.0004
          }
        ]
      },
      "12": {
        "month": 12,
        "days": 31,
        "totalRevenue": 1356431239,
        "trevpar": 250033,
        "divisionShares": {
          "ROOM": 0.2542,
          "GOLF": 0.2466,
          "FNB": 0.2802,
          "LEISURE": 0.0905,
          "MOTO": 0.0231,
          "BANQUET": 0.0275,
          "OTHER": 0.0779
        },
        "facilities": [
          {
            "venueName": "객실",
            "categoryCode": "ROOM",
            "netRevenue": 338592507,
            "shareRatio": 0.2496
          },
          {
            "venueName": "골프",
            "categoryCode": "GOLF",
            "netRevenue": 294754800,
            "shareRatio": 0.2173
          },
          {
            "venueName": "남도예담",
            "categoryCode": "FNB",
            "netRevenue": 128376909,
            "shareRatio": 0.0946
          },
          {
            "venueName": "쿠치나",
            "categoryCode": "FNB",
            "netRevenue": 111482727,
            "shareRatio": 0.0822
          },
          {
            "venueName": "브리스킷346",
            "categoryCode": "FNB",
            "netRevenue": 88460718,
            "shareRatio": 0.0652
          },
          {
            "venueName": "CU편의점",
            "categoryCode": "ETC",
            "netRevenue": 45134555,
            "shareRatio": 0.0333
          },
          {
            "venueName": "밤밤테이블",
            "categoryCode": "FNB",
            "netRevenue": 40074582,
            "shareRatio": 0.0295
          },
          {
            "venueName": "대관",
            "categoryCode": "BANQUET",
            "netRevenue": 37327273,
            "shareRatio": 0.0275
          },
          {
            "venueName": "미디어아트센터",
            "categoryCode": "TICKET",
            "netRevenue": 36847182,
            "shareRatio": 0.0272
          },
          {
            "venueName": "모토아레나",
            "categoryCode": "MOTO",
            "netRevenue": 30237773,
            "shareRatio": 0.0223
          },
          {
            "venueName": "투썸플레이스",
            "categoryCode": "ETC",
            "netRevenue": 29875891,
            "shareRatio": 0.022
          },
          {
            "venueName": "클럽-스타트하우스",
            "categoryCode": "GOLF",
            "netRevenue": 26479091,
            "shareRatio": 0.0195
          },
          {
            "venueName": "놀이동산",
            "categoryCode": "TICKET",
            "netRevenue": 22307727,
            "shareRatio": 0.0164
          },
          {
            "venueName": "벨포레 목장",
            "categoryCode": "TICKET",
            "netRevenue": 19402818,
            "shareRatio": 0.0143
          },
          {
            "venueName": "사계절썰매장",
            "categoryCode": "TICKET",
            "netRevenue": 17732545,
            "shareRatio": 0.0131
          },
          {
            "venueName": "BHC(멕시카나)",
            "categoryCode": "ETC",
            "netRevenue": 16583636,
            "shareRatio": 0.0122
          },
          {
            "venueName": "프로샵",
            "categoryCode": "ETC",
            "netRevenue": 14074545,
            "shareRatio": 0.0104
          },
          {
            "venueName": "클럽-레스토랑",
            "categoryCode": "GOLF",
            "netRevenue": 13218182,
            "shareRatio": 0.0097
          },
          {
            "venueName": "딜라이트",
            "categoryCode": "FNB",
            "netRevenue": 9681909,
            "shareRatio": 0.0071
          },
          {
            "venueName": "얼룩말카페",
            "categoryCode": "TICKET",
            "netRevenue": 8787045,
            "shareRatio": 0.0065
          },
          {
            "venueName": "마운틴카트",
            "categoryCode": "TICKET",
            "netRevenue": 6811364,
            "shareRatio": 0.005
          },
          {
            "venueName": "객실 서비스",
            "categoryCode": "ROOM",
            "netRevenue": 6232914,
            "shareRatio": 0.0046
          },
          {
            "venueName": "벨포레 목장(체험)",
            "categoryCode": "TICKET",
            "netRevenue": 5598182,
            "shareRatio": 0.0041
          },
          {
            "venueName": "미디어-뮤지엄카페",
            "categoryCode": "TICKET",
            "netRevenue": 2435455,
            "shareRatio": 0.0018
          },
          {
            "venueName": "벼루재촌",
            "categoryCode": "FNB",
            "netRevenue": 1988182,
            "shareRatio": 0.0015
          },
          {
            "venueName": "미디어-기프트샵",
            "categoryCode": "TICKET",
            "netRevenue": 1793636,
            "shareRatio": 0.0013
          },
          {
            "venueName": "핏스탑",
            "categoryCode": "MOTO",
            "netRevenue": 1156364,
            "shareRatio": 0.0009
          },
          {
            "venueName": "미니골프",
            "categoryCode": "TICKET",
            "netRevenue": 550909,
            "shareRatio": 0.0004
          },
          {
            "venueName": "디노 시네마",
            "categoryCode": "TICKET",
            "netRevenue": 431818,
            "shareRatio": 0.0003
          }
        ]
      }
    }
  },
  "2025": {
    "annual": {
      "totalRevenue": 26334667152.15,
      "trevpar": 412284,
      "days": 365
    },
    "months": {
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
    }
  }
};

export const ANNUAL_BASELINE_META = MULTI_YEAR_SEASONALITY_DATA[2025].annual;
export const MONTHLY_SEASONALITY_DATA = MULTI_YEAR_SEASONALITY_DATA[2025].months;
