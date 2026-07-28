async function inspectSynergyUnmapped() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';
  const testDates = ['2026-07-27', '2026-07-26', '2026-07-24'];

  console.log('====================================================');
  console.log('🔍 [시너지 대시보드 "미상" 원인 다각도 데이터 분석]');
  console.log('====================================================\n');

  for (const date of testDates) {
    console.log(`\n📅 Inspection Date: ${date}`);

    // API 6: room-channel-sales (Segment focus)
    const resSeg = await fetch(`${baseUrl}/api/v5/report/room-channel-sales?date=${date}&_t=${Date.now()}`, { headers }).then(r => r.json());
    const dataSeg = resSeg.data || resSeg;
    console.log(`[API 6 - room-channel-sales (세그먼트)] items count:`, Array.isArray(dataSeg) ? dataSeg.length : 'object');

    if (Array.isArray(dataSeg)) {
      dataSeg.forEach(item => {
        const segName = item.segmentName || item.segment_name || item.channelName || item.channel_name || item.name || '';
        const rev = item.todayActual || item.revenue || item.totalSales || 0;
        const rooms = item.todayRooms || item.roomsSold || item.rooms || 0;
        console.log(`   - Segment: "${segName}" | Rooms: ${rooms}실 | Revenue: ${rev.toLocaleString()}원`);
      });
    }

    // API 7: room-sales-by-channel (Channel focus)
    const resChan = await fetch(`${baseUrl}/api/v5/report/room-sales-by-channel?date=${date}&_t=${Date.now()}`, { headers }).then(r => r.json());
    const dataChan = resChan.data || resChan;
    console.log(`[API 7 - room-sales-by-channel (채널)] items count:`, Array.isArray(dataChan) ? dataChan.length : 'object');

    if (Array.isArray(dataChan)) {
      dataChan.forEach(item => {
        const chanName = item.channelName || item.channel_name || item.segmentName || item.name || '';
        const rev = item.todayActual || item.revenue || item.totalSales || 0;
        const rooms = item.todayRooms || item.roomsSold || item.rooms || 0;
        console.log(`   - Channel: "${chanName}" | Rooms: ${rooms}실 | Revenue: ${rev.toLocaleString()}원`);
      });
    }
  }
}

inspectSynergyUnmapped().catch(console.error);
