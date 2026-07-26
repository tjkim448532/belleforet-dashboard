async function testPostRoomSegment() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret', 'Content-Type': 'application/json' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT...');
  const res = await fetch(`${baseUrl}/api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT`, { headers }).then(r => r.json());
  console.log('Res Data Keys:', Object.keys(res.data || res));
  if (res.data) {
    console.log('Bins count:', res.data.bins?.length);
    console.log('Sample bins:', res.data.bins?.slice(0, 10));
    console.log('Mappings count:', Array.isArray(res.data.mappings) ? res.data.mappings.length : typeof res.data.mappings);
    console.log('Unclassified count:', Array.isArray(res.data.unclassified) ? res.data.unclassified.length : typeof res.data.unclassified);
    if (res.data.unclassified) {
      console.log('Sample unclassified:', res.data.unclassified.slice(0, 5));
    }
  }
}

testPostRoomSegment().catch(console.error);
