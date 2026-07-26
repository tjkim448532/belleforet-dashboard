async function testV5RoomSegmentMapping() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT...');
  const res = await fetch(`${baseUrl}/api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT`, { headers }).then(r => r.json());
  console.log('Keys:', Object.keys(res));
  console.log('Unclassified (미분류) count:', Array.isArray(res.unclassified) ? res.unclassified.length : (Array.isArray(res.unclassifiedItems) ? res.unclassifiedItems.length : typeof res.unclassified));
  console.log('Bins (세그먼트 목록):', res.bins || res.categories || res.segments);
  
  if (Array.isArray(res.unclassified) && res.unclassified.length > 0) {
    console.log('Sample unclassified rate types:', res.unclassified.slice(0, 10));
  } else if (Array.isArray(res.data?.unclassified)) {
    console.log('Sample unclassified rate types:', res.data.unclassified.slice(0, 10));
  } else {
    console.log('Response sample:', JSON.stringify(res).slice(0, 400));
  }
}

testV5RoomSegmentMapping().catch(console.error);
