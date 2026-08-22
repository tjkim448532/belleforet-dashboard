// 벨포레 리조트 공식 기상 서비스 (증평군 도안면 벨포레 좌표: 36.7825, 127.6042)
// 백엔드 기상 데이터 결측('데이터없음') 시 Open-Meteo 실시간 기상 API 자동 보정

export interface LiveWeatherData {
  description: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

const wmoToKorean = (code: number): string => {
  if (code === 0) return '맑음';
  if (code === 1) return '대체로 맑음';
  if (code === 2) return '구름 많음';
  if (code === 3) return '흐림';
  if ([45, 48].includes(code)) return '안개';
  if ([51, 53, 55].includes(code)) return '약한 비';
  if ([56, 57].includes(code)) return '진눈깨비';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return '비';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '눈';
  if ([95, 96, 99].includes(code)) return '뇌우';
  return '구름 많음';
};

export async function fetchLiveWeatherFallback(dateStr: string): Promise<LiveWeatherData | null> {
  try {
    const lat = 36.7825;
    const lon = 127.6042;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia/Seoul&start_date=${dateStr}&end_date=${dateStr}`;
    
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    
    const code = data.daily?.weather_code?.[0];
    const max = data.daily?.temperature_2m_max?.[0];
    const min = data.daily?.temperature_2m_min?.[0];
    
    if (code !== undefined && max !== undefined && min !== undefined) {
      return {
        description: wmoToKorean(code),
        tempMax: Math.round(max * 10) / 10,
        tempMin: Math.round(min * 10) / 10,
        weatherCode: code
      };
    }
    return null;
  } catch (err) {
    console.warn('[LiveWeatherService] Open-Meteo fallback fetch error:', err);
    return null;
  }
}
